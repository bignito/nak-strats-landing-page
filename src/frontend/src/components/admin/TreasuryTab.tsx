import { createActor as createActorImpl } from "@/backend";
import { PaymentMethod } from "@/backend";
import type { Backend, SubaccountBalanceResult } from "@/backend";
import {
  adminErrorMessage,
  useAdminListOrders,
  useCryptoConfig,
  useForceSweepOrder,
  useGetDefaultSubaccountBalance,
  useGetTreasuryTokens,
  useSweepDefaultSubaccount,
} from "@/hooks/useQueries";
import type { AdminTabBodyProps } from "@/types/routes";
import {
  type createActorFunction,
  useActor,
} from "@caffeineai/core-infrastructure";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { AdminConfirmDialog } from "./AdminConfirmDialog";
import { AdminPanel } from "./AdminPanel";
import { AdminStatCard } from "./AdminStatCard";
import { AdminTable } from "./AdminTable";

const createActor = createActorImpl as unknown as createActorFunction<Backend>;

/** Formats a base-unit balance into a human string using the token decimals. */
function formatUnits(value: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = value / divisor;
  const fraction = value % divisor;
  if (fraction === 0n) return whole.toString();
  const padded = fraction.toString().padStart(decimals, "0");
  return `${whole}.${padded.replace(/0+$/, "")}`;
}

/** Truncates a long hex/address string for dense table display. */
function truncateMiddle(value: string, head = 10, tail = 8): string {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

/** Derives the subaccount index from its 32-byte big-endian hex encoding. */
function subaccountIndexFromHex(hex: string): bigint {
  let value = 0n;
  for (let i = 0; i < hex.length; i += 2) {
    value =
      value * 256n + BigInt(Number.parseInt(hex.slice(i, i + 2), 16) || 0);
  }
  return value;
}

interface TreasuryToken {
  symbol: string;
  balance: bigint;
  decimals: number;
}

/**
 * Parses the raw JSON text returned by `getTreasuryTokens` (an external
 * treasury service) defensively. The service shape is not guaranteed, so any
 * malformed payload falls back to an empty list rather than crashing the tab.
 */
function parseTreasuryTokens(raw: string | null | undefined): TreasuryToken[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const tokens: TreasuryToken[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const symbol = typeof record.symbol === "string" ? record.symbol : "";
    const decimalsRaw = record.decimals;
    const balanceRaw = record.balance;
    if (!symbol) continue;
    let decimals = 0;
    if (typeof decimalsRaw === "number" && Number.isFinite(decimalsRaw)) {
      decimals = decimalsRaw;
    }
    let balance = 0n;
    if (typeof balanceRaw === "bigint") {
      balance = balanceRaw;
    } else if (typeof balanceRaw === "number" && Number.isFinite(balanceRaw)) {
      balance = BigInt(Math.round(balanceRaw));
    } else if (typeof balanceRaw === "string") {
      try {
        balance = BigInt(balanceRaw);
      } catch {
        balance = 0n;
      }
    }
    tokens.push({ symbol, balance, decimals });
  }
  return tokens;
}

interface SweepEntry {
  id: string;
  label: string;
  blockIndex?: bigint;
  error?: string;
}

/**
 * TREASURY tab — ADMIN/OWNER view of the configured treasury, live ckUSDC
 * balance, the canister default-subaccount balance, per-order deposit
 * subaccount balances with full ICRC-1 addresses, total unswept funds, and a
 * sweep history that never truncates a ledger error. Every sweep is a
 * financial action and passes through an explicit confirmation step.
 */
export function TreasuryTab({ session }: AdminTabBodyProps) {
  const canManage = session.canManage;
  const { actor, isFetching } = useActor(createActor);
  const queryClient = useQueryClient();

  const {
    data: cryptoConfig,
    isLoading: cryptoLoading,
    error: cryptoError,
  } = useCryptoConfig();
  const {
    data: treasuryTokensRaw,
    isLoading: tokensLoading,
    error: tokensError,
  } = useGetTreasuryTokens();
  const {
    data: defaultBalance,
    isLoading: defaultLoading,
    error: defaultError,
  } = useGetDefaultSubaccountBalance();
  const {
    data: orders,
    isLoading: ordersLoading,
    error: ordersError,
  } = useAdminListOrders("all");

  const sweepDefault = useSweepDefaultSubaccount();
  const forceSweepOrder = useForceSweepOrder();

  const [sweepHistory, setSweepHistory] = useState<SweepEntry[]>([]);

  const treasuryTokens = useMemo(
    () => parseTreasuryTokens(treasuryTokensRaw),
    [treasuryTokensRaw],
  );

  const usdc = cryptoConfig?.ckUSDC;
  const decimals = usdc?.decimals ?? 6;
  const treasuryPrincipal = cryptoConfig?.treasuryPrincipal;

  // Live ckUSDC balance from the treasury service (defensive parse).
  const liveUsdc = useMemo(() => {
    const match = treasuryTokens.find(
      (t) => t.symbol.toUpperCase() === "CKUSDC",
    );
    return match ?? null;
  }, [treasuryTokens]);

  // Per-order deposit subaccounts. Only crypto orders carry a deposit
  // subaccount with a full ICRC-1 address. PaymentMethod is a separate enum
  // from Token — compare against PaymentMethod.crypto_* variants.
  const orderRows = useMemo(() => {
    if (!orders) return [];
    return orders
      .filter(
        (o) =>
          o.paymentMethod === PaymentMethod.crypto_ckusdc ||
          o.paymentMethod === PaymentMethod.crypto_icp,
      )
      .map((o) => ({
        reference: o.reference,
        subaccountHex: o.subaccountHex,
        depositAccountText: o.depositAccountText,
        amountOwed: o.amountOwed,
        status: o.status,
      }));
  }, [orders]);

  // Live on-ledger balance per order subaccount. The backend derives the
  // subaccount as the 32-byte big-endian encoding of the order id, so the
  // index is recovered from the displayed hex. `useQueries` keeps the hook
  // count stable while the order list changes, and the query keys match
  // `useGetSubaccountBalance` so sweep invalidations refresh these rows.
  const balanceQueries = useQueries({
    queries: orderRows.map((row) => {
      const subaccountIndex = subaccountIndexFromHex(row.subaccountHex);
      return {
        queryKey: ["subaccountBalance", subaccountIndex],
        queryFn: async (): Promise<SubaccountBalanceResult | null> => {
          if (!actor) return null;
          const result = await actor.getSubaccountBalance(subaccountIndex);
          if (result.__kind__ === "err") throw result.err;
          return result.ok;
        },
        enabled: !!actor && !isFetching,
      };
    }),
  });

  // Total unswept = sum of the live balances still held in order deposit
  // subaccounts that have not yet been swept to treasury.
  const totalUnswept = useMemo(() => {
    let total = 0n;
    for (const query of balanceQueries) {
      if (query.data && query.data.balance > 0n) total += query.data.balance;
    }
    return total;
  }, [balanceQueries]);

  const recordSweep = (
    label: string,
    result?: { blockIndex?: bigint; error?: string },
    error?: string,
  ) => {
    setSweepHistory((prev) => [
      {
        id: `${label}-${Date.now()}`,
        label,
        blockIndex: result?.blockIndex,
        error: error ?? result?.error,
      },
      ...prev,
    ]);
  };

  const handleSweepDefault = () => {
    sweepDefault.mutate(undefined, {
      onSuccess: (result) => recordSweep("Default subaccount", result),
      onError: (err) =>
        recordSweep("Default subaccount", undefined, adminErrorMessage(err)),
    });
  };

  const handleSweepOrder = (reference: string, subaccountIndex: bigint) => {
    forceSweepOrder.mutate(reference, {
      onSuccess: (result) => {
        recordSweep(`Order ${reference}`, result);
        void queryClient.invalidateQueries({
          queryKey: ["subaccountBalance", subaccountIndex],
        });
      },
      onError: (err) =>
        recordSweep(`Order ${reference}`, undefined, adminErrorMessage(err)),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Role gate */}
      {!canManage && (
        <div
          className="flex items-start gap-3 p-4"
          style={{
            background: "var(--error-panel-bg)",
            border: "1px solid var(--error-panel-border)",
            borderRadius: "var(--radius)",
          }}
          data-ocid="admin.treasury.role_gate"
        >
          <ShieldAlert
            className="w-5 h-5 shrink-0 mt-0.5"
            style={{ color: "var(--nak-warning)" }}
          />
          <div>
            <p
              className="font-medium"
              style={{ color: "var(--foreground)", fontSize: "0.875rem" }}
            >
              Read-only view
            </p>
            <p
              style={{
                color: "var(--muted-foreground)",
                fontSize: "0.8125rem",
              }}
            >
              Treasury balances and sweeps require ADMIN or OWNER. Your role can
              view these values but cannot sweep funds.
            </p>
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div className="admin-stat-grid" data-ocid="admin.treasury.stats">
        <AdminStatCard
          label="Treasury principal"
          value={
            treasuryPrincipal ? (
              <code className="text-xs">{treasuryPrincipal.toText()}</code>
            ) : (
              "—"
            )
          }
        />
        <AdminStatCard
          label="Live ckUSDC"
          value={
            liveUsdc ? (
              <span className="num">
                {formatUnits(liveUsdc.balance, liveUsdc.decimals)}
              </span>
            ) : (
              "—"
            )
          }
          band={liveUsdc && liveUsdc.balance > 0n ? "positive" : undefined}
        />
        <AdminStatCard
          label="Default subaccount"
          value={
            defaultBalance !== null && defaultBalance !== undefined ? (
              <span className="num">
                {formatUnits(defaultBalance, decimals)}
              </span>
            ) : (
              "—"
            )
          }
          band={
            defaultBalance !== null &&
            defaultBalance !== undefined &&
            defaultBalance > 0n
              ? "warning"
              : undefined
          }
        />
        <AdminStatCard
          label="Total unswept"
          value={
            <span className="num">{formatUnits(totalUnswept, decimals)}</span>
          }
          band={totalUnswept > 0n ? "warning" : "positive"}
        />
      </div>

      {/* Treasury + live balance */}
      <AdminPanel
        title="Treasury"
        actions={
          <span
            className="text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            ADMIN / OWNER
          </span>
        }
      >
        {cryptoLoading || tokensLoading ? (
          <div
            className="flex items-center gap-3 py-6"
            style={{ color: "var(--muted-foreground)" }}
            data-ocid="admin.treasury.loading_state"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading treasury…
          </div>
        ) : cryptoError ? (
          <div className="error-panel" data-ocid="admin.treasury.error_state">
            {adminErrorMessage(cryptoError)}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="section-heading text-sm">
                Configured treasury
              </span>
              <span
                className="text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
                {treasuryPrincipal ? (
                  <code className="admin-mono">
                    {treasuryPrincipal.toText()}
                  </code>
                ) : (
                  "not configured"
                )}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="section-heading text-sm">
                Live ckUSDC balance
              </span>
              <span
                className="text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
                {liveUsdc ? (
                  <span className="num">
                    {formatUnits(liveUsdc.balance, liveUsdc.decimals)} ckUSDC
                  </span>
                ) : (
                  "unavailable"
                )}
              </span>
            </div>
            {tokensError && (
              <div
                className="error-panel"
                data-ocid="admin.treasury.tokens_error"
              >
                {adminErrorMessage(tokensError)}
              </div>
            )}
          </div>
        )}
      </AdminPanel>

      {/* Default subaccount sweep */}
      <AdminPanel
        title="Default subaccount"
        actions={
          <span
            className="text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            ADMIN / OWNER
          </span>
        }
      >
        {defaultLoading ? (
          <div
            className="flex items-center gap-3 py-6"
            style={{ color: "var(--muted-foreground)" }}
            data-ocid="admin.treasury.default_loading"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading balance…
          </div>
        ) : defaultError ? (
          <div className="error-panel" data-ocid="admin.treasury.default_error">
            {adminErrorMessage(defaultError)}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="section-heading text-sm">Balance</span>
              <span
                className="text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
                {defaultBalance !== null && defaultBalance !== undefined ? (
                  <span className="num">
                    {formatUnits(defaultBalance, decimals)} ckUSDC
                  </span>
                ) : (
                  "—"
                )}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <AdminConfirmDialog
                trigger={
                  <button
                    type="button"
                    className="btn btn-sweep"
                    disabled={
                      !canManage ||
                      defaultBalance === null ||
                      defaultBalance === undefined ||
                      defaultBalance <= 0n
                    }
                    data-ocid="admin.treasury.sweep_default_button"
                  >
                    Sweep default subaccount
                  </button>
                }
                title="Sweep default subaccount"
                description={`Move the default subaccount balance (${
                  defaultBalance !== null && defaultBalance !== undefined
                    ? `${formatUnits(defaultBalance, decimals)} ckUSDC`
                    : "0"
                }) to the configured treasury? This is a financial action.`}
                confirmLabel="Sweep"
                cancelLabel="Cancel"
                tone="negative"
                onConfirm={handleSweepDefault}
                pending={sweepDefault.isPending}
                disabled={
                  !canManage ||
                  defaultBalance === null ||
                  defaultBalance === undefined ||
                  defaultBalance <= 0n
                }
              />
              {sweepDefault.isPending && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
            </div>
          </div>
        )}
      </AdminPanel>

      {/* Per-order subaccount balances */}
      <AdminPanel
        title="Order subaccounts"
        actions={
          <span
            className="text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            ADMIN / OWNER
          </span>
        }
      >
        {ordersLoading ? (
          <div
            className="flex items-center gap-3 py-6"
            style={{ color: "var(--muted-foreground)" }}
            data-ocid="admin.treasury.orders_loading"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading orders…
          </div>
        ) : ordersError ? (
          <div className="error-panel" data-ocid="admin.treasury.orders_error">
            {adminErrorMessage(ordersError)}
          </div>
        ) : (
          <AdminTable
            columns={[
              {
                key: "reference",
                header: "Order",
                render: (row) => (
                  <code className="admin-mono">{row.reference}</code>
                ),
              },
              {
                key: "subaccount",
                header: "Subaccount",
                render: (row) => (
                  <code className="admin-mono" title={row.subaccountHex}>
                    {truncateMiddle(row.subaccountHex)}
                  </code>
                ),
              },
              {
                key: "address",
                header: "ICRC-1 address",
                render: (row) => (
                  <code className="admin-mono" title={row.depositAccountText}>
                    {truncateMiddle(row.depositAccountText, 14, 10)}
                  </code>
                ),
              },
              {
                key: "amount",
                header: "Amount owed",
                align: "right",
                render: (row) => (
                  <span className="num">
                    {formatUnits(row.amountOwed, decimals)}
                  </span>
                ),
              },
              {
                key: "live",
                header: "Live balance",
                align: "right",
                render: (row) => {
                  const index = subaccountIndexFromHex(row.subaccountHex);
                  const query = balanceQueries.find(
                    (q) => q.data?.subaccountIndex === index,
                  );
                  if (query?.isLoading) {
                    return (
                      <span
                        className="inline-flex items-center gap-2"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span className="num">…</span>
                      </span>
                    );
                  }
                  if (query?.error) {
                    return (
                      <span
                        className="num"
                        title={adminErrorMessage(query.error)}
                        style={{ color: "var(--nak-negative)" }}
                      >
                        err
                      </span>
                    );
                  }
                  return (
                    <span className="num">
                      {query?.data
                        ? formatUnits(query.data.balance, decimals)
                        : "—"}
                    </span>
                  );
                },
              },
              {
                key: "action",
                header: "",
                align: "right",
                render: (row) => {
                  const index = subaccountIndexFromHex(row.subaccountHex);
                  const query = balanceQueries.find(
                    (q) => q.data?.subaccountIndex === index,
                  );
                  const liveBalance = query?.data?.balance ?? 0n;
                  return (
                    <AdminConfirmDialog
                      trigger={
                        <button
                          type="button"
                          className="btn btn-sweep"
                          disabled={!canManage}
                          data-ocid={`admin.treasury.sweep_order_button.${row.reference}`}
                        >
                          Sweep
                        </button>
                      }
                      title="Sweep order subaccount"
                      description={`Move the live balance of order ${row.reference} (${
                        liveBalance > 0n
                          ? `${formatUnits(liveBalance, decimals)} ckUSDC`
                          : "0"
                      }) to the configured treasury? This is a financial action.`}
                      confirmLabel="Sweep"
                      cancelLabel="Cancel"
                      tone="negative"
                      onConfirm={() => handleSweepOrder(row.reference, index)}
                      pending={forceSweepOrder.isPending}
                      disabled={!canManage}
                    />
                  );
                },
              },
            ]}
            rows={orderRows}
            rowKey={(row) => row.reference}
            emptyMessage="No crypto orders with deposit subaccounts."
          />
        )}
      </AdminPanel>

      {/* Sweep history */}
      <AdminPanel
        title="Sweep history"
        actions={
          <span
            className="text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            ADMIN / OWNER
          </span>
        }
      >
        {sweepHistory.length === 0 ? (
          <div
            className="admin-panel-body"
            style={{ color: "var(--muted-foreground)" }}
            data-ocid="admin.treasury.history_empty"
          >
            No sweeps performed this session.
          </div>
        ) : (
          <AdminTable
            columns={[
              {
                key: "label",
                header: "Target",
                render: (row) => <span>{row.label}</span>,
              },
              {
                key: "block",
                header: "Block",
                align: "right",
                render: (row) =>
                  row.blockIndex !== undefined ? (
                    <span className="num">{row.blockIndex.toString()}</span>
                  ) : (
                    "—"
                  ),
              },
              {
                key: "error",
                header: "Ledger error",
                render: (row) =>
                  row.error ? (
                    <span
                      style={{
                        color: "var(--nak-negative)",
                        wordBreak: "break-word",
                      }}
                    >
                      {row.error}
                    </span>
                  ) : (
                    <span style={{ color: "var(--nak-positive)" }}>OK</span>
                  ),
              },
            ]}
            rows={sweepHistory}
            rowKey={(row) => row.id}
            emptyMessage="No sweeps performed this session."
          />
        )}
      </AdminPanel>
    </div>
  );
}
