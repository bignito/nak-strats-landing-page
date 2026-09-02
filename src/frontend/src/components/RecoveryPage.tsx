import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Coins,
  RefreshCw,
  ShieldAlert,
  Wallet,
} from "lucide-react";
import {
  useCryptoConfig,
  useForceRecheckPayment,
  useForceSweepOrder,
  useGetCycleBalance,
  useGetDefaultSubaccountBalance,
  useListLatePayments,
  useListOrdersForRecovery,
  useMarkLatePaymentReviewed,
  useSweepDefaultSubaccount,
} from "../hooks/useQueries";
import { formatPrice } from "../lib/currency";
import type {
  CryptoPaymentStatus,
  LatePayment,
  OrderRecoveryView,
  RecheckResult,
  RecoveryError,
  SweepResult,
} from "../types/storefront";

interface RecoveryPageProps {
  onNavigateToAdmin: () => void;
  onNavigateToMain: () => void;
}

/** Convert a backend nanosecond timestamp to a readable local date string. */
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

/** Format a cycle balance with thousands separators. */
function formatCycles(cycles: bigint): string {
  return cycles.toLocaleString();
}

/** Human-readable message for a backend recovery error — never swallowed. */
function recoveryErrorMessage(err: RecoveryError): string {
  switch (err.__kind__) {
    case "ledgerError":
      return `Ledger error: ${err.ledgerError}`;
    case "sweepFailed":
      return `Sweep failed: ${err.sweepFailed}`;
    case "invalidConfig":
      return `Invalid config: ${err.invalidConfig}`;
    case "notFound":
      return "Order not found.";
    case "notCryptoOrder":
      return "This order is not a crypto order.";
    case "unauthorized":
      return "Unauthorized — admin access required.";
    default:
      return "Unknown recovery error.";
  }
}

/** Extract the exact error text from a thrown recovery error object. */
function errorText(err: unknown): string {
  if (err && typeof err === "object" && "__kind__" in err) {
    return recoveryErrorMessage(err as RecoveryError);
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

/** Status pill tone for an order's payment status. */
function statusTone(status: string): string {
  switch (status) {
    case "paid":
      return "bg-success-soft text-success border border-emerald-500/30";
    case "pending":
      return "bg-warning-soft text-warning border border-amber-500/30";
    case "expired":
    case "cancelled":
      return "bg-destructive-soft text-destructive border border-red-500/30";
    default:
      return "bg-warning-soft text-warning border border-amber-500/30";
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

function paymentMethodLabel(method: string): string {
  switch (method) {
    case "crypto_icp":
      return "ICP";
    case "crypto_ckusdc":
      return "ckUSDC";
    case "card_stripe":
      return "Card";
    case "manual":
      return "Manual";
    default:
      return method;
  }
}

/** A single explicit ledger/recovery error panel — always visible, never hidden. */
function ErrorPanel({ message }: { message: string }) {
  return (
    <div
      className="error-panel relative flex items-start gap-2"
      role="alert"
      data-ocid="recovery.error_panel"
    >
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
      <span className="min-w-0">{message}</span>
    </div>
  );
}

/** Default-subaccount balance card with a sweep-to-treasury action. */
function DefaultSubaccountCard() {
  const { data: balance, isLoading, error } = useGetDefaultSubaccountBalance();
  const { data: config } = useCryptoConfig();
  const sweep = useSweepDefaultSubaccount();

  const decimals = config?.ckUSDC.decimals ?? 8;
  const balanceError = error ? errorText(error) : null;
  const sweepError = sweep.error ? errorText(sweep.error) : null;
  const sweepSuccess = sweep.data && !sweep.data.error ? sweep.data : null;

  return (
    <div
      className="card glass-card p-5"
      data-ocid="recovery.default_subaccount_card"
    >
      <div className="flex items-center gap-2 mb-1">
        <Wallet className="w-4 h-4 text-teal-400" />
        <h3 className="text-sm uppercase tracking-wide text-muted">
          Default-subaccount balance
        </h3>
      </div>
      <div className="admin-mono text-2xl font-semibold text-white mb-3">
        {isLoading
          ? "…"
          : balance == null
            ? "—"
            : `${formatTokenAmount(balance, decimals)} ckUSDC`}
      </div>
      <button
        type="button"
        className="btn-recheck"
        onClick={() => sweep.mutate()}
        disabled={sweep.isPending}
        data-ocid="recovery.sweep_default_button"
      >
        {sweep.isPending ? "Sweeping…" : "Sweep to treasury"}
      </button>
      {sweepSuccess && (
        <p className="text-xs text-success mt-3 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Swept to treasury
          {sweepSuccess.blockIndex !== undefined
            ? ` · block ${sweepSuccess.blockIndex.toString()}`
            : ""}
        </p>
      )}
      {sweepError && (
        <div className="mt-3">
          <ErrorPanel message={sweepError} />
        </div>
      )}
      {balanceError && (
        <div className="mt-3">
          <ErrorPanel message={balanceError} />
        </div>
      )}
    </div>
  );
}

/** Canister cycle balance card. */
function CycleBalanceCard() {
  const { data: cycles, isLoading, error } = useGetCycleBalance();
  const cycleError = error ? errorText(error) : null;

  return (
    <div
      className="card glass-card p-5"
      data-ocid="recovery.cycle_balance_card"
    >
      <div className="flex items-center gap-2 mb-1">
        <Coins className="w-4 h-4 text-purple-400" />
        <h3 className="text-sm uppercase tracking-wide text-muted">
          Canister cycle balance
        </h3>
      </div>
      <div className="admin-mono text-2xl font-semibold text-white">
        {isLoading ? "…" : `${formatCycles(cycles ?? 0n)} cycles`}
      </div>
      {cycleError && (
        <div className="mt-3">
          <ErrorPanel message={cycleError} />
        </div>
      )}
    </div>
  );
}

/** Per-order row with re-check and sweep actions plus explicit error surfacing. */
function OrderRow({
  order,
  decimals,
}: {
  order: OrderRecoveryView;
  decimals: number;
}) {
  const recheck = useForceRecheckPayment();
  const sweep = useForceSweepOrder();

  const recheckError = recheck.error ? errorText(recheck.error) : null;
  const sweepError = sweep.error ? errorText(sweep.error) : null;
  const recheckResult = recheck.data;
  const sweepResult = sweep.data;

  return (
    <tr data-ocid={`recovery.order_row.${order.reference}`}>
      <td className="admin-mono">{order.reference}</td>
      <td>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusTone(
            order.status,
          )}`}
        >
          {order.status}
        </span>
      </td>
      <td className="admin-mono">{paymentMethodLabel(order.paymentMethod)}</td>
      <td className="admin-mono text-right">{formatPrice(order.amountOwed)}</td>
      <td className="admin-mono max-w-[16rem]">
        {order.depositAccount ? (
          <span className="block break-all">
            {order.depositAccount.textAddress}
          </span>
        ) : (
          <span className="text-muted">—</span>
        )}
      </td>
      <td className="admin-mono text-right">
        {formatTokenAmount(order.liveBalance, decimals)}
      </td>
      <td>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-recheck"
            onClick={() => recheck.mutate(order.reference)}
            disabled={recheck.isPending}
            data-ocid={`recovery.recheck_button.${order.reference}`}
          >
            <RefreshCw className="w-3 h-3" />
            {recheck.isPending ? "Checking…" : "Re-check"}
          </button>
          <button
            type="button"
            className="btn-sweep"
            onClick={() => sweep.mutate(order.reference)}
            disabled={sweep.isPending}
            data-ocid={`recovery.sweep_button.${order.reference}`}
          >
            {sweep.isPending ? "Sweeping…" : "Sweep"}
          </button>
        </div>
        {recheckResult && !recheckResult.error && (
          <p className="text-xs text-success mt-1.5 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            {cryptoStatusLabel(recheckResult.status)} · balance{" "}
            {formatTokenAmount(recheckResult.balance, decimals)}
          </p>
        )}
        {recheckResult?.error && (
          <div className="mt-1.5">
            <ErrorPanel message={`Re-check: ${recheckResult.error}`} />
          </div>
        )}
        {recheckError && (
          <div className="mt-1.5">
            <ErrorPanel message={`Re-check: ${recheckError}`} />
          </div>
        )}
        {sweepResult && !sweepResult.error && (
          <p className="text-xs text-success mt-1.5 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Swept
            {sweepResult.blockIndex !== undefined
              ? ` · block ${sweepResult.blockIndex.toString()}`
              : ""}
          </p>
        )}
        {sweepResult?.error && (
          <div className="mt-1.5">
            <ErrorPanel message={`Sweep: ${sweepResult.error}`} />
          </div>
        )}
        {sweepError && (
          <div className="mt-1.5">
            <ErrorPanel message={`Sweep: ${sweepError}`} />
          </div>
        )}
      </td>
    </tr>
  );
}

/** Late payments list with a mark-reviewed action. */
function LatePaymentsSection() {
  const { data: latePayments, isLoading, error } = useListLatePayments();
  const markReviewed = useMarkLatePaymentReviewed();
  const { data: config } = useCryptoConfig();

  const listError = error ? errorText(error) : null;
  const markError = markReviewed.error ? errorText(markReviewed.error) : null;

  const decimalsFor = (token: string): number =>
    token === "ICP"
      ? (config?.icp.decimals ?? 8)
      : (config?.ckUSDC.decimals ?? 8);

  return (
    <section
      className="card glass-card p-5"
      data-ocid="recovery.late_payments_section"
    >
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-4 h-4 text-warning" />
        <h3 className="text-sm uppercase tracking-wide text-muted">
          Late payments
        </h3>
      </div>

      {listError && (
        <div className="mb-4">
          <ErrorPanel message={listError} />
        </div>
      )}
      {markError && (
        <div className="mb-4">
          <ErrorPanel message={`Mark reviewed: ${markError}`} />
        </div>
      )}

      {isLoading ? (
        <div className="loading-shimmer h-24 rounded-xl" />
      ) : !latePayments || latePayments.length === 0 ? (
        <p className="text-sm text-muted">No late payments to review.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Token</th>
                <th className="text-right">Expected</th>
                <th className="text-right">Received</th>
                <th>Received at</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {latePayments.map((lp: LatePayment, i: number) => (
                <tr
                  key={lp.reference}
                  data-ocid={`recovery.late_payment_row.${i + 1}`}
                >
                  <td className="admin-mono">{lp.reference}</td>
                  <td className="admin-mono">{lp.token}</td>
                  <td className="admin-mono text-right">
                    {formatTokenAmount(
                      lp.expectedAmount,
                      decimalsFor(lp.token),
                    )}
                  </td>
                  <td className="admin-mono text-right">
                    {formatTokenAmount(
                      lp.receivedAmount,
                      decimalsFor(lp.token),
                    )}
                  </td>
                  <td className="admin-mono">
                    {formatTimestamp(lp.receivedAt)}
                  </td>
                  <td>
                    {lp.reviewed ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-success-soft text-success border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" />
                        Reviewed
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-warning-soft text-warning border border-amber-500/30">
                        Unreviewed
                      </span>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-recheck"
                      onClick={() => markReviewed.mutate(lp.reference)}
                      disabled={markReviewed.isPending || lp.reviewed}
                      data-ocid={`recovery.mark_reviewed_button.${i + 1}`}
                    >
                      {lp.reviewed ? "Reviewed" : "Mark reviewed"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/**
 * Admin-only payment recovery dashboard. Lists every order needing recovery
 * attention with live on-ledger balances, per-order re-check and sweep actions,
 * a default-subaccount sweep, the canister cycle balance, and late payments.
 * Every ledger error is surfaced explicitly in a red mono panel — never hidden.
 */
export function RecoveryPage({ onNavigateToAdmin }: RecoveryPageProps) {
  const { data: orders, isLoading, error } = useListOrdersForRecovery();
  const { data: config } = useCryptoConfig();

  const listError = error ? errorText(error) : null;
  const decimals = config?.ckUSDC.decimals ?? 8;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <button
        type="button"
        onClick={onNavigateToAdmin}
        className="back-link mb-6"
        data-ocid="recovery.back_button"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Admin
      </button>

      <div className="flex items-center gap-3 mb-2">
        <ShieldAlert className="w-6 h-6 text-purple-400" />
        <h2
          className="text-2xl sm:text-3xl font-semibold text-white"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Payment Recovery
        </h2>
      </div>
      <p className="text-sm text-muted max-w-2xl mb-6">
        Admin-only tooling to recheck, sweep, and recover crypto payments.
      </p>

      {listError && (
        <div className="mb-6">
          <ErrorPanel message={listError} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <DefaultSubaccountCard />
        <CycleBalanceCard />
      </div>

      <section
        className="card glass-card p-5"
        data-ocid="recovery.orders_section"
      >
        <h3 className="text-sm uppercase tracking-wide text-muted mb-4">
          Orders
        </h3>
        {isLoading ? (
          <div className="loading-shimmer h-40 rounded-xl" />
        ) : !orders || orders.length === 0 ? (
          <p className="text-sm text-muted">
            No orders need recovery attention.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order Ref</th>
                  <th>Status</th>
                  <th>Method</th>
                  <th className="text-right">Amount Owed</th>
                  <th>Deposit Account</th>
                  <th className="text-right">Live Balance</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order: OrderRecoveryView) => (
                  <OrderRow
                    key={order.reference}
                    order={order}
                    decimals={decimals}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="mt-8">
        <LatePaymentsSection />
      </div>
    </div>
  );
}

export default RecoveryPage;
