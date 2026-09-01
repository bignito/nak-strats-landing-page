import Result "mo:core/Result";
import List "mo:core/List";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Types "../types/storefront";
import PaymentServiceTypes "../types/payment-service";
import StorefrontLib "../lib/storefront";
import PaymentAdapterLib "../lib/payment-adapter";
import EmailLib "../lib/email";
import AdminLib "../lib/admin-access-control";
import AdminTypes "../types/admin-access-control";
import AdminEmailLib "../lib/admin-email";
import AdminEmailTypes "../types/admin-email";
import RateLimitTypes "../types/rate-limit";
import RateLimitLib "../lib/rate-limit";
import CancellationTypes "../types/cancellation";
import CancellationLib "../lib/cancellation";
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
) {
  public query func listProducts() : async [Types.Product] {
    StorefrontLib.listActiveProducts(products);
  };

  // Admin-only: create a new product in the catalogue. The caller supplies the
  // full Product record with prices in integer cents (never floats) — the
  // frontend converts dollar input to cents before calling. Binds the caller at
  // the top, rejects the anonymous principal, and traps for a caller that is
  // not a non-anonymous member of the admin allowlist.
  public shared ({ caller }) func createProduct(product : Types.Product) : async Bool {
    AdminLib.requireAdminOrOwner(adminUsers, caller);
    StorefrontLib.createProduct(products, product);
    true
  };

  // Admin-only: update an existing product (matched by id). The caller supplies
  // the full Product record with prices in integer cents. Binds the caller at
  // the top, rejects the anonymous principal, and traps for a caller that is
  // not a non-anonymous member of the admin allowlist.
  public shared ({ caller }) func updateProduct(product : Types.Product) : async Bool {
    AdminLib.requireAdminOrOwner(adminUsers, caller);
    StorefrontLib.updateProduct(products, product);
    true
  };

  // Hidden (admin_only) products are returned only to an authenticated admin,
  // so an admin can reach and purchase the test product via a direct product
  // URL or an admin-only view. Non-admins never see hidden products.
  public shared query ({ caller }) func getProduct(slugOrId : Text) : async ?Types.Product {
    StorefrontLib.getProduct(products, slugOrId, AdminLib.isAdminOrOwner(adminUsers, caller));
  };

  public shared ({ caller }) func createOrder(input : Types.CreateOrderInput) : async Result.Result<Types.CreateOrderResult, Types.OrderError> {
    // Rate limit per caller principal before any reservation is made. The
    // canister cannot see client IPs, so this complements the payment service's
    // per-IP limit; anonymous callers all share the anonymous principal, so for
    // guests this is a global throttle.
    if (not RateLimitLib.checkRateLimit(orderRateLimit, caller, RateLimitLib.ORDER_RATE_WINDOW_NANOS, RateLimitLib.ORDER_RATE_MAX)) {
      return #err(#rateLimited);
    };
    // Cap concurrent pending (unpaid) reservations per caller. A normal
    // customer creates one order at a time and checks out promptly, so this is
    // never tripped by legitimate checkout. For anonymous guests (who all share
    // the anonymous principal) this is a global cap on simultaneous pending
    // orders, bounding how much of the catalogue a script can reserve without
    // paying.
    if (StorefrontLib.countPendingOrders(orders, caller) >= RateLimitLib.PENDING_ORDER_CAP) {
      return #err(#tooManyPendingOrders);
    };
    switch (await StorefrontLib.createOrder(products, orders, state, input, caller, minimumOrderState.minimumOrder)) {
      case (#ok order) {
        switch (await paymentAdapter.createCheckoutSession(order)) {
          case (#ok _) {
            // For a crypto order, send the payment-pending email so a customer
            // who closes the tab can still find their order via the lookup
            // link. Transactional — sends regardless of marketing consent.
            switch (order.payment_method) {
              case (#crypto_ckusdc) {
                ignore (await EmailLib.sendPaymentPending(emailConfig, orders, order.reference, emailTransform));
              };
              case (_) {};
            };
            // Issue a short-lived cancellation token to the browser session
            // that created this order when the caller is an anonymous guest,
            // and RETURN it so the frontend can later call
            // cancelGuestOrder(reference, token). The token is stored keyed by
            // the order reference and is required for guest self-cancellation;
            // a leaked order reference alone never confers the power to cancel.
            // Signed-in customers prove ownership via customer_principal
            // instead and receive no token.
            if (caller.isAnonymous()) {
              let token = await CancellationLib.issueToken(cancelTokens, order.reference);
              #ok({ order; cancellationToken = ?token });
            } else {
              #ok({ order; cancellationToken = null });
            };
          };
          case (#err e) { #err(#paymentFailed(debug_show(e))) };
        };
      };
      case (#err e) { #err(e) };
    };
  };

  // Guest lookup path. Returns the order as a public-safe view that DROPS
  // customer_email — the customer's email is plaintext PII that must never
  // appear in a public or customer-facing query. Matches by Text equality, so
  // both legacy sequential references (NAK-<id>) and new random references
  // resolve.
  public query func getOrderStatus(reference : Text) : async ?AdminEmailTypes.PublicOrderView {
    switch (StorefrontLib.getOrderByReference(orders, reference)) {
      case (?order) { ?AdminEmailLib.toPublicOrderView(order) };
      case null { null };
    };
  };

  // Lists only the orders whose customer_principal matches the caller. The
  // caller is derived from msg.caller server-side — never accepted as a
  // parameter. Rejects the anonymous principal (returns an empty list), so a
  // guest cannot read anyone's orders through this path. Each order is
  // returned as a public-safe view that DROPS customer_email.
  public shared query ({ caller }) func getMyOrders() : async [AdminEmailTypes.PublicOrderView] {
    StorefrontLib.getMyOrders(orders, caller).map(func o = AdminEmailLib.toPublicOrderView(o));
  };
};
