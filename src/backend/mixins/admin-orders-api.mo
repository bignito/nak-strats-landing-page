import List "mo:core/List";
import Map "mo:core/Map";
import Types "../types/storefront";
import CryptoTypes "../types/crypto-payments";
import RecoveryTypes "../types/recovery";
import CancellationTypes "../types/cancellation";
import AdminLib "../lib/admin-access-control";
import AdminTypes "../types/admin-access-control";
import StorefrontLib "../lib/storefront";

mixin (
  orders : List.List<Types.Order>,
  products : List.List<Types.Product>,
  cryptoPayments : Map.Map<Text, CryptoTypes.CryptoPayment>,
  latePayments : List.List<RecoveryTypes.LatePayment>,
  cancelTokens : Map.Map<Text, CancellationTypes.CancellationToken>,
  cryptoCheckCache : Map.Map<Text, CryptoTypes.CryptoCheckCacheEntry>,
  sessionOrders : Map.Map<Text, List.List<Text>>,
  adminUsers : AdminTypes.AdminUsers,
) {
  // Counts of the records permanently deleted from each order-related
  // collection, plus how many pending stock reservations were released.
  public type WipeSummary = {
    orders : Nat;
    sessionOrders : Nat;
    cryptoPayments : Nat;
    latePayments : Nat;
    cancelTokens : Nat;
    cryptoCheckCache : Nat;
    releasedReservations : Nat;
  };

  // Outcome of adminWipeAllOrders: either the wipe was refused (with the reason
  // and, when funds are at risk, the affected order references), or it ran and
  // reports the per-collection deletion counts.
  public type WipeResult = {
    #refused : { reason : Text; unsweptReferences : [Text] };
    #wiped : WipeSummary;
  };

  // True when a crypto payment has received funds that have not been swept to
  // the treasury: a #paid payment whose sweep was skipped (blockIndex 0), an
  // under/overpayment that received a positive amount, or any payment whose
  // order carries a sweep_note (the last sweep was skipped or failed, so funds
  // may still sit in the subaccount).
  func hasUnsweptFunds(payment : CryptoTypes.CryptoPayment, order : ?Types.Order) : Bool {
    switch (payment.status) {
      case (#paid { blockIndex }) { blockIndex == 0 };
      case (#underpayment { received }) { received > 0 };
      case (#overpayment { received }) { received > 0 };
      case (_) {
        switch (order) {
          case (?o) { o.sweep_note != null };
          case null { false };
        };
      };
    };
  };

  // OWNER-only destructive maintenance: permanently clears every order-related
  // collection. Runs only when `confirm` equals exactly "DELETE ALL ORDERS".
  // Before clearing it (a) refuses when any crypto payment has received funds
  // not yet swept to the treasury, returning the affected references, and
  // (b) releases the stock reservations held by pending orders so inventory is
  // correct afterwards. It NEVER touches products, admins/users,
  // paymentServiceConfig, cryptoConfig, or nextOrderId.
  public shared ({ caller }) func adminWipeAllOrders(confirm : Text) : async WipeResult {
    AdminLib.requireOwner(adminUsers, caller);
    if (confirm != "DELETE ALL ORDERS") {
      return #refused({ reason = "confirmation text does not match"; unsweptReferences = [] });
    };
    // Refuse when any crypto payment has received funds not yet swept.
    let unswept = List.empty<Text>();
    for ((reference, payment) in cryptoPayments.entries()) {
      let order = orders.find(func o = o.reference == reference);
      if (hasUnsweptFunds(payment, order)) {
        unswept.add(reference);
      };
    };
    if (unswept.size() > 0) {
      return #refused({
        reason = "unswept crypto funds must be swept to the treasury before wiping";
        unsweptReferences = unswept.toArray();
      });
    };
    // Release stock reservations held by pending orders so inventory is correct.
    var released = 0;
    for (order in orders.toArray().values()) {
      if (order.payment_status == #pending) {
        StorefrontLib.releaseInventory(products, order);
        released += 1;
      };
    };
    // Count then permanently clear each order-related collection.
    let orderCount = orders.size();
    let sessionOrderCount = sessionOrders.size();
    let cryptoPaymentCount = cryptoPayments.size();
    let latePaymentCount = latePayments.size();
    let cancelTokenCount = cancelTokens.size();
    let cryptoCheckCacheCount = cryptoCheckCache.size();
    orders.clear();
    sessionOrders.clear();
    cryptoPayments.clear();
    latePayments.clear();
    cancelTokens.clear();
    cryptoCheckCache.clear();
    #wiped({
      orders = orderCount;
      sessionOrders = sessionOrderCount;
      cryptoPayments = cryptoPaymentCount;
      latePayments = latePaymentCount;
      cancelTokens = cancelTokenCount;
      cryptoCheckCache = cryptoCheckCacheCount;
      releasedReservations = released;
    });
  };
};
