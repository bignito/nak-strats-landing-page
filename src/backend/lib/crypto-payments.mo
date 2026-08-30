import Array "mo:core/Array";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Result "mo:core/Result";
import Map "mo:core/Map";
import List "mo:core/List";
import Types "../types/crypto-payments";
import StorefrontTypes "../types/storefront";
import PaymentAdapterLib "./payment-adapter";

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
        let fee = ledger.fee;
        if (balance <= fee) {
          return #err(#sweepFailed("insufficient balance to cover transfer fee"));
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
                  customer_name = order.customer_name;
                  shipping_address = order.shipping_address;
                  payment_method = order.payment_method;
                  payment_status = #paid;
                  payment_reference = ?reference;
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
            #ok(#paid({ blockIndex }));
          };
          case (#Err e) { #err(#sweepFailed(debug_show(e))) };
        };
      };
    };
  };

  public func sweepToTreasury(
    cryptoPayments : Map.Map<Text, Types.CryptoPayment>,
    reference : Text,
    config : Types.CryptoConfig,
    selfPrincipal : Principal,
  ) : async Result.Result<Nat, Types.CryptoPaymentError> {
    switch (cryptoPayments.get(reference)) {
      case null { #err(#notFound) };
      case (?payment) {
        let ledger = ledgerFor(payment.token, config);
        let ledgerActor : Ledger = actor (ledger.canisterId.toText());
        let balance = await ledgerActor.icrc1_balance_of({ owner = selfPrincipal; subaccount = ?payment.subaccount });
        let fee = ledger.fee;
        if (balance <= fee) {
          return #err(#sweepFailed("insufficient balance to cover transfer fee"));
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
          case (#Ok blockIndex) { #ok(blockIndex) };
          case (#Err e) { #err(#sweepFailed(debug_show(e))) };
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
              customer_name = order.customer_name;
              shipping_address = order.shipping_address;
              payment_method = order.payment_method;
              payment_status = #expired;
              payment_reference = order.payment_reference;
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
