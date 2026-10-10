import {
  type AdminOrderDetail,
  type AdminOrderView,
  type Backend,
  type CryptoPaymentStatus,
  PaymentMethod,
  PaymentStatus,
  ShippingStatus,
  type WipeResult,
  createActor,
} from "@/backend";
import {
  adminErrorMessage,
  useAdminExportOrders,
  useAdminGetOrderDetail,
  useAdminListOrders,
  useAdminReleaseExpiredOrders,
  useAdminWipeAllOrders,
  useCryptoConfig,
  useForceRecheckPayment,
  useForceSweepOrder,
  useGetSubaccountBalance,
  useMarkOrderShipped,
} from "@/hooks/useQueries";
import { formatPrice } from "@/lib/currency";
import {
  type ShippingPayload,
  decryptShipping,
  deserializeShipping,
} from "@/lib/ibe";
import type { AdminTabBodyProps } from "@/types/routes";
import { useActor, useInternetIdentity } from "@caffeineai/core-infrastructure";
import {
  CheckCircle2,
  Download,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  Truck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { CopyButton } from "../CopyButton";
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

/** ISO-8601 timestamp for CSV cells; empty string when the value is absent. */
function csvTimestamp(ns: bigint | undefined): string {
  if (ns === undefined) return "";
  const date = new Date(Number(ns / 1_000_000n));
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

/** Escape one CSV field: wrap in quotes and double any embedded quote. */
function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/** Join a header row and data rows into a CSV document. */
function toCsv(header: string[], rows: string[][]): string {
  return [header, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
}

/** Render an order's line items as "Name × qty" joined by "; ". */
function itemsSummary(items: AdminOrderDetail["items"]): string {
  return items.map((item) => `${item.name} × ${item.quantity}`).join("; ");
}

/** Trigger a browser download of a text payload. */
function downloadText(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

const ORDER_CSV_HEADER = [
  "Reference",
  "Created",
  "Updated",
  "Items",
  "Subtotal",
  "Tax",
  "Shipping",
  "Total",
  "Currency",
  "Customer email",
  "Payment method",
  "Payment status",
  "Payment reference",
  "Shipping status",
  "Tracking number",
  "Shipped date",
  "Marketing consent",
  "Shipping name",
  "Shipping email",
  "Shipping phone",
  "Shipping address line 1",
  "Shipping address line 2",
  "Shipping city",
  "Shipping state",
  "Shipping postal code",
  "Shipping country",
];

/** Number of per-order shipping columns appended to every order row. */
const SHIPPING_COLUMN_COUNT = 9;

/** Every shipping cell for an order that never collected shipping details. */
function notProvidedShippingCells(): string[] {
  return Array.from({ length: SHIPPING_COLUMN_COUNT }, () => "Not provided");
}

/** Every shipping cell for an order whose blob could not be decrypted. */
function couldNotDecryptShippingCells(): string[] {
  return Array.from(
    { length: SHIPPING_COLUMN_COUNT },
    () => "Could not decrypt",
  );
}

/**
 * Map a decrypted shipping payload onto the nine shipping columns. The
 * payload carries no phone field, so that column is always empty.
 */
function shippingPayloadCells(payload: ShippingPayload): string[] {
  return [
    payload.name,
    payload.email,
    "",
    payload.line1,
    payload.line2 ?? "",
    payload.city,
    payload.region,
    payload.postal_code,
    payload.country,
  ];
}

/**
 * Decrypt one order's shipping details into its nine CSV cells. Orders with
 * no shipping details report "Not provided"; any decryption failure (missing
 * blob, no segment for this admin, or a bad ciphertext) reports
 * "Could not decrypt" for that row and never aborts the export.
 */
async function shippingCells(
  detail: AdminOrderDetail,
  adminPrincipal: string,
  backend: Backend,
): Promise<string[]> {
  if (!detail.hasShippingDetails) {
    return notProvidedShippingCells();
  }
  if (!detail.encryptedShipping) {
    return couldNotDecryptShippingCells();
  }
  try {
    const json = await decryptShipping(
      detail.encryptedShipping,
      adminPrincipal,
      backend,
    );
    return shippingPayloadCells(deserializeShipping(json));
  } catch {
    return couldNotDecryptShippingCells();
  }
}

const CRYPTO_CSV_HEADER = [
  "Reference",
  "Token",
  "Amount due",
  "Status",
  "Subaccount",
  "Expiry",
  "Confirmed block index",
  "Created",
  "Updated",
];

/** Human-readable label for an order's shipping status. */
function shippingStatusLabel(status: ShippingStatus): string {
  return status === ShippingStatus.shipped ? "Shipped" : "Pending";
}

/**
 * Build the orders CSV from full admin details, decrypting each order's
 * shipping blob client-side into its nine separate columns. Decryption is
 * per-row and failure-isolated: a row that cannot be decrypted reports
 * "Could not decrypt" and the export continues.
 */
async function buildOrdersCsv(
  details: AdminOrderDetail[],
  adminPrincipal: string,
  backend: Backend,
): Promise<string> {
  const rows = await Promise.all(
    details.map(async (detail) => [
      detail.reference,
      csvTimestamp(detail.createdAt),
      csvTimestamp(detail.updatedAt),
      itemsSummary(detail.items),
      formatPrice(detail.subtotal),
      formatPrice(detail.tax),
      formatPrice(detail.shipping),
      formatPrice(detail.total),
      detail.currency,
      detail.customerEmail,
      METHOD_LABELS[detail.paymentMethod] ?? detail.paymentMethod,
      detail.status,
      detail.paymentReference ?? "",
      shippingStatusLabel(detail.shippingStatus),
      detail.trackingNumber ?? "",
      csvTimestamp(detail.shippedAt),
      detail.marketingConsent
        ? `Yes${detail.marketingConsentAt !== undefined ? ` (${csvTimestamp(detail.marketingConsentAt)})` : ""}`
        : "No",
      ...(await shippingCells(detail, adminPrincipal, backend)),
    ]),
  );
  return toCsv(ORDER_CSV_HEADER, rows);
}

/** Build the crypto payments CSV from the crypto orders in the detail set. */
function buildCryptoCsv(details: AdminOrderDetail[]): string {
  const rows = details
    .filter((detail) => detail.cryptoStatus !== undefined)
    .map((detail) => {
      const status = detail.cryptoStatus as CryptoPaymentStatus;
      const blockIndex =
        status.__kind__ === "paid" ? status.paid.blockIndex.toString() : "";
      return [
        detail.reference,
        detail.paymentMethod === PaymentMethod.crypto_icp ? "ICP" : "ckUSDC",
        formatPrice(detail.amountOwed),
        cryptoStatusLabel(status),
        detail.subaccountHex,
        csvTimestamp(detail.cryptoExpiresAt),
        blockIndex,
        csvTimestamp(detail.createdAt),
        csvTimestamp(detail.updatedAt),
      ];
    });
  return toCsv(CRYPTO_CSV_HEADER, rows);
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
              <span className="mono-num">{formatPrice(detail.amountOwed)}</span>
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
            <span className="flex items-center gap-2">
              <span className="mono-num">{detail.customerEmail}</span>
              <CopyButton text={detail.customerEmail} label="Copy email" />
            </span>
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
                        {formatPrice(item.unit_amount)}
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
  const [search, setSearch] = useState("");
  const [selectedRef, setSelectedRef] = useState<string | null>(null);
  const [releaseError, setReleaseError] = useState<string | null>(null);

  const releaseExpired = useAdminReleaseExpiredOrders();

  const activeFilter = FILTERS.find((f) => f.id === filter) ?? FILTERS[0];
  const {
    data: orders,
    isLoading,
    error,
  } = useAdminListOrders(activeFilter.backend);

  const listError = error ? adminErrorMessage(error) : null;

  const handleReleaseExpired = () => {
    setReleaseError(null);
    releaseExpired.mutate(undefined, {
      onError: (err) => setReleaseError(adminErrorMessage(err)),
    });
  };

  const visibleOrders = useMemo(() => {
    if (!orders) return [];
    const query = search.trim().toLowerCase();
    if (!query) return orders;
    return orders.filter(
      (order) =>
        order.customerEmail.toLowerCase().includes(query) ||
        order.reference.toLowerCase().includes(query),
    );
  }, [orders, search]);

  /* ---- Export all orders (CSV) + crypto payments (second CSV) ---- */
  const exportOrders = useAdminExportOrders();
  const { actor } = useActor(createActor);
  const { identity } = useInternetIdentity();
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportedThisSession, setExportedThisSession] = useState(false);

  const handleExport = () => {
    setExportError(null);
    exportOrders.mutate(undefined, {
      onSuccess: async (details) => {
        const adminPrincipal = identity?.getPrincipal().toText() ?? "";
        if (!actor || !adminPrincipal) {
          setExportError("Session not ready — sign in again");
          return;
        }
        try {
          const stamp = new Date().toISOString().slice(0, 10);
          downloadText(
            `orders-${stamp}.csv`,
            await buildOrdersCsv(details, adminPrincipal, actor),
          );
          downloadText(`crypto-payments-${stamp}.csv`, buildCryptoCsv(details));
          setExportedThisSession(true);
        } catch (err) {
          setExportError(adminErrorMessage(err));
        }
      },
      onError: (err) => setExportError(adminErrorMessage(err)),
    });
  };

  /* ---- Owner-only delete all orders ---- */
  const wipe = useAdminWipeAllOrders();
  const [wipeError, setWipeError] = useState<string | null>(null);
  const [wipeResult, setWipeResult] = useState<WipeResult | null>(null);
  const [confirmText, setConfirmText] = useState("");

  const canWipe = session.canManageUsers;
  const confirmMatches = confirmText === "DELETE ALL ORDERS";

  const handleWipe = () => {
    setWipeError(null);
    setWipeResult(null);
    wipe.mutate("DELETE ALL ORDERS", {
      onSuccess: (result) => {
        setWipeResult(result);
        setConfirmText("");
      },
      onError: (err) => setWipeError(adminErrorMessage(err)),
    });
  };

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

      {/* Export all orders (CSV) — ignores the active filter/search */}
      <div
        className="flex flex-wrap items-center gap-3"
        data-ocid="admin.orders.export"
      >
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleExport}
          disabled={exportOrders.isPending}
          data-ocid="admin.orders.export_button"
        >
          {exportOrders.isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Download className="w-3 h-3" />
          )}
          {exportOrders.isPending ? "Exporting…" : "Export all orders (CSV)"}
        </button>
        <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          Downloads every order plus a second CSV of crypto payments.
        </span>
        {exportError && <ErrorPanel message={exportError} />}
      </div>

      {/* Manual release of expired pending reservations (ADMIN/OWNER only) */}
      {session.canManage && (
        <div
          className="flex flex-wrap items-center gap-3"
          data-ocid="admin.orders.release_expired"
        >
          <button
            type="button"
            className="btn-recheck"
            onClick={handleReleaseExpired}
            disabled={releaseExpired.isPending}
            data-ocid="admin.orders.release_expired_button"
          >
            <RefreshCw className="w-3 h-3" />
            {releaseExpired.isPending
              ? "Releasing…"
              : "Release expired reservations"}
          </button>
          {releaseExpired.isSuccess && (
            <span
              className="flex items-center gap-1.5 text-xs"
              style={{ color: "var(--positive)" }}
              data-ocid="admin.orders.release_expired_success"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Released {releaseExpired.data.toString()} expired reservation
              {releaseExpired.data === 1n ? "" : "s"}.
            </span>
          )}
          {releaseError && <ErrorPanel message={releaseError} />}
        </div>
      )}

      {/* Owner-only destructive wipe */}
      {canWipe && (
        <AdminPanel title="Danger zone">
          <div className="flex flex-col gap-3">
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              Permanently deletes every order and crypto payment record. The
              export must be downloaded first, and the action is refused while
              any crypto funds remain unswept.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <AdminConfirmDialog
                trigger={
                  <button
                    type="button"
                    className="btn-negative"
                    disabled={
                      !exportedThisSession || !confirmMatches || wipe.isPending
                    }
                    data-ocid="admin.orders.wipe_button"
                  >
                    <Trash2 className="w-3 h-3" />
                    {wipe.isPending ? "Deleting…" : "Delete all orders"}
                  </button>
                }
                title="Delete all orders"
                description="This permanently deletes every order and crypto payment record. This cannot be undone."
                confirmLabel="Delete all orders"
                cancelLabel="Cancel"
                tone="negative"
                pending={wipe.isPending}
                onConfirm={handleWipe}
              />
              {!exportedThisSession && (
                <span
                  className="text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                  data-ocid="admin.orders.wipe_disabled_hint"
                >
                  Download the export first to enable deletion.
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label className="field-label" htmlFor="admin-wipe-confirm">
                Type DELETE ALL ORDERS to confirm
              </label>
              <input
                id="admin-wipe-confirm"
                className="field-input"
                style={{ maxWidth: "22rem" }}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE ALL ORDERS"
                disabled={!exportedThisSession || wipe.isPending}
                data-ocid="admin.orders.wipe_confirm_input"
              />
              <span
                className="text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
                {confirmMatches
                  ? "Confirmation matches — the delete button is armed."
                  : "The delete button stays disabled until this matches exactly."}
              </span>
            </div>
            {wipeError && <ErrorPanel message={wipeError} />}
            {wipeResult?.__kind__ === "refused" && (
              <div
                className="error-panel flex flex-col gap-1"
                role="alert"
                data-ocid="admin.orders.wipe_refused"
              >
                <span className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  {wipeResult.refused.reason}
                </span>
                <span className="text-xs">
                  Unswept references:{" "}
                  {wipeResult.refused.unsweptReferences.join(", ") || "none"}
                </span>
              </div>
            )}
            {wipeResult?.__kind__ === "wiped" && (
              <div
                className="flex flex-col gap-1 text-xs"
                style={{ color: "var(--positive)" }}
                data-ocid="admin.orders.wipe_success"
              >
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Deleted all orders.
                </span>
                <span style={{ color: "var(--muted-foreground)" }}>
                  Orders {wipeResult.wiped.orders.toString()} · session orders{" "}
                  {wipeResult.wiped.sessionOrders.toString()} · crypto payments{" "}
                  {wipeResult.wiped.cryptoPayments.toString()} · late payments{" "}
                  {wipeResult.wiped.latePayments.toString()} · cancel tokens{" "}
                  {wipeResult.wiped.cancelTokens.toString()} · crypto check
                  cache {wipeResult.wiped.cryptoCheckCache.toString()}
                </span>
              </div>
            )}
          </div>
        </AdminPanel>
      )}

      {listError && <ErrorPanel message={listError} />}

      {/* Orders table */}
      <AdminPanel
        title="Orders"
        actions={
          <span
            className="text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            {visibleOrders.length} order
            {visibleOrders.length === 1 ? "" : "s"}
          </span>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--muted-foreground)" }}
              aria-hidden="true"
            />
            <input
              type="search"
              className="field-input"
              style={{ paddingLeft: "2.25rem" }}
              placeholder="Search by customer email or reference…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search orders by customer email or reference"
              data-ocid="admin.orders.search_input"
            />
          </div>
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
                    <span className="num">{formatPrice(row.amountOwed)}</span>
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
                    <span className="num">
                      {formatTimestamp(row.createdAt)}
                    </span>
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
                      <span style={{ color: "var(--muted-foreground)" }}>
                        —
                      </span>
                    ),
                },
                {
                  key: "email",
                  header: "Customer email",
                  render: (row) => (
                    <span className="flex items-center gap-2">
                      <span className="mono-num">{row.customerEmail}</span>
                      <CopyButton text={row.customerEmail} label="Copy email" />
                    </span>
                  ),
                },
              ]}
              rows={visibleOrders}
              rowKey={(row) => row.reference}
              emptyMessage={
                search.trim()
                  ? "No orders match this search."
                  : "No orders match this filter."
              }
            />
          )}
        </div>
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
