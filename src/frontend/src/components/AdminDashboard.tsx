import { AdminTabShell } from "./AdminTabShell";

interface AdminDashboardProps {
  onNavigateToMain: () => void;
}

/**
 * The admin dashboard page. Renders the tabbed admin shell. This is the single
 * entry point for the #/admin route; the shell owns the header, tab bar, and
 * role/session gating.
 */
export function AdminDashboard({ onNavigateToMain }: AdminDashboardProps) {
  return <AdminTabShell onNavigateToMain={onNavigateToMain} />;
}

export default AdminDashboard;
