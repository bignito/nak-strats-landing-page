import List "mo:core/List";
import Map "mo:core/Map";
import Principal "mo:core/Principal";

module {
  // ---- Types matching the NewActor of the preceding migration
  // (20260904_000000.mo): the deployed stable shape before this change. ----
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

  type ResponseCacheEntry = {
    var value : Text;
    var timestamp : Int;
  };

  // OldActor matches the NewActor of the preceding migration
  // (20260904_000000.mo): the deployed stable shape before this change.
  type OldActor = {
    products : List.List<Product>;
    orders : List.List<Order>;
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
    featuredVideo : { var rawUrl : Text; var embedUrl : Text };
    responseCache : Map.Map<Text, ResponseCacheEntry>;
    publicReadRateLimit : RateLimitState;
  };

  // NewActor adds the four stable fields introduced by the cycle-cost fix:
  // the permanent IBE public-key cache, the per-principal rate-limit state for
  // getIbePublicKey, the per-principal rate-limit state for checkCryptoPayment,
  // and the short-lived per-reference checkCryptoPayment result cache. All are
  // seeded empty. All other stable state is preserved unchanged.
  type IbePublicKeyCache = {
    var cachedKey : ?Blob;
    var cachedKeyName : Text;
    var cachedDerivationPath : Blob;
  };

  type CryptoCheckCacheEntry = {
    var status : CryptoPaymentStatus;
    var timestamp : Int;
  };

  type NewActor = {
    products : List.List<Product>;
    orders : List.List<Order>;
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
    featuredVideo : { var rawUrl : Text; var embedUrl : Text };
    responseCache : Map.Map<Text, ResponseCacheEntry>;
    publicReadRateLimit : RateLimitState;
    ibePublicKeyCache : IbePublicKeyCache;
    ibeRateLimit : RateLimitState;
    cryptoCheckRateLimit : RateLimitState;
    cryptoCheckCache : Map.Map<Text, CryptoCheckCacheEntry>;
  };

  public func migration(old : OldActor) : NewActor {
    {
      products = old.products;
      orders = old.orders;
      state = old.state;
      cryptoPayments = old.cryptoPayments;
      cryptoConfig = old.cryptoConfig;
      paymentServiceConfig = old.paymentServiceConfig;
      adminUsers = old.adminUsers;
      minimumOrder = old.minimumOrder;
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
      featuredVideo = old.featuredVideo;
      responseCache = old.responseCache;
      publicReadRateLimit = old.publicReadRateLimit;
      ibePublicKeyCache = { var cachedKey = null; var cachedKeyName = ""; var cachedDerivationPath = "\00" : Blob };
      ibeRateLimit = { var calls = Map.empty() };
      cryptoCheckRateLimit = { var calls = Map.empty() };
      cryptoCheckCache = Map.empty();
    };
  };
};
