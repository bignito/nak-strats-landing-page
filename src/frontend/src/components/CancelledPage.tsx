import { ArrowLeft, ShoppingCart, XCircle } from "lucide-react";
import type React from "react";
import { useEffect } from "react";

interface CancelledPageProps {
  onNavigateToMain: () => void;
  onNavigateToShop: () => void;
  onNavigateToCart: () => void;
}

const CancelledPage: React.FC<CancelledPageProps> = ({
  onNavigateToMain,
  onNavigateToShop,
  onNavigateToCart,
}) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12 sm:mb-16 px-2">
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="relative">
              <XCircle className="w-12 h-12 text-red-400" />
              <div className="absolute inset-0 rounded-full bg-red-400/20 blur-xl animate-pulse" />
            </div>
            <h1
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Checkout Cancelled
            </h1>
          </div>
          <p className="text-sm sm:text-base text-gray-300 max-w-2xl mx-auto">
            Your checkout was cancelled
          </p>
        </div>

        <div className="relative max-w-4xl mx-auto px-2">
          <div className="relative card glass-card p-6 sm:p-10 text-center">
            <p className="text-gray-300 mb-6">
              No payment was processed and your cart is still intact. You can
              return to the shop to keep browsing, or head back to your cart to
              try the checkout again.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={onNavigateToShop}
                className="btn px-8 py-4 text-base font-semibold"
              >
                Return to Shop
              </button>
              <button
                type="button"
                onClick={onNavigateToCart}
                className="btn px-8 py-4 text-base font-semibold"
              >
                <ShoppingCart className="w-4 h-4" />
                Back to Cart
              </button>
              <button
                type="button"
                onClick={onNavigateToMain}
                className="btn px-8 py-4 text-base font-semibold"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Main
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CancelledPage;
