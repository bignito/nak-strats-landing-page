import Principal "mo:core/Principal";
import Text "mo:core/Text";
import List "mo:core/List";
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
    await ManagementCanister.vetKdDeriveKey(caller.toBlob(), IbeLib.DOMAIN_SEPARATOR.encodeUtf8(), IbeLib.keyId(ibeKeyName), transportPublicKey);
  };
};