import { useCart } from "@/hooks/useCart";
import { formatPrice } from "@/lib/currency";
import { ArrowLeft, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
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
        <div className="text-center mb-12 sm:mb-16 px-2">
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="relative">
              <ShoppingCart className="w-12 h-12 text-teal-400" />
              <div className="absolute inset-0 rounded-full bg-teal-400/20 blur-xl animate-pulse" />
            </div>
            <h1
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Your Cart
            </h1>
          </div>
          <p className="text-sm sm:text-base text-gray-300 max-w-2xl mx-auto">
            {itemCount > 0
              ? `${itemCount} ${itemCount === 1 ? "item" : "items"} ready for checkout`
              : "Your cart is empty"}
          </p>
        </div>

        {items.length === 0 ? (
          <div className="relative max-w-4xl mx-auto px-2">
            <div
              className="relative card glass-card p-6 sm:p-10 text-center"
              data-ocid="cart.empty_state"
            >
              <div className="relative flex items-center justify-center gap-4 mb-6">
                <div className="relative">
                  <ShoppingCart className="w-10 h-10 text-purple-400" />
                  <div className="absolute inset-0 rounded-full bg-purple-400/20 blur-xl animate-pulse" />
                </div>
              </div>
              <h3 className="text-xl sm:text-2xl mb-3">Your cart is empty</h3>
              <p className="text-gray-300 mb-8 max-w-md mx-auto">
                Looks like you haven&apos;t added anything yet. Explore the shop
                and grab some NAK Strat gear.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={onNavigateToShop}
                  className="btn px-8 py-4 text-base font-semibold"
                  data-ocid="cart.continue_shopping_button"
                >
                  Continue Shopping
                </button>
                <button
                  type="button"
                  onClick={onNavigateToMain}
                  className="btn px-8 py-4 text-base font-semibold"
                  data-ocid="cart.back_to_main_button"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Main
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
            {/* Line items */}
            <div className="lg:col-span-2 space-y-4">
              <div className="card glass-card p-4 sm:p-6" data-ocid="cart.list">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg sm:text-xl">Items</h3>
                  <button
                    type="button"
                    onClick={clearCart}
                    className="btn px-4 py-2 text-sm"
                    data-ocid="cart.clear_button"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear Cart
                  </button>
                </div>

                <ul className="divide-y divide-white/10">
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
                      <li
                        key={`${item.product.id}-${item.variantId}`}
                        className="py-4 first:pt-0 last:pb-0"
                        data-ocid={`cart.item.${index + 1}`}
                      >
                        <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                          {/* Thumbnail */}
                          <div className="shrink-0 w-full sm:w-20 h-40 sm:h-20 rounded-xl overflow-hidden bg-black/40 border border-white/10 flex items-center justify-center">
                            {image ? (
                              <img
                                src={image}
                                alt={item.product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ShoppingCart className="w-6 h-6 text-purple-400" />
                            )}
                          </div>

                          {/* Details */}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-base sm:text-lg truncate">
                              {item.product.name}
                            </h4>
                            {variant && (
                              <p className="text-sm text-gray-400">
                                {variant.name}
                                {variant.size ? ` · ${variant.size}` : ""}
                              </p>
                            )}
                            <p className="text-sm text-gray-400 mt-1">
                              {formatPrice(unitPrice)} each
                            </p>
                          </div>

                          {/* Quantity stepper */}
                          <div className="flex items-center gap-3">
                            <div
                              className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/40 p-1"
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
                                className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
                                aria-label={`Decrease quantity of ${item.product.name}`}
                                data-ocid={`cart.decrease_button.${index + 1}`}
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span
                                className="w-8 text-center font-semibold"
                                aria-live="polite"
                              >
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
                                className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
                                aria-label={`Increase quantity of ${item.product.name}`}
                                data-ocid={`cart.increase_button.${index + 1}`}
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Line total */}
                            <div className="w-24 text-right">
                              <p className="font-semibold text-teal-300">
                                {formatPrice(lineTotal)}
                              </p>
                            </div>

                            {/* Remove */}
                            <button
                              type="button"
                              onClick={() =>
                                removeItem(item.product.id, item.variantId)
                              }
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              aria-label={`Remove ${item.product.name} from cart`}
                              data-ocid={`cart.remove_button.${index + 1}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            {/* Order summary */}
            <div className="lg:col-span-1">
              <div
                className="card glass-card p-6 sm:p-8 sticky top-24"
                data-ocid="cart.summary"
              >
                <h3 className="text-lg sm:text-xl mb-6">Order Summary</h3>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Items</span>
                    <span className="font-medium">{itemCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Subtotal</span>
                    <span className="font-medium">{formatPrice(subtotal)}</span>
                  </div>
                </div>

                <div className="my-6 h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />

                <div className="flex items-center justify-between mb-6">
                  <span className="text-base font-semibold">Total</span>
                  <span className="text-xl font-bold text-teal-300">
                    {formatPrice(subtotal)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={onNavigateToCheckout}
                  className="btn w-full px-8 py-4 text-base font-semibold"
                  data-ocid="cart.checkout_button"
                >
                  Proceed to Checkout
                </button>

                <button
                  type="button"
                  onClick={onNavigateToShop}
                  className="btn w-full px-8 py-4 text-base font-semibold mt-3"
                  data-ocid="cart.continue_shopping_button"
                >
                  Continue Shopping
                </button>

                <button
                  type="button"
                  onClick={onNavigateToMain}
                  className="btn w-full px-8 py-4 text-base font-semibold mt-3"
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
