import { useCart } from "@/hooks/useCart";
import { useProducts } from "@/hooks/useQueries";
import type { Product } from "@/types/storefront";
import {
  ArrowLeft,
  Check,
  Image as ImageIcon,
  ShoppingCart,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";

interface ShopPageProps {
  onNavigateToMain: () => void;
  onNavigateToProduct?: (slugOrId: string) => void;
}

const formatPrice = (value: bigint) =>
  Number(value).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });

const ShopPage: React.FC<ShopPageProps> = ({ onNavigateToMain }) => {
  const { data: products, isLoading, isError } = useProducts();
  const { addItem } = useCart();
  const [addedId, setAddedId] = useState<string | null>(null);

  // Automatically scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleAddToCart = (product: Product) => {
    const variantId = product.variants[0]?.id ?? "";
    addItem(product, variantId, 1);
    setAddedId(product.slug || String(product.id));
    window.setTimeout(() => setAddedId(null), 2000);
  };

  return (
    <div className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Quiet back link */}
        <div className="mb-8 sm:mb-10 px-2">
          <button
            type="button"
            onClick={onNavigateToMain}
            className="back-link"
            data-ocid="shop.back_link"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-12 sm:mb-16 px-2">
          <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-teal-400 mb-3">
            Fragrance
          </p>
          <h1
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            The NAK STRATS Collection
          </h1>
          <p className="text-sm sm:text-base text-gray-300 max-w-2xl mx-auto mt-4">
            Handcrafted colognes from the NAK STRATS collection — reserve yours
            before they sell out.
          </p>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div
            className="grid gap-5"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(15rem, 1fr))",
            }}
            data-ocid="shop.loading_state"
          >
            {["skeleton-0", "skeleton-1", "skeleton-2"].map((key) => (
              <div key={key} className="shop-card p-4">
                <div className="shop-well loading-shimmer mb-4" />
                <div className="loading-shimmer h-6 w-3/4 rounded-lg mb-3" />
                <div className="loading-shimmer h-4 w-full rounded-lg mb-3" />
                <div className="loading-shimmer h-4 w-2/3 rounded-lg" />
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {!isLoading && isError && (
          <div
            className="card glass-card p-6 sm:p-10 text-center max-w-4xl mx-auto"
            data-ocid="shop.error_state"
          >
            <h3 className="text-xl sm:text-2xl mb-3">
              Couldn&apos;t load the collection
            </h3>
            <p className="text-gray-300 mb-8 max-w-md mx-auto">
              Something went wrong while fetching the products. Please try again
              shortly.
            </p>
            <button
              type="button"
              onClick={onNavigateToMain}
              className="btn px-8 py-4 text-base font-semibold"
              data-ocid="shop.back_to_main_button"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Main
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && (!products || products.length === 0) && (
          <div
            className="card glass-card p-6 sm:p-10 text-center max-w-4xl mx-auto"
            data-ocid="shop.empty_state"
          >
            <div className="relative flex items-center justify-center gap-4 mb-6">
              <div className="relative">
                <ShoppingCart className="w-10 h-10 text-purple-400" />
                <div className="absolute inset-0 rounded-full bg-purple-400/20 blur-xl animate-pulse" />
              </div>
            </div>
            <h3 className="text-xl sm:text-2xl mb-3">
              The collection is being finalized
            </h3>
            <p className="text-gray-300 mb-8 max-w-md mx-auto">
              Our cologne lineup is being prepared. Check back soon for
              availability and pricing.
            </p>
            <button
              type="button"
              onClick={onNavigateToMain}
              className="btn px-8 py-4 text-base font-semibold"
              data-ocid="shop.back_to_main_button"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Main
            </button>
          </div>
        )}

        {/* Product cards */}
        {!isLoading && !isError && products && products.length > 0 && (
          <div
            className="grid gap-5"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(15rem, 1fr))",
            }}
          >
            {products.map((product, index) => {
              const image = product.images?.[0];
              const inventory = Number(product.inventory);
              const isSoldOut = inventory === 0;
              const isLow = inventory > 0 && inventory <= 10;
              const isCritical = inventory > 0 && inventory <= 3;
              const isAdded = addedId === (product.slug || String(product.id));
              return (
                <div
                  key={product.slug || String(product.id)}
                  className={`shop-card ${isSoldOut ? "shop-card-soldout" : ""} animate-fade-in-up`}
                  style={{ animationDelay: `${(index + 1) * 0.1}s` }}
                  data-ocid={`shop.item.${index + 1}`}
                >
                  {/* Portrait image well */}
                  <div className="p-4 pb-0">
                    <div className="shop-well">
                      {image ? (
                        <img src={image} alt={product.name} />
                      ) : (
                        <ImageIcon className="w-12 h-12 text-white/40" />
                      )}
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="p-4">
                    {/* Inventory pill */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      {isSoldOut ? (
                        <span className="inventory-pill inventory-pill-soldout">
                          Sold out
                        </span>
                      ) : isLow ? (
                        <span
                          className={`inventory-pill ${
                            isCritical
                              ? "inventory-pill-critical"
                              : "inventory-pill-low"
                          }`}
                        >
                          {inventory} left
                        </span>
                      ) : (
                        <span className="inventory-pill inventory-pill-low">
                          In stock
                        </span>
                      )}
                    </div>

                    {/* Product name */}
                    <h4
                      className="text-lg sm:text-xl font-semibold mb-1 text-white"
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      {product.name}
                    </h4>

                    {/* Description */}
                    <p className="text-xs sm:text-sm text-gray-400 mb-3 line-clamp-2">
                      {product.description}
                    </p>

                    {/* Price */}
                    <div
                      className="text-lg font-semibold text-teal-300 mb-4"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {formatPrice(product.price)}
                    </div>

                    {/* Add to cart */}
                    <button
                      type="button"
                      onClick={() => handleAddToCart(product)}
                      disabled={isSoldOut}
                      className="add-to-cart"
                      data-ocid={`shop.add_to_cart_button.${index + 1}`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-4 h-4" />
                          Added
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4" />
                          Add to Cart
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ShopPage;
