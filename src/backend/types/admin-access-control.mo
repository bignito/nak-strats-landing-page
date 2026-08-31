import Map "mo:core/Map";
import Principal "mo:core/Principal";

module {
  // The role a principal holds in the admin system. Ordering (lowest to
  // highest): STAFF < ADMIN < OWNER.
  public type Role = {
    // Full access. Manages owners/admins/staff and roles, and can do everything
    // ADMIN and STAFF can. There must always be at least one OWNER; the last
    // owner cannot remove or demote themselves.
    #owner;
    // Everything except managing owners. Can manage products, settings,
    // treasury config, sweeps, and view/fulfil orders.
    #admin;
    // Fulfilment only. Can view orders and shipping details, mark orders
    // shipped, and add tracking numbers. CANNOT change prices, treasury
    // config, payment settings, sweep funds, or manage users.
    #staff;
  };

  // A user's role record. The principal is the map key; the record holds the
  // role and the timestamp (ns since the Unix epoch) at which the role was
  // granted.
  public type UserRecord = {
    role : Role;
    grantedAt : Int;
  };

  // Stable state: maps a principal to its role record. Replaces the flat
  // adminAllowlist Set. This is the single source of truth for authorization.
  public type AdminUsers = Map.Map<Principal, UserRecord>;

  // Persistent one-time-claim flag. Set true on the first successful
  // claimInitialAdmin(); gates the claim path so an emptied roles map can never
  // silently reopen ownership. Carried forward by every migration.
  public type InitialAdminClaimed = { var initialAdminClaimed : Bool };
};
