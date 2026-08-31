import OutCall "mo:caffeineai-http-outcalls/outcall";
import List "mo:core/List";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Timer "mo:core/Timer";
import Types "types/storefront";
import CryptoTypes "types/crypto-payments";
import RecoveryTypes "types/recovery";
import StorefrontApi "mixins/storefront-api";
import PaymentAdapterApi "mixins/payment-adapter-api";
import CryptoPaymentsApi "mixins/crypto-payments-api";
import CryptoPaymentsLib "lib/crypto-payments";
import PaymentServiceTypes "types/payment-service";
import PaymentServiceApi "mixins/payment-service-api";
import AdminApi "mixins/admin-api";
import AdminTypes "types/admin-access-control";
import RecoveryApi "mixins/recovery-api";
import RecoveryLib "lib/recovery";
import SweepApi "mixins/sweep-api";
import EmailApi "mixins/email-api";
import ConsentApi "mixins/consent-api";
import OQL "mo:caffeineai-oql";
import Expose "mo:caffeineai-oql/Expose";
import ListEntity "mo:caffeineai-oql/ListEntity";
import MapEntity "mo:caffeineai-oql/MapEntity";
import SetEntity "mo:caffeineai-oql/SetEntity";
import ApiDocMixin "mixins/api-doc";
import SubmissionTypes "types/submissions";
import SubmissionsApi "mixins/submissions-api";
import IbeApi "mixins/ibe-api";
import Runtime "mo:core/Runtime";

persistent actor Self {
    func pmToText(m : Types.PaymentMethod) : Text {
      switch m {
        case (#manual) "manual";
        case (#card_stripe) "card_stripe";
        case (#crypto_icp) "crypto_icp";
        case (#crypto_ckusdc) "crypto_ckusdc";
      };
    };

    func psToText(s : Types.PaymentStatus) : Text {
      switch s {
        case (#pending) "pending";
        case (#paid) "paid";
        case (#cancelled) "cancelled";
        case (#expired) "expired";
      };
    };

    func optText(o : ?Text) : Text {
      switch o { case null { "" }; case (?t) { t } };
    };

    func optPrincipalToText(o : ?Principal) : Text {
      switch o { case null { "" }; case (?p) { p.toText() } };
    };

    func productRow(p : Types.Product) : OQL.Entity.Row {
      [
        ("id", #nat(p.id)),
        ("name", #text(p.name)),
        ("slug", #text(p.slug)),
        ("description", #text(p.description)),
        ("price", #nat(p.price)),
        ("currency", #text(p.currency)),
        ("images", #text(p.images.values().join(","))),
        ("category", #text(p.category)),
        ("variants", #nat(p.variants.size())),
        ("inventory", #nat(p.inventory)),
        ("active", #bool(p.active)),
        ("admin_only", #bool(p.admin_only)),
        ("created_at", #int(p.created_at)),
        ("updated_at", #int(p.updated_at)),
      ]
    };

    func orderRow(o : Types.Order) : OQL.Entity.Row {
      [
        ("id", #nat(o.id)),
        ("reference", #text(o.reference)),
        ("items", #nat(o.items.size())),
        ("subtotal", #nat(o.subtotal)),
        ("tax", #nat(o.tax)),
        ("shipping", #nat(o.shipping)),
        ("total", #nat(o.total)),
        ("currency", #text(o.currency)),
        ("customer_email", #text(o.customer_email)),
        ("encrypted_shipping", #text(optBlobToText(o.encrypted_shipping))),
        ("has_shipping_details", #bool(o.has_shipping_details)),
        ("payment_method", #text(pmToText(o.payment_method))),
        ("payment_status", #text(psToText(o.payment_status))),
        ("payment_reference", #text(optText(o.payment_reference))),
        ("customer_principal", #text(optPrincipalToText(o.customer_principal))),
        ("sweep_note", #text(optText(o.sweep_note))),
        ("shipping_status", #text(ssToText(o.shipping_status))),
        ("shipped_at", optIntToValue(o.shipped_at)),
        ("tracking_number", #text(optText(o.tracking_number))),
        ("marketing_consent", #bool(o.marketing_consent)),
        ("marketing_consent_at", optIntToValue(o.marketing_consent_at)),
        ("created_at", #int(o.created_at)),
        ("updated_at", #int(o.updated_at)),
      ]
    };

    func tokenToText(t : CryptoTypes.Token) : Text {
      switch t {
        case (#ckUSDC) "ckUSDC";
        case (#ICP) "ICP";
      };
    };

    func cryptoStatusToText(s : CryptoTypes.CryptoPaymentStatus) : Text {
      switch s {
        case (#awaiting_payment) "awaiting_payment";
        case (#paid _) "paid";
        case (#underpayment _) "underpayment";
        case (#overpayment _) "overpayment";
        case (#expired) "expired";
      };
    };

    func optNatToValue(o : ?Nat) : OQL.Value {
      switch o { case null { #null_ }; case (?n) { #nat(n) } };
    };

    func optIntToValue(o : ?Int) : OQL.Value {
      switch o { case null { #null_ }; case (?n) { #int(n) } };
    };

    func ssToText(s : Types.ShippingStatus) : Text {
      switch s {
        case (#pending) "pending";
        case (#shipped) "shipped";
      };
    };

    func optBlobToText(o : ?Blob) : Text {
      switch o { case null { "" }; case (?b) { blobToHex(b) } };
    };

    func hexDigit(n : Nat8) : Text {
      let v = n.toNat();
      if (v < 10) { v.toText() } else {
        switch v {
          case 10 { "a" };
          case 11 { "b" };
          case 12 { "c" };
          case 13 { "d" };
          case 14 { "e" };
          case _ { "f" };
        };
      };
    };

    func blobToHex(b : Blob) : Text {
      var hex = "";
      for (byte in b.toArray().values()) {
        hex := hex # hexDigit(byte / 16) # hexDigit(byte % 16);
      };
      hex;
    };

    func cryptoPaymentRow(p : CryptoTypes.CryptoPayment) : OQL.Entity.Row {
      [
        ("order_id", #nat(p.orderId)),
        ("reference", #text(p.reference)),
        ("token", #text(tokenToText(p.token))),
        ("amount_due", #nat(p.amountDue)),
        ("subaccount", #text(blobToHex(p.subaccount))),
        ("status", #text(cryptoStatusToText(p.status))),
        ("expires_at", #int(p.expiresAt)),
        ("confirmed_block_index", optNatToValue(p.confirmedBlockIndex)),
        ("created_at", #int(p.createdAt)),
        ("updated_at", #int(p.updatedAt)),
      ]
    };

    func ledgerRow(prefix : Text, l : CryptoTypes.LedgerConfig) : [(Text, OQL.Value)] {
      [
        (prefix # "_canister_id", #text(l.canisterId.toText())),
        (prefix # "_decimals", #nat(l.decimals.toNat())),
        (prefix # "_fee", #nat(l.fee)),
      ]
    };

    func cryptoConfigRow(c : CryptoTypes.CryptoConfig) : OQL.Entity.Row {
      [
        ("treasury_principal", #text(c.treasuryPrincipal.toText())),
        ("treasury_subaccount", #text(optBlobToText(c.treasurySubaccount))),
      ]
      .concat(ledgerRow("ckusdc", c.ckUSDC))
      .concat(ledgerRow("icp", c.icp));
    };

    // Payment service config row. The token is write-only and is NEVER exposed
    // through OQL — only the URL and a boolean "is it set" flag.
    func paymentServiceConfigRow(c : PaymentServiceTypes.PaymentServiceConfig) : OQL.Entity.Row {
      [
        ("url", #text(c.url)),
        ("token_set", #bool(c.token != "")),
      ]
    };

    // Late payment row: a payment received after the deposit window expired,
    // flagged for admin review and never discarded. Private (controller-only).
    func latePaymentRow(lp : RecoveryTypes.LatePayment) : OQL.Entity.Row {
      [
        ("reference", #text(lp.reference)),
        ("token", #text(tokenToText(lp.token))),
        ("received_amount", #nat(lp.receivedAmount)),
        ("expected_amount", #nat(lp.expectedAmount)),
        ("received_at", #int(lp.receivedAt)),
        ("reviewed", #bool(lp.reviewed)),
      ]
    };

    // Admin user row: the principal key and the role record it holds. Private
    // (controller-only). The principal is the map key, so the row function
    // receives the (principal, record) pair from the map entries.
    func adminRow(pair : (Principal, AdminTypes.UserRecord)) : OQL.Entity.Row {
      let (p, u) = pair;
      [
        ("principal", #text(p.toText())),
        ("role", #text(roleToText(u.role))),
        ("granted_at", #int(u.grantedAt)),
      ];
    };

    func roleToText(r : AdminTypes.Role) : Text {
      switch r {
        case (#owner) "owner";
        case (#admin) "admin";
        case (#staff) "staff";
      };
    };

    public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
        OutCall.transform(input);
    };

    public func getNAKPrice() : async Text {
        let url = "https://api.dexscreener.com/latest/dex/search?q=NAK/ICP";
        await OutCall.httpGetRequest(url, [], transform);
    };

    public func getTokenImage(chainId : Text, tokenAddress : Text) : async Text {
        let url = "https://api.dexscreener.com/tokens/v1/" # chainId # "/" # tokenAddress;
        await OutCall.httpGetRequest(url, [], transform);
    };

    public func getTokenProfile(chainId : Text, tokenAddress : Text) : async Text {
        let url = "https://api.dexscreener.com/token-profiles/latest/v1";
        let body = "{ \"chainId\": \"" # chainId # "\", \"tokenAddress\": \"" # tokenAddress # "\" }";
        let headers = [{ name = "Content-Type"; value = "application/json" }];
        await OutCall.httpPostRequest(url, headers, body, transform);
    };

    public func getTreasuryTokens() : async Text {
        let url = "https://r4tak-4iaaa-aaaac-qbw5a-cai.icp0.io/tokens";
        await OutCall.httpGetRequest(url, [], transform);
    };

    public func getDashboardData() : async Text {
        let url = "https://r4tak-4iaaa-aaaac-qbw5a-cai.icp0.io/dashboard";
        await OutCall.httpGetRequest(url, [], transform);
    };

    // Storefront state (stable, seeded by the migration chain)
    let products : List.List<Types.Product>;
    let orders : List.List<Types.Order>;
    let state : { var nextOrderId : Nat };

    // Crypto payment state (stable, seeded by the migration chain)
    let cryptoPayments : Map.Map<Text, CryptoTypes.CryptoPayment>;
    let cryptoConfig : CryptoTypes.CryptoConfig;

    // Payment service config (stable, seeded by the migration chain). The token
    // is write-only: it is stored here but never returned to any caller.
    let paymentServiceConfig : PaymentServiceTypes.PaymentServiceConfig;

    // Admin users (stable, seeded by the migration chain). Maps a principal to
    // its role record (OWNER/ADMIN/STAFF). Replaces the flat adminAllowlist
    // Set. Starts empty; the first principal claims ownership via
    // claimInitialAdmin().
    let adminUsers : Map.Map<Principal, AdminTypes.UserRecord>;

    // Persistent one-time-claim flag (stable, seeded by the migration chain).
    // Set true on the first successful claimInitialAdmin(). claimInitialAdmin
    // is gated on this flag being false (not merely on the allowlist being
    // empty), so an emptied allowlist can never silently reopen ownership.
    let initialAdminClaimed : { var initialAdminClaimed : Bool };

    // Minimum order total (in USD cents) required for crypto checkout (stable,
    // seeded by the migration chain, default $0.25). Crypto orders below this
    // are rejected server-side because they cannot be swept to the treasury
    // after the ledger transfer fee is deducted. Admin-configurable.
    let minimumOrder : { var minimumOrder : Nat };

    // Runtime icrc1_fee cache (stable, seeded by the migration chain). The
    // sweep queries icrc1_fee on the configured ledger at runtime and caches it
    // briefly rather than hardcoding it; the hardcoded ledger fee is only the
    // initial fallback before the first query.
    let feeCache : CryptoTypes.FeeCache;

    // Late payments received after the deposit window expired, flagged for
    // admin review and never discarded (stable, seeded by the migration chain).
    let latePayments : List.List<RecoveryTypes.LatePayment>;

    // Per-principal submission rate-limit state (stable, seeded by the
    // migration chain). Maps a caller principal to the timestamps of its recent
    // submissions so the canister can reject a burst of submissions from the
    // same principal, complementing the payment service's per-IP limit.
    let rateLimit : SubmissionTypes.RateLimitState;

    // Payment adapter (transient — recreated on restart, not persisted)
    transient let selfPrincipal = Principal.fromActor(Self);
    transient let paymentAdapter = CryptoPaymentsLib.cryptoAdapter(orders, products, cryptoPayments, cryptoConfig);

    // The vetKD key name for IBE derivation, read from the VETKD_KEY_NAME
    // canister environment variable (default "test_key_1"). Read transiently at
    // every (re)start because a migration module cannot call
    // Runtime.envVar<system>; the value is captured into the key id used for
    // every derivation. Changing VETKD_KEY_NAME on a later upgrade has no
    // effect on already-derived keys.
    transient let ibeKeyName = Runtime.envVar<system>("VETKD_KEY_NAME") ?? "test_key_1";

    // Verification timer handle (transient — a timer id is not stable state and
    // is recreated on restart). Registered/cancelled via the recovery API.
    transient let timerState = { var timerId = null : ?Timer.TimerId };

    // Auto-register the recurring payment-verification timer on every (re)start.
    // Transient fields are re-initialized on canister init AND post-upgrade, and
    // timers are not persisted across upgrades, so this re-registers the timer
    // after every upgrade. Verification therefore runs independent of the
    // browser tab even if no admin ever calls startVerificationTimer.
    transient let _verificationTimer = ignore {
      timerState.timerId := ?Timer.recurringTimer<system>(#seconds(30), func() : async () {
        ignore (await RecoveryLib.runVerificationPass(cryptoPayments, orders, products, latePayments, cryptoConfig, selfPrincipal, feeCache, paymentServiceConfig, emailTransform));
      });
    };

    include EmailApi(paymentServiceConfig, orders, adminUsers);
    include ConsentApi(paymentServiceConfig, adminUsers);
    include SweepApi(cryptoConfig, selfPrincipal, adminUsers, feeCache);
    include StorefrontApi(products, orders, state, paymentAdapter, adminUsers, minimumOrder, paymentServiceConfig, emailTransform);
    include PaymentAdapterApi(paymentAdapter);
    include CryptoPaymentsApi(orders, products, cryptoPayments, cryptoConfig, selfPrincipal, adminUsers, minimumOrder, feeCache);
    include PaymentServiceApi(paymentServiceConfig, orders, products, adminUsers);
    include AdminApi(adminUsers, initialAdminClaimed, selfPrincipal);
    include IbeApi(adminUsers, ibeKeyName);
    include RecoveryApi(orders, products, cryptoPayments, cryptoConfig, selfPrincipal, adminUsers, feeCache, latePayments, timerState, paymentServiceConfig, emailTransform);
    include SubmissionsApi(paymentServiceConfig, adminUsers, rateLimit);

    // OQL — expose persisted storefront data as queryable entities.
    // Products are a public catalogue; orders are private (controller-only).
    transient let productEntity = OQL.Entity.build(OQL.Entity.public_(OQL.Entity.sample(
      products.toEntity("product", "Product", "id", productRow),
      {
        id = 0;
        name = "";
        slug = "";
        description = "";
        price = 0;
        currency = "";
        images = [];
        category = "";
        variants = [];
        inventory = 0;
        active = true;
        admin_only = false;
        created_at = 0;
        updated_at = 0;
      }
    )));
    transient let orderEntity = OQL.Entity.build(OQL.Entity.controllerOnly(OQL.Entity.sample(
      orders.toEntity("order", "Order", "id", orderRow),
      {
        id = 0;
        reference = "";
        items = [];
        subtotal = 0;
        tax = 0;
        shipping = 0;
        total = 0;
        currency = "";
        customer_email = "";
        encrypted_shipping = null : ?Blob;
        has_shipping_details = false;
        payment_method = #manual;
        payment_status = #pending;
        payment_reference = null;
        customer_principal = null;
        sweep_note = null : ?Text;
        shipping_status = #pending;
        shipped_at = null : ?Int;
        tracking_number = null : ?Text;
        marketing_consent = false;
        marketing_consent_at = null : ?Int;
        created_at = 0 : Int;
        updated_at = 0 : Int;
      }
    )));
    // Crypto payment records are private (controller-only): they carry the
    // per-order subaccount, amount due, and payment status.
    transient let cryptoPaymentEntity = OQL.Entity.build(OQL.Entity.controllerOnly(OQL.Entity.sample(
      cryptoPayments.toEntity("cryptoPayment", "CryptoPayment", "reference", cryptoPaymentRow),
      {
        orderId = 0;
        reference = "";
        token = #ckUSDC;
        amountDue = 0;
        subaccount = "\00" : Blob;
        status = #awaiting_payment;
        expiresAt = 0 : Int;
        confirmedBlockIndex = null : ?Nat;
        createdAt = 0 : Int;
        updatedAt = 0 : Int;
      }
    )));
    // The crypto configuration (treasury destination + ledger configs) is a
    // single private row, controller-only.
    transient let cryptoConfigEntity = OQL.Entity.build(OQL.Entity.controllerOnly(OQL.Entity.sample(
      OQL.Entity.new<CryptoTypes.CryptoConfig>(
        "cryptoConfig",
        func () = [cryptoConfig].values(),
        "CryptoConfig",
        "treasury_principal",
        cryptoConfigRow,
      ),
      {
        var treasuryPrincipal = Principal.fromText("aaaaa-aa");
        var treasurySubaccount = null : ?Blob;
        var ckUSDC = { canisterId = Principal.fromText("aaaaa-aa"); decimals = 6 : Nat8; fee = 10_000 };
        var icp = { canisterId = Principal.fromText("aaaaa-aa"); decimals = 8 : Nat8; fee = 10_000 };
      }
    )));
    // The payment service configuration (URL + write-only token flag) is a
    // single private row, controller-only. The token value itself is never
    // exposed — only the URL and whether the token is set.
    transient let paymentServiceConfigEntity = OQL.Entity.build(OQL.Entity.controllerOnly(OQL.Entity.sample(
      OQL.Entity.new<PaymentServiceTypes.PaymentServiceConfig>(
        "paymentServiceConfig",
        func () = [paymentServiceConfig].values(),
        "PaymentServiceConfig",
        "url",
        paymentServiceConfigRow,
      ),
      {
        var url = "";
        var token = "";
      }
    )));
    // Late payments are private (controller-only): they carry the reference,
    // token, received/expected amounts, and review flag for admin recovery.
    transient let latePaymentEntity = OQL.Entity.build(OQL.Entity.controllerOnly(OQL.Entity.sample(
      latePayments.toEntity("latePayment", "LatePayment", "reference", latePaymentRow),
      {
        reference = "";
        token = #ckUSDC;
        receivedAmount = 0;
        expectedAmount = 0;
        receivedAt = 0 : Int;
        reviewed = false;
      }
    )));
    // The admin users map is private (controller-only): it lists the principals
    // holding a role and their role. It is never exposed to end users through
    // OQL.
    transient let adminEntity = OQL.Entity.build(OQL.Entity.controllerOnly(OQL.Entity.sample(
      OQL.Entity.new<(Principal, AdminTypes.UserRecord)>(
        "admin",
        func () = adminUsers.entries(),
        "Admin",
        "principal",
        adminRow,
      ),
      (Principal.fromText("aaaaa-aa"), { role = #staff; grantedAt = 0 : Int; })
    )));
    include Expose({
      entities = [productEntity, orderEntity, cryptoPaymentEntity, cryptoConfigEntity, paymentServiceConfigEntity, latePaymentEntity, adminEntity];
    });

    include ApiDocMixin();
};
