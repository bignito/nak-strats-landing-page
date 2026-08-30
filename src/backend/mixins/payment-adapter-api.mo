import Result "mo:core/Result";
import Types "../types/storefront";
import PaymentAdapterLib "../lib/payment-adapter";

mixin (paymentAdapter : PaymentAdapterLib.PaymentAdapter) {
  public func createCheckoutSession(order : Types.Order) : async Result.Result<PaymentAdapterLib.CheckoutSession, PaymentAdapterLib.PaymentError> {
    await paymentAdapter.createCheckoutSession(order);
  };

  public func getPaymentStatus(reference : Text) : async Types.PaymentStatus {
    await paymentAdapter.getPaymentStatus(reference);
  };

  public func handlePaymentConfirmation(payload : Text) : async Result.Result<(), PaymentAdapterLib.PaymentError> {
    await paymentAdapter.handlePaymentConfirmation(payload);
  };
};
