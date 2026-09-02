import { useCart } from "@/hooks/useCart";
import { useProduct } from "@/hooks/useQueries";
import { formatPrice } from "@/lib/currency";
import {
  ArrowLeft,
  Check,
  Image as ImageIcon,
  Minus,
  Plus,
  ShoppingCart,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";

interface ProductPageProps {
  slugOrId: string;
  onNavigateToMain: () => void;
  onNavigateToShop: () => void;
}

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
    : (product?.price ?? 0);
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
        {/* Quiet back link */}
        <div className="mb-8 sm:mb-10 px-2">
          <button
            type="button"
            onClick={onNavigateToShop}
            className="back-link"
            data-ocid="product.back_link"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Shop
          </button>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div
            className="relative max-w-5xl mx-auto px-2"
            data-ocid="product.loading_state"
          >
            <div className="surface p-6 sm:p-10">
              <div className="grid grid-cols-1 min-[860px]:grid-cols-2 gap-8 md:gap-12">
                <div className="loading-shimmer aspect-square" />
                <div className="space-y-4">
                  <div className="loading-shimmer h-4 w-24" />
                  <div className="loading-shimmer h-8 w-3/4" />
                  <div className="loading-shimmer h-4 w-full" />
                  <div className="loading-shimmer h-4 w-2/3" />
                  <div className="loading-shimmer h-12 w-40 mt-6" />
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
            <div className="surface p-6 sm:p-10 text-center">
              <h3 className="text-xl sm:text-2xl mb-3">
                Couldn&apos;t load this product
              </h3>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Something went wrong while fetching the product details. Please
                try again or head back to the shop.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={onNavigateToShop}
                  className="btn px-8 py-4 text-base"
                  data-ocid="product.back_to_shop_button"
                >
                  Back to Shop
                </button>
                <button
                  type="button"
                  onClick={onNavigateToMain}
                  className="btn btn-secondary px-8 py-4 text-base"
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
            <div className="surface p-6 sm:p-10 text-center">
              <div className="flex items-center justify-center gap-4 mb-6">
                <ShoppingCart className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl sm:text-2xl mb-3">Product not found</h3>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                We couldn&apos;t find the product you were looking for. It may
                have been removed or the link is no longer valid.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={onNavigateToShop}
                  className="btn px-8 py-4 text-base"
                  data-ocid="product.back_to_shop_button"
                >
                  Browse the Shop
                </button>
                <button
                  type="button"
                  onClick={onNavigateToMain}
                  className="btn btn-secondary px-8 py-4 text-base"
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
            <div className="surface p-6 sm:p-8 lg:p-12">
              <div className="grid grid-cols-1 min-[860px]:grid-cols-2 gap-8 md:gap-12 items-start">
                {/* Product image well */}
                <div className="product-well aspect-square">
                  {image ? (
                    <img src={image} alt={product.name} />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                      <ImageIcon className="w-16 h-16" />
                      <span className="text-sm">No image available</span>
                    </div>
                  )}
                </div>

                {/* Product details */}
                <div className="min-w-0">
                  <p className="section-label mb-3">{product.category}</p>
                  <h2
                    className="text-2xl sm:text-3xl lg:text-4xl mb-3"
                    style={{ fontSize: "1.75rem" }}
                  >
                    {product.name}
                  </h2>
                  <p className="text-sm sm:text-base text-secondary-foreground mb-8">
                    {product.description}
                  </p>

                  {/* Price */}
                  <div className="flex items-center gap-3 mb-8">
                    <span className="mono-num text-2xl sm:text-3xl">
                      {formatPrice(unitPrice)}
                    </span>
                    {maxInventory === 0n && (
                      <span className="stock-pill stock-pill-soldout">
                        Sold out
                      </span>
                    )}
                  </div>

                  {/* Variant selector */}
                  {product.variants.length > 0 && (
                    <div className="mb-8">
                      <h3 className="section-label mb-3">Select Variant</h3>
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
                              className={`bordered-select justify-between text-left ${
                                isSelected ? "is-active" : ""
                              } ${isSoldOut ? "opacity-45 cursor-not-allowed" : ""}`}
                              data-ocid={`product.variant.${variant.id}`}
                            >
                              <span className="flex items-center gap-2">
                                <span className="font-medium text-sm">
                                  {variant.name}
                                  {variant.size ? ` · ${variant.size}` : ""}
                                </span>
                                {isSelected && (
                                  <Check className="w-4 h-4 shrink-0" />
                                )}
                              </span>
                              <span className="flex items-center gap-3">
                                <span className="mono-num text-sm">
                                  {formatPrice(variant.price)}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {isSoldOut
                                    ? "Sold out"
                                    : `${variant.inventory} in stock`}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Quantity stepper */}
                  <div className="mb-8">
                    <h3 className="section-label mb-3">Quantity</h3>
                    <div
                      className="bordered-stepper"
                      data-ocid="product.quantity"
                    >
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        disabled={quantity <= 1}
                        className="disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Decrease quantity"
                        data-ocid="product.decrease_button"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="stepper-value" aria-live="polite">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setQuantity((q) => Math.min(maxQty, q + 1))
                        }
                        disabled={quantity >= maxQty}
                        className="disabled:opacity-40 disabled:cursor-not-allowed"
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
                      className="btn px-8 py-4 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                      data-ocid="product.add_to_cart_button"
                    >
                      {added ? (
                        <>
                          <Check className="w-5 h-5" />
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
                      className="btn btn-secondary px-8 py-4 text-base"
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
                      className="back-link"
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
