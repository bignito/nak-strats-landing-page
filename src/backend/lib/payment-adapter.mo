import Result "mo:core/Result";
import List "mo:core/List";
import Types "../types/storefront";

module {
  public type CheckoutSession = {
    reference : Text;
    url : ?Text;
  };

  public type PaymentError = {
    #invalidOrder;
    #paymentFailed : Text;
  };

  public type PaymentAdapter = {
    createCheckoutSession : (order : Types.Order) -> async Result.Result<CheckoutSession, PaymentError>;
    getPaymentStatus : (reference : Text) -> async Types.PaymentStatus;
    handlePaymentConfirmation : (payload : Text) -> async Result.Result<(), PaymentError>;
  };

  public func manualAdapter(orders : List.List<Types.Order>) : PaymentAdapter {
    {
      createCheckoutSession = func(order : Types.Order) : async Result.Result<CheckoutSession, PaymentError> {
        #ok({ reference = order.reference; url = null });
      };
      getPaymentStatus = func(reference : Text) : async Types.PaymentStatus {
        switch (orders.find(func o = o.reference == reference)) {
          case (?o) { o.payment_status };
          case null { #pending };
        };
      };
      handlePaymentConfirmation = func(_payload : Text) : async Result.Result<(), PaymentError> {
        #ok();
      };
    };
  };
};
