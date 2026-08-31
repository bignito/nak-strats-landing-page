import Principal "mo:core/Principal";
import Text "mo:core/Text";
import ManagementCanister "mo:ic-vetkeys/ManagementCanister";
import AdminLib "../lib/admin-access-control";
import AdminTypes "../types/admin-access-control";
import IbeLib "../lib/ibe";

mixin (adminUsers : AdminTypes.AdminUsers, ibeKeyName : Text) {
  // Public: returns the IBE public key for the app's DOMAIN_SEPARATOR so the
  // frontend can IBE-encrypt shipping details to admin principals. Free —
  // vetkd_public_key costs no cycles. An update (not a query) because it makes
  // an inter-canister call to the management canister.
  public shared func getIbePublicKey() : async Blob {
    await ManagementCanister.vetKdPublicKey(null, IbeLib.DOMAIN_SEPARATOR.encodeUtf8(), IbeLib.keyId(ibeKeyName));
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
    await ManagementCanister.vetKdDeriveKey(caller.toBlob(), IbeLib.DOMAIN_SEPARATOR.encodeUtf8(), IbeLib.keyId(ibeKeyName), transportPublicKey);
  };
};