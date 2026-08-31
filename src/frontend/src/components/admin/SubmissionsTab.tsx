import { Discipline } from "@/backend";
import { adminErrorMessage, useListSubmissions } from "@/hooks/useQueries";
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

function formatDate(ts: bigint): string {
  const date = new Date(timestampToMs(ts));
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const DISCIPLINE_LABELS: Record<Discipline, string> = {
  [Discipline.music]: "Music",
  [Discipline.visualArt]: "Visual art",
  [Discipline.video]: "Video",
  [Discipline.writing]: "Writing",
  [Discipline.other]: "Other",
};

/**
 * SUBMISSIONS tab — read-only dense list of artist submissions. All reads go
 * through a query call to keep cycle cost low. Each row shows the artist name,
 * discipline, contact email, link, marketing consent, and submission time.
 */
export function SubmissionsTab(_props: AdminTabBodyProps) {
  const { data: submissions, isLoading, error } = useListSubmissions();

  const stats = useMemo(() => {
    const list = submissions ?? [];
    const consented = list.filter((s) => s.marketingConsent).length;
    return { total: list.length, consented };
  }, [submissions]);

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center gap-3 py-16"
        style={{ color: "var(--muted-foreground)" }}
        data-ocid="admin.submissions.loading_state"
      >
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading submissions…
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="admin-panel"
        style={{ borderColor: "var(--nak-negative)" }}
        data-ocid="admin.submissions.error_state"
      >
        <div className="admin-panel-body">
          <p style={{ color: "var(--nak-negative)" }}>
            {adminErrorMessage(error)}
          </p>
        </div>
      </div>
    );
  }

  const rows = submissions ?? [];

  return (
    <div className="flex flex-col gap-4" data-ocid="admin.submissions">
      <div className="admin-stat-grid" data-ocid="admin.submissions.stats">
        <AdminStatCard label="Submissions" value={String(stats.total)} />
        <AdminStatCard
          label="Marketing consent"
          value={String(stats.consented)}
        />
      </div>

      <AdminPanel title="Artist submissions">
        <AdminTable
          columns={[
            { key: "name", header: "Artist", render: (s) => s.name },
            {
              key: "discipline",
              header: "Discipline",
              render: (s) => DISCIPLINE_LABELS[s.discipline] ?? s.discipline,
            },
            { key: "email", header: "Email", render: (s) => s.email },
            {
              key: "link",
              header: "Link",
              render: (s) =>
                s.link ? (
                  <a
                    href={s.link}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                    style={{ color: "var(--primary)" }}
                    data-ocid={`admin.submissions.link.${s.id}`}
                  >
                    {s.link}
                  </a>
                ) : (
                  "—"
                ),
            },
            {
              key: "consent",
              header: "Consent",
              render: (s) =>
                s.marketingConsent ? (
                  <span style={{ color: "var(--nak-positive)" }}>yes</span>
                ) : (
                  <span style={{ color: "var(--muted-foreground)" }}>no</span>
                ),
            },
            {
              key: "submittedAt",
              header: "Submitted",
              align: "right",
              render: (s) => formatDate(s.submittedAt),
            },
          ]}
          rows={rows}
          rowKey={(s) => s.id}
          emptyMessage="No artist submissions yet."
        />
      </AdminPanel>
    </div>
  );
}
