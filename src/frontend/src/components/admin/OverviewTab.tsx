import { PaymentMethod, PaymentStatus } from "@/backend";
import {
  useAdminListOrders,
  useGetTreasuryTokens,
  useProducts,
} from "@/hooks/useQueries";
import { formatPrice } from "@/lib/currency";
import type { AdminTabBodyProps } from "@/types/routes";
import { Loader2 } from "lucide-react";
import { useMemo } from "react";
import { AdminPanel } from "./AdminPanel";
import { AdminStatCard } from "./AdminStatCard";
import { AdminTable } from "./AdminTable";

/** Nanosecond backend timestamp -> epoch milliseconds. */
function timestampToMs(ts: bigint): number {
  return Number(ts / 1_000_000n);
}

/** Dense monetary figure — integer cents rendered as USD dollars. */
function formatMoney(amount: bigint): string {
  return formatPrice(amount);
}

function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

/** True when a crypto order needs manual admin review. */
function needsReview(
  status: PaymentStatus,
  cryptoStatus?: {
    __kind__: string;
  },
): boolean {
  if (cryptoStatus) {
    const kind = cryptoStatus.__kind__;
    if (
      kind === "overpayment" ||
      kind === "underpayment" ||
      kind === "expired"
    ) {
      return true;
    }
  }
  return status === PaymentStatus.expired;
}

/** Row shape for the per-product units table. */
interface ProductRow {
  name: string;
  category: string;
  price: bigint;
  currency: string;
  inventory: bigint;
  units: number;
}

/**
 * OVERVIEW tab — dense read-only operations summary. All figures are computed
 * client-side from a single `adminListOrders("all")` query plus the product
 * list, so the view stays read-heavy and cheap on cycles. The external
 * dashboard JSON is parsed defensively for per-product units when available.
 */
export function OverviewTab({ session: _session }: AdminTabBodyProps) {
  const { data: orders, isLoading: ordersLoading } = useAdminListOrders("all");
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: dashboardRaw } = useGetTreasuryTokens();

  const stats = useMemo(() => {
    const list = orders ?? [];
    const now = Date.now();
    const dayMs = 86_400_000;

    const today = list.filter(
      (o) => now - timestampToMs(o.createdAt) < dayMs,
    ).length;
    const week = list.filter(
      (o) => now - timestampToMs(o.createdAt) < 7 * dayMs,
    ).length;
    const month = list.filter(
      (o) => now - timestampToMs(o.createdAt) < 30 * dayMs,
    ).length;

    const paid = list.filter((o) => o.status === PaymentStatus.paid);
    const cryptoRevenue = paid
      .filter(
        (o) =>
          o.paymentMethod === PaymentMethod.crypto_icp ||
          o.paymentMethod === PaymentMethod.crypto_ckusdc,
      )
      .reduce((sum, o) => sum + o.amountOwed, 0n);
    const cardRevenue = paid
      .filter((o) => o.paymentMethod === PaymentMethod.card_stripe)
      .reduce((sum, o) => sum + o.amountOwed, 0n);

    const pending = list.filter(
      (o) => o.status === PaymentStatus.pending,
    ).length;
    const failed = list.filter(
      (o) =>
        o.status === PaymentStatus.expired ||
        o.status === PaymentStatus.cancelled,
    ).length;
    const review = list.filter((o) =>
      needsReview(o.status, o.cryptoStatus),
    ).length;

    const aov =
      paid.length > 0
        ? paid.reduce((sum, o) => sum + o.amountOwed, 0n) / BigInt(paid.length)
        : 0n;

    return {
      total: list.length,
      today,
      week,
      month,
      cryptoRevenue,
      cardRevenue,
      pending,
      failed,
      review,
      aov,
    };
  }, [orders]);

  // Per-product units sold, parsed defensively from the external dashboard
  // JSON when it exposes a products array; otherwise falls back to inventory.
  const unitsByProduct = useMemo(() => {
    const map = new Map<string, number>();
    if (!dashboardRaw) return map;
    try {
      const parsed = JSON.parse(dashboardRaw) as Record<string, unknown>;
      const rows = parsed.products ?? parsed.sales ?? parsed.items;
      if (Array.isArray(rows)) {
        for (const row of rows) {
          if (row && typeof row === "object") {
            const r = row as Record<string, unknown>;
            const name = String(r.name ?? r.product ?? r.slug ?? "");
            const units = Number(
              r.units_sold ?? r.unitsSold ?? r.quantity ?? 0,
            );
            if (name) map.set(name, units);
          }
        }
      }
    } catch {
      // Unparseable external payload — fall back to inventory only.
    }
    return map;
  }, [dashboardRaw]);

  const productRows = useMemo(
    () =>
      (products ?? []).map((p) => ({
        name: p.name,
        category: p.category,
        price: p.price,
        currency: p.currency,
        inventory: p.inventory,
        units: unitsByProduct.get(p.name) ?? 0,
      })),
    [products, unitsByProduct],
  );

  if (ordersLoading || productsLoading) {
    return (
      <div
        className="flex items-center justify-center gap-3 py-16"
        style={{ color: "var(--muted-foreground)" }}
        data-ocid="admin.overview.loading_state"
      >
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading overview…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" data-ocid="admin.overview">
      <div className="admin-stat-grid" data-ocid="admin.overview.order_counts">
        <AdminStatCard label="Orders today" value={formatCount(stats.today)} />
        <AdminStatCard label="Orders 7d" value={formatCount(stats.week)} />
        <AdminStatCard label="Orders 30d" value={formatCount(stats.month)} />
        <AdminStatCard
          label="Orders all time"
          value={formatCount(stats.total)}
        />
      </div>

      <div className="admin-stat-grid" data-ocid="admin.overview.revenue">
        <AdminStatCard
          label="Revenue crypto"
          value={formatMoney(stats.cryptoRevenue)}
        />
        <AdminStatCard
          label="Revenue card"
          value={formatMoney(stats.cardRevenue)}
        />
        <AdminStatCard
          label="Average order value"
          value={formatMoney(stats.aov)}
        />
      </div>

      <div className="admin-stat-grid" data-ocid="admin.overview.status_counts">
        <AdminStatCard
          label="Pending"
          value={formatCount(stats.pending)}
          band="warning"
        />
        <AdminStatCard
          label="Failed"
          value={formatCount(stats.failed)}
          band="negative"
        />
        <AdminStatCard
          label="Needs review"
          value={formatCount(stats.review)}
          band="negative"
        />
      </div>

      <AdminPanel title="Units sold per product">
        <AdminTable<ProductRow>
          columns={[
            { key: "name", header: "Product", render: (r) => r.name },
            { key: "category", header: "Category", render: (r) => r.category },
            {
              key: "price",
              header: "Price",
              align: "right",
              render: (r) => formatMoney(r.price),
            },
            {
              key: "inventory",
              header: "Inventory",
              align: "right",
              render: (r) => formatCount(Number(r.inventory)),
            },
            {
              key: "units",
              header: "Units sold",
              align: "right",
              render: (r) => (r.units > 0 ? formatCount(r.units) : "—"),
            },
          ]}
          rows={productRows}
          rowKey={(r) => r.name}
          emptyMessage="No products configured."
        />
      </AdminPanel>
    </div>
  );
}
