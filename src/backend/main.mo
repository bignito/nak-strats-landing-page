import OutCall "mo:caffeineai-http-outcalls/outcall";
import List "mo:core/List";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Types "types/storefront";
import CryptoTypes "types/crypto-payments";
import StorefrontApi "mixins/storefront-api";
import PaymentAdapterApi "mixins/payment-adapter-api";
import CryptoPaymentsApi "mixins/crypto-payments-api";
import CryptoPaymentsLib "lib/crypto-payments";
import OQL "mo:caffeineai-oql";
import Expose "mo:caffeineai-oql/Expose";
import ListEntity "mo:caffeineai-oql/ListEntity";
import MapEntity "mo:caffeineai-oql/MapEntity";
import ApiDocMixin "mixins/api-doc";

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

    func addrToText(a : Types.ShippingAddress) : Text {
      a.line1 # ", " # a.city # ", " # a.region # " " # a.postal_code # ", " # a.country;
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
        ("customer_name", #text(o.customer_name)),
        ("shipping_address", #text(addrToText(o.shipping_address))),
        ("payment_method", #text(pmToText(o.payment_method))),
        ("payment_status", #text(psToText(o.payment_status))),
        ("payment_reference", #text(optText(o.payment_reference))),
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

    // Payment adapter (transient — recreated on restart, not persisted)
    transient let selfPrincipal = Principal.fromActor(Self);
    transient let paymentAdapter = CryptoPaymentsLib.cryptoAdapter(orders, products, cryptoPayments, cryptoConfig);

    include StorefrontApi(products, orders, state, paymentAdapter);
    include PaymentAdapterApi(paymentAdapter);
    include CryptoPaymentsApi(orders, products, cryptoPayments, cryptoConfig, selfPrincipal);

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
        customer_name = "";
        shipping_address = {
          line1 = "";
          line2 = null;
          city = "";
          region = "";
          postal_code = "";
          country = "";
        };
        payment_method = #manual;
        payment_status = #pending;
        payment_reference = null;
        created_at = 0;
        updated_at = 0;
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
    include Expose({
      entities = [productEntity, orderEntity, cryptoPaymentEntity, cryptoConfigEntity];
    });

    include ApiDocMixin();
};
