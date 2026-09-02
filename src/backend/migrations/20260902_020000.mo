import List "mo:core/List";
import Map "mo:core/Map";
import Principal "mo:core/Principal";

module {
  // ---- New (post-change) types: prices are US dollar decimal Floats ----
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

  // ---- Old (pre-change) types: prices were integer cents (Nat) ----
  type OldProductVariant = {
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
    variants : [OldProductVariant];
    inventory : Nat;
    active : Bool;
    admin_only : Bool;
    created_at : Int;
    updated_at : Int;
  };

  type OldOrderItem = {
    product_id : Nat;
    variant_id : Text;
    name : Text;
    quantity : Nat;
    unit_amount : Nat;
  };

  type OldOrder = {
    id : Nat;
    reference : Text;
    items : [OldOrderItem];
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
  // (20260902_010000.mo): the deployed stable shape before this change.
  type OldActor = {
    products : List.List<OldProduct>;
    orders : List.List<OldOrder>;
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

  // NewActor changes Product/ProductVariant prices and all order monetary
  // fields from Nat (integer cents) to Float (US dollar decimal), and the
  // minimumOrder config from Nat cents to Float dollars. The product catalogue
  // is replaced entirely with the 29 specified colognes.
  type NewActor = {
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
    assets : Map.Map<Text, AssetRecord>;
    uploads : Map.Map<Text, UploadSession>;
    categories : List.List<Category>;
  };

  // Build a catalogue product. Prices are US dollar decimal values (e.g.
  // 24.99) — never integer cents. Each product carries a single variant sized
  // to the product and a static /images/*.webp asset path.
  func product(
    id : Nat,
    name : Text,
    slug : Text,
    price : Float,
    category : Text,
    size : Text,
    image : Text,
  ) : Product {
    {
      id;
      name;
      slug;
      description = "";
      price;
      currency = "USD";
      images = [image];
      category;
      variants = [
        { id = size; name = size; size; price; inventory = 25 },
      ];
      inventory = 25;
      active = true;
      admin_only = false;
      created_at = 0;
      updated_at = 0;
    };
  };

  func convertOrderItem(o : OldOrderItem) : OrderItem {
    {
      product_id = o.product_id;
      variant_id = o.variant_id;
      name = o.name;
      quantity = o.quantity;
      // Old unit_amount was integer cents; convert to US dollar decimal.
      unit_amount = o.unit_amount.toFloat() / 100.0;
    };
  };

  func convertOrder(o : OldOrder) : Order {
    {
      id = o.id;
      reference = o.reference;
      items = o.items.map(func i = convertOrderItem(i));
      subtotal = o.subtotal.toFloat() / 100.0;
      tax = o.tax.toFloat() / 100.0;
      shipping = o.shipping.toFloat() / 100.0;
      total = o.total.toFloat() / 100.0;
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
    // Replace the entire product catalogue with the 29 specified colognes, in
    // the given order, with sequential ids 1-29. Prices are US dollar decimal
    // values stored directly as Float (never integer cents, never divided by
    // 100 in the display path). Images are static /images/*.webp assets.
    let products = List.fromArray<Product>([
      product(1, "Ameer Al Oud | Eau De Parfum | 100ml", "ameer-al-oud-eau-de-parfum-100ml", 24.99, "eau-de-parfum", "100ml", "/images/ameer-al-oud-eau-de-parfum-100ml.webp"),
      product(2, "Arabic Coffee | Eau De Parfum | 100ml", "arabic-coffee-eau-de-parfum-100ml", 44.99, "eau-de-parfum", "100ml", "/images/arabic-coffee-eau-de-parfum-100ml.webp"),
      product(3, "Atlantis | Eau De Parfum | 140ml", "atlantis-eau-de-parfum-140ml", 44.99, "eau-de-parfum", "140ml", "/images/atlantis-eau-de-parfum-140ml.webp"),
      product(4, "Black Horse | Eau De Parfum | 100ml", "black-horse-eau-de-parfum-100ml", 44.99, "eau-de-parfum", "100ml", "/images/black-horse-eau-de-parfum-100ml.webp"),
      product(5, "Blue Moon | Eau De Parfum | 100ml", "blue-moon-eau-de-parfum-100ml", 44.99, "eau-de-parfum", "100ml", "/images/blue-moon-eau-de-parfum-100ml.webp"),
      product(6, "Cuban Tobacco | Extrait De Aoud | 100ml", "cuban-tobacco-extrait-de-aoud-100ml", 44.99, "extrait-de-aoud", "100ml", "/images/cuban-tobacco-extrait-de-aoud-100ml.webp"),
      product(7, "Dolce Marina | Eau De Parfum | 140ml", "dolce-marina-eau-de-parfum-140ml", 34.99, "eau-de-parfum", "140ml", "/images/dolce-marina-eau-de-parfum-140ml.webp"),
      product(8, "Dubai Ocean | Eau De Parfum | 100ml", "dubai-ocean-eau-de-parfum-100ml", 44.99, "eau-de-parfum", "100ml", "/images/dubai-ocean-eau-de-parfum-100ml.webp"),
      product(9, "Fabrica 1929 | Extrait De Parfum | 150ml", "fabrica-1929-extrait-de-parfum-150ml", 69.99, "extrait-de-parfum", "150ml", "/images/fabrica-1929-extrait-de-parfum-150ml.webp"),
      product(10, "Gray oud | Extrait De Parfum | 150ml", "gray-oud-extrait-de-parfum-150ml", 69.99, "extrait-de-parfum", "150ml", "/images/gray-oud-extrait-de-parfum-150ml.webp"),
      product(11, "Honey Oud | Eau De Parfum | 140ml", "honey-oud-eau-de-parfum-140ml", 34.99, "eau-de-parfum", "140ml", "/images/honey-oud-eau-de-parfum-140ml.webp"),
      product(12, "Italian tobacco | Extrait De Parfum | 150ml", "italian-tobacco-extrait-de-parfum-150ml", 69.99, "extrait-de-parfum", "150ml", "/images/italian-tobacco-extrait-de-parfum-150ml.webp"),
      product(13, "Jewel | Eau De Parfum | 140ml", "jewel-eau-de-parfum-140ml", 34.99, "eau-de-parfum", "140ml", "/images/jewel-eau-de-parfum-140ml.webp"),
      product(14, "Kariman | Concentrated Perfume Oil | 30ml", "kariman-concentrated-perfume-oil-30ml", 199.99, "concentrated-perfume-oil", "30ml", "/images/kariman-concentrated-perfume-oil-30ml.webp"),
      product(15, "Manhattan | Eau De Parfum | 100ml", "manhattan-eau-de-parfum-100ml", 44.99, "eau-de-parfum", "100ml", "/images/manhattan-eau-de-parfum-100ml.webp"),
      product(16, "Mehyar | Concentrated Perfume Oil | 30ml", "mehyar-concentrated-perfume-oil-30ml", 179.99, "concentrated-perfume-oil", "30ml", "/images/mehyar-concentrated-perfume-oil-30ml.webp"),
      product(17, "My Stone | Eau De Parfum | 100ml", "my-stone-eau-de-parfum-100ml", 29.99, "eau-de-parfum", "100ml", "/images/my-stone-eau-de-parfum-100ml.webp"),
      product(18, "Omniyat | Eau De Parfum | 140ml", "omniyat-eau-de-parfum-140ml", 44.99, "eau-de-parfum", "140ml", "/images/omniyat-eau-de-parfum-140ml.webp"),
      product(19, "Oud Al Ameer - Extrait De Aoud 120ml", "oud-al-ameer-extrait-de-aoud-120ml", 54.99, "extrait-de-aoud", "120ml", "/images/oud-al-ameer-extrait-de-aoud-120ml.webp"),
      product(20, "Oud Dubai | Eau De Parfum | 100ml", "oud-dubai-eau-de-parfum-100ml", 34.99, "eau-de-parfum", "100ml", "/images/oud-dubai-eau-de-parfum-100ml.webp"),
      product(21, "oyal Musk|Eau De Parfum|100ml", "oyal-musk-eau-de-parfum-100ml", 34.99, "eau-de-parfum", "100ml", "/images/oyal-musk-eau-de-parfum-100ml.webp"),
      product(22, "Pink Miss | Eau De Parfum | 140ml", "pink-miss-eau-de-parfum-140ml", 34.99, "eau-de-parfum", "140ml", "/images/pink-miss-eau-de-parfum-140ml-1.webp"),
      product(23, "Purple candy | Extrait De Parfum | 150ml", "purple-candy-extrait-de-parfum-150ml", 69.99, "extrait-de-parfum", "150ml", "/images/purple-candy-extrait-de-parfum-150ml.webp"),
      product(24, "Rosso ombre | Extrait De Parfum | 150ml", "rosso-ombre-extrait-de-parfum-150ml", 69.99, "extrait-de-parfum", "150ml", "/images/rosso-ombre-extrait-de-parfum-150ml.webp"),
      product(25, "Surrati Arabian Eagle 100 ml", "surrati-arabian-eagle-100-ml", 44.99, "eau-de-parfum", "100ml", "/images/surrati-arabian-eagle-100-ml.webp"),
      product(26, "Surrati Dream Valley|140ml", "surrati-dream-valley-140ml", 34.99, "eau-de-parfum", "140ml", "/images/surrati-dream-valley-140ml.webp"),
      product(27, "Surrati Lady Rose 100 ml", "surrati-lady-rose-100-ml", 34.99, "eau-de-parfum", "100ml", "/images/surrati-lady-rose-100-ml.webp"),
      product(28, "Surrati Luxury Oud 100 ml", "surrati-luxury-oud-100-ml", 44.99, "eau-de-parfum", "100ml", "/images/surrati-luxury-oud-100-ml.webp"),
      product(29, "Turquoise Stone | Eau De Parfum | 100ml", "turquoise-stone-eau-de-parfum-100ml", 29.99, "eau-de-parfum", "100ml", "/images/turquoise-stone-eau-de-parfum-100ml.webp"),
    ]);

    // Rebuild the category catalogue for the new product categories, as slugs
    // consistent with the existing category migration.
    let categories = List.fromArray<Category>([
      { id = 1; slug = "eau-de-parfum"; name = "Eau De Parfum"; description = null; sortOrder = 0; active = true; showWhenEmpty = false; created_at = 0; updated_at = 0 },
      { id = 2; slug = "extrait-de-aoud"; name = "Extrait De Aoud"; description = null; sortOrder = 1; active = true; showWhenEmpty = false; created_at = 0; updated_at = 0 },
      { id = 3; slug = "extrait-de-parfum"; name = "Extrait De Parfum"; description = null; sortOrder = 2; active = true; showWhenEmpty = false; created_at = 0; updated_at = 0 },
      { id = 4; slug = "concentrated-perfume-oil"; name = "Concentrated Perfume Oil"; description = null; sortOrder = 3; active = true; showWhenEmpty = false; created_at = 0; updated_at = 0 },
    ]);

    {
      products;
      // Existing orders keep their monetary fields converted from integer
      // cents to US dollar decimal values.
      orders = old.orders.map(func o = convertOrder(o));
      state = old.state;
      cryptoPayments = old.cryptoPayments;
      cryptoConfig = old.cryptoConfig;
      paymentServiceConfig = old.paymentServiceConfig;
      adminUsers = old.adminUsers;
      // Minimum order total converted from cents to US dollar decimal.
      minimumOrder = { var minimumOrder = old.minimumOrder.minimumOrder.toFloat() / 100.0 };
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
