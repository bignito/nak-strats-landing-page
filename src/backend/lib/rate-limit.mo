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

  // Cap on concurrent pending (unpaid) reservations PER SESSION. A normal
  // customer creates one order at a time and checks out promptly, so this is
  // never tripped by legitimate checkout. For a signed-in customer the cap is
  // per-principal; for an anonymous guest it is scoped to the browser-scoped
  // session identifier issued at checkout (NOT global across all guests), so one
  // guest's abandoned carts never block another guest.
  public let PENDING_ORDER_CAP : Nat = 3;

  // Default global ceiling on concurrent pending (unpaid) orders across ALL
  // callers combined. This is purely a catastrophic-abuse backstop: it is set
  // high enough that normal traffic never approaches it, and it is
  // admin-configurable at runtime (see the pending-order config). It exists so a
  // script that fabricates many session identifiers cannot reserve the entire
  // catalogue without paying.
  public let PENDING_ORDER_GLOBAL_CAP : Nat = 1000;

  // Reservation expiry for a pending CARD order that never reached Stripe. A
  // card customer either redirects to Stripe within moments or has left, so an
  // abandoned card order's reserved inventory is released after 10 minutes
  // rather than holding it for the full 30-minute payment window.
  public let CARD_RESERVATION_TTL_NANOS : Int = 600_000_000_000; // 10 minutes

  // Reservation expiry for a pending MANUAL order (and the fallback for other
  // non-crypto methods). Manual orders have no payment flow, so an abandoned
  // manual order's reserved inventory is released after 30 minutes. Crypto
  // orders are handled by the crypto verification timer's 30-minute deposit
  // window and are not swept by the reservation sweep.
  public let CRYPTO_RESERVATION_TTL_NANOS : Int = 1_800_000_000_000; // 30 minutes

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
