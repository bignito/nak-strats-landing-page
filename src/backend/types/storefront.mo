module {
  public type ProductId = Nat;

  public type ProductVariant = {
    id : Text;
    name : Text;
    size : Text;
    price : Nat;
    inventory : Nat;
  };

  public type Product = {
    id : ProductId;
    name : Text;
    slug : Text;
    description : Text;
    price : Nat;
    currency : Text;
    images : [Text];
    category : Text;
    variants : [ProductVariant];
    inventory : Nat;
    active : Bool;
    created_at : Int;
    updated_at : Int;
  };

  public type OrderItem = {
    product_id : ProductId;
    variant_id : Text;
    name : Text;
    quantity : Nat;
    unit_amount : Nat;
  };

  public type ShippingAddress = {
    line1 : Text;
    line2 : ?Text;
    city : Text;
    region : Text;
    postal_code : Text;
    country : Text;
  };

  public type PaymentStatus = {
    #pending;
    #paid;
    #cancelled;
    #expired;
  };

  public type PaymentMethod = {
    #manual;
    #card_stripe;
    #crypto_icp;
    #crypto_ckusdc;
  };

  public type Order = {
    id : Nat;
    reference : Text;
    items : [OrderItem];
    subtotal : Nat;
    tax : Nat;
    shipping : Nat;
    total : Nat;
    currency : Text;
    customer_email : Text;
    customer_name : Text;
    shipping_address : ShippingAddress;
    payment_method : PaymentMethod;
    payment_status : PaymentStatus;
    payment_reference : ?Text;
    created_at : Int;
    updated_at : Int;
  };

  public type CreateOrderItem = {
    product_id : ProductId;
    variant_id : Text;
    quantity : Nat;
  };

  public type CreateOrderInput = {
    items : [CreateOrderItem];
    customer_email : Text;
    customer_name : Text;
    shipping_address : ShippingAddress;
    payment_method : PaymentMethod;
  };

  public type OrderError = {
    #emptyOrder;
    #unknownProduct : ProductId;
    #productInactive : ProductId;
    #unknownVariant : (ProductId, Text);
    #outOfStock : (ProductId, Text);
    #invalidQuantity;
    #paymentFailed : Text;
  };
};
