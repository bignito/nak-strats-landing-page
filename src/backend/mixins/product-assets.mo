import Result "mo:core/Result";
import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Random "mo:core/Random";
import Blob "mo:core/Blob";
import Text "mo:core/Text";
import Types "../types/storefront";
import AssetTypes "../types/product-assets";
import AdminTypes "../types/admin-access-control";
import AdminLib "../lib/admin-access-control";
import CycleCountersLib "../lib/cycle-counters";
import CycleTypes "../types/cycle-monitor";

// Product image asset storage and serving. Stores image blobs in canister
// stable state (NOT the external blob gateway) and serves them publicly over
// the canister's HTTP interface at /assets/products/<assetId>.
//
// Upload and delete are ADMIN/OWNER only (STAFF and anonymous callers are
// rejected). Upload is chunked to stay under the IC ingress message limit.
mixin (
  assets : Map.Map<AssetTypes.AssetId, AssetTypes.AssetRecord>,
  uploads : Map.Map<Text, AssetTypes.UploadSession>,
  adminUsers : AdminTypes.AdminUsers,
  products : List.List<Types.Product>,
  selfPrincipal : Principal,
  cycleCounters : CycleTypes.CycleCounters,
) {
  // --- Constants (static literals; transient so they are not stable state) ---

  // Chunk size for chunked uploads (~1MB), well clear of the IC ingress
  // message limit (~2MB) so a single update call carrying a photo never fails.
  transient let CHUNK_SIZE = 1_000_000;
  // Maximum accepted image size after client-side compression (2MB).
  transient let MAX_IMAGE_SIZE = 2_000_000;
  // Maximum images per product.
  transient let MAX_IMAGES_PER_PRODUCT = 5;
  // Abandoned upload sessions idle longer than this (1 hour) are swept.
  transient let EXPIRY_WINDOW_NANOS = 3_600_000_000_000;
  // Streaming chunk size for serving large asset bodies over the HTTP interface.
  transient let STREAM_CHUNK = 1_000_000;

  // --- Helpers ---

  func assetHexDigit(n : Nat8) : Text {
    let v = n.toNat();
    if (v < 10) { v.toText() } else {
      switch v {
        case 10 { "a" };
        case 11 { "b" };
        case 12 { "c" };
        case 13 { "d" };
        case 14 { "e" };
        case _ { "f" };
      };
    };
  };

  func assetBlobToHex(b : Blob) : Text {
    var hex = "";
    for (byte in b.toArray().values()) {
      hex := hex # assetHexDigit(byte / 16) # assetHexDigit(byte % 16);
    };
    hex;
  };

  // Generate a unique id (upload id or asset id) from IC raw randomness.
  func generateId() : async Text {
    CycleCountersLib.incRawRandCalls(cycleCounters);
    let bytes = await Random.blob();
    assetBlobToHex(bytes);
  };

  // The absolute public URL for a stored asset. Asset ids are immutable, so the
  // URL is stable and safe to cache forever.
  func assetUrl(assetId : AssetTypes.AssetId) : Text {
    "https://" # selfPrincipal.toText() # ".icp0.io/assets/products/" # assetId;
  };

  // Authorization: ADMIN or OWNER only. STAFF and the anonymous principal are
  // rejected. Returns an UploadError to surface, or null when authorized.
  func authError(caller : Principal) : ?AssetTypes.UploadError {
    if (caller.isAnonymous()) { ?#unauthorized }
    else if (not AdminLib.isAdminOrOwner(adminUsers, caller)) { ?#unauthorized }
    else { null };
  };

  func isValidContentType(ct : Text) : Bool {
    ct == "image/jpeg" or ct == "image/png" or ct == "image/webp";
  };

  // Validate the declared content type against the actual file magic bytes.
  // JPEG starts FF D8 FF; PNG starts 89 50 4E 47 0D 0A 1A 0A; WebP starts
  // "RIFF" and bytes 8-11 are "WEBP". A file claiming one type that is not
  // that type is rejected.
  func magicBytesMatch(contentType : Text, blob : Blob) : Bool {
    let arr = blob.toArray();
    switch contentType {
      case "image/jpeg" {
        arr.size() >= 3 and arr[0] == 0xFF and arr[1] == 0xD8 and arr[2] == 0xFF;
      };
      case "image/png" {
        arr.size() >= 8
          and arr[0] == 0x89 and arr[1] == 0x50 and arr[2] == 0x4E and arr[3] == 0x47
          and arr[4] == 0x0D and arr[5] == 0x0A and arr[6] == 0x1A and arr[7] == 0x0A;
      };
      case "image/webp" {
        arr.size() >= 12
          and arr[0] == 0x52 and arr[1] == 0x49 and arr[2] == 0x46 and arr[3] == 0x46
          and arr[8] == 0x57 and arr[9] == 0x45 and arr[10] == 0x42 and arr[11] == 0x50;
      };
      case _ { false };
    };
  };

  // Remove upload sessions idle for longer than the expiry window, freeing
  // their accumulated chunk storage. Runs lazily on startUpload and on the
  // recurring hourly timer.
  func sweepExpiredSessions() {
    let now = Time.now();
    let expired = uploads.entries().filter(func (_, s) = now - s.lastActivityAt > EXPIRY_WINDOW_NANOS);
    for ((id, _) in expired) {
      uploads.remove(id);
    };
  };

  func notFoundResponse() : AssetTypes.HttpResponse {
    {
      status_code = 404;
      headers = [];
      body = "Not Found".encodeUtf8();
      streaming_strategy = null;
    };
  };

  // Shared handler for both http_request and http_request_update. Serves
  // GET /assets/products/<assetId> publicly with the correct content-type and
  // a long immutable cache-control header. Returns 404 for unknown ids or
  // non-asset paths, and 405 for non-GET methods.
  func handleAssetRequest(req : AssetTypes.HttpRequest) : AssetTypes.HttpResponse {
    if (req.method != "GET") {
      return {
        status_code = 405;
        headers = [];
        body = "Method Not Allowed".encodeUtf8();
        streaming_strategy = null;
      };
    };
    let parts = req.url.split(#text "/").toArray();
    if (parts.size() < 4 or parts[1] != "assets" or parts[2] != "products") {
      return notFoundResponse();
    };
    let assetId = parts[3];
    switch (assets.get(assetId)) {
      case (?asset) {
        let headers = [
          ("Content-Type", asset.contentType),
          ("Content-Length", asset.byteSize.toText()),
          ("Cache-Control", "public, max-age=31536000, immutable"),
        ];
        if (asset.bytes.size() > STREAM_CHUNK) {
          let token : AssetTypes.StreamingCallbackToken = {
            key = assetId;
            content_encoding = "identity";
            index = 0;
            sha256 = null;
          };
          let strategy : AssetTypes.StreamingStrategy = #Callback({
            callback = http_request_streaming_callback;
            token;
          });
          {
            status_code = 200;
            headers;
            body = Blob.empty();
            streaming_strategy = ?strategy;
          };
        } else {
          {
            status_code = 200;
            headers;
            body = asset.bytes;
            streaming_strategy = null;
          };
        };
      };
      case null { notFoundResponse() };
    };
  };

  // Begin a chunked upload. Binds the caller, rejects anonymous and non
  // ADMIN/OWNER callers, validates the content type (rejecting SVG) and the
  // declared total size (2MB max), then creates an UploadSession and returns
  // its id. Also lazily sweeps expired abandoned sessions.
  public shared ({ caller }) func startUpload(contentType : Text, totalSize : Nat) : async Result.Result<Text, AssetTypes.UploadError> {
    switch (authError(caller)) {
      case (?e) { return #err(e) };
      case null {};
    };
    sweepExpiredSessions();
    if (contentType == "image/svg+xml") { return #err(#svgNotAllowed) };
    if (not isValidContentType(contentType)) { return #err(#invalidContentType) };
    if (totalSize > MAX_IMAGE_SIZE) { return #err(#tooLarge) };
    let id = await generateId();
    let now = Time.now();
    let session : AssetTypes.UploadSession = {
      id;
      owner = caller;
      contentType;
      totalSize;
      received = Map.empty();
      createdAt = now;
      lastActivityAt = now;
    };
    uploads.add(id, session);
    #ok(id);
  };

  // Accept one chunk (~1MB) for an in-progress upload. Only the session owner
  // may upload; chunks must arrive in order (index == next expected). Bumps
  // lastActivityAt so the expiry sweep does not reap an active upload.
  public shared ({ caller }) func uploadChunk(uploadId : Text, index : Nat, blob : Blob) : async Result.Result<(), AssetTypes.UploadError> {
    switch (authError(caller)) {
      case (?e) { return #err(e) };
      case null {};
    };
    switch (uploads.get(uploadId)) {
      case null { return #err(#notFound) };
      case (?session) {
        if (session.owner != caller) { return #err(#unauthorized) };
        if (index != session.received.size()) { return #err(#chunkOutOfOrder) };
        var currentSize = 0;
        for ((_, c) in session.received.entries()) {
          currentSize += c.size();
        };
        if (currentSize + blob.size() > session.totalSize) { return #err(#tooLarge) };
        session.received.add(index, blob);
        let updatedSession : AssetTypes.UploadSession = {
          id = session.id;
          owner = session.owner;
          contentType = session.contentType;
          totalSize = session.totalSize;
          received = session.received;
          createdAt = session.createdAt;
          lastActivityAt = Time.now();
        };
        uploads.add(uploadId, updatedSession);
        #ok();
      };
    };
  };

  // Validate the assembled size matches the declared totalSize, verify the
  // magic bytes against the declared content type, enforce the 5-image-per-
  // product cap, then commit the AssetRecord and append its absolute URL
  // (https://<canister-id>.icp0.io/assets/products/<assetId>) to the product's
  // images list. Returns the new asset id.
  public shared ({ caller }) func finishUpload(uploadId : Text, productId : Nat) : async Result.Result<Text, AssetTypes.UploadError> {
    switch (authError(caller)) {
      case (?e) { return #err(e) };
      case null {};
    };
    switch (uploads.get(uploadId)) {
      case null { return #err(#notFound) };
      case (?session) {
        if (session.owner != caller) { return #err(#unauthorized) };
        // Assemble chunks in index order.
        var assembledArr : [Nat8] = [];
        var i = 0;
        while (i < session.received.size()) {
          switch (session.received.get(i)) {
            case (?chunk) { assembledArr := assembledArr.concat(chunk.toArray()) };
            case null { return #err(#chunkOutOfOrder) };
          };
          i += 1;
        };
        let assembled = assembledArr.toBlob();
        if (assembled.size() != session.totalSize) { return #err(#sizeMismatch) };
        switch (products.find(func p = p.id == productId)) {
          case null { return #err(#notFound) };
          case (?product) {
            if (product.images.size() >= MAX_IMAGES_PER_PRODUCT) { return #err(#tooManyImages) };
            if (not magicBytesMatch(session.contentType, assembled)) { return #err(#magicByteMismatch) };
            let assetId = await generateId();
            let now = Time.now();
            let asset : AssetTypes.AssetRecord = {
              id = assetId;
              contentType = session.contentType;
              bytes = assembled;
              byteSize = assembled.size();
              uploadedAt = now;
              productId;
            };
            assets.add(assetId, asset);
            uploads.remove(uploadId);
            let url = assetUrl(assetId);
            let snapshot = products.toArray();
            products.clear();
            for (p in snapshot.values()) {
              if (p.id == productId) {
                products.add({ p with images = p.images.concat([url]) });
              } else {
                products.add(p);
              };
            };
            #ok(assetId);
          };
        };
      };
    };
  };

  // ADMIN/OWNER only. Removes the asset's URL from the owning product's images
  // list AND deletes the stored blob so no orphaned bytes accumulate.
  public shared ({ caller }) func deleteProductImage(assetId : Text) : async Result.Result<(), AssetTypes.UploadError> {
    switch (authError(caller)) {
      case (?e) { return #err(e) };
      case null {};
    };
    switch (assets.get(assetId)) {
      case null { return #err(#notFound) };
      case (?asset) {
        let productId = asset.productId;
        let url = assetUrl(assetId);
        let snapshot = products.toArray();
        products.clear();
        for (p in snapshot.values()) {
          if (p.id == productId) {
            let newImages = p.images.filter(func img = img != url);
            products.add({ p with images = newImages });
          } else {
            products.add(p);
          };
        };
        assets.remove(assetId);
        #ok();
      };
    };
  };

  // Public trigger for the expiry sweep, invoked by the recurring hourly timer
  // registered in main.mo. Removes abandoned upload sessions idle longer than
  // the expiry window so their accumulated chunk storage is freed.
  public func sweepExpiredUploads() : async () {
    sweepExpiredSessions();
  };

  // Aggregate storage accounting for product images (total bytes + count),
  // surfaced in the admin Canister tab.
  public query func getProductImageStorageStats() : async AssetTypes.StorageStats {
    var total = 0;
    var count = 0;
    for ((_, a) in assets.entries()) {
      total += a.byteSize;
      count += 1;
    };
    { totalBytes = total; count };
  };

  // Public HTTP interface serving GET /assets/products/<assetId> with the
  // correct content-type and a long cache-control header
  // (public, max-age=31536000, immutable) since asset ids are immutable.
  public query func http_request(req : AssetTypes.HttpRequest) : async AssetTypes.HttpResponse {
    handleAssetRequest(req);
  };

  // Update variant of the HTTP interface (required alongside http_request for
  // the IC to route asset requests to the canister).
  public query func http_request_update(req : AssetTypes.HttpRequest) : async AssetTypes.HttpResponse {
    handleAssetRequest(req);
  };

  // Streaming callback for large asset bodies that exceed the single-response
  // byte ceiling.
  public query func http_request_streaming_callback(token : AssetTypes.StreamingCallbackToken) : async AssetTypes.StreamingCallbackResponse {
    switch (assets.get(token.key)) {
      case (?asset) {
        let arr = asset.bytes.toArray();
        let start = token.index * STREAM_CHUNK;
        if (start >= arr.size()) {
          { body = Blob.empty(); token = null };
        } else {
          let end = if (start + STREAM_CHUNK > arr.size()) { arr.size() } else { start + STREAM_CHUNK };
          let slice = arr.sliceToArray(start, end).toBlob();
          let nextToken : ?AssetTypes.StreamingCallbackToken = if (end < arr.size()) {
            ?{
              key = token.key;
              content_encoding = token.content_encoding;
              index = token.index + 1;
              sha256 = token.sha256;
            };
          } else {
            null;
          };
          { body = slice; token = nextToken };
        };
      };
      case null { { body = Blob.empty(); token = null } };
    };
  };
};
