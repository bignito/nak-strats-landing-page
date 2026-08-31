import List "mo:core/List";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Set "mo:core/Set";

module {
  type ProductVariant = {
    id : Text;
    name : Text;
    size : Text;
    price : Nat;
    inventory : Nat;
  };

  type Product = {
    id : Nat;
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
    admin_only : Bool;
    created_at : Int;
    updated_at : Int;
  };

  type OrderItem = {
    product_id : Nat;
    variant_id : Text;
    name : Text;
    quantity : Nat;
    unit_amount : Nat;
  };

  type ShippingAddress = {
    line1 : Text;
    line2 : ?Text;
    city : Text;
    region : Text;
    postal_code : Text;
    country : Text;
  };

  type PaymentStatus = {
    #pending;
    #paid;
    #cancelled;
    #expired;
  };

  type PaymentMethod = {
    #manual;
    #card_stripe;
    #crypto_icp;
    #crypto_ckusdc;
  };

  type ShippingStatus = {
    #pending;
    #shipped;
  };

  // Old order shape: no IBE ciphertext fields.
  type Order = {
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
    customer_principal : ?Principal;
    sweep_note : ?Text;
    shipping_status : ShippingStatus;
    shipped_at : ?Int;
    tracking_number : ?Text;
    marketing_consent : Bool;
    marketing_consent_at : ?Int;
    created_at : Int;
    updated_at : Int;
  };

  // New order shape: drops the plaintext customer_name and shipping_address
  // (PII is never stored in canister state) and adds the opaque IBE ciphertext
  // of the customer's shipping details (encrypted client-side to every admin
  // principal) plus the has_shipping_details operational flag. customer_email
  // is kept in plaintext as the ONE documented exception: it must reach the
  // email service to route the transactional confirmation email. Existing
  // orders predate IBE and carry no ciphertext: encrypted_shipping = null,
  // has_shipping_details = false.
  type NewOrder = {
    id : Nat;
    reference : Text;
    items : [OrderItem];
    subtotal : Nat;
    tax : Nat;
    shipping : Nat;
    total : Nat;
    currency : Text;
    customer_email : Text;
    encrypted_shipping : ?Blob;
    has_shipping_details : Bool;
    payment_method : PaymentMethod;
    payment_status : PaymentStatus;
    payment_reference : ?Text;
    customer_principal : ?Principal;
    sweep_note : ?Text;
    shipping_status : ShippingStatus;
    shipped_at : ?Int;
    tracking_number : ?Text;
    marketing_consent : Bool;
    marketing_consent_at : ?Int;
    created_at : Int;
    updated_at : Int;
  };

  type Token = {
    #ckUSDC;
    #ICP;
  };

  type LedgerConfig = {
    canisterId : Principal;
    decimals : Nat8;
    fee : Nat;
  };

  type CryptoConfig = {
    var treasuryPrincipal : Principal;
    var treasurySubaccount : ?Blob;
    var ckUSDC : LedgerConfig;
    var icp : LedgerConfig;
  };

  type CryptoPaymentStatus = {
    #awaiting_payment;
    #paid : { blockIndex : Nat };
    #underpayment : { expected : Nat; received : Nat };
    #overpayment : { expected : Nat; received : Nat };
    #expired;
  };

  type CryptoPayment = {
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

  type FeeCacheEntry = {
    var fee : Nat;
    var updatedAt : Int;
  };

  type FeeCache = {
    var ckUSDC : FeeCacheEntry;
    var icp : FeeCacheEntry;
  };

  type LatePayment = {
    reference : Text;
    token : Token;
    receivedAmount : Nat;
    expectedAmount : Nat;
    receivedAt : Int;
    reviewed : Bool;
  };

  // OldActor matches the NewActor of the preceding migration
  // (20260831_010000.mo): the deployed stable shape before this change.
  type OldActor = {
    products : List.List<Product>;
    orders : List.List<Order>;
    state : { var nextOrderId : Nat };
    cryptoPayments : Map.Map<Text, CryptoPayment>;
    cryptoConfig : CryptoConfig;
    paymentServiceConfig : { var url : Text; var token : Text };
    adminAllowlist : Set.Set<Principal>;
    minimumOrder : { var minimumOrder : Nat };
    feeCache : FeeCache;
    latePayments : List.List<LatePayment>;
    rateLimit : { var submissions : Map.Map<Principal, [Int]> };
  };

  // NewActor adds the IBE ciphertext fields to every order. No new top-level
  // stable field: the vetKD key name is read transiently from the
  // VETKD_KEY_NAME environment variable in main.mo (a migration module cannot
  // call Runtime.envVar<system>).
  type NewActor = {
    products : List.List<Product>;
    orders : List.List<NewOrder>;
    state : { var nextOrderId : Nat };
    cryptoPayments : Map.Map<Text, CryptoPayment>;
    cryptoConfig : CryptoConfig;
    paymentServiceConfig : { var url : Text; var token : Text };
    adminAllowlist : Set.Set<Principal>;
    minimumOrder : { var minimumOrder : Nat };
    feeCache : FeeCache;
    latePayments : List.List<LatePayment>;
    rateLimit : { var submissions : Map.Map<Principal, [Int]> };
  };

  public func migration(old : OldActor) : NewActor {
    {
      products = old.products;
      // Existing orders predate IBE: they carry no ciphertext and their
      // plaintext customer_name / shipping_address are dropped (PII is never
      // stored in canister state). customer_email is kept for routing the
      // confirmation email. encrypted_shipping = null, has_shipping_details =
      // false for legacy orders.
      orders = old.orders.map(func o : NewOrder = {
        id = o.id;
        reference = o.reference;
        items = o.items;
        subtotal = o.subtotal;
        tax = o.tax;
        shipping = o.shipping;
        total = o.total;
        currency = o.currency;
        customer_email = o.customer_email;
        encrypted_shipping = null : ?Blob;
        has_shipping_details = false;
        payment_method = o.payment_method;
        payment_status = o.payment_status;
        payment_reference = o.payment_reference;
        customer_principal = o.customer_principal;
        sweep_note = o.sweep_note;
        shipping_status = o.shipping_status;
        shipped_at = o.shipped_at;
        tracking_number = o.tracking_number;
        marketing_consent = o.marketing_consent;
        marketing_consent_at = o.marketing_consent_at;
        created_at = o.created_at;
        updated_at = o.updated_at;
      });
      state = old.state;
      cryptoPayments = old.cryptoPayments;
      cryptoConfig = old.cryptoConfig;
      paymentServiceConfig = old.paymentServiceConfig;
      adminAllowlist = old.adminAllowlist;
      minimumOrder = old.minimumOrder;
      feeCache = old.feeCache;
      latePayments = old.latePayments;
      rateLimit = old.rateLimit;
    };
  };
};