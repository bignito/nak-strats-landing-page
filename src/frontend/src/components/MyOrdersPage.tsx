import type { Order, OrderItem } from "@/backend";
import { useMyOrders } from "@/hooks/useQueries";
import { formatPrice } from "@/lib/currency";
import type { PaymentStatus } from "@/types/storefront";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import {
  ArrowLeft,
  Clock,
  Loader2,
  LogIn,
  Package,
  PackageOpen,
  ShoppingBag,
} from "lucide-react";
import type React from "react";
import { useEffect } from "react";

interface MyOrdersPageProps {
  onNavigateToMain: () => void;
}

/** Convert a nanosecond backend timestamp to a readable date string. */
function formatTimestamp(timestamp: bigint): string {
  const date = new Date(Number(timestamp / 1_000_000n));
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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

/** Compact one-line item summary, e.g. "2× NAK Hoodie, 1× Sticker". */
function itemSummary(items: OrderItem[]): string {
  return items
    .map((item) => `${item.quantity.toString()}× ${item.name}`)
    .join(", ");
}

const MyOrdersPage: React.FC<MyOrdersPageProps> = ({ onNavigateToMain }) => {
  const { isAuthenticated, login, isLoggingIn, isInitializing } =
    useInternetIdentity();
  const { data: orders, isLoading, isError, refetch } = useMyOrders();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10 sm:mb-14 px-2">
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="relative">
              <ShoppingBag className="w-12 h-12 text-teal-400" />
              <div className="absolute inset-0 rounded-full bg-teal-400/20 blur-xl animate-pulse" />
            </div>
            <h1
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              My Orders
            </h1>
          </div>
          <p className="text-sm sm:text-base text-gray-300 max-w-2xl mx-auto">
            Track the orders you&apos;ve placed. Sign in to see your order
            history.
          </p>
        </div>

        {isInitializing ? (
          <div
            className="max-w-3xl mx-auto flex items-center justify-center gap-3 text-gray-300"
            data-ocid="myorders.auth_loading"
          >
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Checking authentication…</span>
          </div>
        ) : !isAuthenticated ? (
          <div
            className="max-w-3xl mx-auto card glass-card p-8 sm:p-12 text-center"
            data-ocid="myorders.sign_in_state"
          >
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="relative">
                <Package className="w-10 h-10 text-purple-400" />
                <div className="absolute inset-0 rounded-full bg-purple-400/20 blur-xl animate-pulse" />
              </div>
              <h2
                className="text-2xl sm:text-3xl font-semibold text-white"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Sign in to track your orders
              </h2>
            </div>
            <p className="text-sm sm:text-base text-gray-300 max-w-xl mx-auto mb-8">
              Signing in is optional — you can keep shopping and checking out as
              a guest. But signing in lets you view all of your past orders in
              one place.
            </p>
            <button
              type="button"
              onClick={login}
              disabled={isLoggingIn}
              data-ocid="myorders.sign_in_button"
              className="btn px-8 py-3 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign in to track your orders — optional
                </>
              )}
            </button>
          </div>
        ) : isLoading ? (
          <div
            className="max-w-3xl mx-auto space-y-4"
            data-ocid="myorders.loading_state"
          >
            <div className="card glass-card p-6 loading-shimmer h-28" />
            <div className="card glass-card p-6 loading-shimmer h-28" />
            <div className="card glass-card p-6 loading-shimmer h-28" />
          </div>
        ) : isError ? (
          <div
            className="max-w-3xl mx-auto card glass-card p-8 text-center"
            data-ocid="myorders.error_state"
          >
            <p className="text-destructive mb-4">
              We couldn&apos;t load your orders. Please try again.
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="btn px-6 py-3 text-sm font-semibold"
              data-ocid="myorders.retry_button"
            >
              Try Again
            </button>
          </div>
        ) : !orders || orders.length === 0 ? (
          <div
            className="max-w-3xl mx-auto card glass-card p-8 sm:p-12 text-center"
            data-ocid="myorders.empty_state"
          >
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="relative">
                <PackageOpen className="w-10 h-10 text-purple-400" />
                <div className="absolute inset-0 rounded-full bg-purple-400/20 blur-xl animate-pulse" />
              </div>
              <h2
                className="text-2xl sm:text-3xl font-semibold text-white"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                No orders yet
              </h2>
            </div>
            <p className="text-sm sm:text-base text-gray-300 max-w-xl mx-auto mb-8">
              You haven&apos;t placed any orders yet. When you do, they&apos;ll
              show up here so you can track them.
            </p>
            <button
              type="button"
              onClick={onNavigateToMain}
              className="btn px-8 py-3 text-sm font-semibold"
              data-ocid="myorders.shop_button"
            >
              <ShoppingBag className="w-4 h-4" />
              Browse the Shop
            </button>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {orders.map((order, index) => {
              const statusMeta = STATUS_META[order.payment_status];
              return (
                <div
                  key={order.reference}
                  className="card glass-card p-6 sm:p-8"
                  data-ocid={`myorders.order_item.${index + 1}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-4">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${statusMeta.soft} ${statusMeta.className}`}
                        data-ocid={`myorders.status.${index + 1}`}
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

                  <div className="border-t border-white/10 pt-4">
                    <p
                      className="text-sm text-gray-300"
                      data-ocid={`myorders.items.${index + 1}`}
                    >
                      {itemSummary(order.items)}
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm text-gray-400">
                        {order.items.length}{" "}
                        {order.items.length === 1 ? "item" : "items"}
                      </span>
                      <span className="font-mono-nak text-lg text-teal-bright">
                        {formatPrice(order.total)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="text-center mt-10">
          <button
            type="button"
            onClick={onNavigateToMain}
            className="btn px-8 py-4 text-base font-semibold"
            data-ocid="myorders.back_button"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Main
          </button>
        </div>
      </div>
    </div>
  );
};

export default MyOrdersPage;
