import Array "mo:core/Array";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Result "mo:core/Result";
import Map "mo:core/Map";
import List "mo:core/List";
import Types "../types/crypto-payments";
import StorefrontTypes "../types/storefront";
import PaymentServiceTypes "../types/payment-service";
import PaymentAdapterLib "./payment-adapter";
import EmailLib "./email";
import OutCall "mo:caffeineai-http-outcalls/outcall";

module {
  // ICRC-1 ledger interface (called via actor(canisterId), not the ic package).
  type Account = { owner : Principal; subaccount : ?Blob };

  type TransferArg = {
    from_subaccount : ?Blob;
    to : Account;
    amount : Nat;
    fee : ?Nat;
    memo : ?Blob;
    created_at_time : ?Nat64;
  };

  type TransferError = {
    #BadFee : { expected_fee : Nat };
    #BadBurn : { min_burn_amount : Nat };
    #InsufficientFunds : { balance : Nat };
    #TooOld;
    #CreatedInFuture : { ledger_time : Nat64 };
    #Duplicate : { duplicate_of : Nat };
    #TemporarilyUnavailable;
    #GenericError : { error_code : Nat; message : Text };
  };

  type Ledger = actor {
    icrc1_balance_of : shared query Account -> async Nat;
    icrc1_transfer : shared TransferArg -> async { #Ok : Nat; #Err : TransferError };
    icrc1_fee : shared query () -> async Nat;
  };

  // 30-minute deposit window, in nanoseconds.
  let DEPOSIT_WINDOW_NS : Int = 1_800_000_000_000;

  // How long a cached icrc1_fee is considered fresh, in nanoseconds (5 minutes).
  // The fee is queried from the ledger at runtime and cached briefly rather
  // than queried on every sweep.
  let FEE_CACHE_TTL_NS : Int = 300_000_000_000;

  func byteAt(value : Nat, position : Nat) : Nat8 {
    // position 0 = least significant byte.
    var v = value;
    var p = 0;
    while (p < position) { v := v / 256; p += 1 };
    (v % 256).toNat8();
  };

  func pow10(exp : Nat) : Nat {
    var result = 1;
    var e = 0;
    while (e < exp) { result *= 10; e += 1 };
    result;
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

  func ledgerFor(token : Types.Token, config : Types.CryptoConfig) : Types.LedgerConfig {
    switch token {
      case (#ckUSDC) { config.ckUSDC };
      case (#ICP) { config.icp };
    };
  };

  // Returns the icrc1_fee for the given token's ledger, queried at runtime and
  // cached briefly. The cache entry starts at the hardcoded ledger fee (the
  // fallback) and is refreshed from the ledger when stale (updatedAt == 0 or
  // older than FEE_CACHE_TTL_NS). The returned value is used for the sweep so a
  // ledger fee change never silently breaks sweeps.
  public func getRuntimeFee(
    token : Types.Token,
    config : Types.CryptoConfig,
    feeCache : Types.FeeCache,
  ) : async Nat {
    let ledger = ledgerFor(token, config);
    let entry = switch token {
      case (#ckUSDC) { feeCache.ckUSDC };
      case (#ICP) { feeCache.icp };
    };
    let now = Time.now();
    if (entry.updatedAt == 0 or now - entry.updatedAt > FEE_CACHE_TTL_NS) {
      let ledgerActor : Ledger = actor (ledger.canisterId.toText());
      let queried = await ledgerActor.icrc1_fee();
      entry.fee := queried;
      entry.updatedAt := now;
      queried;
    } else {
      entry.fee;
    };
  };

  // Records a sweep outcome note on the order with the given reference. Used to
  // record a skipped sweep (balance not greater than the fee) or a failed sweep
  // (including low cycles) so the system does not repeatedly fail silently.
  public func recordSweepNote(orders : List.List<StorefrontTypes.Order>, reference : Text, note : ?Text) {
    switch (orders.find(func o = o.reference == reference)) {
      case (?order) {
        let updated : StorefrontTypes.Order = {
          id = order.id;
          reference = order.reference;
          items = order.items;
          subtotal = order.subtotal;
          tax = order.tax;
          shipping = order.shipping;
          total = order.total;
          currency = order.currency;
          customer_email = order.customer_email;
          encrypted_shipping = order.encrypted_shipping;
          has_shipping_details = order.has_shipping_details;
          payment_method = order.payment_method;
          payment_status = order.payment_status;
          payment_reference = order.payment_reference;
          customer_principal = order.customer_principal;
          sweep_note = note;
          shipping_status = order.shipping_status;
          shipped_at = order.shipped_at;
          tracking_number = order.tracking_number;
          marketing_consent = order.marketing_consent;
          marketing_consent_at = order.marketing_consent_at;
          created_at = order.created_at;
          updated_at = Time.now();
        };
        let snapshot = orders.toArray();
        orders.clear();
        for (o in snapshot.values()) {
          if (o.reference == reference) { orders.add(updated) } else { orders.add(o) };
        };
      };
      case null {};
    };
  };

  public func deriveSubaccount(orderId : Nat) : Blob {
    // 32-byte big-endian encoding of the order id.
    let bytes = Array.tabulate(32, func i = byteAt(orderId, 31 - i));
    bytes.toBlob();
  };

  public func computeAmountDue(order : StorefrontTypes.Order, decimals : Nat8) : Nat {
    // order.total is in cents; convert to the token's smallest units.
    // ckUSDC has 6 decimals -> scale = 10^(6-2) = 10^4.
    let scale = pow10(decimals.toNat() - 2);
    order.total * scale;
  };

  public func createPayment(
    cryptoPayments : Map.Map<Text, Types.CryptoPayment>,
    order : StorefrontTypes.Order,
    token : Types.Token,
    config : Types.CryptoConfig,
  ) : Result.Result<Types.CryptoPayment, Types.CryptoPaymentError> {
    // Idempotent: a payment already exists for this reference.
    switch (cryptoPayments.get(order.reference)) {
      case (?existing) { return #ok(existing) };
      case null {};
    };
    let ledger = ledgerFor(token, config);
    let subaccount = deriveSubaccount(order.id);
    let amountDue = computeAmountDue(order, ledger.decimals);
    let now = Time.now();
    let payment : Types.CryptoPayment = {
      orderId = order.id;
      reference = order.reference;
      token;
      amountDue;
      subaccount;
      status = #awaiting_payment;
      expiresAt = now + DEPOSIT_WINDOW_NS;
      confirmedBlockIndex = null;
      createdAt = now;
      updatedAt = now;
    };
    cryptoPayments.add(order.reference, payment);
    #ok(payment);
  };

  public func getPayment(cryptoPayments : Map.Map<Text, Types.CryptoPayment>, reference : Text) : ?Types.CryptoPayment {
    cryptoPayments.get(reference);
  };

  public func getDepositInfo(payment : Types.CryptoPayment, config : Types.CryptoConfig, selfPrincipal : Principal) : Types.DepositInfo {
    let ledger = ledgerFor(payment.token, config);
    {
      reference = payment.reference;
      token = payment.token;
      address = selfPrincipal;
      subaccount = payment.subaccount;
      amountDue = payment.amountDue;
      decimals = ledger.decimals;
      expiresAt = payment.expiresAt;
      qrPayload = selfPrincipal.toText() # ":" # blobToHex(payment.subaccount) # ":" # payment.amountDue.toText();
    };
  };

  // Builds the admin row view for an order in the admin Orders list. When the
  // order has no crypto payment (e.g. manual/card), the crypto-specific fields
  // are empty.
  public func buildAdminOrderView(
    order : StorefrontTypes.Order,
    payment : ?Types.CryptoPayment,
    selfPrincipal : Principal,
  ) : Types.AdminOrderView {
    let subaccountHex = switch (payment) {
      case (?p) { blobToHex(p.subaccount) };
      case null { "" };
    };
    let depositAccountText = switch (payment) {
      case (?p) { selfPrincipal.toText() # "." # blobToHex(p.subaccount) };
      case null { "" };
    };
    {
      reference = order.reference;
      createdAt = order.created_at;
      status = order.payment_status;
      cryptoStatus = switch (payment) { case (?p) { ?p.status }; case null { null } };
      paymentMethod = order.payment_method;
      amountOwed = order.total;
      currency = order.currency;
      itemCount = order.items.size();
      customerEmail = order.customer_email;
      subaccountHex;
      depositAccountText;
      sweepNote = order.sweep_note;
    };
  };

  // Builds the admin full-detail view for an order, including line items and
  // crypto payment status plus the deposit account info.
  public func buildAdminOrderDetail(
    order : StorefrontTypes.Order,
    payment : ?Types.CryptoPayment,
    selfPrincipal : Principal,
  ) : Types.AdminOrderDetail {
    let subaccountHex = switch (payment) {
      case (?p) { blobToHex(p.subaccount) };
      case null { "" };
    };
    let depositAccountText = switch (payment) {
      case (?p) { selfPrincipal.toText() # "." # blobToHex(p.subaccount) };
      case null { "" };
    };
    {
      reference = order.reference;
      createdAt = order.created_at;
      updatedAt = order.updated_at;
      status = order.payment_status;
      cryptoStatus = switch (payment) { case (?p) { ?p.status }; case null { null } };
      paymentMethod = order.payment_method;
      amountOwed = order.total;
      currency = order.currency;
      items = order.items;
      customerEmail = order.customer_email;
      encryptedShipping = order.encrypted_shipping;
      hasShippingDetails = order.has_shipping_details;
      subaccountHex;
      depositAccountText;
      sweepNote = order.sweep_note;
    };
  };

  // True when an order needs admin review: underpaid, overpaid, paid-but-not-
  // swept, expired-but-funded, or sweep-failed. Derived from the crypto payment
  // status variants and the order's sweep note (a sweep note means the last
  // sweep was skipped or failed, so funds may still be sitting in the
  // subaccount).
  public func isNeedsReview(order : StorefrontTypes.Order, payment : ?Types.CryptoPayment) : Bool {
    switch (payment) {
      case null { false };
      case (?p) {
        switch (p.status) {
          case (#underpayment _) { true };
          case (#overpayment _) { true };
          case (#paid _) {
            switch (order.sweep_note) {
              case (?_) { true };
              case null { false };
            };
          };
          case (#expired) {
            switch (order.sweep_note) {
              case (?_) { true };
              case null { false };
            };
          };
          case (#awaiting_payment) {
            // Sweep-failed and expired-but-funded orders can remain in
            // #awaiting_payment but carry a sweep_note (the last sweep was
            // skipped or failed, so funds may still sit in the subaccount).
            // A sweep note on an awaiting-payment order means it needs review.
            switch (order.sweep_note) {
              case (?_) { true };
              case null { false };
            };
          };
        };
      };
    };
  };

  // Matches an order against one of the admin Orders list filters: all,
  // awaiting_payment, paid, expired, cancelled, needs_review.
  public func matchesFilter(
    order : StorefrontTypes.Order,
    payment : ?Types.CryptoPayment,
    filter : Text,
  ) : Bool {
    switch (filter) {
      case "all" { true };
      case "awaiting_payment" {
        switch (payment) {
          case (?p) {
            switch (p.status) {
              case (#awaiting_payment) { true };
              case (_) { false };
            };
          };
          case null { false };
        };
      };
      case "paid" { order.payment_status == #paid };
      case "expired" { order.payment_status == #expired };
      case "cancelled" { order.payment_status == #cancelled };
      case "needs_review" { isNeedsReview(order, payment) };
      case _ { false };
    };
  };

  public func checkPayment(
    cryptoPayments : Map.Map<Text, Types.CryptoPayment>,
    reference : Text,
    config : Types.CryptoConfig,
    selfPrincipal : Principal,
  ) : async Result.Result<Types.CryptoPaymentStatus, Types.CryptoPaymentError> {
    switch (cryptoPayments.get(reference)) {
      case null { #err(#notFound) };
      case (?payment) {
        if (Time.now() > payment.expiresAt) {
          return #err(#expired);
        };
        let ledger = ledgerFor(payment.token, config);
        let ledgerActor : Ledger = actor (ledger.canisterId.toText());
        let balance = await ledgerActor.icrc1_balance_of({ owner = selfPrincipal; subaccount = ?payment.subaccount });
        if (balance >= payment.amountDue) {
          // Overpayment is accepted; the excess is swept with the principal.
          #ok(#paid({ blockIndex = payment.confirmedBlockIndex ?? 0 }));
        } else if (balance > 0) {
          #ok(#underpayment(({ expected = payment.amountDue; received = balance })));
        } else {
          #ok(#awaiting_payment);
        };
      };
    };
  };

  public func confirmPayment(
    cryptoPayments : Map.Map<Text, Types.CryptoPayment>,
    orders : List.List<StorefrontTypes.Order>,
    reference : Text,
    config : Types.CryptoConfig,
    selfPrincipal : Principal,
    feeCache : Types.FeeCache,
    emailConfig : PaymentServiceTypes.PaymentServiceConfig,
    emailTransform : OutCall.Transform,
  ) : async Result.Result<Types.CryptoPaymentStatus, Types.CryptoPaymentError> {
    switch (cryptoPayments.get(reference)) {
      case null { #err(#notFound) };
      case (?payment) {
        // Idempotent: never re-confirm an already-paid payment.
        let st = payment.status;
        switch st {
          case (#paid _) { return #ok(payment.status) };
          case (_) {};
        };
        if (Time.now() > payment.expiresAt) {
          return #err(#expired);
        };
        let ledger = ledgerFor(payment.token, config);
        let ledgerActor : Ledger = actor (ledger.canisterId.toText());
        let balance = await ledgerActor.icrc1_balance_of({ owner = selfPrincipal; subaccount = ?payment.subaccount });
        if (balance < payment.amountDue) {
          if (balance > 0) {
            return #ok(#underpayment(({ expected = payment.amountDue; received = balance })));
          };
          return #ok(#awaiting_payment);
        };
        // balance >= amountDue: sweep the funds to the treasury and confirm.
        // The transfer fee is queried from the ledger at runtime (cached
        // briefly) rather than hardcoded, so a fee change never silently breaks
        // the sweep.
        let fee = await getRuntimeFee(payment.token, config, feeCache);
        if (balance <= fee) {
          // Cannot sweep: after deducting the fee there is nothing left to
          // transfer and the ledger rejects a zero-value transfer. Skip the
          // sweep, leave the funds in the subaccount, and record the skip on
          // the order so we do not repeatedly fail. The payment is still
          // confirmed (funds were received); blockIndex 0 signals no transfer.
          recordSweepNote(orders, reference, ?("sweep skipped: subaccount balance " # balance.toText() # " is not greater than the transfer fee " # fee.toText() # "; funds left in place"));
          let updated : Types.CryptoPayment = {
            orderId = payment.orderId;
            reference = payment.reference;
            token = payment.token;
            amountDue = payment.amountDue;
            subaccount = payment.subaccount;
            status = #paid({ blockIndex = 0 });
            expiresAt = payment.expiresAt;
            confirmedBlockIndex = null;
            createdAt = payment.createdAt;
            updatedAt = Time.now();
          };
          cryptoPayments.add(reference, updated);
          switch (orders.find(func o = o.reference == reference)) {
            case (?order) {
              let updatedOrder : StorefrontTypes.Order = {
                id = order.id;
                reference = order.reference;
                items = order.items;
                subtotal = order.subtotal;
                tax = order.tax;
                shipping = order.shipping;
                total = order.total;
                currency = order.currency;
                customer_email = order.customer_email;
                encrypted_shipping = order.encrypted_shipping;
                has_shipping_details = order.has_shipping_details;
                payment_method = order.payment_method;
                payment_status = #paid;
                payment_reference = ?reference;
                customer_principal = order.customer_principal;
                sweep_note = order.sweep_note;
                shipping_status = order.shipping_status;
                shipped_at = order.shipped_at;
                tracking_number = order.tracking_number;
                marketing_consent = order.marketing_consent;
                marketing_consent_at = order.marketing_consent_at;
                created_at = order.created_at;
                updated_at = Time.now();
              };
              let orderSnapshot = orders.toArray();
              orders.clear();
              for (o in orderSnapshot.values()) {
                if (o.reference == reference) { orders.add(updatedOrder) } else { orders.add(o) };
              };
            };
            case null {};
          };
          // Crypto order confirmed (funds received, sweep skipped): send the
          // order confirmation email. Transactional — sends regardless of
          // marketing consent.
          ignore (await EmailLib.sendOrderConfirmation(emailConfig, orders, reference, emailTransform));
          return #ok(#paid({ blockIndex = 0 }));
        };
        let sweepAmount = balance - fee;
        let transferResult = await ledgerActor.icrc1_transfer({
          from_subaccount = ?payment.subaccount;
          to = { owner = config.treasuryPrincipal; subaccount = config.treasurySubaccount };
          amount = sweepAmount;
          fee = ?fee;
          memo = null;
          created_at_time = null;
        });
        switch transferResult {
          case (#Ok blockIndex) {
            // Sweep succeeded: clear any prior sweep note on the order.
            recordSweepNote(orders, reference, null);
            let updated : Types.CryptoPayment = {
              orderId = payment.orderId;
              reference = payment.reference;
              token = payment.token;
              amountDue = payment.amountDue;
              subaccount = payment.subaccount;
              status = #paid({ blockIndex });
              expiresAt = payment.expiresAt;
              confirmedBlockIndex = ?blockIndex;
              createdAt = payment.createdAt;
              updatedAt = Time.now();
            };
            cryptoPayments.add(reference, updated);
            // Keep the order lifecycle consistent: mark the order #paid and
            // record the payment reference, mirroring releaseInventoryOnExpiry
            // which marks the order #expired. Idempotent: the payment is only
            // confirmed once (guarded above), so the order is updated once.
            switch (orders.find(func o = o.reference == reference)) {
              case (?order) {
                let updatedOrder : StorefrontTypes.Order = {
                  id = order.id;
                  reference = order.reference;
                  items = order.items;
                  subtotal = order.subtotal;
                  tax = order.tax;
                  shipping = order.shipping;
                  total = order.total;
                  currency = order.currency;
                  customer_email = order.customer_email;
                  encrypted_shipping = order.encrypted_shipping;
                  has_shipping_details = order.has_shipping_details;
                  payment_method = order.payment_method;
                  payment_status = #paid;
                  payment_reference = ?reference;
                  customer_principal = order.customer_principal;
                  sweep_note = order.sweep_note;
                  shipping_status = order.shipping_status;
                  shipped_at = order.shipped_at;
                  tracking_number = order.tracking_number;
                  marketing_consent = order.marketing_consent;
                  marketing_consent_at = order.marketing_consent_at;
                  created_at = order.created_at;
                  updated_at = Time.now();
                };
                let orderSnapshot = orders.toArray();
                orders.clear();
                for (o in orderSnapshot.values()) {
                  if (o.reference == reference) { orders.add(updatedOrder) } else { orders.add(o) };
                };
              };
              case null {};
            };
            // Crypto order confirmed and swept: send the order confirmation
            // email. Transactional — sends regardless of marketing consent.
            ignore (await EmailLib.sendOrderConfirmation(emailConfig, orders, reference, emailTransform));
            #ok(#paid({ blockIndex }));
          };
          case (#Err e) {
            // Record the sweep failure on the order so it is not silent.
            recordSweepNote(orders, reference, ?("sweep failed: " # debug_show(e)));
            #err(#sweepFailed(debug_show(e)));
          };
        };
      };
    };
  };

  public func sweepToTreasury(
    cryptoPayments : Map.Map<Text, Types.CryptoPayment>,
    orders : List.List<StorefrontTypes.Order>,
    reference : Text,
    config : Types.CryptoConfig,
    selfPrincipal : Principal,
    feeCache : Types.FeeCache,
  ) : async Result.Result<Nat, Types.CryptoPaymentError> {
    switch (cryptoPayments.get(reference)) {
      case null { #err(#notFound) };
      case (?payment) {
        let ledger = ledgerFor(payment.token, config);
        let ledgerActor : Ledger = actor (ledger.canisterId.toText());
        let balance = await ledgerActor.icrc1_balance_of({ owner = selfPrincipal; subaccount = ?payment.subaccount });
        // The transfer fee is queried from the ledger at runtime (cached
        // briefly) rather than hardcoded, so a fee change never silently breaks
        // the sweep.
        let fee = await getRuntimeFee(payment.token, config, feeCache);
        if (balance <= fee) {
          // Skip the sweep: after deducting the fee there is nothing left to
          // transfer and the ledger rejects a zero-value transfer. Leave the
          // funds in the subaccount and record the skip on the order so we do
          // not repeatedly fail. Returns #ok(0) to signal a successful no-op.
          recordSweepNote(orders, reference, ?("sweep skipped: subaccount balance " # balance.toText() # " is not greater than the transfer fee " # fee.toText() # "; funds left in place"));
          return #ok(0);
        };
        let sweepAmount = balance - fee;
        let transferResult = await ledgerActor.icrc1_transfer({
          from_subaccount = ?payment.subaccount;
          to = { owner = config.treasuryPrincipal; subaccount = config.treasurySubaccount };
          amount = sweepAmount;
          fee = ?fee;
          memo = null;
          created_at_time = null;
        });
        switch transferResult {
          case (#Ok blockIndex) {
            // Sweep succeeded: clear any prior sweep note on the order.
            recordSweepNote(orders, reference, null);
            #ok(blockIndex);
          };
          case (#Err e) {
            // Record the sweep failure on the order so it is not silent.
            recordSweepNote(orders, reference, ?("sweep failed: " # debug_show(e)));
            #err(#sweepFailed(debug_show(e)));
          };
        };
      };
    };
  };

  public func releaseInventoryOnExpiry(
    products : List.List<StorefrontTypes.Product>,
    orders : List.List<StorefrontTypes.Order>,
    cryptoPayments : Map.Map<Text, Types.CryptoPayment>,
    reference : Text,
  ) : async Result.Result<(), Types.CryptoPaymentError> {
    switch (cryptoPayments.get(reference)) {
      case null { #err(#notFound) };
      case (?payment) {
        if (Time.now() <= payment.expiresAt) {
          return #ok();
        };
        let st = payment.status;
        switch st {
          case (#paid _) { return #ok() };
          case (#expired) { return #ok() };
          case (_) {};
        };
        // Restore inventory reserved at order creation.
        switch (orders.find(func o = o.reference == reference)) {
          case (?order) {
            for (item in order.items.values()) {
              switch (products.find(func p = p.id == item.product_id)) {
                case (?product) {
                  let newVariants = product.variants.map(func v =
                    if (v.id == item.variant_id) { { v with inventory = v.inventory + item.quantity } } else { v }
                  );
                  let updated = { product with variants = newVariants; inventory = product.inventory + item.quantity; updated_at = Time.now() };
                  let snapshot = products.toArray();
                  products.clear();
                  for (p in snapshot.values()) {
                    if (p.id == updated.id) { products.add(updated) } else { products.add(p) };
                  };
                };
                case null {};
              };
            };
            let updatedOrder : StorefrontTypes.Order = {
              id = order.id;
              reference = order.reference;
              items = order.items;
              subtotal = order.subtotal;
              tax = order.tax;
              shipping = order.shipping;
              total = order.total;
              currency = order.currency;
              customer_email = order.customer_email;
              encrypted_shipping = order.encrypted_shipping;
              has_shipping_details = order.has_shipping_details;
              payment_method = order.payment_method;
              payment_status = #expired;
              payment_reference = order.payment_reference;
              customer_principal = order.customer_principal;
              sweep_note = order.sweep_note;
              shipping_status = order.shipping_status;
              shipped_at = order.shipped_at;
              tracking_number = order.tracking_number;
              marketing_consent = order.marketing_consent;
              marketing_consent_at = order.marketing_consent_at;
              created_at = order.created_at;
              updated_at = Time.now();
            };
            let orderSnapshot = orders.toArray();
            orders.clear();
            for (o in orderSnapshot.values()) {
              if (o.reference == reference) { orders.add(updatedOrder) } else { orders.add(o) };
            };
          };
          case null {};
        };
        let updatedPayment : Types.CryptoPayment = {
          orderId = payment.orderId;
          reference = payment.reference;
          token = payment.token;
          amountDue = payment.amountDue;
          subaccount = payment.subaccount;
          status = #expired;
          expiresAt = payment.expiresAt;
          confirmedBlockIndex = payment.confirmedBlockIndex;
          createdAt = payment.createdAt;
          updatedAt = Time.now();
        };
        cryptoPayments.add(reference, updatedPayment);
        #ok();
      };
    };
  };

  public func cryptoAdapter(
    orders : List.List<StorefrontTypes.Order>,
    products : List.List<StorefrontTypes.Product>,
    cryptoPayments : Map.Map<Text, Types.CryptoPayment>,
    config : Types.CryptoConfig,
  ) : PaymentAdapterLib.PaymentAdapter {
    let manual = PaymentAdapterLib.manualAdapter(orders);
    {
      createCheckoutSession = func(order : StorefrontTypes.Order) : async Result.Result<PaymentAdapterLib.CheckoutSession, PaymentAdapterLib.PaymentError> {
        let pm = order.payment_method;
        switch pm {
          case (#crypto_ckusdc) {
            // Temporary-disable flag: while CKUSDC_CHECKOUT_ENABLED is false,
            // reject ckUSDC checkout sessions so a direct canister call cannot
            // create a ckUSDC payment. Existing ckUSDC orders are unaffected.
            if (not Types.CKUSDC_CHECKOUT_ENABLED) {
              return #err(#paymentFailed("ckUSDC checkout is temporarily disabled"));
            };
            switch (createPayment(cryptoPayments, order, #ckUSDC, config)) {
              case (#ok payment) { #ok({ reference = payment.reference; url = null }) };
              case (#err e) { #err(#paymentFailed(debug_show(e))) };
            };
          };
          case (#crypto_icp) {
            #err(#paymentFailed("ICP payments are disabled: a rate oracle is required"));
          };
          case (_) { await manual.createCheckoutSession(order) };
        };
      };
      getPaymentStatus = func(reference : Text) : async StorefrontTypes.PaymentStatus {
        switch (cryptoPayments.get(reference)) {
          case (?payment) {
            let st = payment.status;
            switch st {
              case (#paid _) { #paid };
              case (#expired) { #expired };
              case (_) { #pending };
            };
          };
          case null { await manual.getPaymentStatus(reference) };
        };
      };
      handlePaymentConfirmation = func(payload : Text) : async Result.Result<(), PaymentAdapterLib.PaymentError> {
        await manual.handlePaymentConfirmation(payload);
      };
    };
  };
};
