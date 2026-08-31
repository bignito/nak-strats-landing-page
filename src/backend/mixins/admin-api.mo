import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import List "mo:core/List";
import Debug "mo:core/Debug";
import Types "../types/admin-access-control";
import AdminLib "../lib/admin-access-control";

mixin (adminUsers : Types.AdminUsers, initialAdminClaimed : Types.InitialAdminClaimed, selfPrincipal : Principal) {
  // Count of principals currently holding the OWNER role. Used to enforce the
  // invariant that at least one OWNER always exists: the last owner cannot be
  // demoted or revoked.
  func countOwners() : Nat {
    var n = 0;
    for ((_, u) in adminUsers.entries()) {
      switch (u.role) {
        case (#owner) { n += 1 };
        case (_) {};
      };
    };
    n;
  };

  // One-time bootstrap: sets the caller as the first OWNER (highest role).
  // Gated on the persistent initialAdminClaimed flag being false (NOT merely
  // on the roles map being empty), so an emptied map can never silently reopen
  // ownership. Rejects the anonymous principal. Sets the flag true on success.
  public shared ({ caller }) func claimInitialAdmin() : async Bool {
    if (caller.isAnonymous()) { return false };
    if (initialAdminClaimed.initialAdminClaimed) { return false };
    adminUsers.add(caller, { role = #owner; grantedAt = Time.now() });
    initialAdminClaimed.initialAdminClaimed := true;
    true;
  };

  // Controller-only live bootstrap: sets `p` as OWNER and marks
  // initialAdminClaimed true WITHOUT ever opening the public claim path. This
  // is the distinct, documented live bootstrap: the deploy pipeline calls it
  // once at publish time with the deployer's principal. Never exposes an open
  // claim on live.
  public shared ({ caller }) func bootstrapOwner(p : Principal) : async Bool {
    if (not (await AdminLib.isController(selfPrincipal, caller))) { return false };
    if (p.isAnonymous()) { return false };
    adminUsers.add(p, { role = #owner; grantedAt = Time.now() });
    initialAdminClaimed.initialAdminClaimed := true;
    true;
  };

  // Public query: reports only the caller's role, or null when unregistered or
  // anonymous. Never reveals other principals.
  public query ({ caller }) func getMyRole() : async ?Types.Role {
    AdminLib.getRole(adminUsers, caller);
  };

  // Public query: returns only the COUNT of principals holding any role, never
  // the principals themselves.
  public query func adminCount() : async Nat {
    AdminLib.count(adminUsers);
  };

  // OWNER/ADMIN only: lists every user (principal + role + grantedAt).
  public shared ({ caller }) func listUsers() : async [(Principal, Types.UserRecord)] {
    AdminLib.requireAdminOrOwner(adminUsers, caller);
    adminUsers.toArray();
  };

  // OWNER/ADMIN only: lists the principals holding OWNER or ADMIN (the "admin"
  // tier). Backward-compatible with the old listAdmins semantics.
  public shared ({ caller }) func listAdmins() : async [Principal] {
    AdminLib.requireAdminOrOwner(adminUsers, caller);
    let admins = List.empty<Principal>();
    for ((p, u) in adminUsers.entries()) {
      switch (u.role) {
        case (#owner) { admins.add(p) };
        case (#admin) { admins.add(p) };
        case (#staff) {};
      };
    };
    admins.toArray();
  };

  // OWNER only for owner-level changes; ADMIN may grant/revoke STAFF only.
  // grantRole(p, #owner) and grantRole(p, #admin) require OWNER; grantRole(p,
  // #staff) requires ADMIN or OWNER. The last owner cannot demote themselves.
  public shared ({ caller }) func grantRole(p : Principal, role : Types.Role) : async Bool {
    if (p.isAnonymous()) { return false };
    switch role {
      case (#owner) { AdminLib.requireOwner(adminUsers, caller) };
      case (#admin) { AdminLib.requireOwner(adminUsers, caller) };
      case (#staff) { AdminLib.requireAdminOrOwner(adminUsers, caller) };
    };
    // The last owner cannot demote themselves (or any owner) below OWNER.
    switch (adminUsers.get(p)) {
      case (?existing) {
        if (existing.role == #owner and role != #owner and countOwners() <= 1) {
          return false;
        };
      };
      case null {};
    };
    adminUsers.add(p, { role; grantedAt = Time.now() });
    true;
  };

  // OWNER only for owner-level changes; ADMIN may revoke STAFF only. The last
  // owner cannot revoke themselves.
  public shared ({ caller }) func revokeRole(p : Principal) : async Bool {
    if (p.isAnonymous()) { return false };
    switch (adminUsers.get(p)) {
      case null { return false };
      case (?existing) {
        switch (existing.role) {
          case (#owner) {
            AdminLib.requireOwner(adminUsers, caller);
            if (countOwners() <= 1) { return false };
          };
          case (#admin) {
            AdminLib.requireOwner(adminUsers, caller);
          };
          case (#staff) {
            AdminLib.requireAdminOrOwner(adminUsers, caller);
          };
        };
      };
    };
    adminUsers.remove(p);
    true;
  };

  // Backward-compatible wrapper: grants the ADMIN role. Requires OWNER (only
  // the owner may create admins). Returns false for the anonymous principal.
  public shared ({ caller }) func addAdmin(p : Principal) : async Bool {
    if (p.isAnonymous()) { return false };
    AdminLib.requireOwner(adminUsers, caller);
    adminUsers.add(p, { role = #admin; grantedAt = Time.now() });
    true;
  };

  // Backward-compatible wrapper: revokes any role. Requires OWNER (only the
  // owner may remove admins). The last owner cannot remove themselves.
  public shared ({ caller }) func removeAdmin(p : Principal) : async Bool {
    if (p.isAnonymous()) { return false };
    AdminLib.requireOwner(adminUsers, caller);
    switch (adminUsers.get(p)) {
      case null { return false };
      case (?existing) {
        if (existing.role == #owner and countOwners() <= 1) {
          return false;
        };
      };
    };
    adminUsers.remove(p);
    true;
  };

  // Public query: reports only on the caller. True when the caller holds OWNER
  // or ADMIN (the "admin" tier); STAFF reports false. Backward-compatible with
  // the old isAdmin semantics.
  public query ({ caller }) func isAdmin() : async Bool {
    AdminLib.isAdminOrOwner(adminUsers, caller);
  };

  // Controller-only: clears the roles map and reopens the one-time claim path
  // (initialAdminClaimed := false). This is the safe mechanism for the DRAFT
  // reset: only the canister's controller (verified against the IC management
  // canister) may invoke it, so an emptied map can never be exploited by a
  // non-controller. The deploy pipeline calls it on the DRAFT only; live never
  // invokes it. Returns false for any non-controller caller.
  public shared ({ caller }) func resetAdminForMigration() : async Bool {
    if (not (await AdminLib.isController(selfPrincipal, caller))) { return false };
    adminUsers.clear();
    initialAdminClaimed.initialAdminClaimed := false;
    true;
  };
};
