import List "mo:core/List";
import Map "mo:core/Map";
import Principal "mo:core/Principal";

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

  type OldActor = {};

  type NewActor = {
    products : List.List<Product>;
    orders : List.List<Order>;
    state : { var nextOrderId : Nat };
    cryptoPayments : Map.Map<Text, CryptoPayment>;
    cryptoConfig : CryptoConfig;
  };

  public func migration(old : OldActor) : NewActor {
    {
      products = List.fromArray([
        {
          id = 1;
          name = "Midnight Oud";
          slug = "midnight-oud";
          description = "A dark, smoky oud wrapped in amber and leather. Midnight Oud opens with a burst of black pepper and saffron before settling into a warm, resinous base that lingers well past midnight.";
          price = 8500;
          currency = "USD";
          images = ["/images/midnight-oud.png"];
          category = "Fragrance";
          variants = [
            { id = "30ml"; name = "30 ml"; size = "30ml"; price = 6500; inventory = 50 },
            { id = "50ml"; name = "50 ml"; size = "50ml"; price = 8500; inventory = 40 },
            { id = "100ml"; name = "100 ml"; size = "100ml"; price = 11000; inventory = 30 },
          ];
          inventory = 120;
          active = true;
          created_at = 0;
          updated_at = 0;
        },
        {
          id = 2;
          name = "Neon Bloom";
          slug = "neon-bloom";
          description = "An electric floral with jasmine, tuberose, and a hint of pink pepper. Neon Bloom is a bright, unapologetic statement that glows against the dark.";
          price = 6500;
          currency = "USD";
          images = ["/images/neon-bloom.png"];
          category = "Fragrance";
          variants = [
            { id = "30ml"; name = "30 ml"; size = "30ml"; price = 5000; inventory = 60 },
            { id = "50ml"; name = "50 ml"; size = "50ml"; price = 6500; inventory = 45 },
          ];
          inventory = 105;
          active = true;
          created_at = 0;
          updated_at = 0;
        },
        {
          id = 3;
          name = "Void Vetiver";
          slug = "void-vetiver";
          description = "Earthy vetiver grounded in smoky cedar and a whisper of green. Void Vetiver is the scent of quiet confidence — clean, deep, and impossibly grounded.";
          price = 7500;
          currency = "USD";
          images = ["/images/void-vetiver.png"];
          category = "Fragrance";
          variants = [
            { id = "50ml"; name = "50 ml"; size = "50ml"; price = 7500; inventory = 40 },
            { id = "100ml"; name = "100 ml"; size = "100ml"; price = 9500; inventory = 25 },
          ];
          inventory = 65;
          active = true;
          created_at = 0;
          updated_at = 0;
        },
        {
          id = 4;
          name = "Crimson Teak";
          slug = "crimson-teak";
          description = "A rich, woody oriental with teak, tobacco leaf, and warm spice. Crimson Teak is bold, warm, and unmistakably premium.";
          price = 9500;
          currency = "USD";
          images = ["/images/crimson-teak.png"];
          category = "Fragrance";
          variants = [
            { id = "50ml"; name = "50 ml"; size = "50ml"; price = 9500; inventory = 35 },
            { id = "100ml"; name = "100 ml"; size = "100ml"; price = 12000; inventory = 20 },
          ];
          inventory = 55;
          active = true;
          created_at = 0;
          updated_at = 0;
        },
        {
          id = 5;
          name = "Static Citrus";
          slug = "static-citrus";
          description = "A sharp, electric citrus with bergamot, grapefruit, and a metallic twist. Static Citrus cuts through the noise with a clean, energizing spark.";
          price = 3500;
          currency = "USD";
          images = ["/images/static-citrus.png"];
          category = "Fragrance";
          variants = [
            { id = "30ml"; name = "30 ml"; size = "30ml"; price = 3500; inventory = 70 },
            { id = "50ml"; name = "50 ml"; size = "50ml"; price = 4500; inventory = 50 },
          ];
          inventory = 120;
          active = true;
          created_at = 0;
          updated_at = 0;
        },
      ]);
      orders = List.empty();
      state = { var nextOrderId = 1 };
      cryptoPayments = Map.empty();
      cryptoConfig = {
        var treasuryPrincipal = Principal.fromText("ttfax-iely3-bkfh4-tb7o3-dso2i-acf6j-yh6w5-jclgp-7mnhg-lxbzi-qae");
        var treasurySubaccount = null;
        var ckUSDC = {
          canisterId = Principal.fromText("xevnm-gaaaa-aaaar-qafnq-cai");
          decimals = 6;
          fee = 10000;
        };
        var icp = {
          canisterId = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai");
          decimals = 8;
          fee = 10000;
        };
      };
    };
  };
};
