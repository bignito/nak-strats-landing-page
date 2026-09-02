import List "mo:core/List";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Float "mo:core/Float";
import Int "mo:core/Int";

module {
  // ---- Old (pre-change) types: prices are US dollar decimal Floats ----
  type ProductVariant = {
    id : Text;
    name : Text;
    size : Text;
    price : Float;
    inventory : Nat;
  };

  type Product = {
    id : Nat;
    name : Text;
    slug : Text;
    description : Text;
    price : Float;
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
    unit_amount : Float;
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

  type Order = {
    id : Nat;
    reference : Text;
    items : [OrderItem];
    subtotal : Float;
    tax : Float;
    shipping : Float;
    total : Float;
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

  type Role = {
    #owner;
    #admin;
    #staff;
  };

  type UserRecord = {
    role : Role;
    grantedAt : Int;
  };

  type CancellationToken = {
    token : Text;
    expiresAt : Int;
  };

  type RateLimitState = {
    var calls : Map.Map<Principal, [Int]>;
  };

  type AssetRecord = {
    id : Text;
    contentType : Text;
    bytes : Blob;
    byteSize : Nat;
    uploadedAt : Int;
    productId : Nat;
  };

  type UploadSession = {
    id : Text;
    owner : Principal;
    contentType : Text;
    totalSize : Nat;
    received : Map.Map<Nat, Blob>;
    createdAt : Int;
    lastActivityAt : Int;
  };

  type Category = {
    id : Nat;
    slug : Text;
    name : Text;
    description : ?Text;
    sortOrder : Nat;
    active : Bool;
    showWhenEmpty : Bool;
    created_at : Int;
    updated_at : Int;
  };

  // ---- New (post-change) types: prices are integer cents (Nat) ----
  type NewProductVariant = {
    id : Text;
    name : Text;
    size : Text;
    price : Nat;
    inventory : Nat;
  };

  type NewProduct = {
    id : Nat;
    name : Text;
    slug : Text;
    description : Text;
    price : Nat;
    currency : Text;
    images : [Text];
    category : Text;
    variants : [NewProductVariant];
    inventory : Nat;
    active : Bool;
    admin_only : Bool;
    created_at : Int;
    updated_at : Int;
  };

  type NewOrderItem = {
    product_id : Nat;
    variant_id : Text;
    name : Text;
    quantity : Nat;
    unit_amount : Nat;
  };

  type NewOrder = {
    id : Nat;
    reference : Text;
    items : [NewOrderItem];
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

  // OldActor matches the NewActor of the preceding migration
  // (20260902_050000.mo): the deployed stable shape before this change. Prices
  // and monetary fields are US dollar decimal Floats, and minimumOrder is a
  // Float dollar value.
  type OldActor = {
    products : List.List<Product>;
    orders : List.List<Order>;
    state : { var nextOrderId : Nat };
    cryptoPayments : Map.Map<Text, CryptoPayment>;
    cryptoConfig : CryptoConfig;
    paymentServiceConfig : { var url : Text; var token : Text };
    adminUsers : Map.Map<Principal, UserRecord>;
    minimumOrder : { var minimumOrder : Float };
    feeCache : FeeCache;
    latePayments : List.List<LatePayment>;
    rateLimit : { var submissions : Map.Map<Principal, [Int]> };
    initialAdminClaimed : { var initialAdminClaimed : Bool };
    orderRateLimit : RateLimitState;
    checkoutRateLimit : RateLimitState;
    confirmRateLimit : RateLimitState;
    unsubscribeRateLimit : RateLimitState;
    cancelTokens : Map.Map<Text, CancellationToken>;
    sessionOrders : Map.Map<Text, List.List<Text>>;
    pendingOrderConfig : { var globalCap : Nat };
    assets : Map.Map<Text, AssetRecord>;
    uploads : Map.Map<Text, UploadSession>;
    categories : List.List<Category>;
  };

  // NewActor converts every Float dollar price/monetary field to integer cents
  // (Nat): product price and variant price, order unit_amount and
  // subtotal/tax/shipping/total, and the minimumOrder config. All other stable
  // state is preserved unchanged.
  type NewActor = {
    products : List.List<NewProduct>;
    orders : List.List<NewOrder>;
    state : { var nextOrderId : Nat };
    cryptoPayments : Map.Map<Text, CryptoPayment>;
    cryptoConfig : CryptoConfig;
    paymentServiceConfig : { var url : Text; var token : Text };
    adminUsers : Map.Map<Principal, UserRecord>;
    minimumOrder : { var minimumOrder : Nat };
    feeCache : FeeCache;
    latePayments : List.List<LatePayment>;
    rateLimit : { var submissions : Map.Map<Principal, [Int]> };
    initialAdminClaimed : { var initialAdminClaimed : Bool };
    orderRateLimit : RateLimitState;
    checkoutRateLimit : RateLimitState;
    confirmRateLimit : RateLimitState;
    unsubscribeRateLimit : RateLimitState;
    cancelTokens : Map.Map<Text, CancellationToken>;
    sessionOrders : Map.Map<Text, List.List<Text>>;
    pendingOrderConfig : { var globalCap : Nat };
    assets : Map.Map<Text, AssetRecord>;
    uploads : Map.Map<Text, UploadSession>;
    categories : List.List<Category>;
  };

  // Convert a US dollar decimal Float (e.g. 24.99) to integer cents (2499).
  // Round to the nearest cent so 2-decimal values convert exactly despite
  // binary floating-point representation (e.g. 44.99 * 100.0 is 4498.999...).
  func toCents(f : Float) : Nat {
    Float.nearest(f * 100.0).toInt().toNat();
  };

  func convertVariant(v : ProductVariant) : NewProductVariant {
    {
      id = v.id;
      name = v.name;
      size = v.size;
      price = toCents(v.price);
      inventory = v.inventory;
    };
  };

  func convertProduct(p : Product) : NewProduct {
    {
      id = p.id;
      name = p.name;
      slug = p.slug;
      description = p.description;
      price = toCents(p.price);
      currency = p.currency;
      images = p.images;
      category = p.category;
      variants = p.variants.map(func v = convertVariant(v));
      inventory = p.inventory;
      active = p.active;
      admin_only = p.admin_only;
      created_at = p.created_at;
      updated_at = p.updated_at;
    };
  };

  func convertOrderItem(o : OrderItem) : NewOrderItem {
    {
      product_id = o.product_id;
      variant_id = o.variant_id;
      name = o.name;
      quantity = o.quantity;
      unit_amount = toCents(o.unit_amount);
    };
  };

  func convertOrder(o : Order) : NewOrder {
    {
      id = o.id;
      reference = o.reference;
      items = o.items.map(func i = convertOrderItem(i));
      subtotal = toCents(o.subtotal);
      tax = toCents(o.tax);
      shipping = toCents(o.shipping);
      total = toCents(o.total);
      currency = o.currency;
      customer_email = o.customer_email;
      encrypted_shipping = o.encrypted_shipping;
      has_shipping_details = o.has_shipping_details;
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
    };
  };

  public func migration(old : OldActor) : NewActor {
    {
      products = old.products.map(func p = convertProduct(p));
      orders = old.orders.map(func o = convertOrder(o));
      state = old.state;
      cryptoPayments = old.cryptoPayments;
      cryptoConfig = old.cryptoConfig;
      paymentServiceConfig = old.paymentServiceConfig;
      adminUsers = old.adminUsers;
      minimumOrder = { var minimumOrder = toCents(old.minimumOrder.minimumOrder) };
      feeCache = old.feeCache;
      latePayments = old.latePayments;
      rateLimit = old.rateLimit;
      initialAdminClaimed = old.initialAdminClaimed;
      orderRateLimit = old.orderRateLimit;
      checkoutRateLimit = old.checkoutRateLimit;
      confirmRateLimit = old.confirmRateLimit;
      unsubscribeRateLimit = old.unsubscribeRateLimit;
      cancelTokens = old.cancelTokens;
      sessionOrders = old.sessionOrders;
      pendingOrderConfig = old.pendingOrderConfig;
      assets = old.assets;
      uploads = old.uploads;
      categories = old.categories;
    };
  };
};
