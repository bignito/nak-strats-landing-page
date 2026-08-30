module {
  // Runtime-configurable payment service settings. The token is write-only:
  // it is stored here but never returned to any caller.
  public type PaymentServiceConfig = {
    var url : Text;
    var token : Text;
  };

  // Public view of the config. The token is never exposed — only a boolean
  // "is it set" flag, so the frontend can decide whether to offer card checkout.
  public type PaymentServiceConfigView = {
    url : Text;
    tokenSet : Bool;
  };

  public type PaymentServiceError = {
    #notFound;
    #notConfigured : Text;
    #outcallFailed : Text;
    #invalidResponse : Text;
    #unauthorized;
    #alreadyPaid;
  };

  public type CheckoutSession = {
    reference : Text;
    url : ?Text;
  };
};
