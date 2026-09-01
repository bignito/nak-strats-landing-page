import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Types "../types/rate-limit";

module {
  // Rate-limit windows and maxima, mirroring the existing submissions pattern
  // (lib/submissions.mo: window 1 hour / max 5). The canister cannot see client
  // IPs, so it limits by the caller's principal; anonymous callers all share the
  // anonymous principal, so for them each limit is effectively global.
  public let ORDER_RATE_WINDOW_NANOS : Int = 3_600_000_000_000; // 1 hour
  public let ORDER_RATE_MAX : Nat = 5;

  public let CARD_RATE_WINDOW_NANOS : Int = 3_600_000_000_000; // 1 hour
  public let CARD_RATE_MAX : Nat = 10;

  public let UNSUBSCRIBE_RATE_WINDOW_NANOS : Int = 3_600_000_000_000; // 1 hour
  public let UNSUBSCRIBE_RATE_MAX : Nat = 10;

  // Cap on concurrent pending (unpaid) reservations per caller. A normal
  // customer creates one order at a time and checks out promptly, so this is
  // never tripped by legitimate checkout. For the anonymous principal (all
  // guests share it) this is a global cap on simultaneous pending orders,
  // bounding how much of the catalogue a script can reserve without paying.
  public let PENDING_ORDER_CAP : Nat = 3;

  // Check and record a per-principal rate limit. Returns true when the call is
  // allowed (and records the timestamp), false when the caller has exceeded the
  // limit within the window.
  public func checkRateLimit(state : Types.RateLimitState, caller : Principal, windowNanos : Int, max : Nat) : Bool {
    let now = Time.now();
    let recent = switch (state.calls.get(caller)) {
      case (?ts) { ts };
      case null { [] };
    };
    let filtered = recent.filter(func t = now - t < windowNanos);
    if (filtered.size() >= max) {
      false;
    } else {
      state.calls.add(caller, filtered.concat([now]));
      true;
    };
  };
};
