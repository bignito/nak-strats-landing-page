import { useProducts } from "@/hooks/useQueries";
import type { Product } from "@/types/storefront";
import {
  ArrowLeft,
  Image as ImageIcon,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import type React from "react";
import { useEffect } from "react";

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

const accentFor = (index: number) => {
  const accents = [
    "from-purple-500 to-pink-500",
    "from-teal-500 to-purple-500",
    "from-pink-500 to-indigo-500",
    "from-indigo-500 to-teal-500",
    "from-purple-500 to-teal-500",
  ];
  return accents[index % accents.length];
};

const ShopPage: React.FC<ShopPageProps> = ({
  onNavigateToMain,
  onNavigateToProduct = () => {},
}) => {
  const { data: products, isLoading, isError } = useProducts();

  // Automatically scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSelect = (product: Product) => {
    onNavigateToProduct(product.slug || String(product.id));
  };

  return (
    <div className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Modern Header */}
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
              Shop
            </h1>
          </div>
          <p className="text-sm sm:text-base text-gray-300 max-w-2xl mx-auto">
            Official NAK STRATS cologne collection
          </p>
        </div>

        {/* Product Grid */}
        <div className="relative max-w-6xl mx-auto mb-12 sm:mb-20 px-2">
          <div className="relative card glass-card p-6 sm:p-8 lg:p-12">
            <div className="text-center mb-8 sm:mb-12">
              <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-pink-400" />
                <h3
                  className="text-2xl sm:text-3xl font-semibold text-white"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Featured Fragrances
                </h3>
              </div>
              <p className="text-sm sm:text-base text-gray-300">
                Handcrafted colognes from the NAK STRATS collection
              </p>
            </div>

            {/* Loading state */}
            {isLoading && (
              <div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
                data-ocid="shop.loading_state"
              >
                {["skeleton-0", "skeleton-1", "skeleton-2"].map((key) => (
                  <div
                    key={key}
                    className="card glass-card p-6 sm:p-8 text-center"
                  >
                    <div className="loading-shimmer w-24 h-24 sm:w-28 sm:h-28 rounded-2xl mx-auto mb-4 sm:mb-6" />
                    <div className="loading-shimmer h-6 w-3/4 mx-auto rounded-lg mb-3" />
                    <div className="loading-shimmer h-4 w-full rounded-lg mb-3" />
                    <div className="loading-shimmer h-4 w-2/3 mx-auto rounded-lg" />
                  </div>
                ))}
              </div>
            )}

            {/* Error state */}
            {!isLoading && isError && (
              <div
                className="card glass-card p-6 sm:p-10 text-center"
                data-ocid="shop.error_state"
              >
                <h3 className="text-xl sm:text-2xl mb-3">
                  Couldn&apos;t load the collection
                </h3>
                <p className="text-gray-300 mb-8 max-w-md mx-auto">
                  Something went wrong while fetching the products. Please try
                  again shortly.
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
                className="card glass-card p-6 sm:p-10 text-center"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {products.map((product, index) => {
                  const image = product.images?.[0];
                  const isSoldOut = product.inventory === 0n;
                  return (
                    <button
                      key={product.slug || String(product.id)}
                      type="button"
                      onClick={() => handleSelect(product)}
                      className="group relative text-left animate-fade-in-up"
                      style={{ animationDelay: `${(index + 1) * 0.1}s` }}
                      data-ocid={`shop.item.${index + 1}`}
                      aria-label={`View ${product.name}`}
                    >
                      {/* Glow effect */}
                      <div
                        className={`absolute inset-0 bg-gradient-to-r ${accentFor(
                          index,
                        )} rounded-2xl blur-xl opacity-10 group-hover:opacity-20 transition-all duration-500`}
                      />

                      {/* Product card */}
                      <div className="relative block card glass-card p-6 sm:p-8 hover:shadow-2xl transition-all duration-500 group-hover:scale-105 text-center h-full">
                        {/* Product image */}
                        <div className="flex items-center justify-center mb-4 sm:mb-6">
                          <div
                            className={`w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br ${accentFor(
                              index,
                            )} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 overflow-hidden`}
                          >
                            {image ? (
                              <img
                                src={image}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ImageIcon className="w-10 h-10 sm:w-12 sm:h-12 text-white/80" />
                            )}
                          </div>
                        </div>

                        {/* Product name */}
                        <h4
                          className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3 text-white"
                          style={{ fontFamily: "var(--font-heading)" }}
                        >
                          {product.name}
                        </h4>

                        {/* Description */}
                        <p className="text-xs sm:text-sm text-gray-400 mb-3 sm:mb-4 line-clamp-2">
                          {product.description}
                        </p>

                        {/* Price */}
                        <div className="flex items-center justify-center gap-2 text-sm text-teal-300 font-medium">
                          <ShoppingCart className="w-3 h-3" />
                          <span>{formatPrice(product.price)}</span>
                          {isSoldOut && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-destructive-soft text-destructive">
                              Sold out
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Back to Main Button */}
        <div className="text-center px-2">
          <button
            type="button"
            onClick={onNavigateToMain}
            className="btn inline-flex items-center gap-3 sm:gap-4 px-8 sm:px-12 py-4 sm:py-6 text-lg sm:text-xl font-semibold rounded-2xl sm:rounded-3xl transition-all duration-300 hover:scale-105 hover:shadow-2xl group relative overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg, var(--nak-teal) 0%, var(--nak-purple) 50%, var(--nak-pink) 100%)",
              border: "2px solid rgba(6, 182, 212, 0.3)",
              boxShadow: "0 10px 40px rgba(6, 182, 212, 0.2)",
            }}
            data-ocid="shop.back_to_main_button"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 group-hover:-translate-x-1 transition-transform duration-300" />
            <span className="relative z-10">Back to Main Page</span>

            {/* Button shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShopPage;
