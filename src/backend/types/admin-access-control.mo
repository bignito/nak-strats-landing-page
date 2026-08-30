import Set "mo:core/Set";
import Principal "mo:core/Principal";

module {
  // The admin allowlist: a Set of Principal stored in stable state that
  // survives canister upgrades. Membership is enforced by requireAdmin.
  public type AdminAllowlist = Set.Set<Principal>;
};
