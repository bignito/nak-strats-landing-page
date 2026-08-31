import { useCart } from "@/hooks/useCart";
import { useProducts } from "@/hooks/useQueries";
import { formatPrice } from "@/lib/currency";
import type { Product } from "@/types/storefront";
import { ArrowLeft, Check, Image as ImageIcon } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";

interface ShopPageProps {
  onNavigateToMain: () => void;
  onNavigateToProduct?: (slugOrId: string) => void;
}

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
            style={{
              background: "transparent",
              border: "none",
              padding: 0,
            }}
            data-ocid="shop.back_link"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>

        {/* Header */}
        <div className="mb-10 sm:mb-14 px-2">
          <p className="section-label mb-3">Product Line</p>
          <h1
            className="text-[1.75rem] font-medium leading-tight"
            style={{ fontSize: "1.75rem", letterSpacing: "-0.015em" }}
          >
            Fragrance
          </h1>
          <p
            className="text-sm mt-3 max-w-2xl"
            style={{ color: "var(--muted-foreground)" }}
          >
            Handcrafted colognes from the NAK STRATS collection — reserve yours
            before they sell out.
          </p>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="lattice" data-ocid="shop.loading_state">
            {["skeleton-0", "skeleton-1", "skeleton-2"].map((key) => (
              <div key={key} className="lattice-cell">
                <div className="product-well loading-shimmer" />
                <div className="loading-shimmer h-5 w-3/4" />
                <div className="loading-shimmer h-4 w-full" />
                <div className="loading-shimmer h-4 w-2/3" />
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {!isLoading && isError && (
          <div
            className="surface p-8 sm:p-10 text-center max-w-4xl mx-auto"
            data-ocid="shop.error_state"
          >
            <h3 className="text-xl sm:text-2xl mb-3">
              Couldn&apos;t load the collection
            </h3>
            <p
              className="text-sm mb-8 max-w-md mx-auto"
              style={{ color: "var(--muted-foreground)" }}
            >
              Something went wrong while fetching the products. Please try again
              shortly.
            </p>
            <button
              type="button"
              onClick={onNavigateToMain}
              className="btn-secondary"
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
            className="surface p-8 sm:p-10 text-center max-w-4xl mx-auto"
            data-ocid="shop.empty_state"
          >
            <ImageIcon
              className="w-10 h-10 mx-auto mb-6"
              style={{ color: "var(--muted-foreground)" }}
            />
            <h3 className="text-xl sm:text-2xl mb-3">
              The collection is being finalized
            </h3>
            <p
              className="text-sm mb-8 max-w-md mx-auto"
              style={{ color: "var(--muted-foreground)" }}
            >
              Our cologne lineup is being prepared. Check back soon for
              availability and pricing.
            </p>
            <button
              type="button"
              onClick={onNavigateToMain}
              className="btn-secondary"
              data-ocid="shop.back_to_main_button"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Main
            </button>
          </div>
        )}

        {/* Product lattice */}
        {!isLoading && !isError && products && products.length > 0 && (
          <div className="lattice" data-ocid="shop.grid">
            {products.map((product, index) => {
              const image = product.images?.[0];
              const inventory = Number(product.inventory);
              const isSoldOut = inventory === 0;
              const isLow = inventory > 0 && inventory <= 10;
              const isAdded = addedId === (product.slug || String(product.id));
              const size = product.variants[0]?.size;
              return (
                <div
                  key={product.slug || String(product.id)}
                  className={`lattice-cell ${isSoldOut ? "is-soldout" : ""}`}
                  data-ocid={`shop.item.${index + 1}`}
                >
                  {/* Portrait image well */}
                  <div className="product-well">
                    {image ? (
                      <img src={image} alt={product.name} />
                    ) : (
                      <ImageIcon
                        className="w-12 h-12"
                        style={{ color: "var(--muted-foreground)" }}
                      />
                    )}
                  </div>

                  {/* Name + size */}
                  <div className="flex items-baseline justify-between gap-2">
                    <h4
                      className="text-[0.9375rem] font-medium leading-snug"
                      style={{
                        fontSize: "0.9375rem",
                        letterSpacing: "-0.015em",
                      }}
                    >
                      {product.name}
                    </h4>
                    {size && (
                      <span
                        className="mono-num text-[0.6875rem] whitespace-nowrap"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {size}
                      </span>
                    )}
                  </div>

                  {/* Fragrance notes */}
                  <p
                    className="text-[0.75rem] leading-relaxed"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {product.description}
                  </p>

                  {/* Divider */}
                  <div
                    className="mt-auto"
                    style={{ borderTop: "1px solid var(--border)" }}
                  />

                  {/* Price + add */}
                  <div className="flex items-center justify-between gap-2 pt-3">
                    <span className="mono-num text-[0.9375rem]">
                      {formatPrice(product.price)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAddToCart(product)}
                      disabled={isSoldOut}
                      className="add-arrow"
                      style={{
                        background: "transparent",
                        border: "none",
                        padding: 0,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.25rem",
                      }}
                      data-ocid={`shop.add_to_cart_button.${index + 1}`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-4 h-4" />
                          Added
                        </>
                      ) : (
                        <>Add &rarr;</>
                      )}
                    </button>
                  </div>

                  {/* Inventory pill */}
                  <div className="flex items-center justify-between">
                    {isSoldOut ? (
                      <span className="stock-pill stock-pill-soldout">
                        Sold out
                      </span>
                    ) : isLow ? (
                      <span className="stock-pill">{inventory} left</span>
                    ) : (
                      <span className="stock-pill">In stock</span>
                    )}
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
