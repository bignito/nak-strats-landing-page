import Result "mo:core/Result";
import List "mo:core/List";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Timer "mo:core/Timer";
import Cycles "mo:core/Cycles";
import Types "../types/recovery";
import StorefrontTypes "../types/storefront";
import CryptoTypes "../types/crypto-payments";
import PaymentServiceTypes "../types/payment-service";
import RecoveryLib "../lib/recovery";
import AdminLib "../lib/admin-access-control";
import AdminTypes "../types/admin-access-control";
import OutCall "mo:caffeineai-http-outcalls/outcall";

mixin (
  orders : List.List<StorefrontTypes.Order>,
  products : List.List<StorefrontTypes.Product>,
  cryptoPayments : Map.Map<Text, CryptoTypes.CryptoPayment>,
  cryptoConfig : CryptoTypes.CryptoConfig,
  selfPrincipal : Principal,
  adminUsers : AdminTypes.AdminUsers,
  feeCache : CryptoTypes.FeeCache,
  latePayments : List.List<Types.LatePayment>,
  timerState : { var timerId : ?Timer.TimerId },
  paymentServiceConfig : PaymentServiceTypes.PaymentServiceConfig,
  emailTransform : OutCall.Transform,
) {
  // 1. DIAGNOSIS SUPPORT. Reports the canister's current cycle balance via
  // Cycles.balance(). Cycle balance is not sensitive, so this is a public
  // query. Low cycles can cause inter-canister ledger calls to fail, so this
  // lets anyone confirm the canister is funded.
  public query func getCycleBalance() : async Nat {
    Cycles.balance();
  };

  // Returns the canister's own principal. Public query — the canister ID is
  // not sensitive.
  public query func getCanisterId() : async Principal {
    selfPrincipal;
  };

  // 2. ADMIN RECOVERY — all admin-only, guarded by the principal allowlist.

  // Lists all orders with order reference, status, payment method, amount owed,
  // the full deposit account (owner + subaccount + text address), and the LIVE
  // on-ledger balance of each crypto order's subaccount.
  public shared ({ caller }) func listOrdersForRecovery() : async [Types.OrderRecoveryView] {
    AdminLib.requireStaffOrAbove(adminUsers, caller);
    await RecoveryLib.listOrdersForRecovery(orders, cryptoPayments, cryptoConfig, selfPrincipal);
  };

  // Forces verification of a single order's payment to run immediately,
  // returning the current balance, status, and any error.
  public shared ({ caller }) func forceRecheckPayment(reference : Text) : async Result.Result<Types.RecheckResult, Types.RecoveryError> {
    AdminLib.requireStaffOrAbove(adminUsers, caller);
    await RecoveryLib.forceRecheck(cryptoPayments, reference, cryptoConfig, selfPrincipal);
  };

  // Forces a sweep of a single order's subaccount to the treasury, returning
  // the exact ledger error on failure (never swallowed).
  public shared ({ caller }) func forceSweepOrder(reference : Text) : async Result.Result<Types.SweepResult, Types.RecoveryError> {
    AdminLib.requireAdminOrOwner(adminUsers, caller);
    await RecoveryLib.forceSweep(cryptoPayments, orders, reference, cryptoConfig, selfPrincipal, feeCache);
  };

  // Returns the canister's DEFAULT subaccount balance on the configured ledger.
  public shared ({ caller }) func getDefaultSubaccountBalance() : async Result.Result<Nat, Types.RecoveryError> {
    AdminLib.requireStaffOrAbove(adminUsers, caller);
    await RecoveryLib.getDefaultSubaccountBalance(cryptoConfig, selfPrincipal);
  };

  // Sweeps the canister's DEFAULT subaccount balance to the treasury, returning
  // the exact ledger error on failure (never swallowed).
  public shared ({ caller }) func sweepDefaultSubaccount() : async Result.Result<Types.SweepResult, Types.RecoveryError> {
    AdminLib.requireAdminOrOwner(adminUsers, caller);
    await RecoveryLib.sweepDefaultSubaccount(cryptoConfig, selfPrincipal, feeCache);
  };

  // 3. VERIFICATION TIMER — registers the recurring backend timer that runs
  // payment verification independent of the browser tab. Returns true when the
  // timer was (re)started. The timer is also auto-registered on canister
  // init/post-upgrade (see main.mo), so verification runs even if no admin ever
  // calls this.
  public shared ({ caller }) func startVerificationTimer() : async Bool {
    AdminLib.requireStaffOrAbove(adminUsers, caller);
    switch (timerState.timerId) {
      case (?id) { Timer.cancelTimer(id) };
      case null {};
    };
    timerState.timerId := ?Timer.recurringTimer<system>(#seconds(30), func() : async () {
      ignore (await RecoveryLib.runVerificationPass(cryptoPayments, orders, products, latePayments, cryptoConfig, selfPrincipal, feeCache, paymentServiceConfig, emailTransform));
    });
    true;
  };

  // Cancels the recurring verification timer. Returns true when a timer was
  // running and was cancelled.
  public shared ({ caller }) func stopVerificationTimer() : async Bool {
    AdminLib.requireStaffOrAbove(adminUsers, caller);
    switch (timerState.timerId) {
      case (?id) { Timer.cancelTimer(id); timerState.timerId := null; true };
      case null { false };
    };
  };

  // 4. RESUME + LATE PAYMENT.

  // Returns full deposit info (address, amount, expiry timestamp, remaining
  // time, status) for resuming an in-progress deposit screen. Remaining time is
  // computed server-side from the stored expiry timestamp.
  public query func getResumeInfo(reference : Text) : async Result.Result<Types.ResumeInfo, Types.RecoveryError> {
    RecoveryLib.getResumeInfo(cryptoPayments, reference, cryptoConfig, selfPrincipal);
  };

  // Admin-only. Lists all recorded late payments (received after expiry, flagged
  // for admin review, never discarded).
  public shared ({ caller }) func listLatePayments() : async [Types.LatePayment] {
    AdminLib.requireStaffOrAbove(adminUsers, caller);
    RecoveryLib.listLatePayments(latePayments);
  };

  // Admin-only. Marks a late payment as reviewed. Returns true when found.
  public shared ({ caller }) func markLatePaymentReviewed(reference : Text) : async Bool {
    AdminLib.requireStaffOrAbove(adminUsers, caller);
    RecoveryLib.markLatePaymentReviewed(latePayments, reference);
  };
};
