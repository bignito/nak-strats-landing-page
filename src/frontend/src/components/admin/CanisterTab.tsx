import { useGetCanisterId, useGetCycleBalance } from "@/hooks/useQueries";
import type { AdminTabBodyProps } from "@/types/routes";
import { Check, Copy, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { AdminPanel } from "./AdminPanel";
import { AdminStatCard } from "./AdminStatCard";

/** Draft canister principal — a matching id means this console is DRAFT. */
const DRAFT_CANISTER_ID = "vm5zh-yaaaa-aaaaj-qoaza-cai";

/** Gauge full scale: 3T cycles (top of the green band). */
const GAUGE_MAX = 3_000_000_000_000n;

type Band = "positive" | "warning" | "negative";

/** Cycle-balance band: >2T green, 500B–2T amber, <500B red. */
function bandFor(balance: bigint): Band {
  if (balance > 2_000_000_000_000n) return "positive";
  if (balance >= 500_000_000_000n) return "warning";
  return "negative";
}

/** Trillions with up to 2 decimals, e.g. "1.24 T". */
function formatTrillions(balance: bigint): string {
  const trillions = Number(balance) / 1_000_000_000_000;
  return `${trillions.toLocaleString("en-US", {
    maximumFractionDigits: 2,
  })} T`;
}

/**
 * CANISTER tab — read-only canister health. The cycle balance comes from the
 * backend's mo:core/Cycles read and is shown in trillions with a colour band
 * and gauge; the principal is a public query. Both are query calls, keeping
 * the view read-heavy and cheap on cycles.
 */
export function CanisterTab(_props: AdminTabBodyProps) {
  const { data: cycleBalance, isLoading: cyclesLoading } = useGetCycleBalance();
  const { data: canisterId, isLoading: idLoading } = useGetCanisterId();
  const [copied, setCopied] = useState(false);

  const band = useMemo(
    () => (cycleBalance !== undefined ? bandFor(cycleBalance) : null),
    [cycleBalance],
  );

  const fillPercent = useMemo(() => {
    if (cycleBalance === undefined) return 0;
    const ratio = Number(cycleBalance) / Number(GAUGE_MAX);
    return Math.min(Math.max(ratio, 0), 1) * 100;
  }, [cycleBalance]);

  const isDraft = canisterId === DRAFT_CANISTER_ID;

  const copyPrincipal = async () => {
    if (!canisterId) return;
    try {
      await navigator.clipboard.writeText(canisterId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — the id stays visible for manual copy.
    }
  };

  if (cyclesLoading || idLoading) {
    return (
      <div
        className="flex items-center justify-center gap-3 py-16"
        style={{ color: "var(--muted-foreground)" }}
        data-ocid="admin.canister.loading_state"
      >
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading canister health…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" data-ocid="admin.canister">
      <AdminPanel title="Canister identity">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span
              className={`cycle-band ${isDraft ? "is-warning" : "is-positive"}`}
              aria-hidden="true"
            />
            <span className="admin-stat-label">
              {isDraft ? "Draft canister" : "Live canister"}
            </span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <code
              className="text-xs truncate"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--foreground)",
              }}
              data-ocid="admin.canister.principal"
            >
              {canisterId ?? "—"}
            </code>
            <button
              type="button"
              onClick={() => void copyPrincipal()}
              disabled={!canisterId}
              className="btn btn-secondary"
              aria-label="Copy canister principal"
              data-ocid="admin.canister.copy_button"
            >
              {copied ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      </AdminPanel>

      <AdminPanel title="Cycle balance">
        <div className="flex flex-col gap-4">
          <div
            className="admin-stat-grid"
            data-ocid="admin.canister.cycle_stats"
          >
            <AdminStatCard
              label="Cycle balance"
              value={
                cycleBalance !== undefined ? formatTrillions(cycleBalance) : "—"
              }
              delta={`${cycleBalance?.toLocaleString("en-US") ?? "—"} cycles`}
              band={band ?? undefined}
            />
            <AdminStatCard
              label="Status"
              value={
                band === "positive"
                  ? "Healthy"
                  : band === "warning"
                    ? "Caution"
                    : "Critical"
              }
              band={band ?? undefined}
            />
          </div>

          <div className="flex flex-col gap-2">
            <div
              className="gauge-bar"
              role="img"
              aria-label={`Cycle balance at ${fillPercent.toFixed(0)} percent of the 3 trillion full scale`}
            >
              <div
                className={`gauge-fill is-${band ?? "negative"}`}
                style={{ width: `${fillPercent}%` }}
              />
            </div>
            <div
              className="flex items-center justify-between text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              <span>0</span>
              <span>3 T full scale</span>
            </div>
          </div>

          <div
            className="flex items-center gap-4 text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            <span className="flex items-center gap-1.5">
              <span className="cycle-band is-positive" aria-hidden="true" />
              &gt; 2 T
            </span>
            <span className="flex items-center gap-1.5">
              <span className="cycle-band is-warning" aria-hidden="true" />
              500 B – 2 T
            </span>
            <span className="flex items-center gap-1.5">
              <span className="cycle-band is-negative" aria-hidden="true" />
              &lt; 500 B
            </span>
          </div>
        </div>
      </AdminPanel>
    </div>
  );
}
