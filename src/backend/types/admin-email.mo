import StorefrontTypes "./storefront";

module {
  // Public-safe order view returned by the guest lookup getOrderStatus and by
  // the customer-facing getMyOrders. It mirrors Order EXCEPT customer_email is
  // removed: the customer's email is plaintext PII that must never appear in a
  // public or customer-facing query. It remains visible only through the
  // ADMIN/OWNER-gated admin queries (adminListOrders / adminGetOrderDetail).
  public type PublicOrderView = {
    id : Nat;
    reference : Text;
    items : [StorefrontTypes.OrderItem];
    subtotal : Nat;
    tax : Nat;
    shipping : Nat;
    total : Nat;
    currency : Text;
    // The IBE ciphertext of the customer's shipping details, carried through
    // unchanged from Order.encrypted_shipping. It is opaque ciphertext (never
    // plaintext PII) and is kept so the public response shape stays stable for
    // existing consumers of getOrderStatus / getMyOrders.
    encrypted_shipping : ?Blob;
    has_shipping_details : Bool;
    payment_method : StorefrontTypes.PaymentMethod;
    payment_status : StorefrontTypes.PaymentStatus;
    payment_reference : ?Text;
    customer_principal : ?Principal;
    sweep_note : ?Text;
    shipping_status : StorefrontTypes.ShippingStatus;
    shipped_at : ?Int;
    tracking_number : ?Text;
    marketing_consent : Bool;
    marketing_consent_at : ?Int;
    created_at : Int;
    updated_at : Int;
  };
}
