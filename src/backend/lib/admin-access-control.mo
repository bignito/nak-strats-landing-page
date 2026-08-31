import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Types "../types/admin-access-control";

module {
  // Shared authorization helpers. Every privileged method binds msg.caller at
  // the top of the function (before any await), rejects the anonymous
  // principal explicitly, and checks the required role, trapping with a clear
  // message. Role ordering: STAFF < ADMIN < OWNER.

  // Numeric rank of a role, used to compare "at least this role" requirements.
  // STAFF = 0, ADMIN = 1, OWNER = 2.
  func roleRank(r : Types.Role) : Nat {
    switch r {
      case (#staff) 0;
      case (#admin) 1;
      case (#owner) 2;
    };
  };

  // Rejects the anonymous principal explicitly. Every privileged method calls
  // this before any role check so an unauthenticated caller can never pass a
  // role guard.
  func rejectAnonymous(caller : Principal) {
    if (caller.isAnonymous()) {
      Runtime.trap("Anonymous principal is not authorized");
    };
  };

  // Requires the caller to hold at least the given role. Traps for the
  // anonymous principal and for a caller whose role is below the requirement.
  public func requireRole(users : Types.AdminUsers, caller : Principal, role : Types.Role) {
    rejectAnonymous(caller);
    switch (users.get(caller)) {
      case (?u) {
        if (roleRank(u.role) < roleRank(role)) {
          Runtime.trap("Insufficient role for this operation");
        };
      };
      case null { Runtime.trap("Caller is not registered") };
    };
  };

  // Requires the caller to be ADMIN or OWNER. Used by financial and
  // configuration methods (sweep, treasury config, payment service config,
  // price changes). STAFF is never admitted.
  public func requireAdminOrOwner(users : Types.AdminUsers, caller : Principal) {
    requireRole(users, caller, #admin);
  };

  // Requires the caller to be OWNER. Used by owner-level changes (grant/revoke
  // owner or admin roles, manage owners).
  public func requireOwner(users : Types.AdminUsers, caller : Principal) {
    requireRole(users, caller, #owner);
  };

  // Requires the caller to be STAFF or above. Used by fulfilment methods
  // (view orders/shipping, mark shipped, add tracking).
  public func requireStaffOrAbove(users : Types.AdminUsers, caller : Principal) {
    requireRole(users, caller, #staff);
  };

  // Returns the caller's role, or null when the caller is unregistered or
  // anonymous. Never reveals other principals.
  public func getRole(users : Types.AdminUsers, caller : Principal) : ?Types.Role {
    if (caller.isAnonymous()) { return null };
    switch (users.get(caller)) {
      case (?u) { ?u.role };
      case null { null };
    };
  };

  // Count of principals holding any role. Never returns the principals.
  public func count(users : Types.AdminUsers) : Nat {
    users.size();
  };

  // True when the caller holds any role and is non-anonymous.
  public func isUser(users : Types.AdminUsers, caller : Principal) : Bool {
    if (caller.isAnonymous()) { return false };
    switch (users.get(caller)) {
      case (?_) { true };
      case null { false };
    };
  };

  // True when the caller holds OWNER or ADMIN (the "admin" tier). STAFF is
  // false. Backward-compatible with the old isAdmin semantics.
  public func isAdminOrOwner(users : Types.AdminUsers, caller : Principal) : Bool {
    if (caller.isAnonymous()) { return false };
    switch (users.get(caller)) {
      case (?u) {
        switch (u.role) {
          case (#admin) true;
          case (#owner) true;
          case (#staff) false;
        };
      };
      case null { false };
    };
  };

  // The subset of the IC management canister (aaaaa-aa) interface needed to
  // read this canister's controllers. get_canister_info is a query call that
  // ANY canister may make on ANY other canister, so it is a reliable,
  // authoritative source for the controller list.
  public type ManagementCanister = actor {
    get_canister_info : ({ canister_id : Principal; num_requested_changes : ?Nat64 }) -> async ({ controllers : [Principal] });
  };

  // Returns true only when `caller` is one of this canister's controllers, as
  // reported by the IC management canister. Used to gate the controller-only
  // admin reset path (resetAdminForMigration).
  public func isController(selfPrincipal : Principal, caller : Principal) : async Bool {
    let mgmt : ManagementCanister = actor ("aaaaa-aa");
    let info = await mgmt.get_canister_info({ canister_id = selfPrincipal; num_requested_changes = null });
    info.controllers.contains(caller);
  };
};
