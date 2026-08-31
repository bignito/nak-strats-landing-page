import {
  type AdminOrderDetail,
  type AdminOrderView,
  type CryptoPaymentStatus,
  PaymentMethod,
  PaymentStatus,
} from "@/backend";
import {
  adminErrorMessage,
  useAdminGetOrderDetail,
  useAdminListOrders,
  useCryptoConfig,
  useForceRecheckPayment,
  useForceSweepOrder,
  useGetSubaccountBalance,
  useMarkOrderShipped,
} from "@/hooks/useQueries";
import type { AdminTabBodyProps } from "@/types/routes";
import {
  CheckCircle2,
  Loader2,
  Mail,
  PackageCheck,
  RefreshCw,
  ShieldAlert,
  Truck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AdminConfirmDialog } from "./AdminConfirmDialog";
import { AdminPanel } from "./AdminPanel";
import { AdminTable } from "./AdminTable";

/** UI filter tabs mapped to the backend `adminListOrders` filter values. */
const FILTERS: Array<{ id: string; label: string; backend: string }> = [
  { id: "all", label: "All", backend: "all" },
  { id: "awaiting", label: "Awaiting payment", backend: "awaiting_payment" },
  { id: "paid", label: "Paid", backend: "paid" },
  { id: "failed", label: "Failed", backend: "cancelled" },
  { id: "expired", label: "Expired", backend: "expired" },
  { id: "review", label: "Needs review", backend: "needs_review" },
];

const METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.crypto_icp]: "ICP",
  [PaymentMethod.crypto_ckusdc]: "ckUSDC",
  [PaymentMethod.card_stripe]: "Card",
  [PaymentMethod.manual]: "Manual",
};

function formatTimestamp(ns: bigint): string {
  const date = new Date(Number(ns / 1_000_000n));
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Format a token base-unit amount using the token's decimal places. */
function formatTokenAmount(amount: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = amount / divisor;
  const fraction = amount % divisor;
  if (fraction === 0n) return whole.toLocaleString();
  const fracStr = fraction
    .toString()
    .padStart(decimals, "0")
    .replace(/0+$/, "");
  return `${whole.toLocaleString()}.${fracStr}`;
}

/** Derive the subaccount index from its 32-byte big-endian hex encoding. */
function subaccountIndexFromHex(hex: string): bigint {
  let value = 0n;
  for (let i = 0; i < hex.length; i += 2) {
    value =
      value * 256n + BigInt(Number.parseInt(hex.slice(i, i + 2), 16) || 0);
  }
  return value;
}

function statusTone(status: PaymentStatus): string {
  switch (status) {
    case PaymentStatus.paid:
      return "status-pill-positive";
    case PaymentStatus.pending:
      return "status-pill-warning";
    case PaymentStatus.expired:
    case PaymentStatus.cancelled:
      return "status-pill-negative";
    default:
      return "status-pill-neutral";
  }
}

function cryptoStatusLabel(status: CryptoPaymentStatus): string {
  switch (status.__kind__) {
    case "paid":
      return "Paid";
    case "awaiting_payment":
      return "Awaiting payment";
    case "underpayment":
      return "Underpayment";
    case "overpayment":
      return "Overpayment";
    case "expired":
      return "Expired";
    default:
      return "Unknown";
  }
}

/** A single explicit ledger/outcall error panel — always visible, never hidden. */
function ErrorPanel({ message }: { message: string }) {
  return (
    <div
      className="error-panel relative flex items-start gap-2"
      role="alert"
      data-ocid="admin.orders.error_panel"
    >
      <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
      <span className="min-w-0">{message}</span>
    </div>
  );
}

/**
 * Per-order detail panel: line items, payment reference, deposit address,
 * live on-ledger balance, and the re-check / sweep / mark-shipped actions.
 * Sweep is a financial action gated to ADMIN/OWNER and passes through an
 * explicit confirmation step. Every ledger/outcall error is surfaced verbatim.
 */
function OrderDetail({
  reference,
  session,
  onClose,
}: {
  reference: string;
  session: AdminTabBodyProps["session"];
  onClose: () => void;
}) {
  const { data: detail, isLoading, error } = useAdminGetOrderDetail(reference);
  const { data: config } = useCryptoConfig();
  const recheck = useForceRecheckPayment();
  const sweep = useForceSweepOrder();
  const markShipped = useMarkOrderShipped();

  const [trackingInput, setTrackingInput] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const canSweep = session.canManage;

  const decimals = useMemo(() => {
    if (!detail) return 8;
    return detail.paymentMethod === PaymentMethod.crypto_icp
      ? (config?.icp.decimals ?? 8)
      : (config?.ckUSDC.decimals ?? 8);
  }, [detail, config]);

  const subaccountIndex = useMemo(
    () =>
      detail?.subaccountHex
        ? subaccountIndexFromHex(detail.subaccountHex)
        : null,
    [detail],
  );
  const { data: balance, error: balanceError } =
    useGetSubaccountBalance(subaccountIndex);

  const handleRecheck = () => {
    setActionError(null);
    recheck.mutate(reference, {
      onError: (err) => setActionError(adminErrorMessage(err)),
    });
  };

  const handleSweep = () => {
    setActionError(null);
    sweep.mutate(reference, {
      onError: (err) => setActionError(adminErrorMessage(err)),
    });
  };

  const handleMarkShipped = () => {
    setActionError(null);
    markShipped.mutate(
      { reference, trackingNumber: trackingInput.trim() || null },
      {
        onError: (err) => setActionError(adminErrorMessage(err)),
        onSuccess: () => setTrackingInput(""),
      },
    );
  };

  const detailError = error ? adminErrorMessage(error) : null;
  const balanceErrorText = balanceError
    ? adminErrorMessage(balanceError)
    : null;
  const recheckResult = recheck.data;
  const sweepResult = sweep.data;

  return (
    <AdminPanel
      title={`Order ${reference}`}
      actions={
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onClose}
          data-ocid="admin.orders.close_detail_button"
        >
          Close
        </button>
      }
    >
      {isLoading ? (
        <div
          className="flex items-center gap-3 py-8"
          style={{ color: "var(--muted-foreground)" }}
          data-ocid="admin.orders.detail_loading_state"
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading order detail…
        </div>
      ) : detailError ? (
        <ErrorPanel message={detailError} />
      ) : !detail ? (
        <p style={{ color: "var(--muted-foreground)" }}>Order not found.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {actionError && <ErrorPanel message={actionError} />}

          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex flex-col gap-1">
              <span className="field-label">Status</span>
              <span className={`status-pill ${statusTone(detail.status)}`}>
                {detail.status}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="field-label">Method</span>
              <span className="mono-num">
                {METHOD_LABELS[detail.paymentMethod] ?? detail.paymentMethod}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="field-label">Amount owed</span>
              <span className="mono-num">
                {formatTokenAmount(detail.amountOwed, decimals)}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="field-label">Placed</span>
              <span className="mono-num">
                {formatTimestamp(detail.createdAt)}
              </span>
            </div>
          </div>

          {detail.cryptoStatus && (
            <div className="flex flex-col gap-1">
              <span className="field-label">Crypto status</span>
              <span className="mono-num">
                {cryptoStatusLabel(detail.cryptoStatus)}
              </span>
            </div>
          )}

          {/* Payment reference + deposit address */}
          <div className="flex flex-col gap-1">
            <span className="field-label">Payment reference</span>
            <code className="admin-mono">{detail.reference}</code>
          </div>
          <div className="flex flex-col gap-1">
            <span className="field-label">Deposit address</span>
            <code className="admin-mono">{detail.depositAccountText}</code>
          </div>
          <div className="flex flex-col gap-1">
            <span className="field-label">Customer email</span>
            <span className="mono-num">{detail.customerEmail}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="field-label">Shipping details</span>
            <span className="mono-num">
              {detail.hasShippingDetails ? "Provided" : "Missing"}
            </span>
          </div>

          {/* Live balance */}
          <div className="flex flex-col gap-1">
            <span className="field-label">Live subaccount balance</span>
            <span className="mono-num">
              {balanceErrorText ? (
                <span style={{ color: "var(--negative)" }}>
                  {balanceErrorText}
                </span>
              ) : balance ? (
                `${formatTokenAmount(balance.balance, decimals)} ${
                  detail.paymentMethod === PaymentMethod.crypto_icp
                    ? "ICP"
                    : "ckUSDC"
                }`
              ) : (
                "—"
              )}
            </span>
          </div>

          {/* Line items */}
          <div className="flex flex-col gap-1">
            <span className="field-label">Line items</span>
            <div className="overflow-x-auto">
              <table
                className="admin-table-dense"
                data-ocid="admin.orders.line_items"
              >
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Variant</th>
                    <th className="num-col">Qty</th>
                    <th className="num-col">Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.items.map((item, i) => (
                    <tr
                      key={`${item.name}-${item.variant_id}`}
                      data-ocid={`admin.orders.line_item.${i + 1}`}
                    >
                      <td>{item.name}</td>
                      <td>{item.variant_id}</td>
                      <td className="num-col">{item.quantity.toString()}</td>
                      <td className="num-col">
                        {formatTokenAmount(item.unit_amount, decimals)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {detail.sweepNote && (
            <div className="flex flex-col gap-1">
              <span className="field-label">Sweep note</span>
              <span className="mono-num">{detail.sweepNote}</span>
            </div>
          )}

          {/* Action feedback */}
          {recheckResult && !recheckResult.error && (
            <p
              className="flex items-center gap-1.5 text-xs"
              style={{ color: "var(--positive)" }}
              data-ocid="admin.orders.recheck_success"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {cryptoStatusLabel(recheckResult.status)} · balance{" "}
              {formatTokenAmount(recheckResult.balance, decimals)}
            </p>
          )}
          {recheckResult?.error && (
            <ErrorPanel message={`Re-check: ${recheckResult.error}`} />
          )}
          {sweepResult && !sweepResult.error && (
            <p
              className="flex items-center gap-1.5 text-xs"
              style={{ color: "var(--positive)" }}
              data-ocid="admin.orders.sweep_success"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Swept to treasury
              {sweepResult.blockIndex !== undefined
                ? ` · block ${sweepResult.blockIndex.toString()}`
                : ""}
            </p>
          )}
          {sweepResult?.error && (
            <ErrorPanel message={`Sweep: ${sweepResult.error}`} />
          )}

          {/* Actions */}
          <div
            className="flex flex-wrap items-center gap-2 border-t pt-4"
            style={{ borderColor: "var(--border)" }}
          >
            <button
              type="button"
              className="btn-recheck"
              onClick={handleRecheck}
              disabled={recheck.isPending}
              data-ocid="admin.orders.recheck_button"
            >
              <RefreshCw className="w-3 h-3" />
              {recheck.isPending ? "Checking…" : "Re-check payment"}
            </button>

            {canSweep ? (
              <AdminConfirmDialog
                trigger={
                  <button
                    type="button"
                    className="btn-sweep"
                    disabled={sweep.isPending}
                    data-ocid="admin.orders.sweep_button"
                  >
                    {sweep.isPending ? "Sweeping…" : "Sweep now"}
                  </button>
                }
                title="Sweep order to treasury"
                description={`Force-sweep the deposit subaccount for ${reference} to the treasury? This moves funds on the ledger and cannot be undone.`}
                confirmLabel="Sweep now"
                cancelLabel="Cancel"
                tone="negative"
                onConfirm={handleSweep}
                pending={sweep.isPending}
              />
            ) : (
              <span
                className="text-xs"
                style={{ color: "var(--muted-foreground)" }}
                data-ocid="admin.orders.sweep_restricted"
              >
                Sweep requires ADMIN or OWNER role.
              </span>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <input
                className="field-input"
                style={{ width: "14rem" }}
                placeholder="Tracking number (optional)"
                value={trackingInput}
                onChange={(e) => setTrackingInput(e.target.value)}
                disabled={markShipped.isPending}
                data-ocid="admin.orders.tracking_input"
              />
              <button
                type="button"
                className="btn-shipped"
                onClick={handleMarkShipped}
                disabled={markShipped.isPending}
                data-ocid="admin.orders.mark_shipped_button"
              >
                <Truck className="w-3 h-3" />
                {markShipped.isPending ? "Marking…" : "Mark shipped"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminPanel>
  );
}

/**
 * ORDERS tab — filterable order table with per-order detail. STAFF can view
 * orders and mark shipped / add tracking but cannot sweep; sweep is gated to
 * ADMIN/OWNER and requires an explicit confirmation step. Read-heavy views use
 * query calls, and every ledger/outcall error is surfaced verbatim.
 */
export function OrdersTab({ session }: AdminTabBodyProps) {
  const [filter, setFilter] = useState("all");
  const [selectedRef, setSelectedRef] = useState<string | null>(null);

  const activeFilter = FILTERS.find((f) => f.id === filter) ?? FILTERS[0];
  const {
    data: orders,
    isLoading,
    error,
  } = useAdminListOrders(activeFilter.backend);

  const listError = error ? adminErrorMessage(error) : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Filter tabs */}
      <div
        className="flex flex-wrap items-center gap-1"
        data-ocid="admin.orders.filters"
      >
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`admin-tab${filter === f.id ? " is-active" : ""}`}
            onClick={() => {
              setFilter(f.id);
              setSelectedRef(null);
            }}
            aria-current={filter === f.id ? "page" : undefined}
            data-ocid={`admin.orders.filter.${f.id}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {listError && <ErrorPanel message={listError} />}

      {/* Orders table */}
      <AdminPanel
        title="Orders"
        actions={
          <span
            className="text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            {orders?.length ?? 0} order{(orders?.length ?? 0) === 1 ? "" : "s"}
          </span>
        }
      >
        {isLoading ? (
          <div
            className="flex items-center gap-3 py-8"
            style={{ color: "var(--muted-foreground)" }}
            data-ocid="admin.orders.loading_state"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading orders…
          </div>
        ) : (
          <AdminTable<AdminOrderView>
            columns={[
              {
                key: "reference",
                header: "Reference",
                render: (row) => (
                  <button
                    type="button"
                    className="admin-mono"
                    style={{
                      color: "var(--primary)",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                    onClick={() => setSelectedRef(row.reference)}
                    data-ocid={`admin.orders.open_detail.${row.reference}`}
                  >
                    {row.reference}
                  </button>
                ),
              },
              {
                key: "status",
                header: "Status",
                render: (row) => (
                  <span className={`status-pill ${statusTone(row.status)}`}>
                    {row.status}
                  </span>
                ),
              },
              {
                key: "method",
                header: "Method",
                render: (row) => (
                  <span className="mono-num">
                    {METHOD_LABELS[row.paymentMethod] ?? row.paymentMethod}
                  </span>
                ),
              },
              {
                key: "amount",
                header: "Amount",
                align: "right",
                render: (row) => (
                  <span className="num">{row.amountOwed.toString()}</span>
                ),
              },
              {
                key: "items",
                header: "Items",
                align: "right",
                render: (row) => (
                  <span className="num">{row.itemCount.toString()}</span>
                ),
              },
              {
                key: "created",
                header: "Created",
                render: (row) => (
                  <span className="num">{formatTimestamp(row.createdAt)}</span>
                ),
              },
              {
                key: "crypto",
                header: "Crypto",
                render: (row) =>
                  row.cryptoStatus ? (
                    <span className="mono-num">
                      {cryptoStatusLabel(row.cryptoStatus)}
                    </span>
                  ) : (
                    <span style={{ color: "var(--muted-foreground)" }}>—</span>
                  ),
              },
            ]}
            rows={orders ?? []}
            rowKey={(row) => row.reference}
            emptyMessage="No orders match this filter."
          />
        )}
      </AdminPanel>

      {/* Per-order detail */}
      {selectedRef && (
        <OrderDetail
          reference={selectedRef}
          session={session}
          onClose={() => setSelectedRef(null)}
        />
      )}
    </div>
  );
}
