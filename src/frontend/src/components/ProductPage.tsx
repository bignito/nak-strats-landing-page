import { useCart } from "@/hooks/useCart";
import { useProduct } from "@/hooks/useQueries";
import {
  ArrowLeft,
  Check,
  Image as ImageIcon,
  Minus,
  Plus,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";

interface ProductPageProps {
  slugOrId: string;
  onNavigateToMain: () => void;
  onNavigateToShop: () => void;
}

const formatPrice = (value: bigint) =>
  Number(value).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });

const ProductPage: React.FC<ProductPageProps> = ({
  slugOrId,
  onNavigateToMain,
  onNavigateToShop,
}) => {
  const { data: product, isLoading, isError } = useProduct(slugOrId);
  const { addItem } = useCart();

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    null,
  );
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Reset selection whenever a new product loads
  useEffect(() => {
    setSelectedVariantId(product?.variants[0]?.id ?? null);
    setQuantity(1);
    setAdded(false);
  }, [product]);

  const selectedVariant = useMemo(
    () => product?.variants.find((v) => v.id === selectedVariantId) ?? null,
    [product, selectedVariantId],
  );

  const unitPrice = selectedVariant
    ? selectedVariant.price
    : (product?.price ?? 0n);
  const maxInventory = selectedVariant
    ? selectedVariant.inventory
    : (product?.inventory ?? 0n);
  const maxQty = Math.max(1, Number(maxInventory));
  const image = product?.images[0];

  const handleAddToCart = () => {
    if (!product) return;
    addItem(product, selectedVariantId ?? "", quantity);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-14 px-2">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="relative">
              <ShoppingCart className="w-10 h-10 text-teal-400" />
              <div className="absolute inset-0 rounded-full bg-teal-400/20 blur-xl animate-pulse" />
            </div>
            <h1
              className="text-3xl sm:text-4xl md:text-5xl font-semibold leading-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Product
            </h1>
          </div>
          <p className="text-sm sm:text-base text-gray-300 max-w-2xl mx-auto">
            Official NAK STRATS merchandise and collectibles
          </p>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div
            className="relative max-w-5xl mx-auto px-2"
            data-ocid="product.loading_state"
          >
            <div className="card glass-card p-6 sm:p-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                <div className="loading-shimmer rounded-2xl aspect-square" />
                <div className="space-y-4">
                  <div className="loading-shimmer h-8 w-3/4 rounded-lg" />
                  <div className="loading-shimmer h-4 w-full rounded-lg" />
                  <div className="loading-shimmer h-4 w-2/3 rounded-lg" />
                  <div className="loading-shimmer h-12 w-40 rounded-xl mt-6" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error state */}
        {!isLoading && isError && (
          <div
            className="relative max-w-4xl mx-auto px-2"
            data-ocid="product.error_state"
          >
            <div className="card glass-card p-6 sm:p-10 text-center">
              <h3 className="text-xl sm:text-2xl mb-3">
                Couldn&apos;t load this product
              </h3>
              <p className="text-gray-300 mb-8 max-w-md mx-auto">
                Something went wrong while fetching the product details. Please
                try again or head back to the shop.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={onNavigateToShop}
                  className="btn px-8 py-4 text-base font-semibold"
                  data-ocid="product.back_to_shop_button"
                >
                  Back to Shop
                </button>
                <button
                  type="button"
                  onClick={onNavigateToMain}
                  className="btn px-8 py-4 text-base font-semibold"
                  data-ocid="product.back_to_main_button"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Main
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty / not found state */}
        {!isLoading && !isError && !product && (
          <div
            className="relative max-w-4xl mx-auto px-2"
            data-ocid="product.empty_state"
          >
            <div className="card glass-card p-6 sm:p-10 text-center">
              <div className="relative flex items-center justify-center gap-4 mb-6">
                <div className="relative">
                  <ShoppingCart className="w-10 h-10 text-purple-400" />
                  <div className="absolute inset-0 rounded-full bg-purple-400/20 blur-xl animate-pulse" />
                </div>
              </div>
              <h3 className="text-xl sm:text-2xl mb-3">Product not found</h3>
              <p className="text-gray-300 mb-8 max-w-md mx-auto">
                We couldn&apos;t find the product you were looking for. It may
                have been removed or the link is no longer valid.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={onNavigateToShop}
                  className="btn px-8 py-4 text-base font-semibold"
                  data-ocid="product.back_to_shop_button"
                >
                  Browse the Shop
                </button>
                <button
                  type="button"
                  onClick={onNavigateToMain}
                  className="btn px-8 py-4 text-base font-semibold"
                  data-ocid="product.back_to_main_button"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Main
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Product detail */}
        {!isLoading && !isError && product && (
          <div className="relative max-w-6xl mx-auto px-2">
            <div className="card glass-card p-6 sm:p-8 lg:p-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start">
                {/* Product image */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-teal-600/10 to-pink-600/20 rounded-3xl blur-2xl opacity-40" />
                  <div className="relative aspect-square rounded-3xl overflow-hidden bg-black/40 border border-white/10 flex items-center justify-center">
                    {image ? (
                      <img
                        src={image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-3 text-gray-400">
                        <ImageIcon className="w-16 h-16 text-purple-400" />
                        <span className="text-sm">No image available</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Product details */}
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm uppercase tracking-widest text-teal-400 mb-2">
                    {product.category}
                  </p>
                  <h2
                    className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white mb-3"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {product.name}
                  </h2>
                  <p className="text-sm sm:text-base text-gray-300 mb-6">
                    {product.description}
                  </p>

                  {/* Price */}
                  <div className="flex items-center gap-3 mb-8">
                    <span className="text-2xl sm:text-3xl font-bold text-teal-300">
                      {formatPrice(unitPrice)}
                    </span>
                    {maxInventory === 0n && (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-destructive-soft text-destructive">
                        Out of stock
                      </span>
                    )}
                  </div>

                  {/* Variant selector */}
                  {product.variants.length > 0 && (
                    <div className="mb-8">
                      <h3 className="text-sm font-semibold text-gray-300 mb-3">
                        Select Variant
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {product.variants.map((variant) => {
                          const isSelected = variant.id === selectedVariantId;
                          const isSoldOut = variant.inventory === 0n;
                          return (
                            <button
                              key={variant.id}
                              type="button"
                              onClick={() => {
                                setSelectedVariantId(variant.id);
                                setQuantity(1);
                                setAdded(false);
                              }}
                              disabled={isSoldOut}
                              className={`relative text-left px-4 py-3 rounded-xl border transition-all duration-300 ${
                                isSelected
                                  ? "border-teal-400 bg-teal-soft shadow-[0_0_0_1px_var(--nak-teal-bright),0_4px_16px_rgba(34,211,238,0.2)]"
                                  : "border-white/10 bg-black/40 hover:border-white/25 hover:bg-white/5"
                              } ${isSoldOut ? "opacity-45 cursor-not-allowed" : ""}`}
                              data-ocid={`product.variant.${variant.id}`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-sm text-white">
                                  {variant.name}
                                  {variant.size ? ` · ${variant.size}` : ""}
                                </span>
                                {isSelected && (
                                  <Check className="w-4 h-4 text-teal-400 shrink-0" />
                                )}
                              </div>
                              <div className="flex items-center justify-between gap-2 mt-1">
                                <span className="text-sm text-teal-300">
                                  {formatPrice(variant.price)}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {isSoldOut
                                    ? "Sold out"
                                    : `${variant.inventory} in stock`}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Quantity stepper */}
                  <div className="mb-8">
                    <h3 className="text-sm font-semibold text-gray-300 mb-3">
                      Quantity
                    </h3>
                    <div
                      className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-black/40 p-1"
                      data-ocid="product.quantity"
                    >
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        disabled={quantity <= 1}
                        className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Decrease quantity"
                        data-ocid="product.decrease_button"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span
                        className="w-10 text-center font-semibold"
                        aria-live="polite"
                      >
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setQuantity((q) => Math.min(maxQty, q + 1))
                        }
                        disabled={quantity >= maxQty}
                        className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Increase quantity"
                        data-ocid="product.increase_button"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Add to cart */}
                  <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      disabled={maxInventory === 0n}
                      className="btn px-8 py-4 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                      data-ocid="product.add_to_cart_button"
                    >
                      {added ? (
                        <>
                          <Check className="w-5 h-5 text-teal-300" />
                          Added to Cart
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-5 h-5" />
                          Add to Cart
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={onNavigateToShop}
                      className="btn px-8 py-4 text-base font-semibold"
                      data-ocid="product.continue_shopping_button"
                    >
                      Continue Shopping
                    </button>
                  </div>

                  {/* Back to main */}
                  <div className="mt-8">
                    <button
                      type="button"
                      onClick={onNavigateToMain}
                      className="btn inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold"
                      data-ocid="product.back_to_main_button"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to Main Page
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductPage;
