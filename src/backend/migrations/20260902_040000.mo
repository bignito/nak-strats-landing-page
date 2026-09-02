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
  // (20260902_030000.mo): the deployed stable shape before this change. The
  // catalogue it carries is incorrect (wrong category slugs, wrong product
  // names, empty descriptions), so this migration replaces it with the correct
  // 29-product catalogue and the 3 requested storefront categories.
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
  // products and categories lists change: the catalogue is replaced with the
  // correct 29 colognes (for-him 3, for-her 3, unisex 23) and the categories
  // are the 3 requested storefront categories (for-him / for-her / unisex).
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
  // stores the category SLUG (for-him / for-her / unisex). description is the
  // SHORT_DESC shown verbatim in the shop grid and quick-look modal.
  func product(
    id : Nat,
    name : Text,
    slug : Text,
    price : Float,
    category : Text,
    size : Text,
    image : Text,
    description : Text,
  ) : Product {
    {
      id;
      name;
      slug;
      description;
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
    // /images/*.webp assets. description is the SHORT_DESC used verbatim.
    let products = List.fromArray<Product>([
      product(1, "Arabic Coffee | Eau De Parfum | 100ml", "arabic-coffee-eau-de-parfum-100ml", 44.99, "for-him", "100ml", "/images/arabic-coffee-eau-de-parfum-100ml.webp", "Surrati Arabic Coffee Eau de Parfum. A luxuriously bold and deeply captivating 100ml fragrance that draws inspiration from the rich, ceremonial warmth of Arabic Coffee."),
      product(2, "Cuban Tobacco | Extrait De Aoud | 100ml", "cuban-tobacco-extrait-de-aoud-100ml", 44.99, "for-him", "100ml", "/images/cuban-tobacco-extrait-de-aoud-100ml.webp", "Surrati Cuban Tobacco Extrait de Aoud. A luxurious 100ml men's fragrance designed to embody virility and elegance."),
      product(3, "Italian tobacco | Extrait De Parfum | 150ml", "italian-tobacco-extrait-de-parfum-150ml", 69.99, "for-him", "150ml", "/images/italian-tobacco-extrait-de-parfum-150ml.webp", "Surrati Italian Tobacco Extrait De Parfum. A masterful and commanding 150ml men's fragrance that marries the rugged soul of sun-drenched Italian Tobacco with the polished grace of haute perfumery."),
      product(4, "My Stone | Eau De Parfum | 100ml", "my-stone-eau-de-parfum-100ml", 29.99, "for-her", "100ml", "/images/my-stone-eau-de-parfum-100ml.webp", "Surrati My Stone Eau de Parfum. A fresh, romantic, and sensually captivating women's fragrance that leaves a strong and lasting impression."),
      product(5, "Pink Miss | Eau De Parfum | 140ml", "pink-miss-eau-de-parfum-140ml", 34.99, "for-her", "140ml", "/images/pink-miss-eau-de-parfum-140ml-1.webp", "Pink Miss. A versatile and refined 140ml women's fragrance designed to deliver a delicate aroma with a signature touch of sophistication."),
      product(6, "Surrati Lady Rose 100 ml", "surrati-lady-rose-100-ml", 34.99, "for-her", "100ml", "/images/surrati-lady-rose-100-ml.webp", "Surrati Lady Rose is a feminine Eau de Parfum with a sweet, fruity and floral character. It opens with a fresh combination of rose, guava and pineapple, giving the fragrance a juicy and romantic feel."),
      product(7, "Ameer Al Oud | Eau De Parfum | 100ml", "ameer-al-oud-eau-de-parfum-100ml", 24.99, "unisex", "100ml", "/images/ameer-al-oud-eau-de-parfum-100ml.webp", "Surrati Ameer Al Oud Eau De Parfum. A rich and regal 100ml unisex fragrance that unveils an opulent blend of deep woods and Oud from the very first spritz."),
      product(8, "Atlantis | Eau De Parfum | 140ml", "atlantis-eau-de-parfum-140ml", 44.99, "unisex", "140ml", "/images/atlantis-eau-de-parfum-140ml.webp", "Surrati Atlantis Eau de Parfum. A refreshing and invigorating 140ml unisex fragrance that evokes the mystery and coolness of the ocean's depths."),
      product(9, "Black Horse | Eau De Parfum | 100ml", "black-horse-eau-de-parfum-100ml", 44.99, "unisex", "100ml", "/images/black-horse-eau-de-parfum-100ml.webp", "Surrati Arabian Black Horse Eau De Parfum. A bold and captivating 100ml unisex fragrance that exudes a rugged, powerful aroma."),
      product(10, "Blue Moon | Eau De Parfum | 100ml", "blue-moon-eau-de-parfum-100ml", 44.99, "unisex", "100ml", "/images/blue-moon-eau-de-parfum-100ml.webp", "Surrati Blue Moon Eau De Parfum. A fresh and invigorating 100ml unisex fragrance with an irresistible hint of fruity sweetness."),
      product(11, "Dolce Marina | Eau De Parfum | 140ml", "dolce-marina-eau-de-parfum-140ml", 34.99, "unisex", "140ml", "/images/dolce-marina-eau-de-parfum-140ml.webp", "Surrati Dolce Marina Eau De Parfum. A luxurious 140ml unisex fragrance that embodies timeless elegance and is perfect for any special occasion."),
      product(12, "Dubai Ocean | Eau De Parfum | 100ml", "dubai-ocean-eau-de-parfum-100ml", 44.99, "unisex", "100ml", "/images/dubai-ocean-eau-de-parfum-100ml.webp", "Dubai Ocean Eau de Parfum by Surrati. A prestigious 100ml unisex fragrance that captures the vast, shimmering beauty of the Arabian Gulf."),
      product(13, "Fabrica 1929 | Extrait De Parfum | 150ml", "fabrica-1929-extrait-de-parfum-150ml", 69.99, "unisex", "150ml", "/images/fabrica-1929-extrait-de-parfum-150ml.webp", "Surrati Fabrica 1929 Extrait De Parfum. A masterful and distinguished 150ml unisex fragrance that perfectly embodies elegance and strength, blending golden Honey, deep Oud, and rich Woody notes."),
      product(14, "Gray oud | Extrait De Parfum | 150ml", "gray-oud-extrait-de-parfum-150ml", 69.99, "unisex", "150ml", "/images/gray-oud-extrait-de-parfum-150ml.webp", "Surrati Gray Oud Extrait De Parfum. A bold and modern 150ml unisex fragrance blending authentic Oud with distinctive notes of Saffron and Leather."),
      product(15, "Honey Oud | Eau De Parfum | 140ml", "honey-oud-eau-de-parfum-140ml", 34.99, "unisex", "140ml", "/images/honey-oud-eau-de-parfum-140ml.webp", "Surrati Honey Oud Eau De Parfum. An enchanting and luxurious 140ml unisex fragrance designed for those who desire sophistication and charm."),
      product(16, "Jewel | Eau De Parfum | 140ml", "jewel-eau-de-parfum-140ml", 34.99, "unisex", "140ml", "/images/jewel-eau-de-parfum-140ml.webp", "Surrati Jewel Eau De Parfum. A luxurious 140ml unisex fragrance that defines timeless elegance and is crafted for those who appreciate sophisticated aromas."),
      product(17, "Kariman | Concentrated Perfume Oil | 30ml", "kariman-concentrated-perfume-oil-30ml", 199.99, "unisex", "30ml", "/images/kariman-concentrated-perfume-oil-30ml.webp", "Kariman Concentrated Perfume Oil. A captivating 30ml attar composed of fresh, uplifting Citrus, smooth Woody notes, and a harmonious Spicy and Floral base."),
      product(18, "Manhattan | Eau De Parfum | 100ml", "manhattan-eau-de-parfum-100ml", 44.99, "unisex", "100ml", "/images/manhattan-eau-de-parfum-100ml.webp", "Surrati Manhattan Eau de Parfum. A powerfully sophisticated and urbane 100ml fragrance that captures the bold, commanding energy of Manhattan's skyline."),
      product(19, "Mehyar | Concentrated Perfume Oil | 30ml", "mehyar-concentrated-perfume-oil-30ml", 179.99, "unisex", "30ml", "/images/mehyar-concentrated-perfume-oil-30ml.webp", "Mehyar Concentrated Perfume Oil. An intriguing 30ml attar that balances strength and sophistication, composed of rich smoky Oud, vibrant Citrus, and warm Leather."),
      product(20, "Omniyat | Eau De Parfum | 140ml", "omniyat-eau-de-parfum-140ml", 44.99, "unisex", "140ml", "/images/omniyat-eau-de-parfum-140ml.webp", "Surrati Omniyat Eau De Parfum. A luxurious 140ml unisex fragrance from Surrati's Heritage Collection, blending vibrant Black Currant, Peach and Passionfruit with a warm Vanilla and Sandalwood foundation."),
      product(21, "Oud Al Ameer - Extrait De Aoud 120ml", "oud-al-ameer-extrait-de-aoud-120ml", 54.99, "unisex", "120ml", "/images/oud-al-ameer-extrait-de-aoud-120ml.webp", "Surrati Oud Al Ameer Extrait de Aoud. A regally sophisticated and warmly captivating 120ml Extrait de Aoud that embodies the princely grandeur and timeless heritage of Aoud."),
      product(22, "Oud Dubai | Eau De Parfum | 100ml", "oud-dubai-eau-de-parfum-100ml", 34.99, "unisex", "100ml", "/images/oud-dubai-eau-de-parfum-100ml.webp", "Surrati Oud Dubai Eau de Parfum. A vibrant and sophisticatedly captivating 100ml fragrance that captures the dynamic, sun-drenched spirit of Dubai."),
      product(23, "Royal Musk | Eau De Parfum | 100ml", "oyal-musk-eau-de-parfum-100ml", 34.99, "unisex", "100ml", "/images/oyal-musk-eau-de-parfum-100ml.webp", "Royal Musk Eau De Parfum. A luxurious 100ml unisex fragrance blending warm Woody and Nutty notes, clean Musk, and a romantic Rose and Sweet foundation."),
      product(24, "Purple candy | Extrait De Parfum | 150ml", "purple-candy-extrait-de-parfum-150ml", 69.99, "unisex", "150ml", "/images/purple-candy-extrait-de-parfum-150ml.webp", "Surrati Purple Candy Extrait de Parfum. A masterful and vibrant 150ml unisex luxury fragrance blending Fruity, Woody, and Floral notes with addictive complexity."),
      product(25, "Rosso ombre | Extrait De Parfum | 150ml", "rosso-ombre-extrait-de-parfum-150ml", 69.99, "unisex", "150ml", "/images/rosso-ombre-extrait-de-parfum-150ml.webp", "Surrati Rosso Ombre Extrait De Parfum. A commanding and sophisticated 150ml unisex fragrance blending zesty Citrus, precious Oud Wood, elegant Florals, warm Amber, and sensual Musk."),
      product(26, "Surrati Arabian Eagle 100 ml", "surrati-arabian-eagle-100-ml", 44.99, "unisex", "100ml", "/images/surrati-arabian-eagle-100-ml.webp", "Arabian Eagle by Surrati is a sophisticated unisex Eau de Parfum with a fresh, fruity opening and a warm, sensual dry-down of juicy pineapple, iris, jasmine and pink pepper."),
      product(27, "Surrati Dream Valley|140ml", "surrati-dream-valley-140ml", 34.99, "unisex", "140ml", "/images/surrati-dream-valley-140ml.webp", "Surrati Dream Valley Eau De Parfum. A unique and enchanting 140ml unisex fragrance designed to combine elegance and luxury."),
      product(28, "Surrati Luxury Oud 100 ml", "surrati-luxury-oud-100-ml", 44.99, "unisex", "100ml", "/images/surrati-luxury-oud-100-ml.webp", "The fragrance starts fresh and bright, then becomes smooth, creamy and musky. After it settles on the skin, the oud, cedarwood and amber become more noticeable, giving it a warm Arabian character."),
      product(29, "Turquoise Stone | Eau De Parfum | 100ml", "turquoise-stone-eau-de-parfum-100ml", 29.99, "unisex", "100ml", "/images/turquoise-stone-eau-de-parfum-100ml.webp", "Surrati Turquoise Stone Eau De Parfum. A fresh and romantically captivating 100ml unisex fragrance that evokes clarity and serenity."),
    ]);

    // The 3 requested storefront categories. Product.category stores the slug,
    // so the shop filter (All / For Him / For Her / Unisex) is driven by these
    // records via listCategories().
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
