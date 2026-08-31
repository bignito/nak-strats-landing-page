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

  type OldProduct = {
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
    created_at : Int;
    updated_at : Int;
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
    variants : [ProductVariant];
    inventory : Nat;
    active : Bool;
    // When true, the product is hidden from the public /shop grid and is only
    // reachable by an authenticated admin. It remains active and purchasable.
    // Defaults to false for all existing products.
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

  type OldOrder = {
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
    created_at : Int;
    updated_at : Int;
  };

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
    customer_name : Text;
    shipping_address : ShippingAddress;
    payment_method : PaymentMethod;
    payment_status : PaymentStatus;
    payment_reference : ?Text;
    customer_principal : ?Principal;
    // Records the outcome of the most recent crypto treasury sweep for this
    // order: `null` when no sweep has been attempted or the last sweep
    // succeeded, otherwise a note describing a skipped or failed sweep.
    sweep_note : ?Text;
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

  type OldActor = {
    products : List.List<OldProduct>;
    orders : List.List<OldOrder>;
    state : { var nextOrderId : Nat };
    cryptoPayments : Map.Map<Text, CryptoPayment>;
    cryptoConfig : CryptoConfig;
    paymentServiceConfig : { var url : Text; var token : Text };
    adminAllowlist : Set.Set<Principal>;
  };

  type NewActor = {
    products : List.List<NewProduct>;
    orders : List.List<NewOrder>;
    state : { var nextOrderId : Nat };
    cryptoPayments : Map.Map<Text, CryptoPayment>;
    cryptoConfig : CryptoConfig;
    paymentServiceConfig : { var url : Text; var token : Text };
    adminAllowlist : Set.Set<Principal>;
    minimumOrder : { var minimumOrder : Nat };
    feeCache : FeeCache;
  };

  public func migration(old : OldActor) : NewActor {
    // Existing products get admin_only = false (they are all public real
    // products). The hidden test product is appended separately.
    let migratedProducts = old.products.map<OldProduct, NewProduct>(func p = { p with admin_only = false });
    migratedProducts.add({
      id = 6;
      name = "Test Item — Do Not Order";
      slug = "test-item-do-not-order";
      description = "INTERNAL PAYMENT TEST — NOT A REAL PRODUCT. This item exists solely to verify the ckUSDC payment and treasury sweep end to end with real funds. It is hidden from the public shop and reachable only by an authenticated admin. Do not order this item.";
      price = 50;
      currency = "USD";
      images = [];
      category = "Test";
      variants = [
        { id = "test"; name = "Test"; size = "test"; price = 50; inventory = 100 },
      ];
      inventory = 100;
      active = true;
      admin_only = true;
      created_at = 0;
      updated_at = 0;
    });

    {
      products = migratedProducts;
      // Existing orders predate the sweep-note feature: set sweep_note to null
      // for every existing order.
      orders = old.orders.map(func o = { o with sweep_note = null });
      state = old.state;
      cryptoPayments = old.cryptoPayments;
      cryptoConfig = old.cryptoConfig;
      paymentServiceConfig = old.paymentServiceConfig;
      adminAllowlist = old.adminAllowlist;
      // Default minimum order total for crypto checkout: $0.25 (25 cents).
      // Crypto orders below this cannot be swept after the ledger fee.
      minimumOrder = { var minimumOrder = 25 };
      // Runtime icrc1_fee cache starts at the hardcoded ledger fee (the
      // fallback) with updatedAt = 0 so the first sweep refreshes from the
      // ledger.
      feeCache = {
        var ckUSDC = { var fee = 10000; var updatedAt = 0 };
        var icp = { var fee = 10000; var updatedAt = 0 };
      };
    };
  };
};
