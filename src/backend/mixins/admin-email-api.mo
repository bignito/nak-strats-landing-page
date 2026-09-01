mixin () {
  // The admin-email domain adds NO new public endpoints. Customer email is
  // exposed only through the existing ADMIN/OWNER-gated admin queries
  // (adminListOrders / adminGetOrderDetail) and is removed from every public or
  // customer-facing query (getOrderStatus / getMyOrders) via
  // lib/admin-email.toPublicOrderView. This mixin intentionally declares no
  // public functions.
};
