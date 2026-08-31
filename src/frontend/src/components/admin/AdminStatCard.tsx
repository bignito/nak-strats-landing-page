import type React from "react";

type Band = "positive" | "warning" | "negative";

interface AdminStatCardProps {
  label: string;
  value: React.ReactNode;
  delta?: React.ReactNode;
  band?: Band;
}

/**
 * Shared stat card for the admin console. Renders an uppercase label, a large
 * JetBrains Mono tabular value, and an optional delta line. The optional
 * `band` adds a 2px left colour accent (positive/warning/negative) reserved
 * for cycle-balance and financial states.
 */
export function AdminStatCard({
  label,
  value,
  delta,
  band,
}: AdminStatCardProps) {
  const bandClass = band ? ` is-${band}` : "";
  return (
    <div className={`admin-stat-card${bandClass}`} data-ocid="admin.stat_card">
      <span className="admin-stat-label">{label}</span>
      <span className="admin-stat-value">{value}</span>
      {delta !== undefined && <span className="admin-stat-delta">{delta}</span>}
    </div>
  );
}
