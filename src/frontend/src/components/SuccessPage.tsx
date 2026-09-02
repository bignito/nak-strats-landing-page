import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  PackageCheck,
  ReceiptText,
  RefreshCw,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import type React from "react";
import { useEffect } from "react";
import { useActiveOrderRef } from "../hooks/useActiveOrderRef";
import { useConfirmCardPayment, useOrderStatus } from "../hooks/useQueries";
import { formatPrice } from "../lib/currency";
import { CopyButton } from "./CopyButton";

interface SuccessPageProps {
  orderReference: string;
  onNavigateToMain: () => void;
  onNavigateToShop: () => void;
}

const SuccessPage: React.FC<SuccessPageProps> = ({
  orderReference,
  onNavigateToMain,
  onNavigateToShop,
}) => {
  const confirm = useConfirmCardPayment();
  const { data: order } = useOrderStatus(orderReference || null);
  const { clearActiveOrderRef } = useActiveOrderRef();

  // Only card orders need server-side confirmation via the payment service.
  // Crypto orders are already confirmed on-ledger, so they render the
  // confirmed state directly without calling confirmCardPayment — this keeps
  // the existing ckUSDC flow working even when the payment service is
  // unconfigured (which would otherwise surface a spurious error state).
  const isCardOrder = order?.payment_method === "card_stripe";

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Confirm the order server-side. The canister performs an HTTPS outcall to
  // the payment service's order-status endpoint and only marks the order paid
  // when that check returns status 'paid'. This page never marks the order
  // paid itself. For crypto orders the payment is already confirmed on-chain,
  // so we skip the outcall entirely and show the confirmed state.
  useEffect(() => {
    if (!orderReference || !isCardOrder) return;
    confirm.mutate(orderReference);
  }, [orderReference, isCardOrder, confirm.mutate]);

  const handleRetry = () => {
    if (!orderReference || !isCardOrder) return;
    confirm.mutate(orderReference);
  };

  const data = confirm.data;
  const isConfirmed =
    !isCardOrder ||
    (data?.__kind__ === "ok" && data.ok === "paid") ||
    (data?.__kind__ === "err" && data.err.__kind__ === "alreadyPaid");
  const isStillPending = data?.__kind__ === "ok" && data.ok === "pending";
  const isError =
    isCardOrder &&
    (confirm.isError ||
      (data?.__kind__ === "err" && data.err.__kind__ !== "alreadyPaid"));

  // Once the order is confirmed as paid, clear the active order reference so
  // the resume banner does not reappear for a completed order.
  useEffect(() => {
    if (isConfirmed) {
      clearActiveOrderRef();
    }
  }, [isConfirmed, clearActiveOrderRef]);

  const errorMessage = (() => {
    if (data?.__kind__ === "err" && data.err.__kind__ !== "alreadyPaid") {
      if (data.err.__kind__ === "outcallFailed") {
        return "We could not reach the payment service to confirm your order. Your order is still pending and has not been charged. Please try again in a moment.";
      }
      if (data.err.__kind__ === "notFound") {
        return "We could not find an order matching this reference. Please check the reference and try again.";
      }
      if (data.err.__kind__ === "notConfigured") {
        return "The payment service is not configured yet. Your order is still pending and has not been charged.";
      }
      return "We could not confirm your payment right now. Your order is still pending and has not been charged. Please try again.";
    }
    return "We could not confirm your payment right now. Your order is still pending and has not been charged. Please try again.";
  })();

  const nextSteps = [
    {
      icon: Wallet,
      title: "Payment Confirmed",
      body: "Your payment was received and verified. Your order is now locked in.",
      accent: "text-positive",
    },
    {
      icon: PackageCheck,
      title: "Order Processing",
      body: "Our team is preparing your items for dispatch. You will receive a shipping update when your order ships.",
      accent: "text-primary",
    },
    {
      icon: ReceiptText,
      title: "Keep Your Reference",
      body: "Save your order reference above. Use it any time to look up your order status.",
      accent: "text-muted-foreground",
    },
  ];

  const renderOrderReference = () => (
    <div className="w-full max-w-md">
      <div className="flex items-center justify-center gap-2 mb-2">
        <ReceiptText className="w-4 h-4 text-muted-foreground" />
        <span className="field-label">Order Reference</span>
      </div>
      <div className="inset-well flex items-center justify-between gap-3">
        <span className="mono-num text-sm text-foreground break-all">
          {orderReference}
        </span>
        <CopyButton text={orderReference} label="Copy" className="shrink-0" />
      </div>
    </div>
  );

  const renderOrderSummary = () => {
    if (!order) return null;
    return (
      <div className="w-full max-w-md text-left">
        <div className="flex items-center justify-center gap-2 mb-4">
          <PackageCheck className="w-4 h-4 text-muted-foreground" />
          <span className="field-label">Order Summary</span>
        </div>
        <div className="summary-panel">
          {order.items.map((item, index) => (
            <div
              key={`${item.variant_id}-${index}`}
              className="summary-row"
              data-ocid={`success.line_item.${index + 1}`}
            >
              <span className="min-w-0">
                <span className="block truncate">{item.name}</span>
                <span className="block text-xs text-muted-foreground">
                  Qty {item.quantity.toString()}
                </span>
              </span>
              <span className="summary-value shrink-0">
                {formatPrice(item.unit_amount * Number(item.quantity))}
              </span>
            </div>
          ))}
          <div className="summary-row">
            <span>Subtotal</span>
            <span className="summary-value">{formatPrice(order.subtotal)}</span>
          </div>
          <div className="summary-row">
            <span>Shipping</span>
            <span className="summary-value">{formatPrice(order.shipping)}</span>
          </div>
          <div className="summary-row">
            <span>Tax</span>
            <span className="summary-value">{formatPrice(order.tax)}</span>
          </div>
          <div className="summary-total">
            <span>Total</span>
            <span className="summary-value">{formatPrice(order.total)}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16 px-2">
          <div className="flex items-center justify-center gap-4 mb-8">
            {isConfirmed ? (
              <CheckCircle2 className="w-12 h-12 text-positive" />
            ) : (
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
            )}
            <h1 className="section-heading text-3xl sm:text-4xl md:text-5xl">
              {isConfirmed ? "Order Confirmed" : "Confirming Your Order"}
            </h1>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            {isConfirmed
              ? "Thank you for your purchase. Your payment was successful and your order is confirmed."
              : "We are confirming your payment with the payment service. This only takes a moment."}
          </p>
        </div>

        <div className="relative max-w-4xl mx-auto px-2">
          {confirm.isPending || isStillPending ? (
            /* Confirming state */
            <div
              className="surface p-6 sm:p-10 text-center"
              data-ocid="success.confirming_state"
            >
              <div className="flex flex-col items-center">
                <div className="mb-6">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full surface-hover flex items-center justify-center">
                    <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-primary animate-spin" />
                  </div>
                </div>
                <h2 className="section-heading text-2xl sm:text-3xl mb-3">
                  Confirming Payment
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto mb-8">
                  We are checking your order status with the payment service.
                  Your order is still pending until this confirmation completes.
                </p>
                {renderOrderReference()}
              </div>
            </div>
          ) : isError ? (
            /* Outcall failure / error state — order stays pending */
            <div
              className="surface p-6 sm:p-10 text-center"
              data-ocid="success.error_state"
            >
              <div className="flex flex-col items-center">
                <div className="mb-6">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-destructive-soft flex items-center justify-center">
                    <AlertTriangle className="w-10 h-10 sm:w-12 sm:h-12 text-destructive" />
                  </div>
                </div>
                <h2 className="section-heading text-2xl sm:text-3xl mb-3">
                  Payment Not Confirmed
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto mb-8">
                  {errorMessage}
                </p>
                <div className="mb-8">{renderOrderReference()}</div>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={handleRetry}
                    data-ocid="success.retry_button"
                    className="btn px-8 py-4 text-base font-semibold"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                  </button>
                  <button
                    type="button"
                    onClick={onNavigateToShop}
                    data-ocid="success.continue_shopping_button"
                    className="btn-secondary px-8 py-4 text-base font-semibold"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    Continue Shopping
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Confirmed state */
            <>
              <div className="surface p-6 sm:p-10 mb-8 sm:mb-12">
                <div className="flex flex-col items-center text-center">
                  <div className="mb-6">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-success-soft flex items-center justify-center">
                      <BadgeCheck className="w-10 h-10 sm:w-12 sm:h-12 text-success" />
                    </div>
                  </div>

                  <h2 className="section-heading text-2xl sm:text-3xl mb-3">
                    Payment Successful
                  </h2>
                  <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto mb-8">
                    Your order has been placed and your payment has been
                    confirmed. A summary of your purchase is below.
                  </p>

                  {/* Order reference */}
                  <div className="mb-8">{renderOrderReference()}</div>

                  {/* Ordered items summary */}
                  {renderOrderSummary()}

                  <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
                    <button
                      type="button"
                      onClick={onNavigateToShop}
                      data-ocid="success.continue_shopping_button"
                      className="btn px-8 py-4 text-base font-semibold"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      Continue Shopping
                    </button>
                    <button
                      type="button"
                      onClick={onNavigateToMain}
                      data-ocid="success.back_to_main_button"
                      className="btn-secondary px-8 py-4 text-base font-semibold"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to Main
                    </button>
                  </div>
                </div>
              </div>

              {/* Next steps */}
              <div className="surface p-6 sm:p-10">
                <div className="flex items-center justify-center gap-2 sm:gap-3 mb-6 sm:mb-8">
                  <Clock className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                  <h3 className="section-heading text-2xl sm:text-3xl">
                    What Happens Next
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {nextSteps.map((step, index) => {
                    const Icon = step.icon;
                    return (
                      <div
                        key={step.title}
                        className="hairline p-5 sm:p-6"
                        data-ocid={`success.next_step.${index + 1}`}
                      >
                        <div className="w-12 h-12 rounded-md surface-hover flex items-center justify-center mb-4">
                          <Icon className={`w-6 h-6 ${step.accent}`} />
                        </div>
                        <h4 className="section-heading text-lg mb-2">
                          {step.title}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {step.body}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Support note */}
                <div className="mt-8 sm:mt-10 flex items-start justify-center gap-3 text-center">
                  <Mail className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
                    Questions about your order? Reach out to our support team
                    and reference your order number so we can help you faster.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuccessPage;
