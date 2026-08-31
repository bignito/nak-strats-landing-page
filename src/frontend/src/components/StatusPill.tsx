import type React from "react";

interface StatusPillProps {
  tone: "positive" | "warning" | "muted" | "negative" | "neutral";
  children: React.ReactNode;
}

const TONE_CLASS: Record<StatusPillProps["tone"], string> = {
  positive: "status-pill-positive",
  warning: "status-pill-warning",
  muted: "status-pill-muted",
  negative: "status-pill-negative",
  neutral: "status-pill-neutral",
};

export function StatusPill({ tone, children }: StatusPillProps) {
  return (
    <span className={`status-pill ${TONE_CLASS[tone]}`} data-ocid="status_pill">
      {children}
    </span>
  );
}
