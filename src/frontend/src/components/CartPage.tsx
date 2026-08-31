import { useCart } from "@/hooks/useCart";
import { formatPrice } from "@/lib/currency";
import { ArrowLeft, Minus, Plus, ShoppingCart } from "lucide-react";
import type React from "react";
import { useEffect } from "react";

interface CartPageProps {
  onNavigateToMain: () => void;
  onNavigateToCheckout: () => void;
  onNavigateToShop: () => void;
}

const CartPage: React.FC<CartPageProps> = ({
  onNavigateToMain,
  onNavigateToCheckout,
  onNavigateToShop,
}) => {
  const { items, updateQuantity, removeItem, clearCart, itemCount, subtotal } =
    useCart();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10 sm:mb-14 px-2">
          <button
            type="button"
            onClick={onNavigateToShop}
            className="back-link mb-6"
            data-ocid="cart.back_to_shop_link"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Shop
          </button>
          <p className="section-label mb-3">Cart</p>
          <h1 className="text-3xl sm:text-4xl font-medium leading-tight tracking-[-0.015em]">
            Your Cart
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {itemCount > 0
              ? `${itemCount} ${itemCount === 1 ? "item" : "items"} ready for checkout`
              : "Your cart is empty"}
          </p>
        </div>

        {items.length === 0 ? (
          <div className="max-w-4xl mx-auto px-2" data-ocid="cart.empty_state">
            <p className="text-muted-foreground text-sm mb-6">
              Your cart is empty. Explore the shop and add something to get
              started.
            </p>
            <button
              type="button"
              onClick={onNavigateToShop}
              className="back-link"
              data-ocid="cart.continue_shopping_button"
            >
              <ArrowLeft className="w-4 h-4" />
              Continue Shopping
            </button>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
            {/* Line items */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg sm:text-xl">Items</h3>
                <button
                  type="button"
                  onClick={clearCart}
                  className="quiet-remove"
                  data-ocid="cart.clear_button"
                >
                  Clear Cart
                </button>
              </div>

              <table className="cart-table" data-ocid="cart.list">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="text-right">Price</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Total</th>
                    <th aria-label="Remove" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => {
                    const variant = item.product.variants.find(
                      (v) => v.id === item.variantId,
                    );
                    const unitPrice = variant
                      ? Number(variant.price)
                      : Number(item.product.price);
                    const lineTotal = unitPrice * item.quantity;
                    const image = item.product.images[0];

                    return (
                      <tr
                        key={`${item.product.id}-${item.variantId}`}
                        data-ocid={`cart.item.${index + 1}`}
                      >
                        <td>
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="shrink-0 w-16 h-16 rounded overflow-hidden bg-black/40 border border-border flex items-center justify-center">
                              {image ? (
                                <img
                                  src={image}
                                  alt={item.product.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <ShoppingCart className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-base truncate">
                                {item.product.name}
                              </h4>
                              {variant && (
                                <p className="text-sm text-muted-foreground">
                                  {variant.name}
                                  {variant.size ? ` · ${variant.size}` : ""}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="text-right">
                          <span className="mono-num text-muted-foreground">
                            {formatPrice(unitPrice)}
                          </span>
                        </td>
                        <td className="text-right">
                          <div
                            className="bordered-stepper justify-end"
                            data-ocid={`cart.quantity.${index + 1}`}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(
                                  item.product.id,
                                  item.variantId,
                                  item.quantity - 1,
                                )
                              }
                              aria-label={`Decrease quantity of ${item.product.name}`}
                              data-ocid={`cart.decrease_button.${index + 1}`}
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="stepper-value" aria-live="polite">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(
                                  item.product.id,
                                  item.variantId,
                                  item.quantity + 1,
                                )
                              }
                              aria-label={`Increase quantity of ${item.product.name}`}
                              data-ocid={`cart.increase_button.${index + 1}`}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="text-right">
                          <span className="mono-num">
                            {formatPrice(lineTotal)}
                          </span>
                        </td>
                        <td className="text-right">
                          <button
                            type="button"
                            onClick={() =>
                              removeItem(item.product.id, item.variantId)
                            }
                            className="quiet-remove"
                            aria-label={`Remove ${item.product.name} from cart`}
                            data-ocid={`cart.remove_button.${index + 1}`}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Order summary */}
            <div className="lg:col-span-1">
              <div
                className="summary-panel sticky top-24"
                data-ocid="cart.summary"
              >
                <h3 className="text-lg sm:text-xl mb-1">Order Summary</h3>

                <div className="summary-row">
                  <span>Items</span>
                  <span className="summary-value">{itemCount}</span>
                </div>
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span className="summary-value">{formatPrice(subtotal)}</span>
                </div>
                <div className="summary-row">
                  <span>Shipping</span>
                  <span className="summary-value">—</span>
                </div>
                <div className="summary-row">
                  <span>Tax</span>
                  <span className="summary-value">—</span>
                </div>

                <div className="summary-total">
                  <span>Total</span>
                  <span className="summary-value">{formatPrice(subtotal)}</span>
                </div>

                <button
                  type="button"
                  onClick={onNavigateToCheckout}
                  className="btn w-full px-8 py-4 text-base font-medium mt-2"
                  data-ocid="cart.checkout_button"
                >
                  Proceed to Checkout
                </button>

                <button
                  type="button"
                  onClick={onNavigateToShop}
                  className="btn-secondary btn w-full px-8 py-4 text-base font-medium"
                  data-ocid="cart.continue_shopping_button"
                >
                  Continue Shopping
                </button>

                <button
                  type="button"
                  onClick={onNavigateToMain}
                  className="btn-secondary btn w-full px-8 py-4 text-base font-medium"
                  data-ocid="cart.back_to_main_button"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Main
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;
