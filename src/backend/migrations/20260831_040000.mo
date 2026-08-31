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

  // OldActor matches the NewActor of the preceding migration
  // (20260831_030000.mo): the deployed stable shape before this change. It
  // carries the flat adminAllowlist Set and the persistent initialAdminClaimed
  // flag.
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
    initialAdminClaimed : { var initialAdminClaimed : Bool };
  };

  // NewActor replaces the flat adminAllowlist Set with the roles map
  // (adminUsers : Map<Principal, UserRecord>). The persistent
  // initialAdminClaimed flag is carried forward unchanged.
  //
  // IMPORTANT — the migration is DETERMINISTIC and NEVER resets state. It
  // preserves whatever is on the canister (draft or live): existing allowlist
  // members are migrated into the roles map, and initialAdminClaimed is carried
  // forward. A migration module cannot read an environment/draft flag (it may
  // only import mo:core), so the DRAFT reset is NOT performed here — it is a
  // separate, explicit, controller-only operation (resetAdminForMigration) that
  // the deploy pipeline invokes on the DRAFT only. Because the migration never
  // resets, publishing to live can never reset the live allowlist or reopen the
  // claim path.
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
  };

  public func migration(old : OldActor) : NewActor {
    // Migrate the flat adminAllowlist Set into the roles map. Deterministic and
    // NEVER resets state: existing members are preserved. A single existing
    // member becomes the OWNER (the highest role); multiple members all become
    // ADMIN. The persistent initialAdminClaimed flag is carried forward
    // unchanged. The DRAFT reset is NOT performed here — it is the separate,
    // controller-only resetAdminForMigration operation invoked by the deploy
    // pipeline on the DRAFT only, so publishing to live can never reset the
    // live allowlist or reopen the claim path.
    let adminUsers = Map.empty<Principal, UserRecord>();
    let members = old.adminAllowlist.toArray();
    if (members.size() == 1) {
      adminUsers.add(members[0], { role = #owner; grantedAt = 0 });
    } else {
      for (p in members.values()) {
        adminUsers.add(p, { role = #admin; grantedAt = 0 });
      };
    };
    {
      products = old.products;
      orders = old.orders;
      state = old.state;
      cryptoPayments = old.cryptoPayments;
      cryptoConfig = old.cryptoConfig;
      paymentServiceConfig = old.paymentServiceConfig;
      adminUsers;
      minimumOrder = old.minimumOrder;
      feeCache = old.feeCache;
      latePayments = old.latePayments;
      rateLimit = old.rateLimit;
      initialAdminClaimed = old.initialAdminClaimed;
    };
  };
};