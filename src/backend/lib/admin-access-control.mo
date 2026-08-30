import Set "mo:core/Set";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";

module {
  // The anonymous principal (2vxsx-fae) is never admitted to the allowlist.
  // Every privileged method binds its caller and calls requireAdmin at the top,
  // before any await, so the caller is captured before the method yields.
  public func requireAdmin(allowlist : Set.Set<Principal>, caller : Principal) {
    if (caller == Principal.fromText("2vxsx-fae")) {
      Runtime.trap("anonymous principal is not authorized");
    };
    if (not allowlist.contains(caller)) {
      Runtime.trap("caller is not an admin");
    };
  };

  // Returns true only when `caller` is a non-anonymous member of the allowlist.
  // The anonymous principal is never admitted, so it always reports false.
  public func isAdmin(allowlist : Set.Set<Principal>, caller : Principal) : Bool {
    caller != Principal.fromText("2vxsx-fae") and allowlist.contains(caller)
  };
};
