module {
  // A single consenting address as reported by the external payment service.
  // The email address itself is PII and lives off-canister at the payment
  // service; the canister only proxies it through for admin CSV export and
  // never stores it in canister state.
  public type ConsentListEntry = {
    email : Text;
    // Unix timestamp (nanoseconds, matching Time.now()) at which the customer
    // opted in. `null` when the payment service did not record one.
    consent_at : ?Int;
  };

  // The consent list export is returned as CSV text so the admin can download
  // it directly. The canister proxies the payment service's consent-list
  // endpoint and returns its CSV body unchanged.
  public type ConsentListExport = {
    csv : Text;
  };

  public type ConsentError = {
    #notConfigured : Text;
    #outcallFailed : Text;
    #invalidResponse : Text;
    #unauthorized;
    #invalidToken;
    #alreadyUnsubscribed;
  };

  // Result of a token-based unsubscribe. The token is minted by the payment
  // service (where the suppression list lives); the canister forwards it.
  public type UnsubscribeResult = {
    #ok;
    #err : ConsentError;
  };
};
