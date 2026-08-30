import Result "mo:core/Result";
import List "mo:core/List";
import Types "../types/storefront";
import StorefrontLib "../lib/storefront";
import PaymentAdapterLib "../lib/payment-adapter";

mixin (
  products : List.List<Types.Product>,
  orders : List.List<Types.Order>,
  state : { var nextOrderId : Nat },
  paymentAdapter : PaymentAdapterLib.PaymentAdapter,
) {
  public query func listProducts() : async [Types.Product] {
    StorefrontLib.listActiveProducts(products);
  };

  public query func getProduct(slugOrId : Text) : async ?Types.Product {
    StorefrontLib.getProduct(products, slugOrId);
  };

  public func createOrder(input : Types.CreateOrderInput) : async Result.Result<Types.Order, Types.OrderError> {
    switch (StorefrontLib.createOrder(products, orders, state, input)) {
      case (#ok order) {
        switch (await paymentAdapter.createCheckoutSession(order)) {
          case (#ok _) { #ok(order) };
          case (#err e) { #err(#paymentFailed(debug_show(e))) };
        };
      };
      case (#err e) { #err(e) };
    };
  };

  public query func getOrderStatus(reference : Text) : async ?Types.Order {
    StorefrontLib.getOrderByReference(orders, reference);
  };
};
