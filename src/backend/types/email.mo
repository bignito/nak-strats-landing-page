module {
  // Errors returned by the transactional-email domain. Emails are triggered via
  // HTTPS outcall to the external payment service, which holds the Resend API
  // key (never in the canister or repo). All emails are transactional and send
  // regardless of marketing consent.
  public type EmailError = {
    #notFound;
    #notConfigured : Text;
    #outcallFailed : Text;
    #invalidResponse : Text;
    #unauthorized;
    // The order cannot be shipped (e.g. it is not paid, or already shipped).
    #notShippable;
  };
};
