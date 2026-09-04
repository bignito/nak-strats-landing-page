import Result "mo:core/Result";
import List "mo:core/List";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Time "mo:core/Time";
import Error "mo:core/Error";
import Types "../types/email";
import StorefrontTypes "../types/storefront";
import PaymentServiceTypes "../types/payment-service";
import OutCall "mo:caffeineai-http-outcalls/outcall";
import OutCallLocal "./outcall";
import CycleTypes "../types/cycle-monitor";

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

  // Build the JSON body for POST /emails/order-confirmation. Carries the order
  // reference, line items (quantities and prices), totals, the customer email
  // (the ONE field that must reach the email service to route the confirmation
  // email), and payment method. The plaintext shipping address and customer
  // name are NEVER sent — they live only inside the IBE ciphertext
  // (encrypted_shipping) and are decrypted by an admin in the browser, never
  // by the canister or the email service. Transactional — sends regardless of
  // marketing consent.
  func buildOrderConfirmationBody(order : StorefrontTypes.Order) : Text {
    var itemsJson = "[";
    var first = true;
    for (item in order.items.values()) {
      if (not first) { itemsJson := itemsJson # "," };
      itemsJson := itemsJson # "{"
        # "\"name\":\"" # item.name # "\","
        # "\"quantity\":" # item.quantity.toText() # ","
        # "\"unitAmount\":" # item.unit_amount.toText()
        # "}";
      first := false;
    };
    itemsJson := itemsJson # "]";
    let method = switch (order.payment_method) {
      case (#manual) { "manual" };
      case (#card_stripe) { "card_stripe" };
      case (#crypto_icp) { "crypto_icp" };
      case (#crypto_ckusdc) { "crypto_ckusdc" };
    };
    "{"
      # "\"reference\":\"" # order.reference # "\","
      # "\"items\":" # itemsJson # ","
      # "\"subtotal\":" # order.subtotal.toText() # ","
      # "\"tax\":" # order.tax.toText() # ","
      # "\"shipping\":" # order.shipping.toText() # ","
      # "\"total\":" # order.total.toText() # ","
      # "\"currency\":\"" # order.currency # "\","
      # "\"customerEmail\":\"" # order.customer_email # "\","
      # "\"paymentMethod\":\"" # method # "\""
      # "}"
  };

  // Trigger the order confirmation email for an order via HTTPS outcall to the
  // external payment service (POST {url}/emails/order-confirmation). The body
  // carries the order reference, line items (quantities and prices), totals,
  // shipping address, and payment method. Transactional — sends regardless of
  // marketing consent. Called when a payment is confirmed, for both crypto and
  // card orders.
  public func sendOrderConfirmation(
    counters : CycleTypes.CycleCounters,
    config : PaymentServiceTypes.PaymentServiceConfig,
    orders : List.List<StorefrontTypes.Order>,
    reference : Text,
    transform : OutCall.Transform,
  ) : async Result.Result<(), Types.EmailError> {
    if (config.url == "") { return #err(#notConfigured("PAYMENT_SERVICE_URL is not set")) };
    if (config.token == "") { return #err(#notConfigured("PAYMENT_SERVICE_TOKEN is not set")) };
    switch (orders.find(func o = o.reference == reference)) {
      case null { #err(#notFound) };
      case (?order) {
        let body = buildOrderConfirmationBody(order);
        let headers = [
          { name = "Content-Type"; value = "application/json" },
          { name = "Authorization"; value = "Bearer " # config.token },
        ];
        let url = config.url # "/emails/order-confirmation";
        try {
          let responseText = await OutCallLocal.httpPostRequest(counters, url, headers, body, transform, 8_192 : Nat64);
          switch (jsonStringField(responseText, "ok")) {
            case (?ok) {
              if (ok == "true") { #ok() } else { #err(#invalidResponse("email send failed")) };
            };
            case null { #err(#invalidResponse("missing ok in response")) };
          };
        } catch e {
          #err(#outcallFailed("payment service unreachable: " # e.message()));
        };
      };
    };
  };

  // Trigger the payment-pending email for a crypto order via HTTPS outcall to
  // the external payment service (POST {url}/emails/payment-pending). The body
  // carries the order reference and a link back to the order lookup page. Sent
  // when a crypto order is created, so a customer who closes the tab can still
  // find their order.
  public func sendPaymentPending(
    counters : CycleTypes.CycleCounters,
    config : PaymentServiceTypes.PaymentServiceConfig,
    orders : List.List<StorefrontTypes.Order>,
    reference : Text,
    transform : OutCall.Transform,
  ) : async Result.Result<(), Types.EmailError> {
    if (config.url == "") { return #err(#notConfigured("PAYMENT_SERVICE_URL is not set")) };
    if (config.token == "") { return #err(#notConfigured("PAYMENT_SERVICE_TOKEN is not set")) };
    switch (orders.find(func o = o.reference == reference)) {
      case null { #err(#notFound) };
      case (?order) {
        let body = "{"
          # "\"reference\":\"" # order.reference # "\","
          # "\"customerEmail\":\"" # order.customer_email # "\""
          # "}";
        let headers = [
          { name = "Content-Type"; value = "application/json" },
          { name = "Authorization"; value = "Bearer " # config.token },
        ];
        let url = config.url # "/emails/payment-pending";
        try {
          let responseText = await OutCallLocal.httpPostRequest(counters, url, headers, body, transform, 8_192 : Nat64);
          switch (jsonStringField(responseText, "ok")) {
            case (?ok) {
              if (ok == "true") { #ok() } else { #err(#invalidResponse("email send failed")) };
            };
            case null { #err(#invalidResponse("missing ok in response")) };
          };
        } catch e {
          #err(#outcallFailed("payment service unreachable: " # e.message()));
        };
      };
    };
  };

  // Trigger the shipping notification email for an order via HTTPS outcall to
  // the external payment service (POST {url}/emails/shipping). The body carries
  // the order reference and the tracking number when present. Transactional —
  // sends regardless of marketing consent.
  public func sendShippingNotification(
    counters : CycleTypes.CycleCounters,
    config : PaymentServiceTypes.PaymentServiceConfig,
    orders : List.List<StorefrontTypes.Order>,
    reference : Text,
    transform : OutCall.Transform,
  ) : async Result.Result<(), Types.EmailError> {
    if (config.url == "") { return #err(#notConfigured("PAYMENT_SERVICE_URL is not set")) };
    if (config.token == "") { return #err(#notConfigured("PAYMENT_SERVICE_TOKEN is not set")) };
    switch (orders.find(func o = o.reference == reference)) {
      case null { #err(#notFound) };
      case (?order) {
        let tracking = switch (order.tracking_number) {
          case (?t) { "\"" # t # "\"" };
          case null { "null" };
        };
        let body = "{"
          # "\"reference\":\"" # order.reference # "\","
          # "\"customerEmail\":\"" # order.customer_email # "\","
          # "\"trackingNumber\":" # tracking
          # "}";
        let headers = [
          { name = "Content-Type"; value = "application/json" },
          { name = "Authorization"; value = "Bearer " # config.token },
        ];
        let url = config.url # "/emails/shipping";
        try {
          let responseText = await OutCallLocal.httpPostRequest(counters, url, headers, body, transform, 8_192 : Nat64);
          switch (jsonStringField(responseText, "ok")) {
            case (?ok) {
              if (ok == "true") { #ok() } else { #err(#invalidResponse("email send failed")) };
            };
            case null { #err(#invalidResponse("missing ok in response")) };
          };
        } catch e {
          #err(#outcallFailed("payment service unreachable: " # e.message()));
        };
      };
    };
  };

  // Mark an order as shipped: set shipping_status = #shipped, shipped_at = now,
  // and the optional tracking number. Returns #notShippable for an order that is
  // not paid or already shipped, and #notFound for an unknown reference.
  public func markOrderShipped(
    orders : List.List<StorefrontTypes.Order>,
    reference : Text,
    trackingNumber : ?Text,
  ) : Result.Result<(), Types.EmailError> {
    switch (orders.find(func o = o.reference == reference)) {
      case null { #err(#notFound) };
      case (?order) {
        // Only a paid, not-yet-shipped order can be marked shipped.
        if (order.payment_status != #paid) { return #err(#notShippable) };
        if (order.shipping_status == #shipped) { return #err(#notShippable) };
        let updated : StorefrontTypes.Order = {
          id = order.id;
          reference = order.reference;
          items = order.items;
          subtotal = order.subtotal;
          tax = order.tax;
          shipping = order.shipping;
          total = order.total;
          currency = order.currency;
          customer_email = order.customer_email;
          encrypted_shipping = order.encrypted_shipping;
          has_shipping_details = order.has_shipping_details;
          payment_method = order.payment_method;
          payment_status = order.payment_status;
          payment_reference = order.payment_reference;
          customer_principal = order.customer_principal;
          sweep_note = order.sweep_note;
          shipping_status = #shipped;
          shipped_at = ?Time.now();
          tracking_number = trackingNumber;
          marketing_consent = order.marketing_consent;
          marketing_consent_at = order.marketing_consent_at;
          created_at = order.created_at;
          updated_at = Time.now();
        };
        let snapshot = orders.toArray();
        orders.clear();
        for (o in snapshot.values()) {
          if (o.reference == reference) { orders.add(updated) } else { orders.add(o) };
        };
        #ok();
      };
    };
  };
};
