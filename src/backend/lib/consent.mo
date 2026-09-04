import Result "mo:core/Result";
import Text "mo:core/Text";
import Error "mo:core/Error";
import Types "../types/consent";
import PaymentServiceTypes "../types/payment-service";
import CycleTypes "../types/cycle-monitor";
import OutCall "mo:caffeineai-http-outcalls/outcall";
import OutCallLocal "./outcall";

module {
  // Extract the unquoted value of a string field from a flat JSON object.
  // e.g. jsonStringField("{\"a\":\"x\",\"b\":\"y\"}", "a") == ?"x".
  func jsonStringField(json : Text, field : Text) : ?Text {
    let key = "\"" # field # "\":\"";
    let parts = json.split(#text key);
    switch (parts.next()) {
      case null { null };
      case (?_) {
        switch (parts.next()) {
          case null { null };
          case (?rest) {
            switch (rest.split(#text "\"").next()) {
              case null { null };
              case (?value) { ?value };
            };
          };
        };
      };
    };
  };

  // Fetch the list of consenting addresses from the external payment service
  // and return it as CSV. The canister proxies the payment service's
  // consent-list endpoint via HTTPS outcall (Bearer token) and returns the CSV
  // body unchanged. The email addresses are PII that lives off-canister; the
  // canister never persists them.
  public func fetchConsentListCsv(
    counters : CycleTypes.CycleCounters,
    config : PaymentServiceTypes.PaymentServiceConfig,
    transform : OutCall.Transform,
  ) : async Result.Result<Types.ConsentListExport, Types.ConsentError> {
    if (config.url == "") { return #err(#notConfigured("PAYMENT_SERVICE_URL is not set")) };
    if (config.token == "") { return #err(#notConfigured("PAYMENT_SERVICE_TOKEN is not set")) };
    let url = config.url # "/emails/consent-list";
    let headers = [{ name = "Authorization"; value = "Bearer " # config.token }];
    try {
      let csv = await OutCallLocal.httpGetRequest(counters, url, headers, transform, 1_000_000 : Nat64);
      #ok({ csv });
    } catch e {
      #err(#outcallFailed("payment service unreachable: " # e.message()));
    };
  };

  // Forward a token-based unsubscribe to the external payment service, which
  // adds the address to its stored suppression list. Suppressed addresses are
  // never sent marketing email; transactional emails remain exempt. The
  // suppression list lives at the payment service, not in canister state.
  public func unsubscribe(
    counters : CycleTypes.CycleCounters,
    config : PaymentServiceTypes.PaymentServiceConfig,
    token : Text,
    transform : OutCall.Transform,
  ) : async Result.Result<(), Types.ConsentError> {
    if (config.url == "") { return #err(#notConfigured("PAYMENT_SERVICE_URL is not set")) };
    if (config.token == "") { return #err(#notConfigured("PAYMENT_SERVICE_TOKEN is not set")) };
    let url = config.url # "/emails/unsubscribe";
    let headers = [
      { name = "Content-Type"; value = "application/json" },
      { name = "Authorization"; value = "Bearer " # config.token },
    ];
    let body = "{ \"token\":\"" # token # "\" }";
    try {
      let responseText = await OutCallLocal.httpPostRequest(counters, url, headers, body, transform, 8_192 : Nat64);
      switch (jsonStringField(responseText, "status")) {
        case (?status) {
          if (status == "ok") {
            #ok();
          } else if (status == "invalid_token") {
            #err(#invalidToken);
          } else if (status == "already_unsubscribed") {
            #err(#alreadyUnsubscribed);
          } else {
            #err(#invalidResponse("unexpected status in response"));
          };
        };
        case null { #err(#invalidResponse("missing status in response")) };
      };
    } catch e {
      #err(#outcallFailed("payment service unreachable: " # e.message()));
    };
  };
};
