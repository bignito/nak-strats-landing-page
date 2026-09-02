import Result "mo:core/Result";
import List "mo:core/List";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Types "../types/storefront";
import PaymentServiceTypes "../types/payment-service";
import StorefrontLib "../lib/storefront";
import PaymentAdapterLib "../lib/payment-adapter";
import AdminLib "../lib/admin-access-control";
import AdminTypes "../types/admin-access-control";
import AdminEmailTypes "../types/admin-email";
import RateLimitTypes "../types/rate-limit";
import RateLimitLib "../lib/rate-limit";
import CancellationTypes "../types/cancellation";
import CancellationLib "../lib/cancellation";
import AssetTypes "../types/product-assets";
import OutCall "mo:caffeineai-http-outcalls/outcall";

mixin (
  products : List.List<Types.Product>,
  orders : List.List<Types.Order>,
  state : { var nextOrderId : Nat },
  paymentAdapter : PaymentAdapterLib.PaymentAdapter,
  adminUsers : AdminTypes.AdminUsers,
  minimumOrderState : { var minimumOrder : Nat },
  emailConfig : PaymentServiceTypes.PaymentServiceConfig,
  emailTransform : OutCall.Transform,
  orderRateLimit : RateLimitTypes.RateLimitState,
  cancelTokens : Map.Map<Text, CancellationTypes.CancellationToken>,
  assets : Map.Map<AssetTypes.AssetId, AssetTypes.AssetRecord>,
  selfPrincipal : Principal,
  sessionOrders : Map.Map<Text, List.List<Text>>,
  pendingOrderConfig : RateLimitTypes.PendingOrderConfig,
) {
  // Public-safe view of an order that omits customer_email (plaintext PII).
  func toPublicView(order : Types.Order) : AdminEmailTypes.PublicOrderView {
    {
      id = order.id;
      reference = order.reference;
      items = order.items;
      subtotal = order.subtotal.toFloat();
      tax = order.tax.toFloat();
      shipping = order.shipping.toFloat();
      total = order.total.toFloat();
      currency = order.currency;
      encrypted_shipping = order.encrypted_shipping;
      has_shipping_details = order.has_shipping_details;
      payment_method = order.payment_method;
      payment_status = order.payment_status;
      payment_reference = order.payment_reference;
      customer_principal = order.customer_principal;
      sweep_note = order.sweep_note;
      shipping_status = order.shipping_status;
      shipped_at = order.shipped_at;
      tracking_number = order.tracking_number;
      marketing_consent = order.marketing_consent;
      marketing_consent_at = order.marketing_consent_at;
      created_at = order.created_at;
      updated_at = order.updated_at;
    };
  };

  public query func listProducts() : async [Types.Product] {
    StorefrontLib.listActiveProducts(products);
  };

  public shared ({ caller }) func createProduct(product : Types.Product) : async Bool {
    AdminLib.requireAdminOrOwner(adminUsers, caller);
    if (not StorefrontLib.hasValidPrices(product)) {
      Runtime.trap("Product price must be a positive integer number of cents");
    };
    StorefrontLib.createProduct(products, product);
    true;
  };

  public shared ({ caller }) func updateProduct(product : Types.Product) : async Bool {
    AdminLib.requireAdminOrOwner(adminUsers, caller);
    if (not StorefrontLib.hasValidPrices(product)) {
      Runtime.trap("Product price must be a positive integer number of cents");
    };
    StorefrontLib.updateProduct(products, product, assets, selfPrincipal);
    true;
  };

  public shared query ({ caller }) func getProduct(slugOrId : Text) : async ?Types.Product {
    let isAdmin = AdminLib.isAdminOrOwner(adminUsers, caller);
    StorefrontLib.getProduct(products, slugOrId, isAdmin);
  };

  public shared ({ caller }) func createOrder(input : Types.CreateOrderInput) : async Result.Result<Types.CreateOrderResult, Types.OrderError> {
    if (not RateLimitLib.checkRateLimit(orderRateLimit, caller, RateLimitLib.ORDER_RATE_WINDOW_NANOS, RateLimitLib.ORDER_RATE_MAX)) {
      return #err(#rateLimited);
    };
    // Pending-order caps: per-session (or per-principal for signed-in) and the
    // global catastrophic-abuse backstop.
    let sessionId = input.session_id;
    if (StorefrontLib.countPendingOrders(orders, caller, sessionId, sessionOrders) >= RateLimitLib.PENDING_ORDER_CAP) {
      return #err(#tooManyPendingOrders);
    };
    if (StorefrontLib.countAllPendingOrders(orders) >= pendingOrderConfig.globalCap) {
      return #err(#tooManyPendingOrders);
    };
    switch (await StorefrontLib.createOrder(products, orders, state, input, caller, minimumOrderState.minimumOrder)) {
      case (#err e) { #err(e) };
      case (#ok order) {
        switch (await paymentAdapter.createCheckoutSession(order)) {
          case (#err e) {
            // The payment flow could not start: release the reserved inventory
            // and mark the order cancelled so it never lingers as a pending
            // reservation, then surface a clear error.
            StorefrontLib.releaseInventory(products, order);
            ignore StorefrontLib.updateOrderStatus(orders, order.reference, #cancelled, null);
            #err(#paymentFailed(debug_show(e)));
          };
          case (#ok _) {
            let isGuest = caller.isAnonymous();
            let cancellationToken = if (isGuest) {
              ?(await CancellationLib.issueToken(cancelTokens, order.reference));
            } else {
              null;
            };
            // Track the guest's order under its browser-scoped session id so the
            // per-session pending cap is scoped to this browser session. Reuse
            // the browser-supplied session id, or issue one (the order reference
            // is unique and unguessable) for a first-time guest.
            let returnedSessionId = if (isGuest) {
              let sid = switch (sessionId) { case (?s) { s }; case null { order.reference } };
              switch (sessionOrders.get(sid)) {
                case (?refs) { refs.add(order.reference) };
                case null { sessionOrders.add(sid, List.fromArray([order.reference])) };
              };
              ?sid;
            } else {
              null;
            };
            #ok({ order; cancellationToken; sessionId = returnedSessionId });
          };
        };
      };
    };
  };

  public query func getOrderStatus(reference : Text) : async ?AdminEmailTypes.PublicOrderView {
    switch (StorefrontLib.getOrderByReference(orders, reference)) {
      case (?order) { ?toPublicView(order) };
      case null { null };
    };
  };

  public shared query ({ caller }) func getMyOrders() : async [AdminEmailTypes.PublicOrderView] {
    StorefrontLib.getMyOrders(orders, caller).map(toPublicView);
  };

  public shared ({ caller }) func releaseExpiredReservations() : async Nat {
    ignore caller;
    StorefrontLib.releaseExpiredReservations(orders, products);
  };

  public shared ({ caller }) func updatePendingOrderGlobalCap(cap : Nat) : async Nat {
    AdminLib.requireAdminOrOwner(adminUsers, caller);
    pendingOrderConfig.globalCap := cap;
    pendingOrderConfig.globalCap;
  };

  public query func getPendingOrderConfig() : async { perSessionCap : Nat; globalCap : Nat } {
    { perSessionCap = RateLimitLib.PENDING_ORDER_CAP; globalCap = pendingOrderConfig.globalCap };
  };
};
