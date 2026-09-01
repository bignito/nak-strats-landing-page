import StorefrontTypes "../types/storefront";
import AdminEmailTypes "../types/admin-email";

module {
  // Converts an Order into the public-safe PublicOrderView, dropping
  // customer_email so the customer's email is never exposed in a public or
  // customer-facing query. Used by getOrderStatus and getMyOrders.
  public func toPublicOrderView(order : StorefrontTypes.Order) : AdminEmailTypes.PublicOrderView {
    {
      id = order.id;
      reference = order.reference;
      items = order.items;
      subtotal = order.subtotal;
      tax = order.tax;
      shipping = order.shipping;
      total = order.total;
      currency = order.currency;
      encrypted_shipping = order.encrypted_shipping;
      has_shipping_details = order.has_shipping_details;
      payment_method = order.payment_method;
      payment_status = order.payment_status;
      payment_reference = order.payment_reference;
      customer_principal = order.customer_principal;
      sweep_note = order.sweep_note;
      shipping_status = order.shipping_status;
      shipped_at = order.shipped_at;
      tracking_number = order.tracking_number;
      marketing_consent = order.marketing_consent;
      marketing_consent_at = order.marketing_consent_at;
      created_at = order.created_at;
      updated_at = order.updated_at;
    };
  };
}