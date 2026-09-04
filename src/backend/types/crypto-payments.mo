import StorefrontTypes "./storefront";

module {
  // Temporary disable flag for ckUSDC checkout. When false, NEW ckUSDC orders
  // are rejected server-side (createOrder returns #err(#ckUSDCDisabled) and the
  // crypto adapter rejects #crypto_ckusdc checkout sessions) and the checkout
  // UI hides the option. Existing ckUSDC orders remain fully visible and
  // fulfillable — the flag governs creation only. Re-enable by flipping this
  // single line to true.
  public let CKUSDC_CHECKOUT_ENABLED : Bool = false;

  public type Token = {
    #ckUSDC;
    #ICP;
  };

  public type LedgerConfig = {
    canisterId : Principal;
    decimals : Nat8;
    fee : Nat;
  };

  public type CryptoConfig = {
    var treasuryPrincipal : Principal;
    var treasurySubaccount : ?Blob;
    var ckUSDC : LedgerConfig;
    var icp : LedgerConfig;
  };

  public type CryptoConfigView = {
    treasuryPrincipal : Principal;
    treasurySubaccount : ?Blob;
    ckUSDC : LedgerConfig;
    icp : LedgerConfig;
    // The minimum order total (in integer cents, e.g. 25 for $0.25) required
    // for crypto checkout. Crypto orders below this are rejected server-side
    // because they cannot be swept to the treasury after the ledger transfer
    // fee is deducted.
    minimumOrder : Nat;
    // Whether ckUSDC checkout is currently enabled. Mirrors the compile-time
    // CKUSDC_CHECKOUT_ENABLED constant so the checkout UI reads the same single
    // value. When false, the UI must not offer ckUSDC and the backend rejects
    // new ckUSDC orders.
    ckUSDCEnabled : Bool;
  };

  // A single cached icrc1_fee value for one ledger, with the time it was
  // fetched. `updatedAt == 0` means "never fetched" so the first sweep always
  // refreshes from the ledger.
  public type FeeCacheEntry = {
    var fee : Nat;
    var updatedAt : Int;
  };

  // Runtime icrc1_fee cache, one entry per token. The fee is queried from the
  // configured ledger at runtime and cached briefly rather than hardcoded; the
  // hardcoded ledger fee is only the initial fallback before the first query.
  public type FeeCache = {
    var ckUSDC : FeeCacheEntry;
    var icp : FeeCacheEntry;
  };

  public type CryptoPaymentStatus = {
    #awaiting_payment;
    #paid : { blockIndex : Nat };
    #underpayment : { expected : Nat; received : Nat };
    #overpayment : { expected : Nat; received : Nat };
    #expired;
  };

  // A single cached checkCryptoPayment result for one order reference, with the
  // time it was fetched. The cache is short-lived (15s TTL) and collapses a
  // client polling every few seconds into one ledger call per 15 seconds. The
  // entry is deleted when the payment reaches #paid or #expired so the map
  // cannot grow forever.
  public type CryptoCheckCacheEntry = {
    var status : CryptoPaymentStatus;
    var timestamp : Int;
  };

  public type CryptoPayment = {
    orderId : Nat;
    reference : Text;
    token : Token;
    amountDue : Nat;
    subaccount : Blob;
    status : CryptoPaymentStatus;
    expiresAt : Int;
    confirmedBlockIndex : ?Nat;
    createdAt : Int;
    updatedAt : Int;
  };

  public type DepositInfo = {
    reference : Text;
    token : Token;
    address : Principal;
    subaccount : Blob;
    amountDue : Nat;
    decimals : Nat8;
    expiresAt : Int;
    qrPayload : Text;
  };

  public type CryptoPaymentError = {
    #notFound;
    #notCryptoOrder;
    #alreadyPaid;
    #expired;
    #underpayment : { expected : Nat; received : Nat };
    #overpayment : { expected : Nat; received : Nat };
    #ledgerError : Text;
    #unauthorized;
    #invalidConfig : Text;
    #sweepFailed : Text;
    // The caller exceeded the per-principal rate limit on checkCryptoPayment
    // (10 calls per 60 seconds). The canister cannot see client IPs, so this
    // complements the ledger's own protections; anonymous callers all share the
    // anonymous principal, so for them this is a global cap.
    #rateLimited;
    // The crypto order total is below the configured minimum order total (the
    // payload is the minimum in integer cents). Crypto orders below this cannot
    // be swept to the treasury after the ledger transfer fee is deducted.
    #belowMinimumOrder : Nat;
  };

  // Admin-only row view of an order for the admin Orders list. Includes the
  // per-order subaccount hex and the full ICRC-1 deposit account text so the
  // admin UI can display and copy the deposit address without a second call.
  public type AdminOrderView = {
    reference : Text;
    createdAt : Int;
    status : StorefrontTypes.PaymentStatus;
    cryptoStatus : ?CryptoPaymentStatus;
    paymentMethod : StorefrontTypes.PaymentMethod;
    // Amount owed in integer cents (e.g. 2499 for $24.99). Never a Float dollar.
    amountOwed : Nat;
    currency : Text;
    itemCount : Nat;
    // The customer's email address (already stored plaintext on the order to
    // route confirmation emails). Visible only through this ADMIN/OWNER-gated
    // admin view so a payment can be reviewed or a customer contacted without
    // decrypting the shipping blob. NEVER exposed in any public or
    // customer-facing query.
    customerEmail : Text;
    subaccountHex : Text;
    depositAccountText : Text;
    sweepNote : ?Text;
  };

  // Admin-only full order detail, including line items and crypto payment
  // status plus the deposit account info.
  public type AdminOrderDetail = {
    reference : Text;
    createdAt : Int;
    updatedAt : Int;
    status : StorefrontTypes.PaymentStatus;
    cryptoStatus : ?CryptoPaymentStatus;
    paymentMethod : StorefrontTypes.PaymentMethod;
    // Amount owed in integer cents (e.g. 2499 for $24.99). Never a Float dollar.
    amountOwed : Nat;
    currency : Text;
    items : [StorefrontTypes.OrderItem];
    customerEmail : Text;
    // The IBE ciphertext of the customer's shipping details (same shape as
    // Order.encrypted_shipping: a single Blob of concatenated per-admin
    // ciphertexts, each prefixed with its 4-byte big-endian length). The admin
    // frontend fetches this and decrypts the slice for its own principal
    // CLIENT-SIDE to fulfil the order. The canister never decrypts it. `null`
    // when the order carries no encrypted shipping details.
    encryptedShipping : ?Blob;
    // Whether the order carries IBE-encrypted shipping details (mirrors
    // Order.has_shipping_details). The admin UI warns when this is false.
    hasShippingDetails : Bool;
    subaccountHex : Text;
    depositAccountText : Text;
    sweepNote : ?Text;
  };
};
