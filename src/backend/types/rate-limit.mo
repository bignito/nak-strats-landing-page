import Map "mo:core/Map";
import Principal "mo:core/Principal";

module {
  // Generic per-principal rate-limit state. Maps a caller principal to the
  // timestamps of its recent calls so the canister can reject a burst from the
  // same principal. The canister cannot see client IPs, so this complements the
  // payment service's per-IP limit (the payment service sees the real client IP
  // and applies its own per-IP throttle). Anonymous callers all share the
  // anonymous principal, so for them this is effectively a global cap — which is
  // the "per-IP-equivalent" throttle for guests.
  public type RateLimitState = {
    var calls : Map.Map<Principal, [Int]>;
  };

  // Admin-configurable pending-order ceiling. The per-session cap (PENDING_ORDER_CAP
  // in lib/rate-limit.mo) bounds how many concurrent pending orders ONE browser
  // session may hold; this global ceiling bounds how many concurrent pending
  // orders may exist across ALL callers combined, purely as a catastrophic-abuse
  // backstop. It is set high enough that normal traffic never approaches it and
  // is adjustable by an admin at runtime.
  public type PendingOrderConfig = {
    var globalCap : Nat;
  };
};
