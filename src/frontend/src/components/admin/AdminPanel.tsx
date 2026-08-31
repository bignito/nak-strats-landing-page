import type React from "react";

interface AdminPanelProps {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * Shared bordered section panel for the admin console. Renders a hairline
 * panel with an uppercase title row and a body. Used by every admin tab body
 * to keep the dense operations layout consistent.
 */
export function AdminPanel({
  title,
  actions,
  children,
  className,
}: AdminPanelProps) {
  return (
    <section
      className={`admin-panel ${className ?? ""}`}
      data-ocid="admin.panel"
    >
      <div className="admin-panel-head">
        <h3 className="admin-panel-title">{title}</h3>
        {actions}
      </div>
      <div className="admin-panel-body">{children}</div>
    </section>
  );
}
