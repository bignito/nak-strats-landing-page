import Result "mo:core/Result";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Set "mo:core/Set";
import Types "../types/payment-service";
import StorefrontTypes "../types/storefront";
import PaymentServiceLib "../lib/payment-service";
import AdminLib "../lib/admin-access-control";
import OutCall "mo:caffeineai-http-outcalls/outcall";

mixin (
  config : Types.PaymentServiceConfig,
  orders : List.List<StorefrontTypes.Order>,
  products : List.List<StorefrontTypes.Product>,
  adminAllowlist : Set.Set<Principal>,
) {
  // Public view of the payment service config. The token is write-only and is
  // never returned — only a boolean "is it set" flag.
  public query func getPaymentServiceConfig() : async Types.PaymentServiceConfigView {
    { url = config.url; tokenSet = config.token != "" };
  };

  public shared ({ caller }) func updatePaymentServiceUrl(url : Text) : async Result.Result<(), Types.PaymentServiceError> {
    AdminLib.requireAdmin(adminAllowlist, caller);
    config.url := url;
    #ok();
  };

  public shared ({ caller }) func updatePaymentServiceToken(token : Text) : async Result.Result<(), Types.PaymentServiceError> {
    AdminLib.requireAdmin(adminAllowlist, caller);
    config.token := token;
    #ok();
  };

  // Create a Stripe-hosted checkout session for a card order and return the
  // checkout URL to redirect the customer to. Returns a clear error when the
  // payment service is unconfigured or unreachable; never marks the order paid.
  public func createCardCheckoutSession(reference : Text, successUrl : Text, cancelUrl : Text) : async Result.Result<Types.CheckoutSession, Types.PaymentServiceError> {
    await PaymentServiceLib.createCheckoutSession(config, orders, reference, successUrl, cancelUrl, paymentServiceTransform);
  };

  // Confirm a card order by querying the payment service's order-status
  // endpoint. Only marks the order paid when the server-side status is "paid".
  // Passes the config + transform as the email config/transform so a confirmed
  // card order triggers its transactional order-confirmation email.
  public func confirmCardPayment(reference : Text) : async Result.Result<StorefrontTypes.PaymentStatus, Types.PaymentServiceError> {
    await PaymentServiceLib.confirmPayment(config, orders, reference, paymentServiceTransform, config, paymentServiceTransform);
  };

  // Cancel a pending card order, releasing its reserved inventory.
  public func cancelCardOrder(reference : Text) : async Result.Result<(), Types.PaymentServiceError> {
    PaymentServiceLib.cancelOrder(orders, products, reference);
  };

  // HTTP outcall transform for the payment service: strips every response
  // header (Date, request IDs, Stripe trace headers) so responses are
  // identical across replicas, returning only the stable JSON body.
  public query func paymentServiceTransform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };
};
