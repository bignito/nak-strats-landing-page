import type { OrderItem } from "@/backend";
import { formatPrice } from "@/lib/currency";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
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
import { CopyButton } from "./CopyButton";
import { StatusPill } from "./StatusPill";

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
  { label: string; tone: "positive" | "warning" | "muted" | "negative" }
> = {
  paid: { label: "Paid", tone: "positive" },
  pending: { label: "Pending Payment", tone: "warning" },
  expired: { label: "Expired", tone: "muted" },
  cancelled: { label: "Cancelled", tone: "negative" },
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
    <ul className="divide-y divide-[var(--border)]">
      {items.map((item, index) => (
        <li
          key={`${item.product_id}-${item.variant_id}-${index}`}
          data-ocid={`order.item.${index + 1}`}
          className="flex items-center justify-between gap-4 py-3"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--foreground)] truncate">
              {item.name}
            </p>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
              Qty {item.quantity.toString()} · {item.variant_id}
            </p>
          </div>
          <p className="text-sm mono-num text-[var(--foreground)] whitespace-nowrap">
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

  const statusMeta = order ? STATUS_META[order.payment_status] : undefined;

  return (
    <div className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10 sm:mb-14 px-2">
          <div className="flex items-center gap-3 mb-4">
            <Search className="w-5 h-5 text-[var(--primary)]" />
            <h1 className="section-heading text-2xl sm:text-3xl">
              Order Lookup
            </h1>
          </div>
          <p className="text-sm text-[var(--muted-foreground)] max-w-2xl">
            Enter your order reference to check its status, items, total, and
            payment state.
          </p>
        </div>

        {/* Lookup form */}
        <div className="max-w-2xl px-2 mb-10">
          <form
            onSubmit={handleSubmit}
            className="surface p-5 sm:p-6"
            data-ocid="order.lookup_form"
          >
            <label htmlFor="order-reference" className="field-label block mb-2">
              Order Reference
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                id="order-reference"
                type="text"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="e.g. NAK-XXXXXX"
                className="field-input flex-1 min-w-0"
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
          <div className="px-2">
            {isLoading && (
              <div
                className="surface p-8 text-center"
                data-ocid="order.loading_state"
              >
                <div className="loading-shimmer h-4 w-40 mx-auto rounded mb-4" />
                <div className="loading-shimmer h-4 w-64 mx-auto rounded" />
              </div>
            )}

            {!isLoading && isError && (
              <div
                className="surface p-8 text-center"
                data-ocid="order.error_state"
              >
                <p className="text-[var(--negative)] mb-4">
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
                className="surface p-8 text-center"
                data-ocid="order.empty_state"
              >
                <Package className="w-10 h-10 text-[var(--muted-foreground)] mx-auto mb-4" />
                <p className="text-[var(--secondary-foreground)]">
                  No order found for reference{" "}
                  <span className="mono-num text-[var(--foreground)]">
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
                  className="surface p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  data-ocid="order.status_banner"
                >
                  <div className="flex items-center gap-4">
                    <StatusPill tone={statusMeta.tone}>
                      <Clock className="w-3.5 h-3.5" />
                      {statusMeta.label}
                    </StatusPill>
                    <div>
                      <p className="field-label mb-1">Reference</p>
                      <p className="mono-num text-[var(--foreground)]">
                        {order.reference}
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="field-label mb-1">Placed</p>
                    <p className="text-sm text-[var(--secondary-foreground)]">
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
                    className="surface p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    data-ocid="order.resume_panel"
                  >
                    <div className="flex items-center gap-4">
                      <span className="flex h-10 w-10 items-center justify-center rounded-[var(--radius)] border border-[var(--border-strong)] text-[var(--primary)]">
                        <Wallet className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="section-heading text-sm mb-1">
                          This deposit is still open
                        </p>
                        <p className="text-sm text-[var(--secondary-foreground)]">
                          Resume to complete your payment —{" "}
                          <span className="mono-num text-[var(--foreground)]">
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
                  <div className="surface p-6 sm:p-8">
                    <h3 className="section-heading text-base mb-4 flex items-center gap-2">
                      <Package className="w-4 h-4 text-[var(--primary)]" />
                      Items
                    </h3>
                    <OrderItems items={order.items} />
                    <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-2 text-sm">
                      <div className="flex justify-between text-[var(--muted-foreground)]">
                        <span>Subtotal</span>
                        <span className="mono-num text-[var(--foreground)]">
                          {formatPrice(order.subtotal)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[var(--muted-foreground)]">
                        <span>Shipping</span>
                        <span className="mono-num text-[var(--foreground)]">
                          {formatPrice(order.shipping)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[var(--muted-foreground)]">
                        <span>Tax</span>
                        <span className="mono-num text-[var(--foreground)]">
                          {formatPrice(order.tax)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-[var(--border)]">
                        <span className="font-medium text-[var(--foreground)]">
                          Total
                        </span>
                        <span className="mono-num text-base text-[var(--foreground)]">
                          {formatPrice(order.total)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Payment + deposit */}
                  <div className="space-y-6">
                    <div className="surface p-6 sm:p-8">
                      <h3 className="section-heading text-base mb-4 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-[var(--primary)]" />
                        Payment
                      </h3>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-[var(--muted-foreground)]">
                            Method
                          </span>
                          <span className="text-[var(--foreground)]">
                            {paymentMethodLabel(order.payment_method)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--muted-foreground)]">
                            Status
                          </span>
                          <span className="mono-num text-[var(--foreground)]">
                            {statusMeta.label}
                          </span>
                        </div>
                        {cryptoStatus && (
                          <div className="flex justify-between">
                            <span className="text-[var(--muted-foreground)]">
                              Payment State
                            </span>
                            <span
                              className={
                                cryptoStatus.__kind__ === "paid"
                                  ? "text-[var(--positive)]"
                                  : cryptoStatus.__kind__ === "expired"
                                    ? "text-[var(--negative)]"
                                    : "text-[var(--nak-warning)]"
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
                        className="surface p-6 sm:p-8"
                        data-ocid="order.deposit_panel"
                      >
                        <h3 className="section-heading text-base mb-4 flex items-center gap-2">
                          <Wallet className="w-4 h-4 text-[var(--primary)]" />
                          Deposit Address
                        </h3>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-[var(--muted-foreground)]">
                              Token
                            </span>
                            <span className="mono-num text-[var(--foreground)]">
                              {deposit.token}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[var(--muted-foreground)]">
                              Amount Due
                            </span>
                            <span className="mono-num text-[var(--foreground)]">
                              {formatTokenAmount(
                                deposit.amountDue,
                                deposit.decimals,
                              )}{" "}
                              {deposit.token}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[var(--muted-foreground)]">
                              Expires
                            </span>
                            <span className="text-[var(--secondary-foreground)]">
                              {formatTimestamp(deposit.expiresAt)}
                            </span>
                          </div>
                          <div>
                            <span className="field-label block mb-2">
                              Address
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="inset-well flex-1 min-w-0">
                                {depositAccountString(deposit)}
                              </span>
                              <CopyButton
                                text={depositAccountString(deposit)}
                                label="Copy"
                                className="shrink-0"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Shipping — operational status only. The full shipping
                    address is stored as IBE ciphertext and is not displayed on
                    this customer-facing page. */}
                <div className="surface p-6 sm:p-8">
                  <h3 className="section-heading text-base mb-4 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[var(--primary)]" />
                    Shipping
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[var(--muted-foreground)]">
                        Status
                      </span>
                      <span className="text-[var(--foreground)]">
                        {order.shipping_status === "shipped"
                          ? "Shipped"
                          : "Pending"}
                      </span>
                    </div>
                    {order.tracking_number && (
                      <div className="flex justify-between">
                        <span className="text-[var(--muted-foreground)]">
                          Tracking
                        </span>
                        <span className="mono-num text-[var(--foreground)]">
                          {order.tracking_number}
                        </span>
                      </div>
                    )}
                    {order.shipped_at && (
                      <div className="flex justify-between">
                        <span className="text-[var(--muted-foreground)]">
                          Shipped
                        </span>
                        <span className="text-[var(--secondary-foreground)]">
                          {formatTimestamp(order.shipped_at)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-[var(--muted-foreground)]">
                        Contact
                      </span>
                      <span className="text-[var(--foreground)]">
                        {order.customer_email}
                      </span>
                    </div>
                  </div>
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
