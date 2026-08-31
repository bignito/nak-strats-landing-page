import { PaymentMethod } from "@/backend";
import type { CreateOrderInput } from "@/backend";
import { formatPrice } from "@/lib/currency";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Clock,
  Copy,
  CreditCard,
  Loader2,
  ShieldCheck,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import QRCode from "react-qr-code";
import { useActiveOrderRef } from "../hooks/useActiveOrderRef";
import { useCart } from "../hooks/useCart";
import {
  useCheckCryptoPayment,
  useConfirmCryptoPayment,
  useCreateCardCheckoutSession,
  useCreateOrder,
  useCryptoConfig,
  useCryptoDepositInfo,
  useCryptoPaymentStatus,
  usePaymentServiceConfig,
  useReleaseExpiredOrders,
  useResumeInfo,
} from "../hooks/useQueries";
import type { CartItem, CryptoPaymentStatus, Order } from "../types/storefront";
import { depositAccountString } from "../types/storefront";

interface CheckoutPageProps {
  onNavigateToMain: () => void;
  onNavigateToCart: () => void;
  onNavigateToSuccess: (orderReference: string) => void;
}

type Step = "shipping" | "review" | "deposit";

const STEPS: { key: Step; label: string }[] = [
  { key: "shipping", label: "Shipping" },
  { key: "review", label: "Review" },
  { key: "deposit", label: "Payment" },
];

function formatTokenAmount(amount: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = amount / divisor;
  const fraction = amount % divisor;
  if (fraction === 0n) return whole.toString();
  const fracStr = fraction
    .toString()
    .padStart(decimals, "0")
    .replace(/0+$/, "");
  return `${whole}.${fracStr}`;
}

function formatCountdown(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => n.toString().padStart(2, "0")).join(":");
}

function countdownClass(remainingSec: number): string {
  if (remainingSec <= 60) return "countdown-critical";
  if (remainingSec <= 300) return "countdown-warning";
  return "countdown-idle";
}

function statusMessage(status: CryptoPaymentStatus | null): string {
  if (!status)
    return "Awaiting payment — send the exact amount to the address above.";
  switch (status.__kind__) {
    case "paid":
      return "Payment confirmed on-ledger. Thank you!";
    case "awaiting_payment":
      return "Awaiting payment — send the exact amount to the address above.";
    case "underpayment":
      return "Insufficient payment received. Please send the remaining amount.";
    case "overpayment":
      return "Overpayment detected. Please contact support.";
    case "expired":
      return "This deposit has expired. Please place a new order.";
    default:
      return "Awaiting payment — send the exact amount to the address above.";
  }
}

/** Sticky order summary shown in the right column on desktop. */
function OrderSummary({
  order,
  items,
  cartSubtotal,
}: {
  order: Order | null;
  items: CartItem[];
  cartSubtotal: number;
}) {
  const hasOrder = order !== null;

  return (
    <div className="relative card glass-card p-6">
      <h3 className="mb-4 text-lg uppercase tracking-wide">Order Summary</h3>

      {hasOrder ? (
        <>
          <div className="mb-5 space-y-3">
            {order.items.map((item, idx) => (
              <div
                key={item.variant_id}
                className="flex items-center justify-between gap-4"
                data-ocid={`checkout.summary_item.${idx + 1}`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {item.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    Qty {item.quantity.toString()}
                  </p>
                </div>
                <span className="font-mono-nak text-sm text-gray-200">
                  {formatPrice(item.unit_amount * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-2 border-t border-white/10 pt-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Subtotal</span>
              <span className="font-mono-nak text-gray-200">
                {formatPrice(order.subtotal)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Tax</span>
              <span className="font-mono-nak text-gray-200">
                {formatPrice(order.tax)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Shipping</span>
              <span className="font-mono-nak text-gray-200">
                {formatPrice(order.shipping)}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-white/10 pt-3 text-base font-semibold">
              <span className="text-white">Total</span>
              <span className="font-mono-nak text-teal-bright">
                {formatPrice(order.total)}
              </span>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="mb-5 space-y-3">
            {items.map((item, idx) => {
              const variant = item.product.variants.find(
                (v) => v.id === item.variantId,
              );
              const unitPrice = variant ? variant.price : item.product.price;
              return (
                <div
                  key={`${item.product.id}-${item.variantId}`}
                  className="flex items-center justify-between gap-4"
                  data-ocid={`checkout.summary_item.${idx + 1}`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      {item.product.name}
                    </p>
                    <p className="text-xs text-gray-400">Qty {item.quantity}</p>
                  </div>
                  <span className="font-mono-nak text-sm text-gray-200">
                    {formatPrice(unitPrice * BigInt(item.quantity))}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="space-y-2 border-t border-white/10 pt-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Subtotal</span>
              <span className="font-mono-nak text-gray-200">
                {formatPrice(BigInt(Math.round(cartSubtotal)))}
              </span>
            </div>
            <p className="pt-2 text-xs text-gray-500">
              Tax and shipping are calculated when you place your order.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

const CheckoutPage: React.FC<CheckoutPageProps> = ({
  onNavigateToMain,
  onNavigateToCart,
  onNavigateToSuccess,
}) => {
  const { items, subtotal } = useCart();
  const [step, setStep] = useState<Step>("shipping");
  const [order, setOrder] = useState<Order | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"crypto" | "card">(
    "crypto",
  );
  const [orderError, setOrderError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [paid, setPaid] = useState(false);
  const [expired, setExpired] = useState(false);

  // Resume: a stored active order reference restores a returning customer's
  // in-progress deposit (same address, amount, and server-derived remaining
  // time) instead of starting a new order.
  const { activeOrderRef, setActiveOrderRef, clearActiveOrderRef } =
    useActiveOrderRef();
  const { data: resumeInfo, isError: resumeError } =
    useResumeInfo(activeOrderRef);
  const [resumeMode, setResumeMode] = useState(false);

  // Shipping form draft (local UI state)
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  // Marketing consent — always unticked by default (explicit opt-in only).
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("");
  const [postalCode, setPostalCode] = useState("");

  const createOrder = useCreateOrder();
  const checkPayment = useCheckCryptoPayment();
  const confirmPayment = useConfirmCryptoPayment();
  const createCardSession = useCreateCardCheckoutSession();
  const { data: cryptoConfig } = useCryptoConfig();
  const { data: paymentServiceConfig } = usePaymentServiceConfig();
  useReleaseExpiredOrders();

  // Card payments are only offered when the payment service URL and token are
  // both configured (the token value itself is never exposed — only tokenSet).
  const cardEnabled = useMemo(() => {
    if (!paymentServiceConfig) return false;
    return (
      paymentServiceConfig.url.trim() !== "" && paymentServiceConfig.tokenSet
    );
  }, [paymentServiceConfig]);

  // The reference driving the deposit screen. In resume mode it comes from the
  // stored order's resume info; otherwise from the freshly-created order.
  const depositReference = resumeMode
    ? (resumeInfo?.reference ?? null)
    : (order?.reference ?? null);

  const depositInfo = useCryptoDepositInfo(
    resumeMode ? null : (order?.reference ?? null),
  );
  const paymentStatus = useCryptoPaymentStatus(depositReference);

  // Deposit data for display: resume mode uses the server-provided deposit from
  // getResumeInfo; the fresh flow uses the deposit query for the new order.
  const depositData = resumeMode
    ? (resumeInfo?.deposit ?? null)
    : depositInfo.data;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Restore a returning customer's in-progress deposit on load. Only applies
  // before the user starts a new order (order is null and still on shipping).
  // When the stored reference resolves to a valid awaiting-payment deposit we
  // jump straight to the deposit screen with the same address, amount, and
  // server-derived remaining time. Otherwise the reference is cleared and the
  // normal flow is shown.
  useEffect(() => {
    if (order !== null || step !== "shipping") return;
    if (!activeOrderRef) return;
    if (resumeError) {
      clearActiveOrderRef();
      return;
    }
    if (!resumeInfo) return;
    if (
      resumeInfo.status.__kind__ === "awaiting_payment" &&
      resumeInfo.deposit
    ) {
      setResumeMode(true);
      setStep("deposit");
    } else {
      clearActiveOrderRef();
    }
  }, [
    activeOrderRef,
    resumeInfo,
    resumeError,
    order,
    step,
    clearActiveOrderRef,
  ]);

  // Poll on-ledger payment status while on the deposit screen.
  useEffect(() => {
    if (step !== "deposit" || !depositReference) return;
    const interval = setInterval(() => {
      checkPayment.mutate(depositReference, {
        onSuccess: (result) => {
          if (result.__kind__ === "ok" && result.ok.__kind__ === "paid") {
            // Finalize the order: sweep funds to treasury, mark paid, decrement
            // inventory. Guard against double-confirmation while pending.
            if (!confirmPayment.isPending) {
              confirmPayment.mutate(depositReference, {
                onSuccess: (confirmResult) => {
                  if (
                    confirmResult.__kind__ === "ok" &&
                    confirmResult.ok.__kind__ === "paid"
                  ) {
                    setPaid(true);
                    clearActiveOrderRef();
                  }
                },
              });
            }
          } else if (
            result.__kind__ === "err" &&
            result.err.__kind__ === "expired"
          ) {
            // The backend reports the deposit has expired.
            setExpired(true);
            clearActiveOrderRef();
          }
        },
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [
    step,
    depositReference,
    checkPayment,
    confirmPayment,
    clearActiveOrderRef,
  ]);

  // Navigate to success once paid, passing the real order reference.
  useEffect(() => {
    if (!paid || !order?.reference) return;
    const t = setTimeout(() => onNavigateToSuccess(order.reference), 1800);
    return () => clearTimeout(t);
  }, [paid, order?.reference, onNavigateToSuccess]);

  // Countdown derived from the backend expiry timestamp.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const remainingSec = useMemo(() => {
    if (!depositData) return 0;
    const expiresMs = Number(depositData.expiresAt / 1_000_000n);
    return Math.max(0, Math.floor((expiresMs - now) / 1000));
  }, [depositData, now]);

  // Transition to the expired state once the countdown hits zero (unless the
  // deposit was already paid). The countdown is derived from the server-side
  // expiry timestamp, so it never resets on reload.
  useEffect(() => {
    if (step !== "deposit" || paid) return;
    if (remainingSec <= 0 && depositData) {
      setExpired(true);
      clearActiveOrderRef();
    }
  }, [step, paid, remainingSec, depositData, clearActiveOrderRef]);

  const ledgerUnset = useMemo(() => {
    if (!cryptoConfig) return false;
    return cryptoConfig.ckUSDC.canisterId.toText() === "aaaaa-aa";
  }, [cryptoConfig]);

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOrderError(null);
    const input: CreateOrderInput = {
      customer_name: name,
      customer_email: email,
      marketing_consent: marketingConsent,
      shipping_address: {
        line1,
        line2: line2 || undefined,
        city,
        region,
        country,
        postal_code: postalCode,
      },
      payment_method:
        paymentMethod === "card"
          ? PaymentMethod.card_stripe
          : PaymentMethod.crypto_ckusdc,
      items: items.map((item) => ({
        product_id: item.product.id,
        variant_id: item.variantId,
        quantity: BigInt(item.quantity),
      })),
    };
    createOrder.mutate(input, {
      onSuccess: (result) => {
        if (result.__kind__ === "ok") {
          setOrder(result.ok);
          setResumeMode(false);
          // Remember this order so a returning customer can restore its
          // deposit screen (same address, amount, remaining time).
          setActiveOrderRef(result.ok.reference);
          setStep("review");
        } else {
          setOrderError(
            result.err.__kind__ === "outOfStock"
              ? "One or more items are out of stock."
              : result.err.__kind__ === "emptyOrder"
                ? "Your cart is empty."
                : result.err.__kind__ === "belowMinimumOrder"
                  ? `Orders must be at least ${formatPrice(
                      result.err.belowMinimumOrder,
                    )} for crypto payment.`
                  : "We could not place your order. Please try again.",
          );
        }
      },
    });
  };

  const handleCopyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard unavailable — ignore.
    }
  };

  // Place the order: crypto advances to the deposit screen (existing flow),
  // card creates a Stripe checkout session and redirects the customer.
  const handlePlaceOrder = () => {
    if (!order?.reference) return;
    setOrderError(null);
    if (paymentMethod === "card") {
      const base = `${window.location.origin}${window.location.pathname}`;
      createCardSession.mutate(
        {
          reference: order.reference,
          successUrl: `${base}?order_id=${order.reference}`,
          cancelUrl: `${base}?order_id=${order.reference}&status=cancelled`,
        },
        {
          onSuccess: (result) => {
            if (result.__kind__ === "ok" && result.ok.url) {
              window.location.href = result.ok.url;
            } else {
              setOrderError(
                result.__kind__ === "err" &&
                  result.err.__kind__ === "notConfigured"
                  ? "Card payments are not configured yet."
                  : "We could not start card payment. Please try again.",
              );
            }
          },
        },
      );
    } else {
      setStep("deposit");
    }
  };

  const shippingFormValid =
    name.trim() !== "" &&
    email.trim() !== "" &&
    line1.trim() !== "" &&
    city.trim() !== "" &&
    region.trim() !== "" &&
    country.trim() !== "" &&
    postalCode.trim() !== "";

  const depositAddress = depositData ? depositAccountString(depositData) : "";
  const amountOwed = depositData
    ? formatTokenAmount(depositData.amountDue, depositData.decimals)
    : "";

  // Loading state for the deposit screen: the fresh flow waits on the deposit
  // query; resume mode waits on the resume info resolving before we know
  // whether to restore a deposit or show the normal flow.
  const checkingResume = !!activeOrderRef && !resumeInfo && !resumeError;
  const depositLoading = resumeMode ? false : depositInfo.isLoading;

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8 sm:mb-10 px-2">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="relative">
              <Wallet className="w-12 h-12 text-teal-400" />
              <div className="absolute inset-0 rounded-full bg-teal-400/20 blur-xl animate-pulse" />
            </div>
            <h1
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Checkout
            </h1>
          </div>
          <p className="text-sm sm:text-base text-gray-300 max-w-2xl mx-auto">
            Complete your crypto payment
          </p>
        </div>

        {/* 3-step progress indicator */}
        <div
          className="flex items-center justify-center gap-3 sm:gap-4 mb-8 sm:mb-12"
          data-ocid="checkout.step_indicator"
        >
          {STEPS.map((s, i) => {
            const active = step === s.key;
            const done = i < stepIndex;
            return (
              <div key={s.key} className="flex items-center gap-3 sm:gap-4">
                <div
                  className={`checkout-step ${
                    done
                      ? "checkout-step-done"
                      : active
                        ? "checkout-step-current"
                        : ""
                  }`}
                  data-ocid={`checkout.step.${i + 1}`}
                >
                  <span className="checkout-step-dot">
                    {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="h-px w-8 sm:w-12 bg-white/15" />
                )}
              </div>
            );
          })}
        </div>

        {checkingResume ? (
          <div className="relative max-w-2xl mx-auto px-2">
            <div
              className="relative card glass-card p-8 sm:p-12 text-center"
              data-ocid="checkout.resume_loading"
            >
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-white/5 loading-shimmer" />
              <div className="mx-auto mb-3 h-6 w-48 rounded-xl bg-white/5 loading-shimmer" />
              <div className="mx-auto h-4 w-64 rounded-xl bg-white/5 loading-shimmer" />
            </div>
          </div>
        ) : items.length === 0 && step !== "deposit" ? (
          <div className="relative max-w-2xl mx-auto px-2">
            <div className="relative card glass-card p-8 sm:p-12 text-center">
              <ShoppingCart className="w-12 h-12 text-teal-400 mx-auto mb-4" />
              <h3 className="text-2xl mb-3">Your cart is empty</h3>
              <p className="text-gray-300 mb-6">
                Add some pieces to your cart before checking out.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={onNavigateToCart}
                  data-ocid="checkout.back_to_cart_button"
                  className="btn px-8 py-4 text-base font-semibold"
                >
                  Back to Cart
                </button>
                <button
                  type="button"
                  onClick={onNavigateToMain}
                  data-ocid="checkout.back_to_main_button"
                  className="btn px-8 py-4 text-base font-semibold"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Main
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 min-[820px]:grid-cols-[minmax(0,1fr)_340px] gap-6 sm:gap-8 items-start">
            {/* Left column — active step content */}
            <div className="relative min-w-0 px-2">
              {step === "shipping" ? (
                <div className="relative card glass-card p-6 sm:p-10">
                  <h2 className="text-2xl sm:text-3xl mb-2">
                    Shipping Details
                  </h2>
                  <p className="text-gray-300 mb-8">
                    Where should we send your order?
                  </p>

                  {orderError && (
                    <div
                      className="mb-6 flex items-start gap-3 rounded-xl bg-destructive-soft p-4 text-sm text-destructive"
                      data-ocid="checkout.order_error"
                    >
                      <AlertTriangle className="h-5 w-5 shrink-0" />
                      <span>{orderError}</span>
                    </div>
                  )}

                  <form onSubmit={handleShippingSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label
                          htmlFor="checkout-name"
                          className="mb-1.5 block text-sm font-medium text-gray-300"
                        >
                          Full name
                        </label>
                        <input
                          id="checkout-name"
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Jane Doe"
                          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:outline-none"
                          data-ocid="checkout.name_input"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="checkout-email"
                          className="mb-1.5 block text-sm font-medium text-gray-300"
                        >
                          Email
                        </label>
                        <input
                          id="checkout-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="jane@example.com"
                          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:outline-none"
                          data-ocid="checkout.email_input"
                        />
                      </div>
                    </div>

                    {/* Optional marketing consent — separate from the required
                        email field above. Never pre-checked (explicit opt-in). */}
                    <label
                      htmlFor="checkout-consent"
                      className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4"
                    >
                      <input
                        id="checkout-consent"
                        type="checkbox"
                        checked={marketingConsent}
                        onChange={(e) => setMarketingConsent(e.target.checked)}
                        className="consent-checkbox mt-0.5"
                        data-ocid="checkout.consent_checkbox"
                      />
                      <span className="text-sm text-gray-300">
                        Email me about new NAK STRATS drops and releases
                        <span className="text-gray-500"> (optional)</span>
                      </span>
                    </label>

                    <div>
                      <label
                        htmlFor="checkout-line1"
                        className="mb-1.5 block text-sm font-medium text-gray-300"
                      >
                        Address line 1
                      </label>
                      <input
                        id="checkout-line1"
                        type="text"
                        value={line1}
                        onChange={(e) => setLine1(e.target.value)}
                        placeholder="123 Neon Avenue"
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:outline-none"
                        data-ocid="checkout.line1_input"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="checkout-line2"
                        className="mb-1.5 block text-sm font-medium text-gray-300"
                      >
                        Address line 2{" "}
                        <span className="text-gray-500">(optional)</span>
                      </label>
                      <input
                        id="checkout-line2"
                        type="text"
                        value={line2}
                        onChange={(e) => setLine2(e.target.value)}
                        placeholder="Apt, suite, unit"
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:outline-none"
                        data-ocid="checkout.line2_input"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label
                          htmlFor="checkout-city"
                          className="mb-1.5 block text-sm font-medium text-gray-300"
                        >
                          City
                        </label>
                        <input
                          id="checkout-city"
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="Neo Tokyo"
                          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:outline-none"
                          data-ocid="checkout.city_input"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="checkout-region"
                          className="mb-1.5 block text-sm font-medium text-gray-300"
                        >
                          Region / State
                        </label>
                        <input
                          id="checkout-region"
                          type="text"
                          value={region}
                          onChange={(e) => setRegion(e.target.value)}
                          placeholder="Kanto"
                          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:outline-none"
                          data-ocid="checkout.region_input"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label
                          htmlFor="checkout-country"
                          className="mb-1.5 block text-sm font-medium text-gray-300"
                        >
                          Country
                        </label>
                        <input
                          id="checkout-country"
                          type="text"
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          placeholder="Japan"
                          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:outline-none"
                          data-ocid="checkout.country_input"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="checkout-postal"
                          className="mb-1.5 block text-sm font-medium text-gray-300"
                        >
                          Postal code
                        </label>
                        <input
                          id="checkout-postal"
                          type="text"
                          value={postalCode}
                          onChange={(e) => setPostalCode(e.target.value)}
                          placeholder="100-0001"
                          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:outline-none"
                          data-ocid="checkout.postal_input"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                      <button
                        type="button"
                        onClick={onNavigateToCart}
                        data-ocid="checkout.back_to_cart_button"
                        className="btn px-6 py-3 text-sm font-semibold"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Cart
                      </button>
                      <button
                        type="submit"
                        disabled={!shippingFormValid || createOrder.isPending}
                        data-ocid="checkout.continue_button"
                        className="btn px-8 py-4 text-base font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {createOrder.isPending ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Placing Order…
                          </>
                        ) : (
                          "Continue to Review"
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              ) : step === "review" ? (
                <div className="relative card glass-card p-6 sm:p-10">
                  <h2 className="text-2xl sm:text-3xl mb-2">
                    Checkout Summary
                  </h2>
                  <p className="text-gray-300 mb-8">
                    Review your order and choose a payment token.
                  </p>

                  {ledgerUnset && (
                    <div
                      className="mb-6 flex items-start gap-3 rounded-xl bg-warning-soft p-4 text-sm text-warning"
                      data-ocid="checkout.admin_warning"
                    >
                      <AlertTriangle className="h-5 w-5 shrink-0" />
                      <span>
                        Admin notice: the ckUSDC ledger is not configured.
                        Payment may not be verifiable until it is set.
                      </span>
                    </div>
                  )}

                  {orderError && (
                    <div
                      className="mb-6 flex items-start gap-3 rounded-xl bg-destructive-soft p-4 text-sm text-destructive"
                      data-ocid="checkout.order_error"
                    >
                      <AlertTriangle className="h-5 w-5 shrink-0" />
                      <span>{orderError}</span>
                    </div>
                  )}

                  {/* Payment method selection — crypto (ckUSDC) and card (Stripe) */}
                  <div className="mb-8">
                    <p className="mb-3 text-sm font-medium text-gray-300">
                      Payment method
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("crypto")}
                        data-ocid="checkout.method_crypto"
                        className={`token-option flex items-center gap-4 p-4 text-left ${
                          paymentMethod === "crypto"
                            ? "token-option-selected"
                            : ""
                        }`}
                      >
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-soft text-teal-bright">
                          <Wallet className="h-5 w-5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-white">
                            Pay with crypto
                          </span>
                          <span className="block text-xs text-gray-400">
                            ckUSDC deposit
                          </span>
                        </span>
                        {paymentMethod === "crypto" && (
                          <Check className="ml-auto h-5 w-5 text-teal-bright" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => cardEnabled && setPaymentMethod("card")}
                        disabled={!cardEnabled}
                        data-ocid="checkout.method_card"
                        className={`token-option flex items-center gap-4 p-4 text-left ${
                          paymentMethod === "card"
                            ? "token-option-selected"
                            : ""
                        } ${!cardEnabled ? "token-option-disabled" : ""}`}
                      >
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-soft text-teal-bright">
                          <CreditCard className="h-5 w-5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-white">
                            Pay with card
                          </span>
                          <span className="block text-xs text-gray-400">
                            {cardEnabled
                              ? "Stripe checkout"
                              : "Unavailable — not configured"}
                          </span>
                        </span>
                        {paymentMethod === "card" && (
                          <Check className="ml-auto h-5 w-5 text-teal-bright" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <button
                      type="button"
                      onClick={() => setStep("shipping")}
                      data-ocid="checkout.back_to_shipping_button"
                      className="btn px-6 py-3 text-sm font-semibold"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Edit Shipping
                    </button>
                    <button
                      type="button"
                      onClick={handlePlaceOrder}
                      disabled={createCardSession.isPending}
                      data-ocid="checkout.place_order_button"
                      className="btn px-8 py-4 text-base font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {createCardSession.isPending ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Redirecting to payment…
                        </>
                      ) : (
                        "Place Order"
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative deposit-surface p-6 sm:p-10">
                  {/* PAID badge */}
                  {paid && (
                    <div
                      className="absolute right-5 top-5 flex items-center gap-2 rounded-full bg-success-soft px-4 py-1.5 text-sm font-bold uppercase tracking-wide text-success"
                      data-ocid="checkout.paid_badge"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Paid
                    </div>
                  )}

                  {/* Header row — title left, countdown top-right */}
                  <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-2xl sm:text-3xl mb-1">
                        Crypto Deposit
                      </h2>
                      <p className="text-gray-300">
                        Send the exact amount to the address below to complete
                        your order.
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Clock className="h-5 w-5 text-warning" />
                      <span
                        className={`font-mono-nak text-2xl sm:text-3xl font-bold ${countdownClass(
                          remainingSec,
                        )}`}
                        data-ocid="checkout.countdown"
                      >
                        {formatCountdown(remainingSec)}
                      </span>
                    </div>
                  </div>

                  {expired ? (
                    <div
                      className="flex flex-col items-center gap-4 rounded-xl bg-destructive-soft p-8 text-center"
                      data-ocid="checkout.expired_state"
                    >
                      <AlertTriangle className="h-10 w-10 text-destructive" />
                      <div>
                        <h3 className="text-xl font-semibold text-destructive mb-1">
                          Deposit Expired
                        </h3>
                        <p className="text-sm text-gray-300">
                          This deposit has expired and the reserved inventory
                          has been released. Please place a new order to
                          continue.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={onNavigateToMain}
                        data-ocid="checkout.expired_back_to_main_button"
                        className="btn px-8 py-4 text-base font-semibold"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Main
                      </button>
                    </div>
                  ) : depositLoading ? (
                    <div
                      className="space-y-4"
                      data-ocid="checkout.deposit_loading"
                    >
                      <div className="h-12 w-full rounded-xl bg-white/5 loading-shimmer" />
                      <div className="mx-auto h-40 w-40 rounded-xl bg-white/5 loading-shimmer" />
                      <div className="h-8 w-40 mx-auto rounded-xl bg-white/5 loading-shimmer" />
                    </div>
                  ) : depositData ? (
                    <div className="space-y-8">
                      {/* Order reference — shown prominently before payment */}
                      <div className="flex flex-col items-center gap-1 text-center">
                        <p className="text-xs font-medium uppercase tracking-widest text-gray-400">
                          Order reference
                        </p>
                        <p
                          className="font-mono-nak text-lg sm:text-xl font-bold text-teal-bright"
                          data-ocid="checkout.order_reference"
                        >
                          {depositReference}
                        </p>
                      </div>

                      {/* Amount owed — largest element */}
                      <div className="text-center">
                        <p className="mb-2 text-sm font-medium text-gray-300">
                          Exact amount owed ({depositData.token})
                        </p>
                        <p
                          className="amount-owed"
                          data-ocid="checkout.amount_owed"
                        >
                          {amountOwed}{" "}
                          <span className="text-teal-bright">
                            {depositData.token}
                          </span>
                        </p>
                      </div>

                      {/* Deposit address — dark inset well */}
                      <div>
                        <p className="mb-2 text-sm font-medium text-gray-300">
                          Deposit address
                        </p>
                        <div className="deposit-address-well flex items-center gap-3">
                          <span
                            className="min-w-0 flex-1 break-all"
                            data-ocid="checkout.deposit_address"
                          >
                            {depositAddress}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyAddress(depositAddress)}
                            aria-label="Copy deposit address"
                            data-ocid="checkout.copy_address_button"
                            className="btn shrink-0 px-3 py-2 text-sm"
                          >
                            {copied ? (
                              <Check className="h-4 w-4 text-success" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* QR code */}
                      <div className="flex justify-center">
                        <div className="rounded-2xl bg-white p-4">
                          <QRCode
                            value={depositAddress}
                            size={168}
                            bgColor="#ffffff"
                            fgColor="#000000"
                            aria-label="QR code for deposit address"
                          />
                        </div>
                      </div>

                      {/* Status — 'watching the ledger' with pulsing amber dot */}
                      <div
                        className={`flex items-center gap-3 rounded-xl p-4 text-sm ${
                          paid
                            ? "bg-success-soft text-success"
                            : "bg-teal-soft text-teal-bright"
                        }`}
                        data-ocid="checkout.payment_status"
                      >
                        {paid ? (
                          <ShieldCheck className="h-5 w-5 shrink-0" />
                        ) : (
                          <span
                            className="ledger-dot shrink-0"
                            aria-hidden="true"
                          />
                        )}
                        <span>
                          {paid
                            ? "Payment confirmed. Redirecting to your order summary…"
                            : `Watching the ledger — ${statusMessage(
                                paymentStatus.data ?? null,
                              )}`}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <button
                          type="button"
                          onClick={onNavigateToMain}
                          data-ocid="checkout.back_to_main_button"
                          className="btn px-6 py-3 text-sm font-semibold"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          Back to Main
                        </button>
                        <p className="text-xs text-gray-500">
                          Payment is verified on-ledger automatically.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="flex items-start gap-3 rounded-xl bg-destructive-soft p-4 text-sm text-destructive"
                      data-ocid="checkout.deposit_error"
                    >
                      <AlertTriangle className="h-5 w-5 shrink-0" />
                      <span>
                        We could not generate your deposit. Please go back and
                        try again.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right column — sticky order summary */}
            <aside className="min-w-0 min-[820px]:sticky min-[820px]:top-24">
              <OrderSummary
                order={order}
                items={items}
                cartSubtotal={subtotal}
              />
            </aside>
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckoutPage;
