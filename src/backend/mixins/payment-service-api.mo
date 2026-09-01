import Result "mo:core/Result";
import List "mo:core/List";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Types "../types/payment-service";
import StorefrontTypes "../types/storefront";
import PaymentServiceLib "../lib/payment-service";
import AdminLib "../lib/admin-access-control";
import AdminTypes "../types/admin-access-control";
import RateLimitTypes "../types/rate-limit";
import RateLimitLib "../lib/rate-limit";
import CancellationTypes "../types/cancellation";
import CancellationLib "../lib/cancellation";
import OutCall "mo:caffeineai-http-outcalls/outcall";

mixin (
  config : Types.PaymentServiceConfig,
  orders : List.List<StorefrontTypes.Order>,
  products : List.List<StorefrontTypes.Product>,
  adminUsers : AdminTypes.AdminUsers,
  checkoutRateLimit : RateLimitTypes.RateLimitState,
  confirmRateLimit : RateLimitTypes.RateLimitState,
  cancelTokens : Map.Map<Text, CancellationTypes.CancellationToken>,
) {
  // Public view of the payment service config. The token is write-only and is
  // never returned — only a boolean "is it set" flag.
  public query func getPaymentServiceConfig() : async Types.PaymentServiceConfigView {
    { url = config.url; tokenSet = config.token != "" };
  };

  public shared ({ caller }) func updatePaymentServiceUrl(url : Text) : async Result.Result<(), Types.PaymentServiceError> {
    AdminLib.requireAdminOrOwner(adminUsers, caller);
    config.url := url;
    #ok();
  };

  public shared ({ caller }) func updatePaymentServiceToken(token : Text) : async Result.Result<(), Types.PaymentServiceError> {
    AdminLib.requireAdminOrOwner(adminUsers, caller);
    config.token := token;
    #ok();
  };

  // Create a Stripe-hosted checkout session for a card order and return the
  // checkout URL to redirect the customer to. Returns a clear error when the
  // payment service is unconfigured or unreachable; never marks the order paid.
  // Rate limited per caller principal before the HTTPS outcall so an arbitrary
  // caller cannot drain the canister's cycles by looping this endpoint.
  public shared ({ caller }) func createCardCheckoutSession(reference : Text, successUrl : Text, cancelUrl : Text) : async Result.Result<Types.CheckoutSession, Types.PaymentServiceError> {
    if (not RateLimitLib.checkRateLimit(checkoutRateLimit, caller, RateLimitLib.CARD_RATE_WINDOW_NANOS, RateLimitLib.CARD_RATE_MAX)) {
      return #err(#rateLimited);
    };
    await PaymentServiceLib.createCheckoutSession(config, orders, reference, successUrl, cancelUrl, paymentServiceTransform);
  };

  // Confirm a card order by querying the payment service's order-status
  // endpoint. Only marks the order paid when the server-side status is "paid".
  // Passes the config + transform as the email config/transform so a confirmed
  // card order triggers its transactional order-confirmation email. Rate
  // limited per caller principal before the HTTPS outcall. Short-circuits
  // before the rate limit and the outcall when the order is already
  // #paid/#cancelled/#expired: repeat calls return the cached status and never
  // trigger a fresh outcall.
  public shared ({ caller }) func confirmCardPayment(reference : Text) : async Result.Result<StorefrontTypes.PaymentStatus, Types.PaymentServiceError> {
    switch (orders.find(func o = o.reference == reference)) {
      case (?order) {
        switch (order.payment_status) {
          case (#paid) { return #ok(#paid) };
          case (#cancelled) { return #ok(#cancelled) };
          case (#expired) { return #ok(#expired) };
          case (#pending) {};
        };
      };
      case null {};
    };
    if (not RateLimitLib.checkRateLimit(confirmRateLimit, caller, RateLimitLib.CARD_RATE_WINDOW_NANOS, RateLimitLib.CARD_RATE_MAX)) {
      return #err(#rateLimited);
    };
    await PaymentServiceLib.confirmPayment(config, orders, reference, paymentServiceTransform, config, paymentServiceTransform);
  };

  // Cancel a pending card order, releasing its reserved inventory. Succeeds
  // only for (a) an ADMIN or OWNER caller, or (b) the order's own
  // customer_principal (proof of ownership). Anonymous guests are rejected —
  // a leaked order reference alone never confers the power to cancel; a guest
  // self-cancels via cancelGuestOrder with the short-lived cancellation token
  // issued to the browser session that created the order, otherwise the order
  // expires naturally.
  public shared ({ caller }) func cancelCardOrder(reference : Text) : async Result.Result<(), Types.PaymentServiceError> {
    switch (orders.find(func o = o.reference == reference)) {
      case null { #err(#notFound) };
      case (?order) {
        let isAdmin = AdminLib.isAdminOrOwner(adminUsers, caller);
        let isOwner = switch (order.customer_principal) {
          case (?p) { p == caller };
          case null { false };
        };
        if (not isAdmin and not isOwner) {
          return #err(#unauthorized);
        };
        PaymentServiceLib.cancelOrder(orders, products, reference);
      };
    };
  };

  // Guest self-cancellation: cancels a pending order when the caller presents
  // the short-lived cancellation token issued to the browser session that
  // created the order (see createOrder). The token is single-use: it is
  // consumed on a successful cancellation. A leaked order reference alone is
  // never sufficient — without the token the order expires naturally.
  public shared ({ caller }) func cancelGuestOrder(reference : Text, cancellationToken : Text) : async Result.Result<(), Types.PaymentServiceError> {
    switch (orders.find(func o = o.reference == reference)) {
      case null { #err(#notFound) };
      case (?order) {
        // Signed-in customers prove ownership via customer_principal on
        // cancelCardOrder; the token path is for anonymous guests only.
        switch (order.customer_principal) {
          case (?_) { return #err(#unauthorized) };
          case null {};
        };
        if (not CancellationLib.validateToken(cancelTokens, reference, cancellationToken)) {
          return #err(#unauthorized);
        };
        cancelTokens.remove(reference);
        PaymentServiceLib.cancelOrder(orders, products, reference);
      };
    };
  };

  // HTTP outcall transform for the payment service: strips every response
  // header (Date, request IDs, Stripe trace headers) so responses are
  // identical across replicas, returning only the stable JSON body.
  public query func paymentServiceTransform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };
};
