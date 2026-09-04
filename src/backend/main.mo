import OutCall "mo:caffeineai-http-outcalls/outcall";
import OutCallLocal "lib/outcall";
import RateLimitLib "lib/rate-limit";
import List "mo:core/List";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Timer "mo:core/Timer";
import Time "mo:core/Time";
import Types "types/storefront";
import CryptoTypes "types/crypto-payments";
import RecoveryTypes "types/recovery";
import StorefrontApi "mixins/storefront-api";
import StorefrontLib "lib/storefront";
import CategoriesApi "mixins/categories-api";
import PaymentAdapterApi "mixins/payment-adapter-api";
import CryptoPaymentsApi "mixins/crypto-payments-api";
import CryptoPaymentsLib "lib/crypto-payments";
import PaymentServiceTypes "types/payment-service";
import PaymentServiceApi "mixins/payment-service-api";
import AdminApi "mixins/admin-api";
import AdminTypes "types/admin-access-control";
import RecoveryApi "mixins/recovery-api";
import RecoveryLib "lib/recovery";
import SweepApi "mixins/sweep-api";
import EmailApi "mixins/email-api";
import ConsentApi "mixins/consent-api";
import OQL "mo:caffeineai-oql";
import Expose "mo:caffeineai-oql/Expose";
import ListEntity "mo:caffeineai-oql/ListEntity";
import MapEntity "mo:caffeineai-oql/MapEntity";
import SetEntity "mo:caffeineai-oql/SetEntity";
import ApiDocMixin "mixins/api-doc";
import SubmissionTypes "types/submissions";
import SubmissionsApi "mixins/submissions-api";
import SubmissionsLib "lib/submissions";
import IbeApi "mixins/ibe-api";
import IbeTypes "types/ibe";
import FeaturedVideoApi "mixins/featured-video-api";
import RateLimitTypes "types/rate-limit";
import CancellationTypes "types/cancellation";
import AssetTypes "types/product-assets";
import ProductAssetsApi "mixins/product-assets";
import CycleTypes "types/cycle-monitor";
import CycleMonitorLib "lib/cycle-monitor";
import CycleMonitorApi "mixins/cycle-monitor-api";
import Runtime "mo:core/Runtime";

persistent actor Self {
    func pmToText(m : Types.PaymentMethod) : Text {
      switch m {
        case (#manual) "manual";
        case (#card_stripe) "card_stripe";
        case (#crypto_icp) "crypto_icp";
        case (#crypto_ckusdc) "crypto_ckusdc";
      };
    };

    func psToText(s : Types.PaymentStatus) : Text {
      switch s {
        case (#pending) "pending";
        case (#paid) "paid";
        case (#cancelled) "cancelled";
        case (#expired) "expired";
      };
    };

    func optText(o : ?Text) : Text {
      switch o { case null { "" }; case (?t) { t } };
    };

    func optPrincipalToText(o : ?Principal) : Text {
      switch o { case null { "" }; case (?p) { p.toText() } };
    };

    func categoryRow(c : Types.Category) : OQL.Entity.Row {
      [
        ("id", #nat(c.id)),
        ("slug", #text(c.slug)),
        ("name", #text(c.name)),
        ("description", #text(optText(c.description))),
        ("sort_order", #nat(c.sortOrder)),
        ("active", #bool(c.active)),
        ("show_when_empty", #bool(c.showWhenEmpty)),
        ("created_at", #int(c.created_at)),
        ("updated_at", #int(c.updated_at)),
      ]
    };

    func productRow(p : Types.Product) : OQL.Entity.Row {
      [
        ("id", #nat(p.id)),
        ("name", #text(p.name)),
        ("slug", #text(p.slug)),
        ("description", #text(p.description)),
        ("price", #nat(p.price)),
        ("currency", #text(p.currency)),
        ("images", #text(p.images.values().join(","))),
        ("category", #text(p.category)),
        ("variants", #nat(p.variants.size())),
        ("inventory", #nat(p.inventory)),
        ("active", #bool(p.active)),
        ("admin_only", #bool(p.admin_only)),
        ("created_at", #int(p.created_at)),
        ("updated_at", #int(p.updated_at)),
      ]
    };

    func orderRow(o : Types.Order) : OQL.Entity.Row {
      [
        ("id", #nat(o.id)),
        ("reference", #text(o.reference)),
        ("items", #nat(o.items.size())),
        ("subtotal", #nat(o.subtotal)),
        ("tax", #nat(o.tax)),
        ("shipping", #nat(o.shipping)),
        ("total", #nat(o.total)),
        ("currency", #text(o.currency)),
        ("customer_email", #text(o.customer_email)),
        ("encrypted_shipping", #text(optBlobToText(o.encrypted_shipping))),
        ("has_shipping_details", #bool(o.has_shipping_details)),
        ("payment_method", #text(pmToText(o.payment_method))),
        ("payment_status", #text(psToText(o.payment_status))),
        ("payment_reference", #text(optText(o.payment_reference))),
        ("customer_principal", #text(optPrincipalToText(o.customer_principal))),
        ("sweep_note", #text(optText(o.sweep_note))),
        ("shipping_status", #text(ssToText(o.shipping_status))),
        ("shipped_at", optIntToValue(o.shipped_at)),
        ("tracking_number", #text(optText(o.tracking_number))),
        ("marketing_consent", #bool(o.marketing_consent)),
        ("marketing_consent_at", optIntToValue(o.marketing_consent_at)),
        ("created_at", #int(o.created_at)),
        ("updated_at", #int(o.updated_at)),
      ]
    };

    func tokenToText(t : CryptoTypes.Token) : Text {
      switch t {
        case (#ckUSDC) "ckUSDC";
        case (#ICP) "ICP";
      };
    };

    func cryptoStatusToText(s : CryptoTypes.CryptoPaymentStatus) : Text {
      switch s {
        case (#awaiting_payment) "awaiting_payment";
        case (#paid _) "paid";
        case (#underpayment _) "underpayment";
        case (#overpayment _) "overpayment";
        case (#expired) "expired";
      };
    };

    func optNatToValue(o : ?Nat) : OQL.Value {
      switch o { case null { #null_ }; case (?n) { #nat(n) } };
    };

    func optIntToValue(o : ?Int) : OQL.Value {
      switch o { case null { #null_ }; case (?n) { #int(n) } };
    };

    func ssToText(s : Types.ShippingStatus) : Text {
      switch s {
        case (#pending) "pending";
        case (#shipped) "shipped";
      };
    };

    func optBlobToText(o : ?Blob) : Text {
      switch o { case null { "" }; case (?b) { blobToHex(b) } };
    };

    func hexDigit(n : Nat8) : Text {
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

    func blobToHex(b : Blob) : Text {
      var hex = "";
      for (byte in b.toArray().values()) {
        hex := hex # hexDigit(byte / 16) # hexDigit(byte % 16);
      };
      hex;
    };

    func cryptoPaymentRow(p : CryptoTypes.CryptoPayment) : OQL.Entity.Row {
      [
        ("order_id", #nat(p.orderId)),
        ("reference", #text(p.reference)),
        ("token", #text(tokenToText(p.token))),
        ("amount_due", #nat(p.amountDue)),
        ("subaccount", #text(blobToHex(p.subaccount))),
        ("status", #text(cryptoStatusToText(p.status))),
        ("expires_at", #int(p.expiresAt)),
        ("confirmed_block_index", optNatToValue(p.confirmedBlockIndex)),
        ("created_at", #int(p.createdAt)),
        ("updated_at", #int(p.updatedAt)),
      ]
    };

    func ledgerRow(prefix : Text, l : CryptoTypes.LedgerConfig) : [(Text, OQL.Value)] {
      [
        (prefix # "_canister_id", #text(l.canisterId.toText())),
        (prefix # "_decimals", #nat(l.decimals.toNat())),
        (prefix # "_fee", #nat(l.fee)),
      ]
    };

    func cryptoConfigRow(c : CryptoTypes.CryptoConfig) : OQL.Entity.Row {
      [
        ("treasury_principal", #text(c.treasuryPrincipal.toText())),
        ("treasury_subaccount", #text(optBlobToText(c.treasurySubaccount))),
      ]
      .concat(ledgerRow("ckusdc", c.ckUSDC))
      .concat(ledgerRow("icp", c.icp));
    };

    // Payment service config row. The token is write-only and is NEVER exposed
    // through OQL — only the URL and a boolean "is it set" flag.
    func paymentServiceConfigRow(c : PaymentServiceTypes.PaymentServiceConfig) : OQL.Entity.Row {
      [
        ("url", #text(c.url)),
        ("token_set", #bool(c.token != "")),
      ]
    };

    // Late payment row: a payment received after the deposit window expired,
    // flagged for admin review and never discarded. Private (controller-only).
    func latePaymentRow(lp : RecoveryTypes.LatePayment) : OQL.Entity.Row {
      [
        ("reference", #text(lp.reference)),
        ("token", #text(tokenToText(lp.token))),
        ("received_amount", #nat(lp.receivedAmount)),
        ("expected_amount", #nat(lp.expectedAmount)),
        ("received_at", #int(lp.receivedAt)),
        ("reviewed", #bool(lp.reviewed)),
      ]
    };

    // Admin user row: the principal key and the role record it holds. Private
    // (controller-only). The principal is the map key, so the row function
    // receives the (principal, record) pair from the map entries.
    func adminRow(pair : (Principal, AdminTypes.UserRecord)) : OQL.Entity.Row {
      let (p, u) = pair;
      [
        ("principal", #text(p.toText())),
        ("role", #text(roleToText(u.role))),
        ("granted_at", #int(u.grantedAt)),
      ];
    };

    // Product image asset metadata row. The raw image bytes blob is NEVER
    // exposed through OQL — only the id, content type, byte size, upload
    // timestamp, and owning product id. Private (controller-only).
    func assetRow(a : AssetTypes.AssetRecord) : OQL.Entity.Row {
      [
        ("id", #text(a.id)),
        ("content_type", #text(a.contentType)),
        ("byte_size", #nat(a.byteSize)),
        ("uploaded_at", #int(a.uploadedAt)),
        ("product_id", #nat(a.productId)),
      ]
    };

    func roleToText(r : AdminTypes.Role) : Text {
      switch r {
        case (#owner) "owner";
        case (#admin) "admin";
        case (#staff) "staff";
      };
    };

    // Cycle monitor sample row: one row per metrics sample in the fixed
    // 112-slot ring buffer. Exposes the timestamp, cycle balance, heap/stable
    // memory, and the four cumulative attribution counters. Private
    // (controller-only).
    func cycleSampleRow(s : CycleTypes.CycleSample) : OQL.Entity.Row {
      [
        ("timestamp", #int(s.timestamp)),
        ("cycles_balance", #nat(s.cyclesBalance)),
        ("heap_bytes", #nat(s.heapBytes)),
        ("stable_bytes", #nat(s.stableBytes)),
        ("total_outcalls", #nat(s.totalOutcalls)),
        ("total_ledger_calls", #nat(s.totalLedgerCalls)),
        ("total_vetkd_calls", #nat(s.totalVetkdCalls)),
        ("total_raw_rand_calls", #nat(s.totalRawRandCalls)),
      ]
    };

    // Cycle counter row: a single row exposing the four cumulative
    // attribution counters. Private (controller-only).
    func cycleCounterRow(c : CycleTypes.CycleCountersView) : OQL.Entity.Row {
      [
        ("total_outcalls", #nat(c.totalOutcalls)),
        ("total_ledger_calls", #nat(c.totalLedgerCalls)),
        ("total_vetkd_calls", #nat(c.totalVetkdCalls)),
        ("total_raw_rand_calls", #nat(c.totalRawRandCalls)),
      ]
    };

    public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
        OutCall.transform(input);
    };

    // ---- Public read endpoints (cached + rate limited) ----
    // Each of these triggers an HTTPS outcall on a cache miss. To stop a single
    // page load (or a script) from draining the canister's cycles, they are
    // rate limited per caller principal (10 calls/min, anonymous callers share
    // the anonymous principal) and their responses are cached in stable state so
    // repeated calls within the TTL make no outcall. On outcall failure the last
    // good cached value is served when one exists.

    // Cache TTLs (nanoseconds). getNAKPrice and getDashboardData are volatile
    // market/dashboard data (60s); the token image/profile/treasury endpoints
    // change rarely (300s).
    transient let NAK_PRICE_TTL_NANOS : Int = 60_000_000_000;
    transient let DASHBOARD_TTL_NANOS : Int = 60_000_000_000;
    transient let TOKEN_TTL_NANOS : Int = 300_000_000_000;

    // Read a fresh (within-TTL) cache entry, if any.
    func cacheGet(key : Text, ttlNanos : Int) : ?Text {
      switch (responseCache.get(key)) {
        case (?entry) {
          if (Time.now() - entry.timestamp < ttlNanos) { ?entry.value } else { null };
        };
        case null { null };
      };
    };

    // Read a cache entry regardless of age (used to serve stale data on outcall
    // failure).
    func cacheGetStale(key : Text) : ?Text {
      switch (responseCache.get(key)) {
        case (?entry) { ?entry.value };
        case null { null };
      };
    };

    // Store a response in the cache, refreshing the timestamp.
    func cachePut(key : Text, value : Text) {
      switch (responseCache.get(key)) {
        case (?entry) { entry.value := value; entry.timestamp := Time.now() };
        case null { responseCache.add(key, { var value = value; var timestamp = Time.now() }) };
      };
    };

    public shared ({ caller }) func getNAKPrice() : async Text {
      if (not RateLimitLib.checkRateLimit(publicReadRateLimit, caller, RateLimitLib.PUBLIC_READ_RATE_WINDOW_NANOS, RateLimitLib.PUBLIC_READ_RATE_MAX)) {
        return "{\"error\":\"rate_limited\"}";
      };
      switch (cacheGet("nakPrice", NAK_PRICE_TTL_NANOS)) {
        case (?v) { return v };
        case null {};
      };
      let url = "https://api.dexscreener.com/latest/dex/search?q=NAK/ICP";
      try {
        let result = await OutCallLocal.httpGetRequest(cycleCounters, url, [], transform, 16_384 : Nat64);
        cachePut("nakPrice", result);
        result;
      } catch e {
        switch (cacheGetStale("nakPrice")) {
          case (?v) { v };
          case null { Runtime.trap("outcall failed: " # e.message()) };
        };
      };
    };

    public shared ({ caller }) func getTokenImage(chainId : Text, tokenAddress : Text) : async Text {
      if (not RateLimitLib.checkRateLimit(publicReadRateLimit, caller, RateLimitLib.PUBLIC_READ_RATE_WINDOW_NANOS, RateLimitLib.PUBLIC_READ_RATE_MAX)) {
        return "{\"error\":\"rate_limited\"}";
      };
      let key = "tokenImage:" # chainId # ":" # tokenAddress;
      switch (cacheGet(key, TOKEN_TTL_NANOS)) {
        case (?v) { return v };
        case null {};
      };
      let url = "https://api.dexscreener.com/tokens/v1/" # chainId # "/" # tokenAddress;
      try {
        let result = await OutCallLocal.httpGetRequest(cycleCounters, url, [], transform, 16_384 : Nat64);
        cachePut(key, result);
        result;
      } catch e {
        switch (cacheGetStale(key)) {
          case (?v) { v };
          case null { Runtime.trap("outcall failed: " # e.message()) };
        };
      };
    };

    public shared ({ caller }) func getTokenProfile(chainId : Text, tokenAddress : Text) : async Text {
      if (not RateLimitLib.checkRateLimit(publicReadRateLimit, caller, RateLimitLib.PUBLIC_READ_RATE_WINDOW_NANOS, RateLimitLib.PUBLIC_READ_RATE_MAX)) {
        return "{\"error\":\"rate_limited\"}";
      };
      let key = "tokenProfile:" # chainId # ":" # tokenAddress;
      switch (cacheGet(key, TOKEN_TTL_NANOS)) {
        case (?v) { return v };
        case null {};
      };
      let url = "https://api.dexscreener.com/token-profiles/latest/v1";
      let body = "{ \"chainId\": \"" # chainId # "\", \"tokenAddress\": \"" # tokenAddress # "\" }";
      let headers = [{ name = "Content-Type"; value = "application/json" }];
      try {
        let result = await OutCallLocal.httpPostRequest(cycleCounters, url, headers, body, transform, 32_768 : Nat64);
        cachePut(key, result);
        result;
      } catch e {
        switch (cacheGetStale(key)) {
          case (?v) { v };
          case null { Runtime.trap("outcall failed: " # e.message()) };
        };
      };
    };

    public shared ({ caller }) func getTreasuryTokens() : async Text {
      if (not RateLimitLib.checkRateLimit(publicReadRateLimit, caller, RateLimitLib.PUBLIC_READ_RATE_WINDOW_NANOS, RateLimitLib.PUBLIC_READ_RATE_MAX)) {
        return "{\"error\":\"rate_limited\"}";
      };
      switch (cacheGet("treasuryTokens", TOKEN_TTL_NANOS)) {
        case (?v) { return v };
        case null {};
      };
      let url = "https://r4tak-4iaaa-aaaac-qbw5a-cai.icp0.io/tokens";
      try {
        let result = await OutCallLocal.httpGetRequest(cycleCounters, url, [], transform, 65_536 : Nat64);
        cachePut("treasuryTokens", result);
        result;
      } catch e {
        switch (cacheGetStale("treasuryTokens")) {
          case (?v) { v };
          case null { Runtime.trap("outcall failed: " # e.message()) };
        };
      };
    };

    public shared ({ caller }) func getDashboardData() : async Text {
      if (not RateLimitLib.checkRateLimit(publicReadRateLimit, caller, RateLimitLib.PUBLIC_READ_RATE_WINDOW_NANOS, RateLimitLib.PUBLIC_READ_RATE_MAX)) {
        return "{\"error\":\"rate_limited\"}";
      };
      switch (cacheGet("dashboardData", DASHBOARD_TTL_NANOS)) {
        case (?v) { return v };
        case null {};
      };
      let url = "https://r4tak-4iaaa-aaaac-qbw5a-cai.icp0.io/dashboard";
      try {
        let result = await OutCallLocal.httpGetRequest(cycleCounters, url, [], transform, 65_536 : Nat64);
        cachePut("dashboardData", result);
        result;
      } catch e {
        switch (cacheGetStale("dashboardData")) {
          case (?v) { v };
          case null { Runtime.trap("outcall failed: " # e.message()) };
        };
      };
    };

    // A single cached response for a public read endpoint: the raw Text body
    // plus the time it was fetched (nanoseconds since the Unix epoch). Used to
    // serve repeated frontend calls without re-triggering an HTTPS outcall.
    type ResponseCacheEntry = {
      var value : Text;
      var timestamp : Int;
    };

    // Storefront state (stable, seeded by the migration chain)
    let products : List.List<Types.Product>;
    let orders : List.List<Types.Order>;
    let state : { var nextOrderId : Nat };

    // Crypto payment state (stable, seeded by the migration chain)
    let cryptoPayments : Map.Map<Text, CryptoTypes.CryptoPayment>;
    let cryptoConfig : CryptoTypes.CryptoConfig;

    // Payment service config (stable, seeded by the migration chain). The token
    // is write-only: it is stored here but never returned to any caller.
    let paymentServiceConfig : PaymentServiceTypes.PaymentServiceConfig;

    // Admin users (stable, seeded by the migration chain). Maps a principal to
    // its role record (OWNER/ADMIN/STAFF). Replaces the flat adminAllowlist
    // Set. Starts empty; the first principal claims ownership via
    // claimInitialAdmin().
    let adminUsers : Map.Map<Principal, AdminTypes.UserRecord>;

    // Persistent one-time-claim flag (stable, seeded by the migration chain).
    // Set true on the first successful claimInitialAdmin(). claimInitialAdmin
    // is gated on this flag being false (not merely on the allowlist being
    // empty), so an emptied allowlist can never silently reopen ownership.
    let initialAdminClaimed : { var initialAdminClaimed : Bool };

    // Minimum order total (in integer cents, e.g. 25 for $0.25) required for
    // crypto checkout (stable, seeded by the migration chain, default 25). Crypto
    // orders below this are rejected server-side because they cannot be swept
    // to the treasury after the ledger transfer fee is deducted.
    // Admin-configurable.
    let minimumOrder : { var minimumOrder : Nat };

    // Admin-editable featured YouTube video (stable, seeded by the migration
    // chain, default empty). Holds the raw URL the admin pasted plus the
    // normalized embed URL (https://www.youtube.com/embed/VIDEO_ID). Both are
    // empty strings until an admin sets a video via updateFeaturedVideo().
    let featuredVideo : { var rawUrl : Text; var embedUrl : Text };

    // Runtime icrc1_fee cache (stable, seeded by the migration chain). The
    // sweep queries icrc1_fee on the configured ledger at runtime and caches it
    // briefly rather than hardcoding it; the hardcoded ledger fee is only the
    // initial fallback before the first query.
    let feeCache : CryptoTypes.FeeCache;

    // Late payments received after the deposit window expired, flagged for
    // admin review and never discarded (stable, seeded by the migration chain).
    let latePayments : List.List<RecoveryTypes.LatePayment>;

    // Per-principal submission rate-limit state (stable, seeded by the
    // migration chain). Maps a caller principal to the timestamps of its recent
    // submissions so the canister can reject a burst of submissions from the
    // same principal, complementing the payment service's per-IP limit.
    let rateLimit : SubmissionTypes.RateLimitState;

    // Per-principal rate-limit state for createOrder (stable, seeded by the
    // migration chain). Mirrors the submissions pattern; anonymous callers all
    // share the anonymous principal, so for guests this is a global throttle.
    let orderRateLimit : RateLimitTypes.RateLimitState;

    // Per-principal rate-limit state for the card payment endpoints
    // (createCardCheckoutSession / confirmCardPayment) (stable, seeded by the
    // migration chain). Bounds how many HTTPS outcalls an arbitrary caller can
    // trigger, so a script cannot drain the canister's cycles.
    let checkoutRateLimit : RateLimitTypes.RateLimitState;
    let confirmRateLimit : RateLimitTypes.RateLimitState;

    // Per-principal rate-limit state for unsubscribe attempts (stable, seeded
    // by the migration chain). Protects the unsubscribe token space from
    // brute-force by bounding attempts per caller.
    let unsubscribeRateLimit : RateLimitTypes.RateLimitState;

    // Per-principal rate-limit state for the five public read endpoints
    // (getNAKPrice, getTokenImage, getTokenProfile, getTreasuryTokens,
    // getDashboardData) (stable, seeded by the migration chain). Bounds how many
    // HTTPS outcalls an arbitrary caller can trigger per minute, so a script
    // cannot drain the canister's cycles. Anonymous callers all share the
    // anonymous principal, so for them this is a global cap.
    let publicReadRateLimit : RateLimitTypes.RateLimitState;

    // Stable response cache for the five public read endpoints (stable, seeded
    // by the migration chain). Maps an endpoint key (including any parameters)
    // to the last fetched body and timestamp, so repeated frontend calls within
    // the TTL make no outcall. Survives upgrades.
    let responseCache : Map.Map<Text, ResponseCacheEntry>;

    // Permanent cache for the IBE public key (stable, seeded by the migration
    // chain). The vetKD IBE public key is a constant for a given key name +
    // derivation path, so it is fetched once and cached forever (survives
    // upgrades). Never expired on a timer. Stores the key together with the key
    // name and derivation path it was derived from, so a change to either
    // invalidates the cache and triggers a fresh fetch.
    let ibePublicKeyCache : IbeTypes.IbePublicKeyCache;

    // Per-principal rate-limit state for getIbePublicKey (stable, seeded by the
    // migration chain). 10 calls per caller per 60 seconds. Belt-and-braces —
    // the permanent cache means this is almost never reached.
    let ibeRateLimit : RateLimitTypes.RateLimitState;

    // Per-principal rate-limit state for checkCryptoPayment (stable, seeded by
    // the migration chain). 10 calls per caller per 60 seconds, applied FIRST
    // before any ledger work so an arbitrary caller cannot loop the endpoint
    // and force ledger calls.
    let cryptoCheckRateLimit : RateLimitTypes.RateLimitState;

    // Short-lived per-reference cache for checkCryptoPayment results (stable,
    // seeded by the migration chain). 15s TTL; collapses a client polling every
    // few seconds into one ledger call per 15 seconds. Entries are deleted when
    // a payment reaches #paid or #expired so the map cannot grow forever.
    let cryptoCheckCache : Map.Map<Text, CryptoTypes.CryptoCheckCacheEntry>;

    // Short-lived cancellation tokens keyed by order reference (stable, seeded
    // by the migration chain). Issued to the browser session that created an
    // anonymous guest order; required for guest self-cancellation so a leaked
    // order reference alone never confers the power to cancel.
    let cancelTokens : Map.Map<Text, CancellationTypes.CancellationToken>;

    // Browser-scoped session identifiers for anonymous guest checkout (stable,
    // seeded by the migration chain). Maps a session id to the list of order
    // references created by that browser session. The per-session pending-order
    // cap is scoped to this identifier, so one guest's abandoned carts never
    // block another guest. Non-pending references are pruned during counting.
    let sessionOrders : Map.Map<Text, List.List<Text>>;

    // Admin-configurable pending-order ceiling (stable, seeded by the migration
    // chain). The globalCap is the catastrophic-abuse backstop on concurrent
    // pending orders across all callers and sessions; the per-session cap is a
    // compile-time constant (PENDING_ORDER_CAP in lib/rate-limit.mo).
    let pendingOrderConfig : RateLimitTypes.PendingOrderConfig;

    // Product image assets stored in canister stable state (stable, seeded by
    // the migration chain). Maps an immutable asset id to the stored blob and
    // its metadata. Served publicly over the canister's HTTP interface at
    // /assets/products/<assetId>.
    let assets : Map.Map<AssetTypes.AssetId, AssetTypes.AssetRecord>;

    // In-progress chunked upload sessions (stable, seeded by the migration
    // chain). Maps an upload id to the accumulating chunks and metadata.
    // Abandoned sessions are swept after the expiry window.
    let uploads : Map.Map<Text, AssetTypes.UploadSession>;

    // Product categories (stable, seeded by the migration chain). Product.category
    // stores the category SLUG; renaming a category only mutates this record and
    // never rewrites Product or Order records.
    let categories : List.List<Types.Category>;

    // Cycle burn-rate monitor state (stable, seeded by the migration chain).
    // A fixed 112-slot ring buffer of metrics samples (14 days at 3-hour
    // intervals). Each sample is a local-reads-only snapshot of the cycle
    // balance, heap/stable memory, and the four attribution counters. When
    // full, the oldest sample is overwritten; it never grows beyond 112.
    let cycleMetrics : CycleTypes.CycleMetricsState;

    // Monotonic cumulative attribution counters (stable, seeded by the
    // migration chain). Incremented in place at their call sites (outcall
    // wrapper, ledger calls, vetKD calls, raw_rand). Never reset; each sample
    // snapshots their current values so the delta between two samples shows
    // how many of each happened in that window.
    let cycleCounters : CycleTypes.CycleCounters;

    // Payment adapter (transient — recreated on restart, not persisted)
    transient let selfPrincipal = Principal.fromActor(Self);
    transient let paymentAdapter = CryptoPaymentsLib.cryptoAdapter(orders, products, cryptoPayments, cryptoConfig);

    // The vetKD key name for IBE derivation, read from the VETKD_KEY_NAME
    // canister environment variable (default "test_key_1"). Read transiently at
    // every (re)start because a migration module cannot call
    // Runtime.envVar<system>; the value is captured into the key id used for
    // every derivation. Changing VETKD_KEY_NAME on a later upgrade has no
    // effect on already-derived keys.
    transient let ibeKeyName = Runtime.envVar<system>("VETKD_KEY_NAME") ?? "test_key_1";

    // Verification timer handle (transient — a timer id is not stable state and
    // is recreated on restart). Registered/cancelled via the recovery API.
    transient let timerState = { var timerId = null : ?Timer.TimerId };

    // Auto-register the recurring payment-verification timer on every (re)start.
    // Transient fields are re-initialized on canister init AND post-upgrade, and
    // timers are not persisted across upgrades, so this re-registers the timer
    // after every upgrade. Verification therefore runs independent of the
    // browser tab even if no admin ever calls startVerificationTimer.
    transient let _verificationTimer = do {
      let id = Timer.recurringTimer<system>(#seconds(30), func() : async () {
        ignore (await RecoveryLib.runVerificationPass(cycleCounters, cryptoPayments, orders, products, latePayments, cryptoConfig, selfPrincipal, feeCache, paymentServiceConfig, emailTransform, cryptoCheckCache));
      });
      timerState.timerId := ?id;
      id
    };

    // Auto-register the recurring hourly upload-expiry timer on every (re)start.
    // Transient fields are re-initialized on canister init AND post-upgrade, and
    // timers are not persisted across upgrades, so this re-registers the timer
    // after every upgrade. It sweeps abandoned partial upload sessions (idle
    // longer than the expiry window) so their accumulated chunk storage is
    // freed and does not occupy canister storage indefinitely.
    transient let _assetExpiryTimer = do {
      let id = Timer.recurringTimer<system>(#seconds(3600), func() : async () {
        ignore (await sweepExpiredUploads());
        // Prune the per-principal rate-limit maps so they never grow with dead
        // entries: remove any principal whose timestamps are all older than the
        // rate-limit window. This keeps stable memory bounded — storage is
        // billed continuously, so an unbounded per-principal map would cost
        // forever.
        RateLimitLib.pruneRateLimit(orderRateLimit, RateLimitLib.ORDER_RATE_WINDOW_NANOS);
        RateLimitLib.pruneRateLimit(checkoutRateLimit, RateLimitLib.CARD_RATE_WINDOW_NANOS);
        RateLimitLib.pruneRateLimit(confirmRateLimit, RateLimitLib.CARD_RATE_WINDOW_NANOS);
        RateLimitLib.pruneRateLimit(unsubscribeRateLimit, RateLimitLib.UNSUBSCRIBE_RATE_WINDOW_NANOS);
        RateLimitLib.pruneRateLimit(publicReadRateLimit, RateLimitLib.PUBLIC_READ_RATE_WINDOW_NANOS);
        RateLimitLib.pruneRateLimit(ibeRateLimit, RateLimitLib.PUBLIC_READ_RATE_WINDOW_NANOS);
        RateLimitLib.pruneRateLimit(cryptoCheckRateLimit, RateLimitLib.PUBLIC_READ_RATE_WINDOW_NANOS);
        SubmissionsLib.pruneRateLimit(rateLimit);
        // Cycle monitor sample check: piggyback on this existing hourly tick.
        // Record a metrics sample only when at least 3 hours (SAMPLE_INTERVAL_NS)
        // have elapsed since the last one; otherwise do nothing. No new timer,
        // no extra wakeups — the monitor costs zero additional scheduling.
        switch (CycleMonitorLib.lastSampleTimestamp(cycleMetrics)) {
          case (?last) {
            if (Time.now() - last >= CycleMonitorLib.SAMPLE_INTERVAL_NS) {
              CycleMonitorLib.recordSample(cycleMetrics, cycleCounters);
            };
          };
          case null {
            CycleMonitorLib.recordSample(cycleMetrics, cycleCounters);
          };
        };
      });
      id
    };

    // Auto-register the recurring reservation-sweep timer on every (re)start.
    // Transient fields are re-initialized on canister init AND post-upgrade, and
    // timers are not persisted across upgrades, so this re-registers the timer
    // after every upgrade. It releases expired pending CARD and MANUAL
    // reservations (restoring inventory and marking them #expired) promptly
    // rather than only lazily on the next order attempt, so abandoned carts
    // clear quickly and never accumulate into a self-inflicted outage.
    transient let _reservationSweepTimer = do {
      let id = Timer.recurringTimer<system>(#seconds(60), func() : async () {
        ignore (StorefrontLib.releaseExpiredReservations(orders, products));
      });
      id
    };

    include EmailApi(paymentServiceConfig, orders, adminUsers, cycleCounters);
    include ConsentApi(paymentServiceConfig, adminUsers, unsubscribeRateLimit, cycleCounters);
    include SweepApi(cryptoConfig, selfPrincipal, adminUsers, feeCache, cycleCounters);
    include StorefrontApi(products, orders, state, paymentAdapter, adminUsers, minimumOrder, paymentServiceConfig, emailTransform, orderRateLimit, cancelTokens, assets, selfPrincipal, sessionOrders, pendingOrderConfig, cycleCounters);
    include CategoriesApi(categories, products, adminUsers);
    include ProductAssetsApi(assets, uploads, adminUsers, products, selfPrincipal, cycleCounters);
    include PaymentAdapterApi(paymentAdapter);
    include CryptoPaymentsApi(orders, products, cryptoPayments, cryptoConfig, selfPrincipal, adminUsers, minimumOrder, feeCache, cryptoCheckRateLimit, cryptoCheckCache, cycleCounters);
    include PaymentServiceApi(paymentServiceConfig, orders, products, adminUsers, checkoutRateLimit, confirmRateLimit, cancelTokens, cycleCounters);
    include AdminApi(adminUsers, initialAdminClaimed, selfPrincipal);
    include FeaturedVideoApi(featuredVideo, adminUsers);
    include IbeApi(adminUsers, ibeKeyName, ibePublicKeyCache, ibeRateLimit, cycleCounters);
    include RecoveryApi(orders, products, cryptoPayments, cryptoConfig, selfPrincipal, adminUsers, feeCache, latePayments, timerState, paymentServiceConfig, emailTransform, cryptoCheckCache, cycleCounters);
    include SubmissionsApi(cycleCounters, paymentServiceConfig, adminUsers, rateLimit);
    include CycleMonitorApi(cycleMetrics, cycleCounters, adminUsers);

    // OQL — expose persisted storefront data as queryable entities.
    // Products are a public catalogue; orders are private (controller-only).
    transient let productEntity = OQL.Entity.build(OQL.Entity.public_(OQL.Entity.sample(
      products.toEntity("product", "Product", "id", productRow),
      {
        id = 0;
        name = "";
        slug = "";
        description = "";
        price = 0;
        currency = "";
        images = [];
        category = "";
        variants = [];
        inventory = 0;
        active = true;
        admin_only = false;
        created_at = 0 : Int;
        updated_at = 0 : Int;
      }
    )));
    // Categories are a public catalogue: the shop derives its filter chips and
    // section headings from listCategories(), and the category rows are exposed
    // publicly so the same data is queryable through OQL.
    transient let categoryEntity = OQL.Entity.build(OQL.Entity.public_(OQL.Entity.sample(
      categories.toEntity("category", "Category", "id", categoryRow),
      {
        id = 0;
        slug = "";
        name = "";
        description = null : ?Text;
        sortOrder = 0;
        active = true;
        showWhenEmpty = false;
        created_at = 0 : Int;
        updated_at = 0 : Int;
      }
    )));
    transient let orderEntity = OQL.Entity.build(OQL.Entity.controllerOnly(OQL.Entity.sample(
      orders.toEntity("order", "Order", "id", orderRow),
      {
        id = 0;
        reference = "";
        items = [];
        subtotal = 0;
        tax = 0;
        shipping = 0;
        total = 0;
        currency = "";
        customer_email = "";
        encrypted_shipping = null : ?Blob;
        has_shipping_details = false;
        payment_method = #manual;
        payment_status = #pending;
        payment_reference = null : ?Text;
        customer_principal = null : ?Principal;
        sweep_note = null : ?Text;
        shipping_status = #pending;
        shipped_at = null : ?Int;
        tracking_number = null : ?Text;
        marketing_consent = false;
        marketing_consent_at = null : ?Int;
        created_at = 0 : Int;
        updated_at = 0 : Int;
      }
    )));
    // Crypto payment records are private (controller-only): they carry the
    // per-order subaccount, amount due, and payment status.
    transient let cryptoPaymentEntity = OQL.Entity.build(OQL.Entity.controllerOnly(OQL.Entity.sample(
      cryptoPayments.toEntity("cryptoPayment", "CryptoPayment", "reference", cryptoPaymentRow),
      {
        orderId = 0;
        reference = "";
        token = #ckUSDC;
        amountDue = 0;
        subaccount = "\00" : Blob;
        status = #awaiting_payment;
        expiresAt = 0 : Int;
        confirmedBlockIndex = null : ?Nat;
        createdAt = 0 : Int;
        updatedAt = 0 : Int;
      }
    )));
    // The crypto configuration (treasury destination + ledger configs) is a
    // single private row, controller-only.
    transient let cryptoConfigEntity = OQL.Entity.build(OQL.Entity.controllerOnly(OQL.Entity.sample(
      OQL.Entity.new<CryptoTypes.CryptoConfig>(
        "cryptoConfig",
        func () = [cryptoConfig].values(),
        "CryptoConfig",
        "treasury_principal",
        cryptoConfigRow,
      ),
      {
        var treasuryPrincipal = Principal.fromText("aaaaa-aa");
        var treasurySubaccount = null : ?Blob;
        var ckUSDC = { canisterId = Principal.fromText("aaaaa-aa"); decimals = 6 : Nat8; fee = 10_000 };
        var icp = { canisterId = Principal.fromText("aaaaa-aa"); decimals = 8 : Nat8; fee = 10_000 };
      }
    )));
    // The payment service configuration (URL + write-only token flag) is a
    // single private row, controller-only. The token value itself is never
    // exposed — only the URL and whether the token is set.
    transient let paymentServiceConfigEntity = OQL.Entity.build(OQL.Entity.controllerOnly(OQL.Entity.sample(
      OQL.Entity.new<PaymentServiceTypes.PaymentServiceConfig>(
        "paymentServiceConfig",
        func () = [paymentServiceConfig].values(),
        "PaymentServiceConfig",
        "url",
        paymentServiceConfigRow,
      ),
      {
        var url = "";
        var token = "";
      }
    )));
    // Late payments are private (controller-only): they carry the reference,
    // token, received/expected amounts, and review flag for admin recovery.
    transient let latePaymentEntity = OQL.Entity.build(OQL.Entity.controllerOnly(OQL.Entity.sample(
      latePayments.toEntity("latePayment", "LatePayment", "reference", latePaymentRow),
      {
        reference = "";
        token = #ckUSDC;
        receivedAmount = 0;
        expectedAmount = 0;
        receivedAt = 0 : Int;
        reviewed = false;
      }
    )));
    // The admin users map is private (controller-only): it lists the principals
    // holding a role and their role. It is never exposed to end users through
    // OQL.
    transient let adminEntity = OQL.Entity.build(OQL.Entity.controllerOnly(OQL.Entity.sample(
      OQL.Entity.new<(Principal, AdminTypes.UserRecord)>(
        "admin",
        func () = adminUsers.entries(),
        "Admin",
        "principal",
        adminRow,
      ),
      (Principal.fromText("aaaaa-aa"), { role = #staff; grantedAt = 0 : Int; })
    )));
    // Product image asset metadata is private (controller-only): each row
    // exposes the asset id, content type, byte size, upload timestamp, and
    // owning product id. The raw image bytes blob is NEVER exposed through OQL.
    transient let assetEntity = OQL.Entity.build(OQL.Entity.controllerOnly(OQL.Entity.sample(
      assets.toEntity("asset", "Asset", "id", assetRow),
      {
        id = "";
        contentType = "";
        bytes = "\00" : Blob;
        byteSize = 0;
        uploadedAt = 0 : Int;
        productId = 0;
      }
    )));
    // Cycle monitor samples are private (controller-only): each row is one
    // metrics sample from the fixed 112-slot ring buffer (timestamp, cycle
    // balance, heap/stable memory, and the four cumulative counters).
    transient let cycleSampleEntity = OQL.Entity.build(OQL.Entity.controllerOnly(OQL.Entity.sample(
      OQL.Entity.new<CycleTypes.CycleSample>(
        "cycleSample",
        func () = CycleMonitorLib.getSamples(cycleMetrics).values(),
        "CycleSample",
        "timestamp",
        cycleSampleRow,
      ),
      {
        timestamp = 0 : Int;
        cyclesBalance = 0;
        heapBytes = 0;
        stableBytes = 0;
        totalOutcalls = 0;
        totalLedgerCalls = 0;
        totalVetkdCalls = 0;
        totalRawRandCalls = 0;
      }
    )));
    // The cycle attribution counters are private (controller-only): a single
    // row exposing the four cumulative counters (outcalls, ledger, vetKD,
    // raw_rand) since deploy.
    transient let cycleCounterEntity = OQL.Entity.build(OQL.Entity.controllerOnly(OQL.Entity.sample(
      OQL.Entity.new<CycleTypes.CycleCountersView>(
        "cycleCounter",
        func () = [{
          totalOutcalls = cycleCounters.totalOutcalls;
          totalLedgerCalls = cycleCounters.totalLedgerCalls;
          totalVetkdCalls = cycleCounters.totalVetkdCalls;
          totalRawRandCalls = cycleCounters.totalRawRandCalls;
        }].values(),
        "CycleCounter",
        "total_outcalls",
        cycleCounterRow,
      ),
      {
        totalOutcalls = 0;
        totalLedgerCalls = 0;
        totalVetkdCalls = 0;
        totalRawRandCalls = 0;
      }
    )));
    include Expose({
      entities = [productEntity, categoryEntity, orderEntity, cryptoPaymentEntity, cryptoConfigEntity, paymentServiceConfigEntity, latePaymentEntity, adminEntity, assetEntity, cycleSampleEntity, cycleCounterEntity];
    });

    include ApiDocMixin();
};
