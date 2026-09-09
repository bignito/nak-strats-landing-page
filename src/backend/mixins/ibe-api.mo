import Principal "mo:core/Principal";
import Text "mo:core/Text";
import List "mo:core/List";
import Runtime "mo:core/Runtime";
import ManagementCanister "mo:ic-vetkeys/ManagementCanister";
import AdminLib "../lib/admin-access-control";
import AdminTypes "../types/admin-access-control";
import IbeLib "../lib/ibe";
import IbeTypes "../types/ibe";
import RateLimitLib "../lib/rate-limit";
import RateLimitTypes "../types/rate-limit";
import CycleCountersLib "../lib/cycle-counters";
import CycleTypes "../types/cycle-monitor";

mixin (
  adminUsers : AdminTypes.AdminUsers,
  ibeKeyName : Text,
  ibePublicKeyCache : IbeTypes.IbePublicKeyCache,
  ibeRateLimit : RateLimitTypes.RateLimitState,
  cycleCounters : CycleTypes.CycleCounters,
) {
  // Public: returns the IBE public key for the app's DOMAIN_SEPARATOR so the
  // frontend can IBE-encrypt shipping details to admin principals. The vetKD
  // IBE public key is a CONSTANT for a given key name + derivation path, so it
  // is fetched once and cached forever (survives upgrades). The cache is
  // consulted FIRST: a cached hit (a cached key exists AND its stored key name
  // and derivation path match the current ones) returns immediately with NO
  // vetKD call and WITHOUT consuming rate-limit budget. The rate limit applies
  // only to cache misses, which are the calls that actually reach the
  // management canister. An update (not a query) because it makes an
  // inter-canister call to the management canister on a cache miss. Rate
  // limited per caller principal (10 calls per 60 seconds) as belt-and-braces;
  // the cache means this is almost never reached. A Blob return cannot carry a
  // Result error, so an over-limit caller traps.
  public shared ({ caller }) func getIbePublicKey() : async Blob {
    let derivationPath = IbeLib.DOMAIN_SEPARATOR.encodeUtf8();
    // Permanent cache: on a hit (a cached key exists AND its stored key name
    // and derivation path match the current ones) return it immediately with
    // NO vetKD call and NO rate-limit check — cached reads never consume
    // rate-limit budget.
    switch (ibePublicKeyCache.cachedKey) {
      case (?key) {
        if (ibePublicKeyCache.cachedKeyName == ibeKeyName and ibePublicKeyCache.cachedDerivationPath == derivationPath) {
          return key;
        };
      };
      case null {};
    };
    // Miss (empty cache, or key name / derivation path changed): the rate
    // limit guards only this vetKD path, so it is checked here, before the
    // expensive management-canister call.
    if (not RateLimitLib.checkRateLimit(ibeRateLimit, caller, RateLimitLib.PUBLIC_READ_RATE_WINDOW_NANOS, RateLimitLib.PUBLIC_READ_RATE_MAX)) {
      Runtime.trap("rate_limited");
    };
    // Fetch the key once and cache it forever with its key name and derivation
    // path. On a vetKD failure the cache is left empty so the next call
    // retries.
    CycleCountersLib.incVetkdCalls(cycleCounters);
    let key = await ManagementCanister.vetKdPublicKey(null, derivationPath, IbeLib.keyId(ibeKeyName));
    ibePublicKeyCache.cachedKey := ?key;
    ibePublicKeyCache.cachedKeyName := ibeKeyName;
    ibePublicKeyCache.cachedDerivationPath := derivationPath;
    key;
  };

  // Public query: returns the principals that shipping details should be
  // IBE-encrypted to — those holding OWNER or ADMIN (the fulfilment tier).
  // Callable by anyone, including the anonymous principal: these are public
  // encryption targets, and knowing them does not enable decryption (key
  // derivation stays gated via getMyEncryptedIbeKey). Returns principals only
  // — never roles, grant timestamps, or any other user metadata. A query (no
  // inter-canister calls) so it is cheap and callable by guests.
  public query func getEncryptionRecipients() : async [Principal] {
    let recipients = List.empty<Principal>();
    for ((p, u) in adminUsers.entries()) {
      switch (u.role) {
        case (#owner) { recipients.add(p) };
        case (#admin) { recipients.add(p) };
        case (#staff) {};
      };
    };
    recipients.toArray();
  };

  // Admin-only: derives the caller's encrypted IBE vetKey. Binds the caller at
  // the top, rejects the anonymous principal, and traps for a caller that is
  // not a non-anonymous member of the admin allowlist. The derivation input is
  // the caller's own principal; the returned blob is the ENCRYPTED vetKey —
  // the canister never sees or decrypts the raw key. Costs cycles
  // (vetkd_derive_key: 26,153,846,153 for key_1 / 10,000,000,000 for
  // test_key_1; the Motoko helper attaches the amount, excess refunded).
  public shared ({ caller }) func getMyEncryptedIbeKey(transportPublicKey : Blob) : async Blob {
    AdminLib.requireStaffOrAbove(adminUsers, caller);
    CycleCountersLib.incVetkdCalls(cycleCounters);
    await ManagementCanister.vetKdDeriveKey(caller.toBlob(), IbeLib.DOMAIN_SEPARATOR.encodeUtf8(), IbeLib.keyId(ibeKeyName), transportPublicKey);
  };
};
