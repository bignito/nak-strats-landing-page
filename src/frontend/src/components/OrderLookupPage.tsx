import type { OrderItem } from "@/backend";
import { formatPrice } from "@/lib/currency";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Copy,
  CreditCard,
  MapPin,
  Package,
  Search,
  Wallet,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useActiveOrderRef } from "../hooks/useActiveOrderRef";
import {
  useCryptoDepositInfo,
  useCryptoPaymentStatus,
  useOrderLookup,
  useReleaseExpiredOrders,
  useResumeInfo,
} from "../hooks/useQueries";
import {
  type Order,
  type PaymentStatus,
  depositAccountString,
} from "../types/storefront";

interface OrderLookupPageProps {
  onNavigateToMain: () => void;
}

/** Convert a nanosecond backend timestamp to a readable date string. */
function formatTimestamp(timestamp: bigint): string {
  const date = new Date(Number(timestamp / 1_000_000n));
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Format a millisecond duration as MM:SS or HH:MM:SS. */
function formatRemaining(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Format a token amount (ckUSDC/ICP) in its smallest unit into a string. */
function formatTokenAmount(amount: bigint, decimals: number): string {
  const divisor = 10 ** decimals;
  const whole = amount / BigInt(divisor);
  const fraction = amount % BigInt(divisor);
  const fractionStr = fraction.toString().padStart(decimals, "0");
  return `${whole.toLocaleString()}.${fractionStr}`;
}

const STATUS_META: Record<
  PaymentStatus,
  { label: string; className: string; soft: string }
> = {
  paid: {
    label: "Paid",
    className: "text-success",
    soft: "bg-success-soft",
  },
  pending: {
    label: "Pending Payment",
    className: "text-warning",
    soft: "bg-warning-soft",
  },
  expired: {
    label: "Expired",
    className: "text-destructive",
    soft: "bg-destructive-soft",
  },
  cancelled: {
    label: "Cancelled",
    className: "text-destructive",
    soft: "bg-destructive-soft",
  },
};

function paymentMethodLabel(method: Order["payment_method"]): string {
  switch (method) {
    case "crypto_icp":
      return "ICP (Crypto)";
    case "crypto_ckusdc":
      return "ckUSDC (Crypto)";
    case "card_stripe":
      return "Card";
    case "manual":
      return "Manual";
    default:
      return "Unknown";
  }
}

function OrderItems({ items }: { items: OrderItem[] }) {
  return (
    <ul className="divide-y divide-white/5">
      {items.map((item, index) => (
        <li
          key={`${item.product_id}-${item.variant_id}-${index}`}
          data-ocid={`order.item.${index + 1}`}
          className="flex items-center justify-between gap-4 py-3"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {item.name}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Qty {item.quantity.toString()} · {item.variant_id}
            </p>
          </div>
          <p className="text-sm font-mono-nak text-teal-bright whitespace-nowrap">
            {formatPrice(item.unit_amount * item.quantity)}
          </p>
        </li>
      ))}
    </ul>
  );
}

const OrderLookupPage: React.FC<OrderLookupPageProps> = ({
  onNavigateToMain,
}) => {
  const [reference, setReference] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const { data: order, isLoading, isError } = useOrderLookup(submitted);
  const { data: deposit } = useCryptoDepositInfo(submitted);
  const { data: cryptoStatus } = useCryptoPaymentStatus(submitted);
  const { data: resumeInfo } = useResumeInfo(submitted);
  const { setActiveOrderRef } = useActiveOrderRef();

  // Local tick only drives the display of the server-derived expiry; it never
  // resets the countdown because the source of truth is resumeInfo.expiresAt.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Periodically release reserved inventory for expired orders so they
  // confirm/release without a manual refresh.
  useReleaseExpiredOrders();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = reference.trim();
    if (!trimmed) return;
    setSubmitted(trimmed);
  };

  // Resume an in-progress (unexpired, unpaid) deposit. Store the reference as
  // the active order ref and navigate to /checkout?resume=REF so App.tsx routes
  // the customer back to the same deposit screen with the same address, amount,
  // and remaining time.
  const handleResume = () => {
    if (!submitted) return;
    setActiveOrderRef(submitted);
    window.location.search = `?resume=${encodeURIComponent(submitted)}`;
  };

  const isResumable =
    resumeInfo?.status.__kind__ === "awaiting_payment" &&
    Number(resumeInfo.expiresAt / 1_000_000n) - now > 0;
  const remainingMs = resumeInfo
    ? Number(resumeInfo.expiresAt / 1_000_000n) - now
    : 0;

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — ignore.
    }
  };

  const statusMeta = order ? STATUS_META[order.payment_status] : undefined;

  return (
    <div className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10 sm:mb-14 px-2">
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="relative">
              <Search className="w-12 h-12 text-teal-400" />
              <div className="absolute inset-0 rounded-full bg-teal-400/20 blur-xl animate-pulse" />
            </div>
            <h1
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Order Lookup
            </h1>
          </div>
          <p className="text-sm sm:text-base text-gray-300 max-w-2xl mx-auto">
            Enter your order reference to check its status, items, total, and
            payment state.
          </p>
        </div>

        {/* Lookup form */}
        <div className="relative max-w-2xl mx-auto px-2 mb-10">
          <form
            onSubmit={handleSubmit}
            className="relative card glass-card p-5 sm:p-6"
            data-ocid="order.lookup_form"
          >
            <label
              htmlFor="order-reference"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Order Reference
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                id="order-reference"
                type="text"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="e.g. NAK-XXXXXX"
                className="flex-1 min-w-0 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50"
                data-ocid="order.reference_input"
              />
              <button
                type="submit"
                className="btn px-6 py-3 text-sm font-semibold"
                data-ocid="order.lookup_button"
              >
                <Search className="w-4 h-4" />
                Look Up Order
              </button>
            </div>
          </form>
        </div>

        {/* Results */}
        {submitted && (
          <div className="relative px-2">
            {isLoading && (
              <div
                className="card glass-card p-8 text-center"
                data-ocid="order.loading_state"
              >
                <div className="loading-shimmer h-4 w-40 mx-auto rounded mb-4" />
                <div className="loading-shimmer h-4 w-64 mx-auto rounded" />
              </div>
            )}

            {!isLoading && isError && (
              <div
                className="card glass-card p-8 text-center"
                data-ocid="order.error_state"
              >
                <p className="text-destructive mb-4">
                  We couldn&apos;t look up that order. Please check the
                  reference and try again.
                </p>
                <button
                  type="button"
                  onClick={() => setSubmitted(null)}
                  className="btn px-6 py-3 text-sm font-semibold"
                  data-ocid="order.retry_button"
                >
                  Try Again
                </button>
              </div>
            )}

            {!isLoading && !isError && !order && (
              <div
                className="card glass-card p-8 text-center"
                data-ocid="order.empty_state"
              >
                <Package className="w-10 h-10 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-300">
                  No order found for reference{" "}
                  <span className="font-mono-nak text-teal-bright">
                    {submitted}
                  </span>
                  .
                </p>
              </div>
            )}

            {!isLoading && !isError && order && statusMeta && (
              <div className="space-y-6">
                {/* Status banner */}
                <div
                  className="card glass-card p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  data-ocid="order.status_banner"
                >
                  <div className="flex items-center gap-4">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${statusMeta.soft} ${statusMeta.className}`}
                      data-ocid="order.status"
                    >
                      <Clock className="w-4 h-4" />
                      {statusMeta.label}
                    </span>
                    <div>
                      <p className="text-sm text-gray-400">Reference</p>
                      <p className="font-mono-nak text-white">
                        {order.reference}
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-sm text-gray-400">Placed</p>
                    <p className="text-sm text-gray-300">
                      {formatTimestamp(order.created_at)}
                    </p>
                  </div>
                </div>

                {/* Resume deposit — shown when the order is an in-progress,
                    unexpired, unpaid deposit so the customer can return to the
                    same deposit screen with the same address, amount, and
                    remaining time. */}
                {isResumable && resumeInfo && (
                  <div
                    className="deposit-surface relative p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    data-ocid="order.resume_panel"
                  >
                    <div className="flex items-center gap-4">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-soft text-teal-bright">
                        <Wallet className="h-6 w-6" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          This deposit is still open
                        </p>
                        <p className="text-sm text-gray-300">
                          Resume to complete your payment —{" "}
                          <span className="font-mono-nak text-teal-bright">
                            {formatRemaining(remainingMs)}
                          </span>{" "}
                          remaining
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleResume}
                      className="btn px-6 py-3 text-sm font-semibold flex-shrink-0"
                      data-ocid="order.resume_button"
                    >
                      Resume deposit
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Items + totals */}
                  <div className="card glass-card p-6 sm:p-8">
                    <h3
                      className="text-lg font-semibold mb-4 flex items-center gap-2"
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      <Package className="w-5 h-5 text-purple-400" />
                      Items
                    </h3>
                    <OrderItems items={order.items} />
                    <div className="mt-4 pt-4 border-t border-white/10 space-y-2 text-sm">
                      <div className="flex justify-between text-gray-400">
                        <span>Subtotal</span>
                        <span className="font-mono-nak">
                          {formatPrice(order.subtotal)}
                        </span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>Shipping</span>
                        <span className="font-mono-nak">
                          {formatPrice(order.shipping)}
                        </span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>Tax</span>
                        <span className="font-mono-nak">
                          {formatPrice(order.tax)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-white/10">
                        <span className="font-semibold text-white">Total</span>
                        <span className="font-mono-nak text-lg text-teal-bright">
                          {formatPrice(order.total)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Payment + deposit */}
                  <div className="space-y-6">
                    <div className="card glass-card p-6 sm:p-8">
                      <h3
                        className="text-lg font-semibold mb-4 flex items-center gap-2"
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        <CreditCard className="w-5 h-5 text-pink-400" />
                        Payment
                      </h3>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Method</span>
                          <span className="text-white">
                            {paymentMethodLabel(order.payment_method)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Status</span>
                          <span className={statusMeta.className}>
                            {statusMeta.label}
                          </span>
                        </div>
                        {cryptoStatus && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Payment State</span>
                            <span
                              className={
                                cryptoStatus.__kind__ === "paid"
                                  ? "text-success"
                                  : cryptoStatus.__kind__ === "expired"
                                    ? "text-destructive"
                                    : "text-warning"
                              }
                            >
                              {cryptoStatus.__kind__ === "paid"
                                ? `Paid (block ${cryptoStatus.paid.blockIndex.toString()})`
                                : cryptoStatus.__kind__ === "awaiting_payment"
                                  ? "Awaiting payment"
                                  : cryptoStatus.__kind__ === "expired"
                                    ? "Expired"
                                    : cryptoStatus.__kind__ === "overpayment"
                                      ? "Overpayment"
                                      : "Underpayment"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {deposit && (
                      <div
                        className="deposit-surface relative p-6 sm:p-8"
                        data-ocid="order.deposit_panel"
                      >
                        <h3
                          className="text-lg font-semibold mb-4 flex items-center gap-2"
                          style={{ fontFamily: "var(--font-heading)" }}
                        >
                          <Wallet className="w-5 h-5 text-teal-bright" />
                          Deposit Address
                        </h3>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Token</span>
                            <span className="font-mono-nak text-teal-bright">
                              {deposit.token}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Amount Due</span>
                            <span className="font-mono-nak text-white">
                              {formatTokenAmount(
                                deposit.amountDue,
                                deposit.decimals,
                              )}{" "}
                              {deposit.token}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Expires</span>
                            <span className="text-gray-300">
                              {formatTimestamp(deposit.expiresAt)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400 block mb-2">
                              Address
                            </span>
                            <div className="flex items-center gap-2 rounded-xl bg-black/40 border border-white/10 px-3 py-2">
                              <span className="font-mono-nak text-xs text-teal-bright break-all min-w-0">
                                {depositAccountString(deposit)}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleCopy(depositAccountString(deposit))
                                }
                                className="shrink-0 p-2 rounded-lg hover:bg-white/5 transition-colors"
                                aria-label="Copy deposit address"
                                data-ocid="order.copy_address_button"
                              >
                                <Copy className="w-4 h-4 text-gray-400" />
                              </button>
                            </div>
                            {copied && (
                              <p className="text-xs text-success mt-2">
                                Address copied to clipboard.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Shipping */}
                <div className="card glass-card p-6 sm:p-8">
                  <h3
                    className="text-lg font-semibold mb-4 flex items-center gap-2"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    <MapPin className="w-5 h-5 text-teal-400" />
                    Shipping
                  </h3>
                  <p className="text-sm text-gray-300">
                    {order.customer_name} · {order.customer_email}
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    {order.shipping_address.line1}
                    {order.shipping_address.line2
                      ? `, ${order.shipping_address.line2}`
                      : ""}
                    , {order.shipping_address.city},{" "}
                    {order.shipping_address.region},{" "}
                    {order.shipping_address.country}{" "}
                    {order.shipping_address.postal_code}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="text-center mt-10">
          <button
            type="button"
            onClick={onNavigateToMain}
            className="btn px-8 py-4 text-base font-semibold"
            data-ocid="order.back_button"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Main
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderLookupPage;
