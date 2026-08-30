import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Clock,
  Copy,
  Mail,
  PackageCheck,
  ReceiptText,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";

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

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(orderReference);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const nextSteps = [
    {
      icon: Wallet,
      title: "Payment Confirmed",
      body: "Your crypto payment was received and verified on-chain. Your order is now locked in.",
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
              <CheckCircle2 className="w-12 h-12 text-success" />
              <div className="absolute inset-0 rounded-full bg-success-soft blur-xl animate-pulse" />
            </div>
            <h1
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Order Confirmed
            </h1>
          </div>
          <p className="text-sm sm:text-base text-gray-300 max-w-2xl mx-auto">
            Thank you for your purchase. Your crypto payment was successful and
            your order is confirmed.
          </p>
        </div>

        <div className="relative max-w-4xl mx-auto px-2">
          {/* Confirmation card */}
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
                Your order has been placed and your crypto payment has been
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
                Questions about your order? Reach out to our support team and
                reference your order number so we can help you faster.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuccessPage;
