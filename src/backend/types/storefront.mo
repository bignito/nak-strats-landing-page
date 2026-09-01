module {
  public type ProductId = Nat;

  public type ProductVariant = {
    id : Text;
    name : Text;
    size : Text;
    price : Nat;
    inventory : Nat;
  };

  public type Product = {
    id : ProductId;
    name : Text;
    slug : Text;
    description : Text;
    price : Nat;
    currency : Text;
    images : [Text];
    category : Text;
    variants : [ProductVariant];
    inventory : Nat;
    active : Bool;
    // When true, the product is hidden from the public /shop grid and is only
    // reachable by an authenticated admin (via a direct product URL or an
    // admin-only view). It remains active and purchasable. Defaults to false.
    admin_only : Bool;
    created_at : Int;
    updated_at : Int;
  };

  public type OrderItem = {
    product_id : ProductId;
    variant_id : Text;
    name : Text;
    quantity : Nat;
    unit_amount : Nat;
  };

  public type PaymentStatus = {
    #pending;
    #paid;
    #cancelled;
    #expired;
  };

  public type PaymentMethod = {
    #manual;
    #card_stripe;
    #crypto_icp;
    #crypto_ckusdc;
  };

  // Shipping lifecycle of an order. #pending until an admin marks it shipped.
  public type ShippingStatus = {
    #pending;
    #shipped;
  };

  public type Order = {
    id : Nat;
    reference : Text;
    items : [OrderItem];
    subtotal : Nat;
    tax : Nat;
    shipping : Nat;
    total : Nat;
    currency : Text;
    // The customer's email address. This is the ONE documented exception to
    // the "no plaintext PII in canister state" rule: it must reach the email
    // service to route the transactional confirmation email. The canister
    // cannot decrypt the encrypted_shipping blob, so the email is kept in
    // plaintext solely for that routing purpose. Customer name and the full
    // shipping address are NEVER stored in plaintext — they live only inside
    // the IBE ciphertext (encrypted_shipping).
    customer_email : Text;
    // The IBE ciphertext of the customer's shipping details (name, email, and
    // full shipping address), encrypted CLIENT-SIDE in the browser to every
    // admin principal BEFORE any canister call. The canister only ever receives
    // and stores this opaque ciphertext — it never sees the plaintext PII and
    // never decrypts it. Shape decision: a single Blob containing the
    // concatenation of one IBE ciphertext per admin principal (each prefixed
    // with the 4-byte big-endian length of that ciphertext), so a single
    // opaque field covers all admins and the admin frontend can split and
    // decrypt the slice for its own principal. `null` for orders created
    // before IBE was introduced (see has_shipping_details).
    encrypted_shipping : ?Blob;
    // Operational flag: whether this order carries IBE-encrypted shipping
    // details. `false` for pre-IBE orders (encrypted_shipping is null) and for
    // any order where the customer did not provide shipping details. Kept as a
    // plaintext Bool so the canister can run operational checks (e.g. whether
    // fulfilment is possible) without touching the ciphertext.
    has_shipping_details : Bool;
    payment_method : PaymentMethod;
    payment_status : PaymentStatus;
    payment_reference : ?Text;
    // The optional Internet Identity principal of the signed-in customer who
    // placed the order. `null` for anonymous guest checkout. Never derived from
    // a caller-supplied parameter — always from msg.caller at order creation.
    customer_principal : ?Principal;
    // Records the outcome of the most recent crypto treasury sweep for this
    // order: `null` when no sweep has been attempted or the last sweep
    // succeeded, otherwise a human-readable note describing a skipped sweep
    // (balance not greater than the transfer fee) or a failed sweep (including
    // low cycles). Used to avoid repeatedly failing on an un-sweepable balance.
    sweep_note : ?Text;
    // Shipping lifecycle of the order. #pending until an admin marks it shipped.
    shipping_status : ShippingStatus;
    // Timestamp (ns since epoch) when an admin marked the order shipped. `null`
    // until the order is shipped.
    shipped_at : ?Int;
    // Optional carrier tracking number set when the order is marked shipped.
    tracking_number : ?Text;
    // Whether the customer opted in to marketing email at checkout. The
    // checkbox is NEVER pre-checked. Transactional emails (order confirmation,
    // shipping) are exempt from this and send regardless.
    marketing_consent : Bool;
    // Timestamp (ns since epoch) at which the customer gave marketing consent.
    // `null` when the customer did not opt in. Recording WHEN consent was given
    // makes the record defensible under GDPR/CAN-SPAM.
    marketing_consent_at : ?Int;
    created_at : Int;
    updated_at : Int;
  };

  public type CreateOrderItem = {
    product_id : ProductId;
    variant_id : Text;
    quantity : Nat;
  };

  // Return type of createOrder. Wraps the created order together with an
  // optional short-lived cancellation token. The token is present ONLY for
  // anonymous guest callers (the browser session that created the order needs
  // it to self-cancel via cancelGuestOrder); signed-in customers get null and
  // cancel via cancelCardOrder as the order owner.
  public type CreateOrderResult = {
    order : Order;
    cancellationToken : ?Text;
  };

  public type CreateOrderInput = {
    items : [CreateOrderItem];
    // The customer's email address — the single documented exception that
    // reaches the email service for routing the confirmation email. Customer
    // name and the full shipping address are NEVER sent to the canister in
    // plaintext; they are IBE-encrypted client-side into encrypted_shipping.
    customer_email : Text;
    // The IBE ciphertext of the customer's shipping details, encrypted
    // CLIENT-SIDE in the browser to every admin principal before this call.
    // The canister stores it opaquely and never decrypts it. Shape matches
    // Order.encrypted_shipping: a single Blob of concatenated per-admin
    // ciphertexts, each prefixed with its 4-byte big-endian length. `null`
    // when the customer did not provide shipping details.
    encrypted_shipping : ?Blob;
    // Whether the customer provided shipping details (and thus
    // encrypted_shipping is present). Mirrors Order.has_shipping_details.
    has_shipping_details : Bool;
    payment_method : PaymentMethod;
    // Whether the customer opted in to marketing email. The checkbox is NEVER
    // pre-checked; the frontend sends the customer's explicit choice.
    marketing_consent : Bool;
  };

  public type OrderError = {
    #emptyOrder;
    #unknownProduct : ProductId;
    #productInactive : ProductId;
    #unknownVariant : (ProductId, Text);
    #outOfStock : (ProductId, Text);
    #invalidQuantity;
    #paymentFailed : Text;
    // The crypto order total is below the configured minimum order total (the
    // payload is the minimum in cents). Crypto orders below this cannot be
    // swept to the treasury after the ledger transfer fee is deducted.
    #belowMinimumOrder : Nat;
    // ckUSDC checkout is temporarily disabled (the CKUSDC_CHECKOUT_ENABLED
    // constant is false). New ckUSDC orders are rejected; existing ckUSDC
    // orders are unaffected.
    #ckUSDCDisabled;
    // The caller exceeded the per-principal createOrder rate limit within the
    // window (mirrors the submissions rate-limit pattern).
    #rateLimited;
    // The caller already has the maximum number of concurrent pending (unpaid)
    // reservations. For anonymous guests this is a global cap on simultaneous
    // pending orders, bounding how much of the catalogue a script can reserve.
    #tooManyPendingOrders;
  };
};
