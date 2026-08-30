import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Clock,
  Copy,
  Loader2,
  Mail,
  PackageCheck,
  ReceiptText,
  RefreshCw,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useConfirmCardPayment, useOrderStatus } from "../hooks/useQueries";

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
  const [copied, setCopied] = useState(false);
  const confirm = useConfirmCardPayment();
  const { data: order } = useOrderStatus(orderReference || null);

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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(orderReference);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

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
      accent: "text-teal-bright",
      soft: "bg-teal-soft",
    },
    {
      icon: PackageCheck,
      title: "Order Processing",
      body: "Our team is preparing your items for dispatch. You will receive a shipping update shortly.",
      accent: "text-pink-bright",
      soft: "bg-pink-soft",
    },
    {
      icon: ReceiptText,
      title: "Keep Your Reference",
      body: "Save your order reference above. Use it any time to look up your order status.",
      accent: "text-purple-400",
      soft: "bg-purple-900/20",
    },
  ];

  return (
    <div className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16 px-2">
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="relative">
              {isConfirmed ? (
                <CheckCircle2 className="w-12 h-12 text-success" />
              ) : (
                <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
              )}
              <div className="absolute inset-0 rounded-full bg-success-soft blur-xl animate-pulse" />
            </div>
            <h1
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {isConfirmed ? "Order Confirmed" : "Confirming Your Order"}
            </h1>
          </div>
          <p className="text-sm sm:text-base text-gray-300 max-w-2xl mx-auto">
            {isConfirmed
              ? "Thank you for your purchase. Your payment was successful and your order is confirmed."
              : "We are confirming your payment with the payment service. This only takes a moment."}
          </p>
        </div>

        <div className="relative max-w-4xl mx-auto px-2">
          {confirm.isPending || isStillPending ? (
            /* Confirming state */
            <div
              className="relative card glass-card p-6 sm:p-10 text-center"
              data-ocid="success.confirming_state"
            >
              <div className="flex flex-col items-center">
                <div className="relative mb-6">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-purple-900/20 flex items-center justify-center">
                    <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-purple-400 animate-spin" />
                  </div>
                </div>
                <h2
                  className="text-2xl sm:text-3xl font-semibold text-white mb-3"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Confirming Payment
                </h2>
                <p className="text-sm sm:text-base text-gray-300 max-w-xl mx-auto mb-8">
                  We are checking your order status with the payment service.
                  Your order is still pending until this confirmation completes.
                </p>
                <div className="w-full max-w-md deposit-surface p-5 sm:p-6">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <ReceiptText className="w-4 h-4 text-teal-bright" />
                    <span className="text-xs uppercase tracking-widest text-gray-400">
                      Order Reference
                    </span>
                  </div>
                  <span className="font-mono-nak text-lg sm:text-xl text-teal-bright break-all">
                    {orderReference}
                  </span>
                </div>
              </div>
            </div>
          ) : isError ? (
            /* Outcall failure / error state — order stays pending */
            <div
              className="relative card glass-card p-6 sm:p-10 text-center"
              data-ocid="success.error_state"
            >
              <div className="flex flex-col items-center">
                <div className="relative mb-6">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-destructive-soft flex items-center justify-center">
                    <AlertTriangle className="w-10 h-10 sm:w-12 sm:h-12 text-destructive" />
                  </div>
                </div>
                <h2
                  className="text-2xl sm:text-3xl font-semibold text-white mb-3"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Payment Not Confirmed
                </h2>
                <p className="text-sm sm:text-base text-gray-300 max-w-xl mx-auto mb-8">
                  {errorMessage}
                </p>
                <div className="w-full max-w-md deposit-surface p-5 sm:p-6 mb-8">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <ReceiptText className="w-4 h-4 text-teal-bright" />
                    <span className="text-xs uppercase tracking-widest text-gray-400">
                      Order Reference
                    </span>
                  </div>
                  <span className="font-mono-nak text-lg sm:text-xl text-teal-bright break-all">
                    {orderReference}
                  </span>
                </div>
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
                    className="btn px-8 py-4 text-base font-semibold"
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
              <div className="relative card glass-card p-6 sm:p-10 mb-8 sm:mb-12">
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-6">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-success-soft flex items-center justify-center">
                      <BadgeCheck className="w-10 h-10 sm:w-12 sm:h-12 text-success" />
                    </div>
                    <div className="absolute inset-0 rounded-full bg-success-soft blur-2xl animate-pulse" />
                  </div>

                  <h2
                    className="text-2xl sm:text-3xl font-semibold text-white mb-3"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Payment Successful
                  </h2>
                  <p className="text-sm sm:text-base text-gray-300 max-w-xl mx-auto mb-8">
                    Your order has been placed and your payment has been
                    confirmed. A summary of your purchase is below.
                  </p>

                  {/* Order reference */}
                  <div className="w-full max-w-md deposit-surface p-5 sm:p-6 mb-8">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <ReceiptText className="w-4 h-4 text-teal-bright" />
                      <span className="text-xs uppercase tracking-widest text-gray-400">
                        Order Reference
                      </span>
                    </div>
                    <div className="flex items-center justify-center gap-3">
                      <span className="font-mono-nak text-lg sm:text-xl text-teal-bright break-all">
                        {orderReference}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopy}
                        aria-label="Copy order reference"
                        data-ocid="success.copy_reference_button"
                        className="btn p-2.5 rounded-xl"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    {copied && (
                      <p
                        className="mt-2 text-xs text-success"
                        data-ocid="success.copy_confirmation"
                      >
                        Reference copied to clipboard
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-4">
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
                      className="btn px-8 py-4 text-base font-semibold"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to Main
                    </button>
                  </div>
                </div>
              </div>

              {/* Next steps */}
              <div className="relative card glass-card p-6 sm:p-10">
                <div className="flex items-center justify-center gap-2 sm:gap-3 mb-6 sm:mb-8">
                  <Clock className="w-6 h-6 sm:w-7 sm:h-7 text-pink-400" />
                  <h3
                    className="text-2xl sm:text-3xl font-semibold text-white"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    What Happens Next
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {nextSteps.map((step, index) => {
                    const Icon = step.icon;
                    return (
                      <div
                        key={step.title}
                        className="relative token-option p-5 sm:p-6"
                        data-ocid={`success.next_step.${index + 1}`}
                      >
                        <div
                          className={`w-12 h-12 rounded-xl ${step.soft} flex items-center justify-center mb-4`}
                        >
                          <Icon className={`w-6 h-6 ${step.accent}`} />
                        </div>
                        <h4
                          className="text-lg font-semibold text-white mb-2"
                          style={{ fontFamily: "var(--font-heading)" }}
                        >
                          {step.title}
                        </h4>
                        <p className="text-sm text-gray-400">{step.body}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Support note */}
                <div className="mt-8 sm:mt-10 flex items-start justify-center gap-3 text-center">
                  <Mail className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                  <p className="text-xs sm:text-sm text-gray-400 max-w-xl">
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
