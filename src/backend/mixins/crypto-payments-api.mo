import Result "mo:core/Result";
import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Types "../types/crypto-payments";
import StorefrontTypes "../types/storefront";
import CryptoPaymentsLib "../lib/crypto-payments";
import AdminLib "../lib/admin-access-control";
import AdminTypes "../types/admin-access-control";

mixin (
  orders : List.List<StorefrontTypes.Order>,
  products : List.List<StorefrontTypes.Product>,
  cryptoPayments : Map.Map<Text, Types.CryptoPayment>,
  cryptoConfig : Types.CryptoConfig,
  selfPrincipal : Principal,
  adminUsers : AdminTypes.AdminUsers,
  minimumOrderState : { var minimumOrder : Nat },
  feeCache : Types.FeeCache,
) {
  public query func getCryptoConfig() : async Types.CryptoConfigView {
    {
      treasuryPrincipal = cryptoConfig.treasuryPrincipal;
      treasurySubaccount = cryptoConfig.treasurySubaccount;
      ckUSDC = cryptoConfig.ckUSDC;
      icp = cryptoConfig.icp;
      minimumOrder = minimumOrderState.minimumOrder;
      ckUSDCEnabled = Types.CKUSDC_CHECKOUT_ENABLED;
    };
  };

  // Public query: returns the current minimum order total (in USD cents)
  // required for crypto checkout.
  public query func getMinimumOrder() : async Nat {
    minimumOrderState.minimumOrder;
  };

  // Admin-only: sets the minimum order total (in USD cents) required for crypto
  // checkout. Crypto orders below this are rejected server-side because they
  // cannot be swept to the treasury after the ledger transfer fee is deducted.
  public shared ({ caller }) func updateMinimumOrder(minimum : Nat) : async Result.Result<(), Types.CryptoPaymentError> {
    AdminLib.requireAdminOrOwner(adminUsers, caller);
    minimumOrderState.minimumOrder := minimum;
    #ok();
  };

  public query func getCryptoDepositInfo(reference : Text) : async Result.Result<Types.DepositInfo, Types.CryptoPaymentError> {
    switch (CryptoPaymentsLib.getPayment(cryptoPayments, reference)) {
      case null { #err(#notFound) };
      case (?payment) { #ok(CryptoPaymentsLib.getDepositInfo(payment, cryptoConfig, selfPrincipal)) };
    };
  };

  public query func getCryptoPaymentStatus(reference : Text) : async Result.Result<Types.CryptoPaymentStatus, Types.CryptoPaymentError> {
    switch (CryptoPaymentsLib.getPayment(cryptoPayments, reference)) {
      case null { #err(#notFound) };
      case (?payment) { #ok(payment.status) };
    };
  };

  // Customer-facing ledger re-check for their own order. Reads the live
  // on-ledger balance via icrc1_balance_of and returns the current status. It
  // NEVER marks an order paid or sweeps funds — it only reports what the ledger
  // holds. Actual confirmation (sweep + mark paid) is driven by the background
  // verification timer, never by an arbitrary caller.
  public func checkCryptoPayment(reference : Text) : async Result.Result<Types.CryptoPaymentStatus, Types.CryptoPaymentError> {
    await CryptoPaymentsLib.checkPayment(cryptoPayments, reference, cryptoConfig, selfPrincipal);
  };

  // Admin-only: sweeps a single order's subaccount to the treasury. Requires a
  // non-anonymous admin caller. The anonymous principal is rejected by
  // AdminLib.requireAdmin.
  public shared ({ caller }) func sweepCryptoToTreasury(reference : Text) : async Result.Result<Nat, Types.CryptoPaymentError> {
    AdminLib.requireAdminOrOwner(adminUsers, caller);
    await CryptoPaymentsLib.sweepToTreasury(cryptoPayments, orders, reference, cryptoConfig, selfPrincipal, feeCache);
  };

  // Admin-only: scan for expired awaiting_payment orders and release their
  // reserved inventory, marking them expired. Requires a non-anonymous admin
  // caller. The anonymous principal is rejected by AdminLib.requireAdmin.
  public shared ({ caller }) func releaseExpiredOrders() : async Nat {
    AdminLib.requireAdminOrOwner(adminUsers, caller);
    var released = 0;
    for ((reference, payment) in cryptoPayments.entries()) {
      let st = payment.status;
      switch st {
        case (#paid _) {};
        case (#expired) {};
        case (_) {
          if (Time.now() > payment.expiresAt) {
            switch (await CryptoPaymentsLib.releaseInventoryOnExpiry(products, orders, cryptoPayments, reference)) {
              case (#ok()) { released += 1 };
              case (#err _) {};
            };
          };
        };
      };
    };
    released;
  };

  // Admin-only: lists all orders as admin row views, filtered by one of: all,
  // awaiting_payment, paid, expired, cancelled, needs_review. Requires a
  // non-anonymous admin caller. The anonymous principal is rejected by
  // AdminLib.requireAdmin.
  public shared query ({ caller }) func adminListOrders(filter : Text) : async [Types.AdminOrderView] {
    AdminLib.requireAdminOrOwner(adminUsers, caller);
    let views = List.empty<Types.AdminOrderView>();
    for (order in orders.toArray().values()) {
      let payment = cryptoPayments.get(order.reference);
      if (CryptoPaymentsLib.matchesFilter(order, payment, filter)) {
        views.add(CryptoPaymentsLib.buildAdminOrderView(order, payment, selfPrincipal));
      };
    };
    views.toArray();
  };

  // Admin-only: returns the full detail for a single order, including line
  // items and crypto payment status plus the deposit account info. Requires a
  // non-anonymous admin caller. The anonymous principal is rejected by
  // AdminLib.requireAdmin.
  public shared query ({ caller }) func adminGetOrderDetail(reference : Text) : async ?Types.AdminOrderDetail {
    AdminLib.requireAdminOrOwner(adminUsers, caller);
    switch (orders.find(func o = o.reference == reference)) {
      case (?order) {
        let payment = cryptoPayments.get(order.reference);
        ?CryptoPaymentsLib.buildAdminOrderDetail(order, payment, selfPrincipal);
      };
      case null { null };
    };
  };

  public shared ({ caller }) func updateTreasury(principal : Principal, subaccount : ?Blob) : async Result.Result<(), Types.CryptoPaymentError> {
    AdminLib.requireAdminOrOwner(adminUsers, caller);
    cryptoConfig.treasuryPrincipal := principal;
    cryptoConfig.treasurySubaccount := subaccount;
    #ok();
  };

  public shared ({ caller }) func updateLedgerConfig(token : Types.Token, canisterId : Principal, decimals : Nat8, fee : Nat) : async Result.Result<(), Types.CryptoPaymentError> {
    AdminLib.requireAdminOrOwner(adminUsers, caller);
    switch token {
      case (#ckUSDC) { cryptoConfig.ckUSDC := { canisterId; decimals; fee } };
      case (#ICP) { cryptoConfig.icp := { canisterId; decimals; fee } };
    };
    #ok();
  };
};
