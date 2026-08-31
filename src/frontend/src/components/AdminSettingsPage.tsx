import AdminDashboard from "./AdminDashboard";

/**
 * Retired monolithic admin page. The tabbed admin console now lives in
 * AdminTabShell (rendered by AdminDashboard). This file is kept as a thin
 * re-export so any lingering import resolves to the new dashboard instead of
 * leaving dead duplicate admin UI.
 */
export default AdminDashboard;
