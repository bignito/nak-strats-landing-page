import { ArrowRight } from "lucide-react";
import type React from "react";
import { useCkUSDCCheckoutEnabled } from "../hooks/useQueries";

interface ShopBannerProps {
  onNavigateToShop: () => void;
}

const ShopBanner: React.FC<ShopBannerProps> = ({ onNavigateToShop }) => {
  const ckUSDCEnabled = useCkUSDCCheckoutEnabled();
  return (
    <section className="px-6 py-10">
      <div className="max-w-7xl mx-auto">
        <button
          type="button"
          onClick={onNavigateToShop}
          data-ocid="shop_banner"
          aria-label="Enter the shop"
          className="shop-banner group flex w-full items-center justify-between gap-4 text-left cursor-pointer"
        >
          {/* Square thumbnail placeholder */}
          <span
            className="flex-shrink-0 w-10 h-10 surface flex items-center justify-center"
            aria-hidden="true"
          >
            <span
              className="w-4 h-4"
              style={{
                background: "var(--nak-border-strong)",
                borderRadius: "2px",
              }}
            />
          </span>

          {/* Label + line */}
          <span className="flex-1 min-w-0 flex flex-col gap-0.5">
            <span className="section-label">Product Line</span>
            <span className="truncate" style={{ color: "var(--nak-text)" }}>
              {ckUSDCEnabled
                ? "N.A.K. — five colognes, settled in ckUSDC"
                : "N.A.K. — five colognes"}
            </span>
          </span>

          {/* Enter the shop + arrow */}
          <span className="flex-shrink-0 flex items-center gap-2">
            <span
              className="text-sm font-medium"
              style={{ color: "var(--nak-text)" }}
            >
              Enter the shop
            </span>
            <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </span>
        </button>
      </div>
    </section>
  );
};

export default ShopBanner;
