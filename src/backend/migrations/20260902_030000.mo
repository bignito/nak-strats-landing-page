import List "mo:core/List";
import Map "mo:core/Map";
import Principal "mo:core/Principal";

module {
  // ---- Shared types (unchanged from the preceding migration) ----
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

  // OldActor matches the NewActor of the preceding migration
  // (20260902_020000.mo): the deployed stable shape before this change.
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
    assets : Map.Map<Text, AssetRecord>;
    uploads : Map.Map<Text, UploadSession>;
    categories : List.List<Category>;
  };

  // NewActor has the same stable shape as OldActor. Only the contents of the
  // categories and products lists change: the 4 category slugs are replaced by
  // the 3 requested storefront categories (for-him / for-her / unisex), and
  // each of the 29 products is reassigned to its correct category slug with its
  // name, USD decimal price, and image path verified to match the spec.
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
  // to the product and a static /images/*.webp asset path. Product.category
  // stores the category SLUG (for-him / for-her / unisex).
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

  public func migration(old : OldActor) : NewActor {
    // Replace the entire catalogue with the 29 specified colognes, in the given
    // order, with sequential ids 1-29. Prices are US dollar decimal values
    // stored directly as Float (never integer cents). Product.category stores
    // the category SLUG (for-him / for-her / unisex). Images are static
    // /images/*.webp assets.
    let products = List.fromArray<Product>([
      product(1, "Ameer Al Oud | Eau De Parfum | 100ml", "ameer-al-oud-eau-de-parfum-100ml", 24.99, "for-him", "100ml", "/images/ameer-al-oud-eau-de-parfum-100ml.webp"),
      product(2, "Arabic Coffee | Eau De Parfum | 100ml", "arabic-coffee-eau-de-parfum-100ml", 44.99, "for-him", "100ml", "/images/arabic-coffee-eau-de-parfum-100ml.webp"),
      product(3, "Atlantis | Eau De Parfum | 140ml", "atlantis-eau-de-parfum-140ml", 44.99, "for-him", "140ml", "/images/atlantis-eau-de-parfum-140ml.webp"),
      product(4, "Black Horse | Eau De Parfum | 100ml", "black-horse-eau-de-parfum-100ml", 44.99, "for-him", "100ml", "/images/black-horse-eau-de-parfum-100ml.webp"),
      product(5, "Blue Moon | Eau De Parfum | 100ml", "blue-moon-eau-de-parfum-100ml", 44.99, "for-him", "100ml", "/images/blue-moon-eau-de-parfum-100ml.webp"),
      product(6, "Cuban Tobacco | Extrait De Aoud | 100ml", "cuban-tobacco-extrait-de-aoud-100ml", 44.99, "for-him", "100ml", "/images/cuban-tobacco-extrait-de-aoud-100ml.webp"),
      product(7, "Dubai Ocean | Eau De Parfum | 100ml", "dubai-ocean-eau-de-parfum-100ml", 44.99, "for-him", "100ml", "/images/dubai-ocean-eau-de-parfum-100ml.webp"),
      product(8, "Fabrica 1929 | Extrait De Parfum | 150ml", "fabrica-1929-extrait-de-parfum-150ml", 69.99, "for-him", "150ml", "/images/fabrica-1929-extrait-de-parfum-150ml.webp"),
      product(9, "Gray oud | Extrait De Parfum | 150ml", "gray-oud-extrait-de-parfum-150ml", 69.99, "for-him", "150ml", "/images/gray-oud-extrait-de-parfum-150ml.webp"),
      product(10, "Italian tobacco | Extrait De Parfum | 150ml", "italian-tobacco-extrait-de-parfum-150ml", 69.99, "for-him", "150ml", "/images/italian-tobacco-extrait-de-parfum-150ml.webp"),
      product(11, "Manhattan | Eau De Parfum | 100ml", "manhattan-eau-de-parfum-100ml", 44.99, "for-him", "100ml", "/images/manhattan-eau-de-parfum-100ml.webp"),
      product(12, "Mehyar | Concentrated Perfume Oil | 30ml", "mehyar-concentrated-perfume-oil-30ml", 179.99, "for-him", "30ml", "/images/mehyar-concentrated-perfume-oil-30ml.webp"),
      product(13, "Oud Al Ameer - Extrait De Aoud 120ml", "oud-al-ameer-extrait-de-aoud-120ml", 54.99, "for-him", "120ml", "/images/oud-al-ameer-extrait-de-aoud-120ml.webp"),
      product(14, "Oud Dubai | Eau De Parfum | 100ml", "oud-dubai-eau-de-parfum-100ml", 34.99, "for-him", "100ml", "/images/oud-dubai-eau-de-parfum-100ml.webp"),
      product(15, "Rosso ombre | Extrait De Parfum | 150ml", "rosso-ombre-extrait-de-parfum-150ml", 69.99, "for-him", "150ml", "/images/rosso-ombre-extrait-de-parfum-150ml.webp"),
      product(16, "Surrati Arabian Eagle 100 ml", "surrati-arabian-eagle-100-ml", 44.99, "for-him", "100ml", "/images/surrati-arabian-eagle-100-ml.webp"),
      product(17, "Turquoise Stone | Eau De Parfum | 100ml", "turquoise-stone-eau-de-parfum-100ml", 29.99, "for-him", "100ml", "/images/turquoise-stone-eau-de-parfum-100ml.webp"),
      product(18, "Dolce Marina | Eau De Parfum | 140ml", "dolce-marina-eau-de-parfum-140ml", 34.99, "for-her", "140ml", "/images/dolce-marina-eau-de-parfum-140ml.webp"),
      product(19, "Jewel | Eau De Parfum | 140ml", "jewel-eau-de-parfum-140ml", 34.99, "for-her", "140ml", "/images/jewel-eau-de-parfum-140ml.webp"),
      product(20, "Kariman | Concentrated Perfume Oil | 30ml", "kariman-concentrated-perfume-oil-30ml", 199.99, "for-her", "30ml", "/images/kariman-concentrated-perfume-oil-30ml.webp"),
      product(21, "Pink Miss | Eau De Parfum | 140ml", "pink-miss-eau-de-parfum-140ml", 34.99, "for-her", "140ml", "/images/pink-miss-eau-de-parfum-140ml-1.webp"),
      product(22, "Purple candy | Extrait De Parfum | 150ml", "purple-candy-extrait-de-parfum-150ml", 69.99, "for-her", "150ml", "/images/purple-candy-extrait-de-parfum-150ml.webp"),
      product(23, "Surrati Lady Rose 100 ml", "surrati-lady-rose-100-ml", 34.99, "for-her", "100ml", "/images/surrati-lady-rose-100-ml.webp"),
      product(24, "Honey Oud | Eau De Parfum | 140ml", "honey-oud-eau-de-parfum-140ml", 34.99, "unisex", "140ml", "/images/honey-oud-eau-de-parfum-140ml.webp"),
      product(25, "My Stone | Eau De Parfum | 100ml", "my-stone-eau-de-parfum-100ml", 29.99, "unisex", "100ml", "/images/my-stone-eau-de-parfum-100ml.webp"),
      product(26, "Omniyat | Eau De Parfum | 140ml", "omniyat-eau-de-parfum-140ml", 44.99, "unisex", "140ml", "/images/omniyat-eau-de-parfum-140ml.webp"),
      product(27, "oyal Musk|Eau De Parfum|100ml", "oyal-musk-eau-de-parfum-100ml", 34.99, "unisex", "100ml", "/images/oyal-musk-eau-de-parfum-100ml.webp"),
      product(28, "Surrati Dream Valley|140ml", "surrati-dream-valley-140ml", 34.99, "unisex", "140ml", "/images/surrati-dream-valley-140ml.webp"),
      product(29, "Surrati Luxury Oud 100 ml", "surrati-luxury-oud-100-ml", 44.99, "unisex", "100ml", "/images/surrati-luxury-oud-100-ml.webp"),
    ]);

    // Replace the 4 category slugs with the 3 requested storefront categories.
    // Product.category stores the slug, so the shop filter (All / For Him /
    // For Her / Unisex) is driven by these records via listCategories().
    let categories = List.fromArray<Category>([
      { id = 1; slug = "for-him"; name = "For Him"; description = null; sortOrder = 1; active = true; showWhenEmpty = false; created_at = 0; updated_at = 0 },
      { id = 2; slug = "for-her"; name = "For Her"; description = null; sortOrder = 2; active = true; showWhenEmpty = false; created_at = 0; updated_at = 0 },
      { id = 3; slug = "unisex"; name = "Unisex"; description = null; sortOrder = 3; active = true; showWhenEmpty = false; created_at = 0; updated_at = 0 },
    ]);

    {
      products;
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
