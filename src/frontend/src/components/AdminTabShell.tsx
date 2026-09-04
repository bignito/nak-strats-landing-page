import { Role } from "@/backend";
import { CopyButton } from "@/components/CopyButton";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import { CanisterTab } from "@/components/admin/CanisterTab";
import { CategoriesTab } from "@/components/admin/CategoriesTab";
import { CycleMonitorTab } from "@/components/admin/CycleMonitorTab";
import { OrdersTab } from "@/components/admin/OrdersTab";
import { OverviewTab } from "@/components/admin/OverviewTab";
import { ProductsTab } from "@/components/admin/ProductsTab";
import { SettingsTab } from "@/components/admin/SettingsTab";
import { SubmissionsTab } from "@/components/admin/SubmissionsTab";
import { TreasuryTab } from "@/components/admin/TreasuryTab";
import { UsersTab } from "@/components/admin/UsersTab";
import {
  useActorReady,
  useAdminCount,
  useClaimInitialAdmin,
  useGetCanisterId,
  useGetEncryptionRecipients,
  useGetMyRole,
} from "@/hooks/useQueries";
import type {
  AdminSession,
  AdminTabBodyProps,
  AdminTabId,
} from "@/types/routes";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, LogOut, ShieldAlert } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";

/** Draft canister principal — a matching id means this console is DRAFT. */
const DRAFT_CANISTER_ID = "vm5zh-yaaaa-aaaaj-qoaza-cai";

/** The 10 admin tabs in display order. */
const TAB_ORDER: AdminTabId[] = [
  "overview",
  "canister",
  "cycleMonitor",
  "treasury",
  "orders",
  "products",
  "categories",
  "submissions",
  "users",
  "settings",
];

const TAB_LABELS: Record<AdminTabId, string> = {
  overview: "Overview",
  canister: "Canister",
  cycleMonitor: "Cycle Monitor",
  treasury: "Treasury",
  orders: "Orders",
  products: "Products",
  categories: "Categories",
  submissions: "Submissions",
  users: "Users",
  settings: "Settings",
};

/**
 * Registry mapping each tab id to its body component. Every tab is backed by a
 * real body component registered below.
 */
const TAB_BODIES: Record<AdminTabId, React.ComponentType<AdminTabBodyProps>> = {
  overview: (props) => <OverviewTab {...props} />,
  canister: (props) => <CanisterTab {...props} />,
  cycleMonitor: (props) => <CycleMonitorTab {...props} />,
  treasury: (props) => <TreasuryTab {...props} />,
  orders: (props) => <OrdersTab {...props} />,
  products: (props) => <ProductsTab {...props} />,
  categories: (props) => <CategoriesTab {...props} />,
  submissions: (props) => <SubmissionsTab {...props} />,
  users: (props) => <UsersTab {...props} />,
  settings: (props) => <SettingsTab {...props} />,
};

interface AdminTabShellProps {
  onNavigateToMain: () => void;
}

/**
 * Middle-ellipsis truncation for a principal: keeps the first 5 and last 5
 * characters joined by an ellipsis (e.g. `z2dj2…wn-jqe`). Short principals are
 * returned unchanged. The full untruncated string is always what gets copied.
 */
function truncatePrincipal(principal: string): string {
  if (principal.length <= 11) return principal;
  return `${principal.slice(0, 5)}…${principal.slice(-5)}`;
}

/**
 * The tabbed admin shell. Renders a sticky header (with a DRAFT/LIVE canister
 * label), the 8-tab bar with a 2px purple underline on the active tab, and the
 * active tab's body. Admin UI is gated on `isActorReady` and on the caller's
 * role: STAFF sees only ORDERS (fulfilment), ADMIN/OWNER see all tabs, and
 * OWNER additionally sees USERS management.
 */
export function AdminTabShell({ onNavigateToMain }: AdminTabShellProps) {
  const { isActorReady, isAuthenticated, identity } = useActorReady();
  const { data: role, isLoading: roleLoading } = useGetMyRole();
  const { data: adminCount } = useAdminCount();
  const { data: canisterId } = useGetCanisterId();
  const { data: encryptionRecipients } = useGetEncryptionRecipients();
  const claimAdmin = useClaimInitialAdmin();
  const queryClient = useQueryClient();
  const { clear, isLoggingIn } = useInternetIdentity();
  const [activeTab, setActiveTab] = useState<AdminTabId>("overview");

  const isDraft = canisterId === DRAFT_CANISTER_ID;

  const session: AdminSession = useMemo(
    () => ({
      isActorReady,
      isAuthenticated,
      role: role ?? null,
      roleLoading,
      canFulfil:
        role === Role.staff || role === Role.admin || role === Role.owner,
      canManage: role === Role.admin || role === Role.owner,
      canManageUsers: role === Role.owner,
    }),
    [isActorReady, isAuthenticated, role, roleLoading],
  );

  // Role-filtered tab list. STAFF sees only ORDERS; ADMIN/OWNER see all tabs
  // except USERS; OWNER additionally sees USERS management.
  const visibleTabs = useMemo(() => {
    if (role === Role.owner) return TAB_ORDER;
    if (role === Role.admin) return TAB_ORDER.filter((t) => t !== "users");
    if (role === Role.staff) return ["orders" as AdminTabId];
    return [];
  }, [role]);

  // If the active tab is no longer visible (e.g. role changed), fall back to
  // the first visible tab.
  const resolvedTab: AdminTabId | null = visibleTabs.includes(activeTab)
    ? activeTab
    : (visibleTabs[0] ?? null);

  const ActiveBody = resolvedTab ? TAB_BODIES[resolvedTab] : null;
  const userPrincipalText = identity?.getPrincipal().toText() ?? "";

  return (
    <div className="admin-shell" data-ocid="admin.shell">
      {/* Sticky header — title + canister label + primary actions */}
      <header className="admin-header" data-ocid="admin.header">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="admin-title">N.A.K. Admin</h1>
          <span
            className={`cycle-band ${isDraft ? "is-warning" : "is-positive"}`}
            aria-hidden="true"
          />
          <span
            className="text-xs"
            style={{
              color: "var(--muted-foreground)",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.08em",
            }}
            data-ocid="admin.canister_label"
          >
            {isDraft ? "DRAFT" : "LIVE"}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isAuthenticated && userPrincipalText && (
            <code
              className="hidden md:inline-block text-xs max-w-[16rem] truncate"
              style={{
                color: "var(--muted-foreground)",
                fontFamily: "var(--font-mono)",
              }}
              data-ocid="admin.identity"
            >
              {userPrincipalText}
            </code>
          )}
          <button
            type="button"
            onClick={() => void clear()}
            disabled={isLoggingIn}
            className="btn btn-secondary"
            data-ocid="admin.sign_out_button"
          >
            {isLoggingIn ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogOut className="w-4 h-4" />
            )}
            Sign out
          </button>
          <button
            type="button"
            onClick={onNavigateToMain}
            className="btn btn-secondary"
            data-ocid="admin.back_button"
          >
            <ArrowLeft className="w-4 h-4" />
            Main
          </button>
        </div>
      </header>

      {/* Session not ready banner — gates every admin control below */}
      {!isActorReady && (
        <div
          className="flex items-center gap-2 px-6 py-2 text-sm"
          style={{
            borderBottom: "1px solid var(--border)",
            color: "var(--muted-foreground)",
          }}
          data-ocid="admin.session_not_ready"
        >
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          Session not ready — admin controls are disabled until the actor is
          initialised with your identity.
        </div>
      )}

      {/* No encryption recipients — the store cannot take orders. Shown to
          every admin role (public query) as soon as the panel opens, not
          hidden behind a sub-tab. */}
      {isAuthenticated &&
        role &&
        encryptionRecipients !== undefined &&
        encryptionRecipients.length === 0 && (
          <div
            className="flex items-start gap-3 px-6 py-3"
            style={{
              background: "var(--nak-warning-soft)",
              borderBottom: "1px solid oklch(var(--admin-band-warning) / 0.45)",
            }}
            role="alert"
            data-ocid="admin.encryption_recipients_warning"
          >
            <ShieldAlert
              className="w-5 h-5 shrink-0 mt-0.5"
              style={{ color: "var(--nak-warning)" }}
            />
            <div className="flex flex-col gap-0.5 min-w-0">
              <p
                className="text-sm font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                Store not accepting orders
              </p>
              <p
                className="text-sm"
                style={{ color: "var(--muted-foreground)" }}
              >
                No encryption recipients are configured, so the store cannot
                take orders. Checkout is blocked for customers until at least
                one encryption recipient is configured.
              </p>
            </div>
          </div>
        )}

      {/* Tab bar */}
      <nav
        className="admin-tabs"
        aria-label="Admin sections"
        data-ocid="admin.tabs"
      >
        {visibleTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`admin-tab${resolvedTab === tab ? " is-active" : ""}`}
            onClick={() => setActiveTab(tab)}
            aria-current={resolvedTab === tab ? "page" : undefined}
            data-ocid={`admin.tab.${tab}`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </nav>

      {/* Active tab body */}
      <main className="px-6 py-6" data-ocid="admin.tab_body">
        {!isAuthenticated ? (
          <div className="admin-panel" data-ocid="admin.sign_in_state">
            <div className="admin-panel-body">
              <div className="flex items-center gap-3 mb-3">
                <ShieldAlert
                  className="w-5 h-5"
                  style={{ color: "var(--nak-warning)" }}
                />
                <h2 className="admin-panel-title">Sign in required</h2>
              </div>
              <p style={{ color: "var(--muted-foreground)" }}>
                Sign in with Internet Identity to get your principal and request
                admin access.
              </p>
            </div>
          </div>
        ) : roleLoading ? (
          <div
            className="flex items-center justify-center gap-3 py-16"
            style={{ color: "var(--muted-foreground)" }}
            data-ocid="admin.role_loading"
          >
            <Loader2 className="w-5 h-5 animate-spin" />
            Checking access…
          </div>
        ) : !role ? (
          <div className="admin-panel" data-ocid="admin.not_authorized_state">
            <div className="admin-panel-body">
              <div className="flex items-center gap-3 mb-3">
                <ShieldAlert
                  className="w-5 h-5"
                  style={{ color: "var(--nak-warning)" }}
                />
                <h2 className="admin-panel-title">Not authorized</h2>
              </div>
              <p style={{ color: "var(--muted-foreground)" }}>
                Your principal has no admin role, so you cannot view or change
                these settings.
              </p>

              {userPrincipalText && (
                <div
                  className="mt-5 flex flex-col gap-3 rounded-lg border p-4"
                  style={{ borderColor: "var(--border)" }}
                  data-ocid="admin.your_principal_panel"
                >
                  <div className="flex flex-col gap-1.5">
                    <span
                      className="text-xs"
                      style={{
                        color: "var(--muted-foreground)",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        fontWeight: 600,
                      }}
                    >
                      Your principal
                    </span>
                    <div className="flex items-center gap-2 min-w-0">
                      <code
                        className="admin-mono"
                        style={{ fontSize: "0.8125rem" }}
                        data-ocid="admin.your_principal"
                      >
                        {truncatePrincipal(userPrincipalText)}
                      </code>
                      <CopyButton
                        text={userPrincipalText}
                        label="Copy"
                        className="shrink-0"
                      />
                    </div>
                    <p
                      className="text-sm"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      Copy your principal and send it to an administrator to be
                      granted access.
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      This principal is specific to {window.location.origin}.
                    </p>
                  </div>
                </div>
              )}

              {isActorReady && adminCount === 0n && (
                <div
                  className="mt-5 flex flex-col gap-3 rounded-lg border p-4"
                  style={{ borderColor: "var(--border)" }}
                  data-ocid="admin.claim_admin_panel"
                >
                  <div className="flex flex-col gap-1">
                    <h3 className="admin-panel-title">Claim admin</h3>
                    <p
                      className="text-sm"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      This console has no owner yet. Claiming admin grants your
                      principal the highest role (OWNER) and unlocks the full
                      dashboard. This is a draft-only first-claim action.
                    </p>
                  </div>
                  <AdminConfirmDialog
                    tone="warning"
                    title="Claim admin as OWNER"
                    description="This grants your principal the OWNER role — the highest admin role with full control over this console. This is a draft-only first-claim action and cannot be undone."
                    confirmLabel="Claim admin"
                    cancelLabel="Cancel"
                    pending={claimAdmin.isPending}
                    onConfirm={() =>
                      void claimAdmin.mutateAsync(undefined, {
                        onSuccess: () => {
                          void queryClient.invalidateQueries({
                            queryKey: ["myRole"],
                          });
                        },
                      })
                    }
                    trigger={
                      <button
                        type="button"
                        className="btn btn-primary self-start"
                        data-ocid="admin.claim_admin_button"
                      >
                        Claim admin
                      </button>
                    }
                  />
                  {claimAdmin.isError && (
                    <p
                      className="text-sm"
                      style={{ color: "var(--nak-danger)" }}
                      data-ocid="admin.claim_admin_error"
                    >
                      {claimAdmin.error instanceof Error
                        ? claimAdmin.error.message
                        : "Could not claim admin. Please try again."}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : ActiveBody ? (
          <ActiveBody session={session} onNavigateToMain={onNavigateToMain} />
        ) : (
          <div className="admin-panel" data-ocid="admin.no_tabs_state">
            <div className="admin-panel-body">
              <p style={{ color: "var(--muted-foreground)" }}>
                No admin sections are available for your role.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
