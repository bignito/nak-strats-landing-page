import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useGetCycleMetrics } from "@/hooks/useQueries";
import type { AdminTabBodyProps } from "@/types/routes";
import { Loader2 } from "lucide-react";
import { useMemo } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
} from "recharts";
import { AdminPanel } from "./AdminPanel";
import { AdminStatCard } from "./AdminStatCard";
import { AdminTable } from "./AdminTable";

/** Nanosecond backend timestamp -> epoch milliseconds. */
function timestampToMs(ts: bigint): number {
  return Number(ts / 1_000_000n);
}

/** Cycles -> trillions with up to 2 decimals, e.g. "1.24 T". */
function formatT(cycles: bigint): string {
  const t = Number(cycles) / 1_000_000_000_000;
  return `${t.toLocaleString("en-US", { maximumFractionDigits: 2 })} T`;
}

/** Cycles -> approximate USD (1T cycles ≈ $1.33). */
function formatUsd(cycles: bigint): string {
  const usd = (Number(cycles) / 1_000_000_000_000) * 1.33;
  return `$${usd.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Cycles -> trillions as a plain number for chart axes. */
function toT(cycles: bigint): number {
  return Number(cycles) / 1_000_000_000_000;
}

const DAY_MS = 86_400_000;

/** A single interval between two consecutive samples. */
interface Interval {
  /** Index of the later sample in the sorted samples array. */
  index: number;
  startMs: number;
  endMs: number;
  durationMs: number;
  isTopUp: boolean;
  burn: bigint;
  topUpAmount: bigint;
  outcalls: bigint;
  ledger: bigint;
  vetkd: bigint;
  rawRand: bigint;
}

/** Row shape for the per-interval table. */
interface IntervalRow {
  key: string;
  time: string;
  burn: bigint;
  isTopUp: boolean;
  topUpAmount: bigint;
  outcalls: bigint;
  ledger: bigint;
  vetkd: bigint;
  rawRand: bigint;
}

/** Point shape for the balance-over-time chart. */
interface BalancePoint {
  time: string;
  balance: number;
  topUp: number | null;
}

/** Point shape for the memory-over-time chart. */
interface MemoryPoint {
  time: string;
  heap: number;
  stable: number;
}

/**
 * CYCLE MONITOR tab — read-only cycle burn analysis. The backend returns the
 * raw sample ring buffer plus the live balance and current counters; every
 * interval, burn-rate, and top-up computation happens here client-side. An
 * interval is contaminated (a top-up) when the later sample's balance is
 * higher than the earlier one's; contaminated intervals are excluded from
 * burn-rate math and flagged in the table with the approximate amount added.
 */
export function CycleMonitorTab(_props: AdminTabBodyProps) {
  const { data, isLoading } = useGetCycleMetrics();

  const analysis = useMemo(() => {
    if (!data) return null;
    const samples = [...data.samples].sort((a, b) =>
      Number(a.timestamp - b.timestamp),
    );
    if (samples.length < 2) return { samples, intervals: [] as Interval[] };

    const intervals: Interval[] = [];
    for (let i = 1; i < samples.length; i += 1) {
      const prev = samples[i - 1];
      const curr = samples[i];
      const startMs = timestampToMs(prev.timestamp);
      const endMs = timestampToMs(curr.timestamp);
      const isTopUp = curr.cyclesBalance > prev.cyclesBalance;
      intervals.push({
        index: i,
        startMs,
        endMs,
        durationMs: Math.max(endMs - startMs, 0),
        isTopUp,
        burn: isTopUp ? 0n : prev.cyclesBalance - curr.cyclesBalance,
        topUpAmount: isTopUp ? curr.cyclesBalance - prev.cyclesBalance : 0n,
        outcalls: curr.totalOutcalls - prev.totalOutcalls,
        ledger: curr.totalLedgerCalls - prev.totalLedgerCalls,
        vetkd: curr.totalVetkdCalls - prev.totalVetkdCalls,
        rawRand: curr.totalRawRandCalls - prev.totalRawRandCalls,
      });
    }
    return { samples, intervals };
  }, [data]);

  const stats = useMemo(() => {
    if (!analysis || analysis.intervals.length === 0) return null;
    const now = Date.now();

    // Average burn per day over a window, from non-contaminated intervals
    // whose start falls within the window. Denominator is the actual elapsed
    // time spanned by those valid intervals, so gaps from excluded top-ups
    // don't dilute the rate.
    const burnPerDay = (windowMs: number): number | null => {
      let totalBurn = 0n;
      let totalDurationMs = 0;
      for (const it of analysis.intervals) {
        if (it.isTopUp) continue;
        if (it.startMs < now - windowMs) continue;
        totalBurn += it.burn;
        totalDurationMs += it.durationMs;
      }
      if (totalDurationMs <= 0) return null;
      return Number(totalBurn) / (totalDurationMs / DAY_MS);
    };

    const burn24 = burnPerDay(DAY_MS);
    const burn7 = burnPerDay(7 * DAY_MS);
    const burn14 = burnPerDay(14 * DAY_MS);

    // "Current" burn rate: prefer the 24h window, then 7d, then 14d.
    const current = burn24 ?? burn7 ?? burn14;
    const daysRemaining =
      current && current > 0 ? Number(data!.liveBalance) / current : null;

    return { burn24, burn7, burn14, daysRemaining };
  }, [analysis, data]);

  const balancePoints = useMemo<BalancePoint[]>(() => {
    if (!analysis) return [];
    return analysis.samples.map((s, i) => {
      const isTopUp =
        i > 0 && s.cyclesBalance > analysis.samples[i - 1].cyclesBalance;
      return {
        time: new Date(timestampToMs(s.timestamp)).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        balance: toT(s.cyclesBalance),
        topUp: isTopUp ? toT(s.cyclesBalance) : null,
      };
    });
  }, [analysis]);

  const memoryPoints = useMemo<MemoryPoint[]>(() => {
    if (!analysis) return [];
    return analysis.samples.map((s) => ({
      time: new Date(timestampToMs(s.timestamp)).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      heap: Number(s.heapBytes) / 1_048_576,
      stable: Number(s.stableBytes) / 1_048_576,
    }));
  }, [analysis]);

  const intervalRows = useMemo<IntervalRow[]>(() => {
    if (!analysis) return [];
    return analysis.intervals.map((it) => ({
      key: `${it.index}-${it.startMs}`,
      time: new Date(it.startMs).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      burn: it.burn,
      isTopUp: it.isTopUp,
      topUpAmount: it.topUpAmount,
      outcalls: it.outcalls,
      ledger: it.ledger,
      vetkd: it.vetkd,
      rawRand: it.rawRand,
    }));
  }, [analysis]);

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center gap-3 py-16"
        style={{ color: "var(--muted-foreground)" }}
        data-ocid="admin.cycle_monitor.loading_state"
      >
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading cycle metrics…
      </div>
    );
  }

  if (!data || !analysis || analysis.samples.length < 2) {
    return (
      <div className="flex flex-col gap-4" data-ocid="admin.cycle_monitor">
        <AdminPanel title="Cycle Monitor">
          <div
            className="flex flex-col gap-2"
            data-ocid="admin.cycle_monitor.collecting_state"
          >
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              Collecting data — first reading available within 3 hours.
            </p>
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              The canister samples its cycle balance and counters on the hourly
              sweep. Once at least two readings exist, burn-rate and top-up
              analysis will appear here.
            </p>
          </div>
        </AdminPanel>
      </div>
    );
  }

  const liveBalance = data.liveBalance;

  return (
    <div className="flex flex-col gap-4" data-ocid="admin.cycle_monitor">
      {/* Current balance + burn-rate stats */}
      <div className="admin-stat-grid" data-ocid="admin.cycle_monitor.balance">
        <AdminStatCard
          label="Current balance"
          value={formatT(liveBalance)}
          delta={`${liveBalance.toLocaleString("en-US")} cycles`}
        />
        <AdminStatCard
          label="Approx. USD"
          value={formatUsd(liveBalance)}
          delta="1 T cycles ≈ $1.33"
        />
        <AdminStatCard
          label="Burn / day (24h)"
          value={
            stats?.burn24 != null
              ? formatT(BigInt(Math.round(stats.burn24)))
              : "—"
          }
          delta="non-contaminated intervals"
        />
        <AdminStatCard
          label="Burn / day (7d)"
          value={
            stats?.burn7 != null
              ? formatT(BigInt(Math.round(stats.burn7)))
              : "—"
          }
          delta="non-contaminated intervals"
        />
        <AdminStatCard
          label="Burn / day (14d)"
          value={
            stats?.burn14 != null
              ? formatT(BigInt(Math.round(stats.burn14)))
              : "—"
          }
          delta="non-contaminated intervals"
        />
        <AdminStatCard
          label="Days remaining"
          value={
            stats?.daysRemaining != null
              ? stats.daysRemaining.toLocaleString("en-US", {
                  maximumFractionDigits: 1,
                })
              : "—"
          }
          delta="at current burn rate"
        />
      </div>

      {/* Balance over time with top-up markers */}
      <AdminPanel title="Balance over time">
        <ChartContainer
          config={{
            balance: {
              label: "Balance (T)",
              color: "oklch(var(--admin-band-positive))",
            },
            topUp: {
              label: "Top-up",
              color: "oklch(var(--admin-band-warning))",
            },
          }}
          className="h-72"
          data-ocid="admin.cycle_monitor.balance_chart"
        >
          <ComposedChart
            data={balancePoints}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={48}
              tickFormatter={(v: number) => `${v.toFixed(1)}T`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => [
                    `${Number(value).toFixed(2)} T`,
                    name === "topUp" ? "Top-up" : "Balance",
                  ]}
                />
              }
            />
            <Line
              type="monotone"
              dataKey="balance"
              stroke="var(--color-balance)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Scatter
              dataKey="topUp"
              fill="var(--color-topUp)"
              shape="diamond"
              legendType="circle"
            />
          </ComposedChart>
        </ChartContainer>
        <p
          className="mt-2 text-xs"
          style={{ color: "var(--muted-foreground)" }}
        >
          Amber diamonds mark top-up events (intervals where the balance
          increased).
        </p>
      </AdminPanel>

      {/* Heap + stable memory over time */}
      <AdminPanel title="Memory over time">
        <ChartContainer
          config={{
            heap: {
              label: "Heap (MB)",
              color: "oklch(var(--chart-1))",
            },
            stable: {
              label: "Stable (MB)",
              color: "oklch(var(--chart-2))",
            },
          }}
          className="h-72"
          data-ocid="admin.cycle_monitor.memory_chart"
        >
          <ComposedChart
            data={memoryPoints}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={48}
              tickFormatter={(v: number) => `${v.toFixed(0)}`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => [
                    `${Number(value).toFixed(2)} MB`,
                    name === "heap" ? "Heap" : "Stable",
                  ]}
                />
              }
            />
            <Line
              type="monotone"
              dataKey="heap"
              stroke="var(--color-heap)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="stable"
              stroke="var(--color-stable)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </ComposedChart>
        </ChartContainer>
      </AdminPanel>

      {/* Per-interval table */}
      <AdminPanel title="Intervals">
        <AdminTable<IntervalRow>
          columns={[
            {
              key: "time",
              header: "Interval start",
              render: (r) => r.time,
            },
            {
              key: "burn",
              header: "Burn",
              align: "right",
              render: (r) =>
                r.isTopUp ? (
                  <span style={{ color: "var(--nak-warning)" }}>
                    Top-up +{formatT(r.topUpAmount)}
                  </span>
                ) : (
                  formatT(r.burn)
                ),
            },
            {
              key: "outcalls",
              header: "Outcalls",
              align: "right",
              render: (r) => r.outcalls.toLocaleString("en-US"),
            },
            {
              key: "ledger",
              header: "Ledger",
              align: "right",
              render: (r) => r.ledger.toLocaleString("en-US"),
            },
            {
              key: "vetkd",
              header: "vetKD",
              align: "right",
              render: (r) => r.vetkd.toLocaleString("en-US"),
            },
            {
              key: "rawRand",
              header: "Raw rand",
              align: "right",
              render: (r) => r.rawRand.toLocaleString("en-US"),
            },
          ]}
          rows={intervalRows}
          rowKey={(r) => r.key}
          emptyMessage="No intervals recorded yet."
        />
        <p
          className="mt-2 text-xs"
          style={{ color: "var(--muted-foreground)" }}
        >
          Counter columns show the delta in each activity counter across the
          interval, so burn correlates with on-chain activity. Top-up intervals
          are excluded from burn-rate math.
        </p>
      </AdminPanel>
    </div>
  );
}
