import Result "mo:core/Result";
import List "mo:core/List";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Types "../types/storefront";
import CryptoTypes "../types/crypto-payments";
import OrderReferencesLib "./order-references";
import RateLimitLib "./rate-limit";
import AssetTypes "../types/product-assets";
import CycleTypes "../types/cycle-monitor";

module {
  // True when a product's price and every variant price are positive integer
  // cents. A product with a zero price (or a zero-price variant) is never
  // saved, because it would let an order be placed for nothing.
  public func hasValidPrices(product : Types.Product) : Bool {
    product.price > 0 and product.variants.all(func v = v.price > 0);
  };

  public func listActiveProducts(products : List.List<Types.Product>) : [Types.Product] {
    products.toArray().filter(func p = p.active and not p.admin_only);
  };

  public func getProduct(products : List.List<Types.Product>, slugOrId : Text, isAdmin : Bool) : ?Types.Product {
    let bySlug = products.find(func p = p.slug == slugOrId);
    switch (bySlug) {
      case (?p) {
        if (p.admin_only and not isAdmin) { null } else { ?p };
      };
      case null {
        switch (Nat.fromText(slugOrId)) {
          case (?id) {
            switch (products.find(func p = p.id == id)) {
              case (?p) { if (p.admin_only and not isAdmin) { null } else { ?p } };
              case null { null };
            };
          };
          case null { null };
        };
      };
    };
  };

  public func getOrderByReference(orders : List.List<Types.Order>, reference : Text) : ?Types.Order {
    orders.find(func o = o.reference == reference);
  };

  func isPending(order : Types.Order) : Bool {
    order.payment_status == #pending;
  };

  public func countPendingOrders(
    orders : List.List<Types.Order>,
    caller : Principal,
    sessionId : ?Text,
    sessionOrders : Map.Map<Text, List.List<Text>>,
  ) : Nat {
    if (caller.isAnonymous()) {
      // Per-session cap for anonymous guests: count how many of the session's
      // order references are still pending.
      switch (sessionId) {
        case null { 0 };
        case (?sid) {
          switch (sessionOrders.get(sid)) {
            case null { 0 };
            case (?refs) {
              refs.toArray().filter(func r = switch (orders.find(func o = o.reference == r)) {
                case (?o) { isPending(o) };
                case null { false };
              }).size();
            };
          };
        };
      };
    } else {
      // Per-principal cap for signed-in customers.
      orders.toArray().filter(func o = switch (o.customer_principal) {
        case (?p) { p == caller and isPending(o) };
        case null { false };
      }).size();
    };
  };

  public func countAllPendingOrders(orders : List.List<Types.Order>) : Nat {
    orders.toArray().filter(isPending).size();
  };

  // Expiry timestamp for a pending order's inventory reservation. Card orders
  // hold their reservation for the short card window; manual (and other
  // non-crypto) orders hold it for the longer manual window. Crypto orders are
  // governed by the crypto verification timer's deposit window and are never
  // swept by the reservation sweep.
  public func reservationExpiry(order : Types.Order) : Int {
    switch (order.payment_method) {
      case (#card_stripe) { order.created_at + RateLimitLib.CARD_RESERVATION_TTL_NANOS };
      case (_) { order.created_at + RateLimitLib.CRYPTO_RESERVATION_TTL_NANOS };
    };
  };

  public func releaseExpiredReservations(orders : List.List<Types.Order>, products : List.List<Types.Product>) : Nat {
    var released = 0;
    let now = Time.now();
    for (order in orders.toArray().values()) {
      if (isPending(order)) {
        switch (order.payment_method) {
          case (#card_stripe) {
            if (now > reservationExpiry(order)) {
              releaseInventory(products, order);
              ignore updateOrderStatus(orders, order.reference, #expired, order.payment_reference);
              released += 1;
            };
          };
          case (#manual) {
            if (now > reservationExpiry(order)) {
              releaseInventory(products, order);
              ignore updateOrderStatus(orders, order.reference, #expired, order.payment_reference);
              released += 1;
            };
          };
          case (_) {}; // crypto orders are handled by the crypto verification timer
        };
      };
    };
    released;
  };

  public func getMyOrders(orders : List.List<Types.Order>, caller : Principal) : [Types.Order] {
    if (caller.isAnonymous()) { return [] };
    orders.toArray().filter(func o = switch (o.customer_principal) {
      case (?p) { p == caller };
      case null { false };
    });
  };

  public func createProduct(products : List.List<Types.Product>, product : Types.Product) {
    products.add(product);
  };

  public func updateProduct(
    products : List.List<Types.Product>,
    product : Types.Product,
    assets : Map.Map<AssetTypes.AssetId, AssetTypes.AssetRecord>,
    selfPrincipal : Principal,
  ) {
    ignore (assets, selfPrincipal);
    let snapshot = products.toArray();
    products.clear();
    for (p in snapshot.values()) {
      if (p.id == product.id) { products.add(product) } else { products.add(p) };
    };
  };

  // Decrement reserved inventory for an order's line items at order creation.
  func reserveInventory(products : List.List<Types.Product>, order : Types.Order) {
    for (item in order.items.values()) {
      switch (products.find(func p = p.id == item.product_id)) {
        case (?product) {
          let newVariants = product.variants.map(func v =
            if (v.id == item.variant_id) { { v with inventory = v.inventory - item.quantity } } else { v }
          );
          let updated = { product with variants = newVariants; inventory = product.inventory - item.quantity; updated_at = Time.now() };
          let snapshot = products.toArray();
          products.clear();
          for (p in snapshot.values()) {
            if (p.id == updated.id) { products.add(updated) } else { products.add(p) };
          };
        };
        case null {};
      };
    };
  };

  public func releaseInventory(products : List.List<Types.Product>, order : Types.Order) {
    for (item in order.items.values()) {
      switch (products.find(func p = p.id == item.product_id)) {
        case (?product) {
          let newVariants = product.variants.map(func v =
            if (v.id == item.variant_id) { { v with inventory = v.inventory + item.quantity } } else { v }
          );
          let updated = { product with variants = newVariants; inventory = product.inventory + item.quantity; updated_at = Time.now() };
          let snapshot = products.toArray();
          products.clear();
          for (p in snapshot.values()) {
            if (p.id == updated.id) { products.add(updated) } else { products.add(p) };
          };
        };
        case null {};
      };
    };
  };

  public func updateOrderStatus(
    orders : List.List<Types.Order>,
    reference : Text,
    status : Types.PaymentStatus,
    paymentReference : ?Text,
  ) : Bool {
    switch (orders.find(func o = o.reference == reference)) {
      case null { false };
      case (?order) {
        let updated : Types.Order = {
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
          payment_status = status;
          payment_reference = paymentReference;
          customer_principal = order.customer_principal;
          sweep_note = order.sweep_note;
          shipping_status = order.shipping_status;
          shipped_at = order.shipped_at;
          tracking_number = order.tracking_number;
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
        true;
      };
    };
  };

  public func createOrder(
    products : List.List<Types.Product>,
    orders : List.List<Types.Order>,
    state : { var nextOrderId : Nat },
    input : Types.CreateOrderInput,
    caller : Principal,
    minimumOrder : Nat,
    counters : CycleTypes.CycleCounters,
  ) : async Result.Result<Types.Order, Types.OrderError> {
    if (input.items.size() == 0) { return #err(#emptyOrder) };
    // Validate every line item server-side and compute the authoritative unit
    // amounts from the product records — never from browser-submitted prices.
    var subtotal = 0;
    var anyAdminOnly = false;
    let items = List.empty<Types.OrderItem>();
    for (item in input.items.values()) {
      if (item.quantity < 1) { return #err(#invalidQuantity) };
      switch (products.find(func p = p.id == item.product_id)) {
        case null { return #err(#unknownProduct(item.product_id)) };
        case (?product) {
          if (not product.active) { return #err(#productInactive(item.product_id)) };
          if (product.admin_only) { anyAdminOnly := true };
          switch (product.variants.find(func v = v.id == item.variant_id)) {
            case null { return #err(#unknownVariant((item.product_id, item.variant_id))) };
            case (?variant) {
              if (variant.inventory < item.quantity) { return #err(#outOfStock((item.product_id, item.variant_id))) };
              // A zero (or otherwise invalid) price would create a zero-value
              // line item — reject it. An order is never created with one.
              if (variant.price == 0) { return #err(#invalidPrice(product.name)) };
              items.add({
                product_id = item.product_id;
                variant_id = item.variant_id;
                name = product.name;
                quantity = item.quantity;
                unit_amount = variant.price;
              });
              subtotal += variant.price * item.quantity;
            };
          };
        };
      };
    };
    // Shipping: free at or above $50.00 (5000 cents), otherwise $5.00 (500
    // cents). Hidden admin_only test items ship free.
    let shipping = if (anyAdminOnly or subtotal >= 5000) { 0 } else { 500 };
    let tax = subtotal * 8 / 100;
    let total = subtotal + tax + shipping;
    // Crypto-specific checks.
    switch (input.payment_method) {
      case (#crypto_ckusdc) {
        if (not CryptoTypes.CKUSDC_CHECKOUT_ENABLED) { return #err(#ckUSDCDisabled) };
        if (total < minimumOrder) { return #err(#belowMinimumOrder(minimumOrder)) };
      };
      case (_) {};
    };
    let reference = await OrderReferencesLib.generateUniqueReference(orders, counters);
    let now = Time.now();
    let order : Types.Order = {
      id = state.nextOrderId;
      reference;
      items = items.toArray();
      subtotal;
      tax;
      shipping;
      total;
      currency = "usd";
      customer_email = input.customer_email;
      encrypted_shipping = input.encrypted_shipping;
      has_shipping_details = input.has_shipping_details;
      payment_method = input.payment_method;
      payment_status = #pending;
      payment_reference = null;
      customer_principal = if (caller.isAnonymous()) { null } else { ?caller };
      sweep_note = null;
      shipping_status = #pending;
      shipped_at = null;
      tracking_number = null;
      marketing_consent = input.marketing_consent;
      marketing_consent_at = if (input.marketing_consent) { ?now } else { null };
      created_at = now;
      updated_at = now;
    };
    state.nextOrderId += 1;
    orders.add(order);
    reserveInventory(products, order);
    #ok(order);
  };
};
