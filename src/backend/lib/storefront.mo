import Result "mo:core/Result";
import Time "mo:core/Time";
import List "mo:core/List";
import Map "mo:core/Map";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Types "../types/storefront";

module {
  public func listActiveProducts(products : List.List<Types.Product>) : [Types.Product] {
    products.toArray().filter(func p = p.active);
  };

  public func getProduct(products : List.List<Types.Product>, slugOrId : Text) : ?Types.Product {
    switch (products.find(func p = p.slug == slugOrId)) {
      case (?p) { ?p };
      case null {
        switch (Nat.fromText(slugOrId)) {
          case (?id) { products.find(func p = p.id == id) };
          case null { null };
        };
      };
    };
  };

  public func getOrderByReference(orders : List.List<Types.Order>, reference : Text) : ?Types.Order {
    orders.find(func o = o.reference == reference);
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

  public func createOrder(
    products : List.List<Types.Product>,
    orders : List.List<Types.Order>,
    state : { var nextOrderId : Nat },
    input : Types.CreateOrderInput,
  ) : Result.Result<Types.Order, Types.OrderError> {
    if (input.items.size() == 0) { return #err(#emptyOrder) };

    var subtotal = 0;
    var validatedItems : [Types.OrderItem] = [];
    var reserved : [(Types.ProductId, Text, Nat)] = [];
    let reservedQty = Map.empty<Text, Nat>();

    for (item in input.items.values()) {
      if (item.quantity < 1) { return #err(#invalidQuantity) };
      switch (products.find(func p = p.id == item.product_id)) {
        case null { return #err(#unknownProduct(item.product_id)) };
        case (?p) {
          if (not p.active) { return #err(#productInactive(item.product_id)) };
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

    let tax = subtotal * 8 / 100;
    let shipping = if (subtotal >= 5000) { 0 } else { 500 };
    let total = subtotal + tax + shipping;
    let now = Time.now();

    let order : Types.Order = {
      id = state.nextOrderId;
      reference = "NAK-" # state.nextOrderId.toText();
      items = validatedItems;
      subtotal;
      tax;
      shipping;
      total;
      currency = "USD";
      customer_email = input.customer_email;
      customer_name = input.customer_name;
      shipping_address = input.shipping_address;
      payment_method = input.payment_method;
      payment_status = #pending;
      payment_reference = null;
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
          customer_name = order.customer_name;
          shipping_address = order.shipping_address;
          payment_method = order.payment_method;
          payment_status = status;
          payment_reference = paymentReference;
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
