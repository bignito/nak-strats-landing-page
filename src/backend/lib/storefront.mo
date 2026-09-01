import Result "mo:core/Result";
import Time "mo:core/Time";
import List "mo:core/List";
import Map "mo:core/Map";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Types "../types/storefront";
import CryptoTypes "../types/crypto-payments";
import OrderReferencesLib "./order-references";

module {
  public func listActiveProducts(products : List.List<Types.Product>) : [Types.Product] {
    // The public /shop grid shows only active, non-admin-only products. Hidden
    // (admin_only) products never appear here.
    products.toArray().filter(func p = p.active and not p.admin_only);
  };

  public func getProduct(products : List.List<Types.Product>, slugOrId : Text, isAdmin : Bool) : ?Types.Product {
    // Hidden (admin_only) products are returned only to an authenticated admin,
    // so an admin can reach and purchase the test product via a direct product
    // URL or an admin-only view. Non-admins never see hidden products.
    func visible(p : Types.Product) : ?Types.Product {
      if (p.admin_only and not isAdmin) { null } else { ?p };
    };
    switch (products.find(func p = p.slug == slugOrId)) {
      case (?p) { visible(p) };
      case null {
        switch (Nat.fromText(slugOrId)) {
          case (?id) {
            switch (products.find(func p = p.id == id)) {
              case (?p) { visible(p) };
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

  // Returns only the orders whose customer_principal matches the caller. The
  // caller is always derived from msg.caller server-side — never accepted as a
  // parameter. The anonymous principal is rejected (returns an empty list), so
  // a guest can never read anyone's orders through this path.
  public func getMyOrders(orders : List.List<Types.Order>, caller : Principal) : [Types.Order] {
    if (caller == Principal.fromText("2vxsx-fae")) {
      return [];
    };
    orders.toArray().filter(func o = switch (o.customer_principal) {
      case (?p) { p == caller };
      case null { false };
    });
  };

  func decrementVariant(product : Types.Product, variantId : Text, qty : Nat) : Types.Product {
    let newVariants = product.variants.map(func v =
      if (v.id == variantId) {
        let newInv = if (v.inventory >= qty) { v.inventory - qty } else { 0 };
        { v with inventory = newInv };
      } else {
        v;
      }
    );
    let newTotal = if (product.inventory >= qty) { product.inventory - qty } else { 0 };
    { product with variants = newVariants; inventory = newTotal; updated_at = Time.now() };
  };

  func replaceProduct(products : List.List<Types.Product>, updated : Types.Product) {
    let snapshot = products.toArray();
    products.clear();
    for (p in snapshot.values()) {
      if (p.id == updated.id) { products.add(updated) } else { products.add(p) };
    };
  };

  // Admin-only: append a new product to the catalogue. The caller supplies the
  // full Product record (prices in integer cents). The id and timestamps are
  // provided by the caller; the frontend assigns a fresh id and current
  // timestamps when creating.
  public func createProduct(products : List.List<Types.Product>, product : Types.Product) {
    products.add(product);
  };

  // Admin-only: replace an existing product (matched by id) with the supplied
  // record. Prices are integer cents. A no-op when no product with that id
  // exists.
  public func updateProduct(products : List.List<Types.Product>, product : Types.Product) {
    replaceProduct(products, product);
  };

  public func createOrder(
    products : List.List<Types.Product>,
    orders : List.List<Types.Order>,
    state : { var nextOrderId : Nat },
    input : Types.CreateOrderInput,
    caller : Principal,
    minimumOrder : Nat,
  ) : async Result.Result<Types.Order, Types.OrderError> {
    if (input.items.size() == 0) { return #err(#emptyOrder) };

    var subtotal = 0;
    var validatedItems : [Types.OrderItem] = [];
    var reserved : [(Types.ProductId, Text, Nat)] = [];
    // True when the order contains an internal test item (an admin_only
    // product). Internal test items ship free so the test product's total is
    // exactly its price, making the ckUSDC sweep math easy to verify.
    var hasTestItem = false;
    let reservedQty = Map.empty<Text, Nat>();

    for (item in input.items.values()) {
      if (item.quantity < 1) { return #err(#invalidQuantity) };
      switch (products.find(func p = p.id == item.product_id)) {
        case null { return #err(#unknownProduct(item.product_id)) };
        case (?p) {
          if (not p.active) { return #err(#productInactive(item.product_id)) };
          if (p.admin_only) { hasTestItem := true };
          switch (p.variants.find(func v = v.id == item.variant_id)) {
            case null { return #err(#unknownVariant(item.product_id, item.variant_id)) };
            case (?v) {
              let key = item.product_id.toText() # ":" # item.variant_id;
              let already = reservedQty.get(key) ?? 0;
              if (item.quantity + already > v.inventory) {
                return #err(#outOfStock(item.product_id, item.variant_id));
              };
              reservedQty.add(key, already + item.quantity);
              let unitAmount = v.price;
              subtotal += unitAmount * item.quantity;
              validatedItems := validatedItems.concat([{
                product_id = item.product_id;
                variant_id = item.variant_id;
                name = p.name;
                quantity = item.quantity;
                unit_amount = unitAmount;
              }]);
              reserved := reserved.concat([(item.product_id, item.variant_id, item.quantity)]);
            };
          };
        };
      };
    };

    // Internal test items (admin_only products) are exempt from tax as well as
    // shipping, so a single test item's total is exactly its price ($0.50),
    // making the ckUSDC sweep math easy to verify. Real products keep the
    // existing 8% tax and shipping rules.
    let tax = if (hasTestItem) { 0 } else { subtotal * 8 / 100 };
    let shipping = if (hasTestItem or subtotal >= 5000) { 0 } else { 500 };
    let total = subtotal + tax + shipping;
    let now = Time.now();

    // Minimum order guard (enforced server-side, not only in the UI): a crypto
    // order whose total is below the configured minimum cannot be swept to the
    // treasury after the ledger transfer fee is deducted, so reject it here
    // with a clear customer-facing error. Card and manual orders are unaffected.
    let pm = input.payment_method;
    switch pm {
      case (#crypto_ckusdc) {
        // Temporary-disable flag: while CKUSDC_CHECKOUT_ENABLED is false, new
        // ckUSDC orders are rejected server-side so a direct canister call
        // cannot create one even though the UI no longer offers the option.
        // Existing ckUSDC orders are unaffected.
        if (not CryptoTypes.CKUSDC_CHECKOUT_ENABLED) { return #err(#ckUSDCDisabled) };
        if (total < minimumOrder) { return #err(#belowMinimumOrder(minimumOrder)) };
      };
      case (#crypto_icp) {
        if (total < minimumOrder) { return #err(#belowMinimumOrder(minimumOrder)) };
      };
      case (_) {};
    };

    // The display reference is a separate field from the sequential order id:
    // it is drawn from IC raw randomness (unguessable, so order volume and
    // enumerability never leak) and checked for collisions against existing
    // references. The per-order ICRC-1 subaccount is derived from the
    // sequential order id (deriveSubaccount in lib/crypto-payments.mo), so
    // ledger verification, the sweep, and all existing orders are unaffected.
    let order : Types.Order = {
      id = state.nextOrderId;
      reference = await OrderReferencesLib.generateUniqueReference(orders);
      items = validatedItems;
      subtotal;
      tax;
      shipping;
      total;
      currency = "USD";
      customer_email = input.customer_email;
      encrypted_shipping = input.encrypted_shipping;
      has_shipping_details = input.has_shipping_details;
      payment_method = input.payment_method;
      payment_status = #pending;
      payment_reference = null;
      // Store the caller's principal only when they are signed in (non-anonymous).
      // Anonymous guest checkout leaves this null and proceeds exactly as before.
      customer_principal = if (caller == Principal.fromText("2vxsx-fae")) { null } else { ?caller };
      sweep_note = null;
      shipping_status = #pending;
      shipped_at = null;
      tracking_number = null;
      // Record the customer's marketing consent choice and, when they opted in,
      // the exact timestamp at which consent was given (defensible under
      // GDPR/CAN-SPAM). The checkbox is never pre-checked.
      marketing_consent = input.marketing_consent;
      marketing_consent_at = if (input.marketing_consent) { ?now } else { null };
      created_at = now;
      updated_at = now;
    };

    state.nextOrderId += 1;
    orders.add(order);

    for ((productId, variantId, qty) in reserved.values()) {
      switch (products.find(func p = p.id == productId)) {
        case (?current) { replaceProduct(products, decrementVariant(current, variantId, qty)) };
        case null {};
      };
    };

    #ok(order);
  };

  // Restore inventory that was reserved (decremented) at order creation. Used
  // when an order is cancelled or expires so the stock is released back.
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

  // Update an order's payment status and payment reference in place. Returns
  // true when the order was found and updated, false otherwise.
  public func updateOrderStatus(
    orders : List.List<Types.Order>,
    reference : Text,
    status : Types.PaymentStatus,
    paymentReference : ?Text,
  ) : Bool {
    switch (orders.find(func o = o.reference == reference)) {
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
      case null { false };
    };
  };
};
