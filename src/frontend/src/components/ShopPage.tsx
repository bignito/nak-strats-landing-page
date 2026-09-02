import { useCart } from "@/hooks/useCart";
import { useCategories, useProducts } from "@/hooks/useQueries";
import { formatPrice } from "@/lib/currency";
import type { Product } from "@/types/storefront";
import { ArrowLeft, Check, Image as ImageIcon } from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";

interface ShopPageProps {
  onNavigateToMain: () => void;
  onNavigateToProduct?: (slugOrId: string) => void;
}

/** A category slug, or "all" when no filter is active. */
type CategoryFilter = string;

/** One rendered shop section: a known category, or the trailing safety net. */
interface ShopSection {
  key: string;
  heading: string;
  items: Product[];
}

/** Read the selected category slug from the URL hash (#/shop?cat=<slug>). */
function readFilterFromUrl(): CategoryFilter {
  const hash = window.location.hash;
  const queryIndex = hash.indexOf("?");
  if (queryIndex === -1) return "all";
  const params = new URLSearchParams(hash.slice(queryIndex + 1));
  return params.get("cat") ?? "all";
}

const ShopPage: React.FC<ShopPageProps> = ({ onNavigateToMain }) => {
  const { data: products, isLoading, isError } = useProducts();
  const { data: categories } = useCategories();
  const { addItem } = useCart();
  const [addedId, setAddedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<CategoryFilter>(() =>
    readFilterFromUrl(),
  );

  // Automatically scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Filter chips: "All" first, then every active category by name, in the
  // stored sortOrder.
  const filterOptions = useMemo(() => {
    const known = (categories ?? [])
      .map((c) => c.category)
      .filter((c) => c.active)
      .sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder));
    return [
      { value: "all", label: "All" },
      ...known.map((c) => ({ value: c.slug, label: c.name })),
    ];
  }, [categories]);

  // A filter referencing a category that no longer exists falls back to "All".
  const resolvedFilter = useMemo(() => {
    if (filter === "all") return "all";
    const known = (categories ?? [])
      .map((c) => c.category)
      .filter((c) => c.active);
    return known.some((c) => c.slug === filter) ? filter : "all";
  }, [filter, categories]);

  // Group products into per-category sections. Section order comes from the
  // stored category sortOrder; a category with no visible products is hidden
  // unless showWhenEmpty is set. Products whose category slug does not match a
  // known active category land in the trailing "Uncategorized" safety net.
  const sections = useMemo(() => {
    if (!products) return [];
    const known = (categories ?? [])
      .map((c) => c.category)
      .filter((c) => c.active)
      .sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder));
    const knownSlugs = new Set(known.map((c) => c.slug));
    const byCategory = new Map<string, Product[]>();
    const uncategorized: Product[] = [];
    for (const product of products) {
      if (product.category && knownSlugs.has(product.category)) {
        const list = byCategory.get(product.category) ?? [];
        list.push(product);
        byCategory.set(product.category, list);
      } else {
        uncategorized.push(product);
      }
    }
    const ordered: ShopSection[] = [];
    for (const category of known) {
      const items = byCategory.get(category.slug);
      if (items && items.length > 0) {
        ordered.push({ key: category.slug, heading: category.name, items });
      } else if (category.showWhenEmpty) {
        ordered.push({ key: category.slug, heading: category.name, items: [] });
      }
    }
    if (uncategorized.length > 0) {
      ordered.push({
        key: "uncategorized",
        heading: "Uncategorized",
        items: uncategorized,
      });
    }
    return ordered;
  }, [products, categories]);

  // Keep the selected category in the URL hash so the filter survives refresh
  // and is shareable through the page URL.
  useEffect(() => {
    const base = "#/shop";
    const params = new URLSearchParams();
    if (resolvedFilter !== "all") params.set("cat", resolvedFilter);
    const query = params.toString();
    const next = query ? `${base}?${query}` : base;
    if (window.location.hash !== next) {
      window.history.replaceState(null, "", next);
    }
  }, [resolvedFilter]);

  const handleAddToCart = (product: Product) => {
    const variantId = product.variants[0]?.id ?? "";
    addItem(product, variantId, 1);
    setAddedId(product.slug || String(product.id));
    window.setTimeout(() => setAddedId(null), 2000);
  };

  // When a specific category is selected, show only that section; when All is
  // selected, show every section with its heading.
  const visibleSections = useMemo(() => {
    if (resolvedFilter === "all") return sections;
    return sections.filter((s) => s.key === resolvedFilter);
  }, [sections, resolvedFilter]);

  const renderCard = (product: Product, index: number) => {
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
        {/* Portrait image well — an empty image field renders as a clean empty
            well with no broken-image icon */}
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

        {/* Notes */}
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
            <span className="stock-pill stock-pill-soldout">Sold out</span>
          ) : isLow ? (
            <span className="stock-pill">{inventory} left</span>
          ) : (
            <span className="stock-pill">In stock</span>
          )}
        </div>
      </div>
    );
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
        <div className="mb-8 sm:mb-10 px-2">
          <p className="section-label mb-3">Product Line</p>
          <h1
            className="text-[1.75rem] font-medium leading-tight"
            style={{ fontSize: "1.75rem", letterSpacing: "-0.015em" }}
          >
            The Collection
          </h1>
          <p
            className="text-sm mt-3 max-w-2xl"
            style={{ color: "var(--muted-foreground)" }}
          >
            Handcrafted colognes and oils from the NAK STRATS collection —
            reserve yours before they sell out.
          </p>
        </div>

        {/* Category filter — plain text buttons, 2px purple underline on active */}
        <div className="px-2 mb-10 sm:mb-12">
          <fieldset
            className="category-filter"
            data-ocid="shop.category_filter"
          >
            <legend className="sr-only">Filter products by category</legend>
            {filterOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={resolvedFilter === option.value ? "is-active" : ""}
                aria-pressed={resolvedFilter === option.value}
                onClick={() => setFilter(option.value)}
                data-ocid={`shop.filter.${option.value.toLowerCase()}`}
              >
                {option.label}
              </button>
            ))}
          </fieldset>
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

        {/* Per-category sections */}
        {!isLoading &&
          !isError &&
          products &&
          products.length > 0 &&
          visibleSections.map((section) => (
            <section
              key={section.key}
              className="mb-12 sm:mb-16"
              data-ocid={`shop.section.${section.key.toLowerCase()}`}
            >
              <h2 className="category-section-heading mb-4 px-2">
                {section.heading}
              </h2>
              <div className="lattice" data-ocid="shop.grid">
                {section.items.map((product, index) =>
                  renderCard(product, index),
                )}
              </div>
            </section>
          ))}
      </div>
    </div>
  );
};

export default ShopPage;
