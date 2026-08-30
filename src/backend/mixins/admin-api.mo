import Set "mo:core/Set";
import Principal "mo:core/Principal";
import AdminLib "../lib/admin-access-control";

mixin (adminAllowlist : Set.Set<Principal>) {
  // One-time bootstrap: sets the caller as the first admin, callable only
  // while the allowlist is empty. Permanently dead once an admin exists.
  // Rejects the anonymous principal.
  public shared ({ caller }) func claimInitialAdmin() : async Bool {
    if (caller == Principal.fromText("2vxsx-fae")) {
      return false;
    };
    if (adminAllowlist.size() > 0) {
      return false;
    };
    adminAllowlist.add(caller);
    true
  };

  // Admin-only: adds a principal to the admin allowlist.
  public shared ({ caller }) func addAdmin(p : Principal) : async Bool {
    AdminLib.requireAdmin(adminAllowlist, caller);
    if (p == Principal.fromText("2vxsx-fae")) {
      return false;
    };
    adminAllowlist.add(p);
    true
  };

  // Admin-only: removes a principal from the allowlist. The last remaining
  // admin cannot remove themselves, so the allowlist can never become empty.
  public shared ({ caller }) func removeAdmin(p : Principal) : async Bool {
    AdminLib.requireAdmin(adminAllowlist, caller);
    // Never allow the allowlist to become empty: the last admin cannot remove
    // themselves (or anyone, since they are the only member).
    if (adminAllowlist.size() <= 1) {
      return false;
    };
    adminAllowlist.remove(p);
    true
  };

  // Admin-only: lists all admin principals.
  public shared ({ caller }) func listAdmins() : async [Principal] {
    AdminLib.requireAdmin(adminAllowlist, caller);
    adminAllowlist.toArray()
  };

  // Public query: reports only on the caller.
  public query ({ caller }) func isAdmin() : async Bool {
    AdminLib.isAdmin(adminAllowlist, caller)
  };
};
