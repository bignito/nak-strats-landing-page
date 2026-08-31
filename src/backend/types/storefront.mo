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

  public type ShippingAddress = {
    line1 : Text;
    line2 : ?Text;
    city : Text;
    region : Text;
    postal_code : Text;
    country : Text;
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
    customer_email : Text;
    customer_name : Text;
    shipping_address : ShippingAddress;
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

  public type CreateOrderInput = {
    items : [CreateOrderItem];
    customer_email : Text;
    customer_name : Text;
    shipping_address : ShippingAddress;
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
  };
};
