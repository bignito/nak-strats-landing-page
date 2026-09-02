import List "mo:core/List";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Char "mo:core/Char";

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

  // OldActor matches the NewActor of the preceding migration
  // (20260902_000000.mo): the deployed stable shape before this change.
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
    assets : Map.Map<Text, AssetRecord>;
    uploads : Map.Map<Text, UploadSession>;
  };

  // NewActor adds the categories stable field. The migration derives a Category
  // record for every distinct value currently in product.category, maps
  // "Fragrance" -> slug "fragrance" (sortOrder 0), "Oils" -> slug "oils"
  // (sortOrder 1), and the hidden test product's "Test" -> slug "test"
  // (active=false so it never appears in the shop), then rewrites each
  // product's category field to its slug. It is idempotent: everything is
  // derived from the input products each run, so re-running on the same input
  // produces identical categories and never duplicates or corrupts products.
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
    assets : Map.Map<Text, AssetRecord>;
    uploads : Map.Map<Text, UploadSession>;
    categories : List.List<Category>;
  };

  // Lowercase, spaces to hyphens, strip non-alphanumerics. Mirrors the slug
  // generation used by createCategory so migrated slugs match admin-created
  // ones.
  func slugify(name : Text) : Text {
    let chars = name.toLower().toArray();
    var out = "";
    for (c in chars.values()) {
      if (c.isAlphabetic() or c.isDigit()) {
        out := out # c.toText();
      } else if (c == ' ') {
        out := out # "-";
      };
    };
    out;
  };

  public func migration(old : OldActor) : NewActor {
    // Collect the distinct category values currently on products and their
    // generated slugs, in first-seen order.
    let slugByValue = Map.empty<Text, Text>();
    let orderByValue = Map.empty<Text, Nat>();
    var nextOrder = 0;
    for (p in old.products.toArray().values()) {
      let v = p.category;
      if (slugByValue.get(v) == null) {
        slugByValue.add(v, slugify(v));
        orderByValue.add(v, nextOrder);
        nextOrder += 1;
      };
    };

    // Build one Category per distinct value. "Fragrance" -> sortOrder 0,
    // "Oils" -> sortOrder 1; the hidden test product's "Test" category is
    // marked active=false so it never appears in the shop.
    let categories = List.empty<Category>();
    var nextId = 1;
    for ((v, slug) in slugByValue.entries()) {
      let isFragrance = v == "Fragrance";
      let isOils = v == "Oils";
      let isTest = v == "Test";
      let sortOrder = if (isFragrance) { 0 } else if (isOils) { 1 } else { orderByValue.get(v) ?? 0 };
      categories.add({
        id = nextId;
        slug;
        name = v;
        description = null;
        sortOrder;
        active = not isTest;
        showWhenEmpty = false;
        created_at = 0;
        updated_at = 0;
      });
      nextId += 1;
    };

    // Rewrite each product's category field to its slug. Products whose value
    // is already a slug (not in the map) are left unchanged.
    let migratedProducts = old.products.map<Product, Product>(func (p : Product) : Product {
      let updated = {
        id = p.id;
        name = p.name;
        slug = p.slug;
        description = p.description;
        price = p.price;
        currency = p.currency;
        images = p.images;
        category = slugByValue.get(p.category) ?? p.category;
        variants = p.variants;
        inventory = p.inventory;
        active = p.active;
        admin_only = p.admin_only;
        created_at = p.created_at;
        updated_at = p.updated_at;
      };
      updated
    });

    {
      products = migratedProducts;
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
      assets = old.assets;
      uploads = old.uploads;
      categories;
    };
  };
};
