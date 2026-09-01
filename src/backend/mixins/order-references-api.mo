mixin () {
  // The order-references domain exposes no public endpoints: reference
  // generation is internal to order creation. lib/order-references.mo is
  // called from lib/storefront.mo createOrder (which becomes async), and the
  // public createOrder in mixins/storefront-api.mo awaits it. The public
  // lookup getOrderStatus(reference) is unchanged — it matches by Text
  // equality, so both legacy sequential references and new random references
  // resolve.
};