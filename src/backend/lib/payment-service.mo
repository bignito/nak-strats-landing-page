import Result "mo:core/Result";
import List "mo:core/List";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Error "mo:core/Error";
import Types "../types/payment-service";
import StorefrontTypes "../types/storefront";
import StorefrontLib "../lib/storefront";
import EmailLib "./email";
import OutCall "mo:caffeineai-http-outcalls/outcall";

module {
  public func isConfigured(config : Types.PaymentServiceConfig) : Bool {
    config.url != "" and config.token != "";
  };

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

  // Build the JSON body for POST /create-checkout-session. unitAmount is an
  // integer in cents (order items already carry the authoritative unit price
  // computed server-side at order creation); quantity is a positive integer.
  func buildCreateSessionBody(order : StorefrontTypes.Order, successUrl : Text, cancelUrl : Text) : Text {
    var itemsJson = "[";
    var first = true;
    for (item in order.items.values()) {
      if (not first) { itemsJson := itemsJson # "," };
      itemsJson := itemsJson # "{"
        # "\"productId\":\"" # item.product_id.toText() # "\","
        # "\"name\":\"" # item.name # "\","
        # "\"quantity\":" # item.quantity.toText() # ","
        # "\"unitAmount\":" # item.unit_amount.toText() # ","
        # "\"description\":\"" # item.name # "\","
        # "\"variant\":\"" # item.variant_id # "\""
        # "}";
      first := false;
    };
    itemsJson := itemsJson # "]";
    "{"
      # "\"orderId\":\"" # order.reference # "\","
      # "\"lineItems\":" # itemsJson # ","
      # "\"currency\":\"usd\","
      # "\"customerEmail\":\"" # order.customer_email # "\","
      # "\"marketingConsent\":" # (if (order.marketing_consent) { "true" } else { "false" }) # ","
      # "\"successUrl\":\"" # successUrl # "\","
      # "\"cancelUrl\":\"" # cancelUrl # "\""
      # "}"
  };

  // Create a Stripe-hosted checkout session for an order by calling the
  // external payment service. Returns the checkout URL to redirect the customer
  // to. Never marks the order paid. On outcall failure (unreachable service or
  // insufficient cycles) returns a clear error and leaves the order pending.
  public func createCheckoutSession(
    config : Types.PaymentServiceConfig,
    orders : List.List<StorefrontTypes.Order>,
    reference : Text,
    successUrl : Text,
    cancelUrl : Text,
    transform : OutCall.Transform,
  ) : async Result.Result<Types.CheckoutSession, Types.PaymentServiceError> {
    if (config.url == "") { return #err(#notConfigured("PAYMENT_SERVICE_URL is not set")) };
    if (config.token == "") { return #err(#notConfigured("PAYMENT_SERVICE_TOKEN is not set")) };
    switch (orders.find(func o = o.reference == reference)) {
      case null { #err(#notFound) };
      case (?order) {
        let body = buildCreateSessionBody(order, successUrl, cancelUrl);
        let headers = [
          { name = "Content-Type"; value = "application/json" },
          { name = "Authorization"; value = "Bearer " # config.token },
        ];
        let url = config.url # "/create-checkout-session";
        try {
          let responseText = await OutCall.httpPostRequest(url, headers, body, transform);
          switch (jsonStringField(responseText, "checkoutUrl")) {
            case (?checkoutUrl) { #ok({ reference = order.reference; url = ?checkoutUrl }) };
            case null { #err(#invalidResponse("missing checkoutUrl in response")) };
          };
        } catch e {
          #err(#outcallFailed("payment service unreachable: " # e.message()));
        };
      };
    };
  };

  // Confirm a card order by querying the external payment service's order
  // status endpoint. Only when the server-side status is "paid" is the order
  // marked #paid and its payment reference recorded. Idempotent: confirming an
  // already-paid (or already-cancelled/expired) order is a no-op and never
  // double-decrements inventory (inventory is reserved once at order creation).
  public func confirmPayment(
    config : Types.PaymentServiceConfig,
    orders : List.List<StorefrontTypes.Order>,
    reference : Text,
    transform : OutCall.Transform,
    emailConfig : Types.PaymentServiceConfig,
    emailTransform : OutCall.Transform,
  ) : async Result.Result<StorefrontTypes.PaymentStatus, Types.PaymentServiceError> {
    if (config.url == "") { return #err(#notConfigured("PAYMENT_SERVICE_URL is not set")) };
    if (config.token == "") { return #err(#notConfigured("PAYMENT_SERVICE_TOKEN is not set")) };
    switch (orders.find(func o = o.reference == reference)) {
      case null { #err(#notFound) };
      case (?order) {
        // Idempotent: never re-confirm an order that is no longer pending.
        let st = order.payment_status;
        switch st {
          case (#paid) { return #ok(#paid) };
          case (#cancelled) { return #ok(#cancelled) };
          case (#expired) { return #ok(#expired) };
          case (#pending) {};
        };
        let url = config.url # "/order-status/" # reference;
        let headers = [{ name = "Authorization"; value = "Bearer " # config.token }];
        try {
          let responseText = await OutCall.httpGetRequest(url, headers, transform);
          switch (jsonStringField(responseText, "status")) {
            case (?status) {
              if (status == "paid") {
                let paymentReference = jsonStringField(responseText, "paymentReference");
                ignore StorefrontLib.updateOrderStatus(orders, reference, #paid, paymentReference);
                // Card order confirmed: send the order confirmation email.
                // Transactional — sends regardless of marketing consent.
                ignore (await EmailLib.sendOrderConfirmation(emailConfig, orders, reference, emailTransform));
                #ok(#paid);
              } else {
                // pending / expired / failed / unknown — leave the order pending.
                #ok(#pending);
              };
            };
            case null { #err(#invalidResponse("missing status in response")) };
          };
        } catch e {
          #err(#outcallFailed("payment service unreachable: " # e.message()));
        };
      };
    };
  };

  // Cancel a pending card order: release the reserved inventory and mark the
  // order #cancelled. Idempotent for already-cancelled/expired orders; refuses
  // to cancel an already-paid order.
  public func cancelOrder(
    orders : List.List<StorefrontTypes.Order>,
    products : List.List<StorefrontTypes.Product>,
    reference : Text,
  ) : Result.Result<(), Types.PaymentServiceError> {
    switch (orders.find(func o = o.reference == reference)) {
      case null { #err(#notFound) };
      case (?order) {
        let st = order.payment_status;
        switch st {
          case (#paid) { #err(#alreadyPaid) };
          case (#cancelled) { #ok() };
          case (#expired) { #ok() };
          case (#pending) {
            StorefrontLib.releaseInventory(products, order);
            ignore StorefrontLib.updateOrderStatus(orders, reference, #cancelled, order.payment_reference);
            #ok();
          };
        };
      };
    };
  };
};
