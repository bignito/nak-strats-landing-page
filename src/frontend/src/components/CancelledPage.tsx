import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import type React from "react";
import { useEffect } from "react";
import { useCancellationToken } from "../hooks/useCancellationToken";
import { useCancelCardOrder, useCancelGuestOrder } from "../hooks/useQueries";

interface CancelledPageProps {
  orderReference: string;
  onNavigateToMain: () => void;
  onNavigateToShop: () => void;
  onNavigateToCart: () => void;
}

const CancelledPage: React.FC<CancelledPageProps> = ({
  orderReference,
  onNavigateToMain,
  onNavigateToShop,
  onNavigateToCart,
}) => {
  const { isAuthenticated } = useInternetIdentity();
  const { getCancellationToken } = useCancellationToken();
  const cancelCardOrder = useCancelCardOrder();
  const cancelGuestOrder = useCancelGuestOrder();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // When a card checkout was cancelled, release the inventory reservation and
  // mark the order cancelled so the reserved stock is freed for other buyers.
  // Signed-in customers cancel as the order owner via cancelCardOrder.
  // Anonymous guests cannot cancel by reference alone (cancelCardOrder now
  // returns #unauthorized for them), so they must present the short-lived
  // cancellation token issued to their browser session when the order was
  // created, via cancelGuestOrder.
  useEffect(() => {
    if (!orderReference) return;
    if (isAuthenticated) {
      cancelCardOrder.mutate(orderReference);
    } else {
      const token = getCancellationToken(orderReference);
      if (token) {
        cancelGuestOrder.mutate({
          reference: orderReference,
          cancellationToken: token,
        });
      }
    }
  }, [
    orderReference,
    isAuthenticated,
    getCancellationToken,
    cancelCardOrder.mutate,
    cancelGuestOrder.mutate,
  ]);

  return (
    <div className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12 sm:mb-16 px-2">
          <h1 className="section-heading text-3xl sm:text-4xl md:text-5xl">
            Checkout Cancelled
          </h1>
        </div>

        <div className="relative max-w-4xl mx-auto px-2">
          <div className="surface p-6 sm:p-10 text-center">
            <p className="text-sm sm:text-base text-muted-foreground mb-8">
              No payment was processed and your cart is still intact. Any
              reserved inventory has been released.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={onNavigateToCart}
                data-ocid="cancelled.back_to_cart_button"
                className="btn px-8 py-4 text-base font-semibold"
              >
                <ShoppingCart className="w-4 h-4" />
                Back to Cart
              </button>
              <button
                type="button"
                onClick={onNavigateToShop}
                data-ocid="cancelled.return_to_shop_button"
                className="btn-secondary px-8 py-4 text-base font-semibold"
              >
                Return to Shop
              </button>
              <button
                type="button"
                onClick={onNavigateToMain}
                data-ocid="cancelled.back_to_main_button"
                className="btn-secondary px-8 py-4 text-base font-semibold"
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
