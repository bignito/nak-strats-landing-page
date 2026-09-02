import StorefrontTypes "./storefront";
import CryptoTypes "./crypto-payments";

module {
  // A late payment received after the deposit window expired. Recorded so it is
  // never discarded and is flagged for admin review. `reviewed` starts false and
  // is set true by an admin via markLatePaymentReviewed.
  public type LatePayment = {
    reference : Text;
    token : CryptoTypes.Token;
    receivedAmount : Nat;
    expectedAmount : Nat;
    receivedAt : Int;
    reviewed : Bool;
  };

  // The full ICRC-1 deposit account for an order: the owner principal, the
  // 32-byte subaccount, and the text-encoded address (owner.subaccount-hex).
  public type DepositAccount = {
    owner : Principal;
    subaccount : Blob;
    textAddress : Text;
  };

  // Admin recovery view of a single order: order identity/status plus the full
  // deposit account and the LIVE on-ledger balance of that subaccount.
  public type OrderRecoveryView = {
    reference : Text;
    status : StorefrontTypes.PaymentStatus;
    paymentMethod : StorefrontTypes.PaymentMethod;
    amountOwed : Float;
    depositAccount : ?DepositAccount;
    liveBalance : Nat;
    expiresAt : ?Int;
  };

  // Result of forcing a re-check of a single order's payment. `error` is set
  // only when the ledger query failed; otherwise it is null.
  public type RecheckResult = {
    reference : Text;
    status : CryptoTypes.CryptoPaymentStatus;
    balance : Nat;
    error : ?Text;
  };

  // Result of forcing a sweep of a single order (reference set) or of the
  // default subaccount (reference null). `blockIndex` is the on-ledger block
  // index on success; `error` carries the exact ledger error on failure.
  public type SweepResult = {
    reference : ?Text;
    blockIndex : ?Nat;
    error : ?Text;
  };

  // Resume info for an in-progress deposit screen, computed server-side from
  // the stored expiry timestamp (never a client timer that resets on reload).
  public type ResumeInfo = {
    reference : Text;
    deposit : ?CryptoTypes.DepositInfo;
    status : CryptoTypes.CryptoPaymentStatus;
    expiresAt : Int;
    remainingNs : Int;
  };

  public type RecoveryError = {
    #notFound;
    #notCryptoOrder;
    #unauthorized;
    #invalidConfig : Text;
    #ledgerError : Text;
    #sweepFailed : Text;
  };
};
