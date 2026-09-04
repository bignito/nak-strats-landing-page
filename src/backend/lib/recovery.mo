import Result "mo:core/Result";
import List "mo:core/List";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Types "../types/recovery";
import StorefrontTypes "../types/storefront";
import CryptoTypes "../types/crypto-payments";
import PaymentServiceTypes "../types/payment-service";
import CycleTypes "../types/cycle-monitor";
import CryptoPaymentsLib "./crypto-payments";
import CycleCountersLib "./cycle-counters";
import OutCall "mo:caffeineai-http-outcalls/outcall";

module {
  // ICRC-1 ledger interface (mirrors the one in crypto-payments.mo). Called via
  // actor(canisterId), not the ic package.
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

  func ledgerFor(token : CryptoTypes.Token, config : CryptoTypes.CryptoConfig) : CryptoTypes.LedgerConfig {
    switch token {
      case (#ckUSDC) { config.ckUSDC };
      case (#ICP) { config.icp };
    };
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

  // Builds the full ICRC-1 deposit account (owner + subaccount + text address)
  // for a crypto payment. The text address uses the standard ICRC-1 encoding
  // `owner.subaccount-hex` (the same form the frontend's encodeIcrcAccount
  // produces), so the displayed address and the address verification checks are
  // derived from the same subaccount blob.
  public func buildDepositAccount(payment : CryptoTypes.CryptoPayment, selfPrincipal : Principal) : Types.DepositAccount {
    {
      owner = selfPrincipal;
      subaccount = payment.subaccount;
      textAddress = selfPrincipal.toText() # "." # blobToHex(payment.subaccount);
    };
  };

  // Queries the LIVE on-ledger balance of a crypto payment's subaccount via
  // icrc1_balance_of on the configured ledger. A balance query failure traps
  // (the ICRC-1 balance_of returns a plain Nat and cannot return an error), so
  // it propagates as a reject rather than being silently swallowed.
  public func getLiveBalance(
    counters : CycleTypes.CycleCounters,
    cryptoPayments : Map.Map<Text, CryptoTypes.CryptoPayment>,
    reference : Text,
    config : CryptoTypes.CryptoConfig,
    selfPrincipal : Principal,
  ) : async Result.Result<Nat, Types.RecoveryError> {
    switch (cryptoPayments.get(reference)) {
      case null { #err(#notFound) };
      case (?payment) {
        let ledger = ledgerFor(payment.token, config);
        let ledgerActor : Ledger = actor (ledger.canisterId.toText());
        CycleCountersLib.incLedgerCalls(counters);
        let balance = await ledgerActor.icrc1_balance_of({ owner = selfPrincipal; subaccount = ?payment.subaccount });
        #ok(balance);
      };
    };
  };

  // Builds the admin recovery view for every order, including the live
  // on-ledger balance of each crypto order's subaccount.
  public func listOrdersForRecovery(
    counters : CycleTypes.CycleCounters,
    orders : List.List<StorefrontTypes.Order>,
    cryptoPayments : Map.Map<Text, CryptoTypes.CryptoPayment>,
    config : CryptoTypes.CryptoConfig,
    selfPrincipal : Principal,
  ) : async [Types.OrderRecoveryView] {
    let views = List.empty<Types.OrderRecoveryView>();
    for (order in orders.toArray().values()) {
      let payment = cryptoPayments.get(order.reference);
      let deposit = switch (payment) {
        case (?p) { ?buildDepositAccount(p, selfPrincipal) };
        case null { null };
      };
      let liveBalance = switch (payment) {
        case (?_) {
          switch (await getLiveBalance(counters, cryptoPayments, order.reference, config, selfPrincipal)) {
            case (#ok b) { b };
            case (#err _) { 0 };
          };
        };
        case null { 0 };
      };
      views.add({
        reference = order.reference;
        status = order.payment_status;
        paymentMethod = order.payment_method;
        amountOwed = order.total;
        depositAccount = deposit;
        liveBalance;
        expiresAt = switch (payment) { case (?p) { ?p.expiresAt }; case null { null } };
      });
    };
    views.toArray();
  };

  // Forces verification of a single order's payment immediately, returning the
  // current balance, status, and any error.
  public func forceRecheck(
    counters : CycleTypes.CycleCounters,
    cryptoPayments : Map.Map<Text, CryptoTypes.CryptoPayment>,
    reference : Text,
    config : CryptoTypes.CryptoConfig,
    selfPrincipal : Principal,
  ) : async Result.Result<Types.RecheckResult, Types.RecoveryError> {
    switch (cryptoPayments.get(reference)) {
      case null { #err(#notFound) };
      case (?payment) {
        let ledger = ledgerFor(payment.token, config);
        let ledgerActor : Ledger = actor (ledger.canisterId.toText());
        CycleCountersLib.incLedgerCalls(counters);
        let balance = await ledgerActor.icrc1_balance_of({ owner = selfPrincipal; subaccount = ?payment.subaccount });
        let status = if (balance >= payment.amountDue) {
          #paid({ blockIndex = payment.confirmedBlockIndex ?? 0 });
        } else if (balance > 0) {
          #underpayment({ expected = payment.amountDue; received = balance });
        } else {
          #awaiting_payment;
        };
        #ok({ reference; status; balance; error = null });
      };
    };
  };

  // Forces a sweep of a single order's subaccount to the treasury, returning
  // the exact ledger error on failure (never swallowed).
  public func forceSweep(
    counters : CycleTypes.CycleCounters,
    cryptoPayments : Map.Map<Text, CryptoTypes.CryptoPayment>,
    orders : List.List<StorefrontTypes.Order>,
    reference : Text,
    config : CryptoTypes.CryptoConfig,
    selfPrincipal : Principal,
    feeCache : CryptoTypes.FeeCache,
  ) : async Result.Result<Types.SweepResult, Types.RecoveryError> {
    switch (cryptoPayments.get(reference)) {
      case null { #err(#notFound) };
      case (?payment) {
        let ledger = ledgerFor(payment.token, config);
        let ledgerActor : Ledger = actor (ledger.canisterId.toText());
        CycleCountersLib.incLedgerCalls(counters);
        let balance = await ledgerActor.icrc1_balance_of({ owner = selfPrincipal; subaccount = ?payment.subaccount });
        let fee = await CryptoPaymentsLib.getRuntimeFee(counters, payment.token, config, feeCache);
        if (balance <= fee) {
          // Cannot sweep: after deducting the fee there is nothing left to
          // transfer. Record the skip on the order and return the exact reason.
          CryptoPaymentsLib.recordSweepNote(orders, reference, ?("sweep skipped: subaccount balance " # balance.toText() # " is not greater than the transfer fee " # fee.toText() # "; funds left in place"));
          #err(#sweepFailed("subaccount balance " # balance.toText() # " is not greater than the transfer fee " # fee.toText()));
        } else {
          let sweepAmount = balance - fee;
          CycleCountersLib.incLedgerCalls(counters);
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
              CryptoPaymentsLib.recordSweepNote(orders, reference, null);
              #ok({ reference = ?reference; blockIndex = ?blockIndex; error = null });
            };
            case (#Err e) {
              // Record the exact ledger error on the order so it is never silent.
              CryptoPaymentsLib.recordSweepNote(orders, reference, ?("sweep failed: " # debug_show(e)));
              #err(#sweepFailed(debug_show(e)));
            };
          };
        };
      };
    };
  };

  // Queries the canister's DEFAULT subaccount (no subaccount) balance on the
  // configured ckUSDC ledger.
  public func getDefaultSubaccountBalance(
    counters : CycleTypes.CycleCounters,
    config : CryptoTypes.CryptoConfig,
    selfPrincipal : Principal,
  ) : async Result.Result<Nat, Types.RecoveryError> {
    let ledgerActor : Ledger = actor (config.ckUSDC.canisterId.toText());
    CycleCountersLib.incLedgerCalls(counters);
    let balance = await ledgerActor.icrc1_balance_of({ owner = selfPrincipal; subaccount = null });
    #ok(balance);
  };

  // Sweeps the canister's DEFAULT subaccount balance to the treasury, returning
  // the exact ledger error on failure (never swallowed).
  public func sweepDefaultSubaccount(
    counters : CycleTypes.CycleCounters,
    config : CryptoTypes.CryptoConfig,
    selfPrincipal : Principal,
    feeCache : CryptoTypes.FeeCache,
  ) : async Result.Result<Types.SweepResult, Types.RecoveryError> {
    let ledgerActor : Ledger = actor (config.ckUSDC.canisterId.toText());
    CycleCountersLib.incLedgerCalls(counters);
    let balance = await ledgerActor.icrc1_balance_of({ owner = selfPrincipal; subaccount = null });
    let fee = await CryptoPaymentsLib.getRuntimeFee(counters, #ckUSDC, config, feeCache);
    if (balance <= fee) {
      #err(#sweepFailed("default subaccount balance " # balance.toText() # " is not greater than the transfer fee " # fee.toText()));
    } else {
      let sweepAmount = balance - fee;
      CycleCountersLib.incLedgerCalls(counters);
      let transferResult = await ledgerActor.icrc1_transfer({
        from_subaccount = null;
        to = { owner = config.treasuryPrincipal; subaccount = config.treasurySubaccount };
        amount = sweepAmount;
        fee = ?fee;
        memo = null;
        created_at_time = null;
      });
      switch transferResult {
        case (#Ok blockIndex) { #ok({ reference = null; blockIndex = ?blockIndex; error = null }) };
        case (#Err e) { #err(#sweepFailed(debug_show(e))) };
      };
    };
  };

  // Builds resume info for an in-progress deposit screen from stored state:
  // deposit details, status, expiry timestamp, and remaining time computed
  // server-side from the stored expiry. Synchronous — reads stored state only,
  // no ledger call, so it can be exposed as a query.
  public func getResumeInfo(
    cryptoPayments : Map.Map<Text, CryptoTypes.CryptoPayment>,
    reference : Text,
    config : CryptoTypes.CryptoConfig,
    selfPrincipal : Principal,
  ) : Result.Result<Types.ResumeInfo, Types.RecoveryError> {
    switch (cryptoPayments.get(reference)) {
      case null { #err(#notFound) };
      case (?payment) {
        let deposit = CryptoPaymentsLib.getDepositInfo(payment, config, selfPrincipal);
        let now = Time.now();
        let remaining = payment.expiresAt - now;
        #ok({
          reference;
          deposit = ?deposit;
          status = payment.status;
          expiresAt = payment.expiresAt;
          remainingNs = if (remaining < 0) { 0 } else { remaining };
        });
      };
    };
  };

  // Records a late payment received after expiry: stores the received amount
  // and flags it for admin review. Never discards the funds. Idempotent — a
  // reference is only ever recorded once.
  public func recordLatePayment(
    counters : CycleTypes.CycleCounters,
    cryptoPayments : Map.Map<Text, CryptoTypes.CryptoPayment>,
    latePayments : List.List<Types.LatePayment>,
    reference : Text,
    config : CryptoTypes.CryptoConfig,
    selfPrincipal : Principal,
  ) : async () {
    switch (cryptoPayments.get(reference)) {
      case null {};
      case (?payment) {
        if (latePayments.toArray().any(func lp = lp.reference == reference)) {
          return;
        };
        let ledger = ledgerFor(payment.token, config);
        let ledgerActor : Ledger = actor (ledger.canisterId.toText());
        CycleCountersLib.incLedgerCalls(counters);
        let balance = await ledgerActor.icrc1_balance_of({ owner = selfPrincipal; subaccount = ?payment.subaccount });
        latePayments.add({
          reference;
          token = payment.token;
          receivedAmount = balance;
          expectedAmount = payment.amountDue;
          receivedAt = Time.now();
          reviewed = false;
        });
      };
    };
  };

  // Lists all recorded late payments (admin review queue).
  public func listLatePayments(latePayments : List.List<Types.LatePayment>) : [Types.LatePayment] {
    latePayments.toArray();
  };

  // Marks a late payment as reviewed. Returns true when found and updated.
  public func markLatePaymentReviewed(latePayments : List.List<Types.LatePayment>, reference : Text) : Bool {
    var found = false;
    let snapshot = latePayments.toArray();
    latePayments.clear();
    for (lp in snapshot.values()) {
      if (lp.reference == reference) {
        latePayments.add({ lp with reviewed = true });
        found := true;
      } else {
        latePayments.add(lp);
      };
    };
    found;
  };

  // The recurring verification pass run by the backend timer: scans all
  // awaiting/underpayment crypto payments, runs verification, records late
  // payments received after expiry, and releases expired inventory. Returns the
  // number of payments processed. Runs independent of the browser tab.
  public func runVerificationPass(
    counters : CycleTypes.CycleCounters,
    cryptoPayments : Map.Map<Text, CryptoTypes.CryptoPayment>,
    orders : List.List<StorefrontTypes.Order>,
    products : List.List<StorefrontTypes.Product>,
    latePayments : List.List<Types.LatePayment>,
    config : CryptoTypes.CryptoConfig,
    selfPrincipal : Principal,
    feeCache : CryptoTypes.FeeCache,
    emailConfig : PaymentServiceTypes.PaymentServiceConfig,
    emailTransform : OutCall.Transform,
    checkCache : Map.Map<Text, CryptoTypes.CryptoCheckCacheEntry>,
  ) : async Nat {
    // Collect references first so we never mutate the map while iterating it.
    let refs = List.empty<Text>();
    for ((ref, _) in cryptoPayments.entries()) { refs.add(ref) };
    var processed = 0;
    for (reference in refs.toArray().values()) {
      switch (cryptoPayments.get(reference)) {
        case null {};
        case (?payment) {
          let st = payment.status;
          switch st {
            case (#paid _) {};
            case (#expired) {};
            case (_) {
              processed += 1;
              if (Time.now() > payment.expiresAt) {
                // Deposit window passed. Check whether funds arrived late.
                let ledger = ledgerFor(payment.token, config);
                let ledgerActor : Ledger = actor (ledger.canisterId.toText());
                CycleCountersLib.incLedgerCalls(counters);
                let balance = await ledgerActor.icrc1_balance_of({ owner = selfPrincipal; subaccount = ?payment.subaccount });
                if (balance > 0) {
                  // Late payment: record it for admin review, never discard.
                  await recordLatePayment(counters, cryptoPayments, latePayments, reference, config, selfPrincipal);
                } else {
                  // No funds: release reserved inventory and mark expired.
                  ignore (await CryptoPaymentsLib.releaseInventoryOnExpiry(products, orders, cryptoPayments, reference, checkCache));
                };
              } else {
                // Within the window: verify and confirm (sweep) when paid. Pass
                // the email config + transform so a confirmed crypto order
                // triggers its transactional order-confirmation email.
                ignore (await CryptoPaymentsLib.confirmPayment(counters, cryptoPayments, orders, reference, config, selfPrincipal, feeCache, emailConfig, emailTransform, checkCache));
              };
            };
          };
        };
      };
    };
    processed;
  };
};
