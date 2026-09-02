import { Role } from "@/backend";
import { CopyButton } from "@/components/CopyButton";
import {
  adminErrorMessage,
  normalizePrincipalInput,
  useAdminCount,
  useGrantRole,
  useListUsers,
  useRevokeRole,
} from "@/hooks/useQueries";
import type { AdminTabBodyProps } from "@/types/routes";
import { Principal } from "@icp-sdk/core/principal";
import { Loader2, ShieldAlert, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { AdminConfirmDialog } from "./AdminConfirmDialog";
import { AdminPanel } from "./AdminPanel";
import { AdminStatCard } from "./AdminStatCard";
import { AdminTable } from "./AdminTable";

const ROLE_LABELS: Record<Role, string> = {
  [Role.owner]: "Owner",
  [Role.admin]: "Admin",
  [Role.staff]: "Staff",
};

interface UserRow {
  principal: Principal;
  role: Role;
  grantedAt: bigint;
}

function formatDate(ns: bigint): string {
  const date = new Date(Number(ns / 1_000_000n));
  if (Number.isNaN(date.getTime())) return "—";
  return date.toISOString().slice(0, 10);
}

/**
 * USERS tab — OWNER-only role management. Lists every principal with a role,
 * grants and revokes roles, and shows a prominent warning when only ONE owner
 * remains (so the operator never locks the console out of owner control).
 * Role changes are sensitive and pass through an explicit confirmation step.
 */
export function UsersTab({ session }: AdminTabBodyProps) {
  const { data: users, isLoading, error } = useListUsers();
  const { data: adminCount } = useAdminCount();
  const grantRole = useGrantRole();
  const revokeRole = useRevokeRole();

  const [principalInput, setPrincipalInput] = useState("");
  const [grantRoleValue, setGrantRoleValue] = useState<Role>(Role.staff);
  const [grantError, setGrantError] = useState<string | null>(null);

  const normalizedInput = normalizePrincipalInput(principalInput);

  const rows: UserRow[] = useMemo(
    () =>
      (users ?? []).map(([principal, record]) => ({
        principal,
        role: record.role,
        grantedAt: record.grantedAt,
      })),
    [users],
  );

  const ownerCount = useMemo(
    () => rows.filter((r) => r.role === Role.owner).length,
    [rows],
  );
  const adminCountValue = useMemo(
    () => rows.filter((r) => r.role === Role.admin).length,
    [rows],
  );
  const staffCount = useMemo(
    () => rows.filter((r) => r.role === Role.staff).length,
    [rows],
  );

  const canManage = session.canManageUsers;

  const handleGrant = () => {
    setGrantError(null);
    if (!normalizedInput) {
      setGrantError("Enter a principal to grant a role.");
      return;
    }
    let principal: Principal;
    try {
      principal = Principal.fromText(normalizedInput);
    } catch {
      setGrantError(
        "That is not a valid principal — check the text you pasted.",
      );
      return;
    }
    if (rows.some((row) => row.principal.toText() === principal.toText())) {
      setGrantError("That principal already has a role.");
      return;
    }
    grantRole.mutate(
      { principal, role: grantRoleValue },
      {
        onError: (err) => setGrantError(adminErrorMessage(err)),
        onSuccess: () => setPrincipalInput(""),
      },
    );
  };

  const handleRevoke = (principal: Principal) => {
    revokeRole.mutate(principal, {
      onError: (err) => setGrantError(adminErrorMessage(err)),
    });
  };

  const grantPending = grantRole.isPending;
  const revokePending = revokeRole.isPending;

  return (
    <div className="flex flex-col gap-4">
      {/* Prominent warning when only ONE owner exists */}
      {canManage && ownerCount === 1 && (
        <div
          className="flex items-start gap-3 p-4"
          style={{
            background: "var(--error-panel-bg)",
            border: "1px solid var(--error-panel-border)",
            borderRadius: "var(--radius)",
          }}
          data-ocid="admin.users.single_owner_warning"
        >
          <ShieldAlert
            className="w-5 h-5 shrink-0 mt-0.5"
            style={{ color: "var(--nak-warning)" }}
          />
          <div>
            <p
              className="font-medium"
              style={{ color: "var(--foreground)", fontSize: "0.875rem" }}
            >
              Only one owner remains
            </p>
            <p
              style={{
                color: "var(--muted-foreground)",
                fontSize: "0.8125rem",
              }}
            >
              There is exactly one OWNER principal. Revoking or demoting this
              account would leave the console without owner control. Grant
              another owner before making changes.
            </p>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="admin-stat-grid" data-ocid="admin.users.stats">
        <AdminStatCard label="Total users" value={rows.length} />
        <AdminStatCard
          label="Owners"
          value={ownerCount}
          band={ownerCount === 1 ? "warning" : "positive"}
        />
        <AdminStatCard label="Admins" value={adminCountValue} />
        <AdminStatCard label="Staff" value={staffCount} />
        <AdminStatCard label="Admin principals" value={adminCount ?? 0n} />
      </div>

      {/* Grant role */}
      <AdminPanel
        title="Grant role"
        actions={
          <span
            className="text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            OWNER only
          </span>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="field-label" htmlFor="users-grant-principal">
              Principal
            </label>
            <input
              id="users-grant-principal"
              className="field-input"
              placeholder="aaaaa-aaaaa-aaaaa-aaaaa-aaa"
              value={principalInput}
              onChange={(e) => setPrincipalInput(e.target.value)}
              disabled={!canManage}
              data-ocid="admin.users.grant_principal_input"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="field-label" htmlFor="users-grant-role">
              Role
            </label>
            <select
              id="users-grant-role"
              className="field-input"
              value={grantRoleValue}
              onChange={(e) => setGrantRoleValue(e.target.value as Role)}
              disabled={!canManage}
              data-ocid="admin.users.grant_role_select"
            >
              <option value={Role.owner}>Owner</option>
              <option value={Role.admin}>Admin</option>
              <option value={Role.staff}>Staff</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <AdminConfirmDialog
              trigger={
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!canManage || !normalizedInput}
                  data-ocid="admin.users.grant_button"
                >
                  <UserPlus className="w-4 h-4" />
                  Grant role
                </button>
              }
              title="Grant role"
              description={`Grant ${ROLE_LABELS[grantRoleValue]} to ${normalizedInput || "this principal"}? This changes the account's access immediately.`}
              confirmLabel="Grant role"
              cancelLabel="Cancel"
              tone="warning"
              onConfirm={handleGrant}
              pending={grantPending}
              disabled={!canManage || !normalizedInput}
            />
            {grantPending && <Loader2 className="w-4 h-4 animate-spin" />}
          </div>
          {grantError && (
            <div className="error-panel" data-ocid="admin.users.grant_error">
              {grantError}
            </div>
          )}
        </div>
      </AdminPanel>

      {/* Users table */}
      <AdminPanel
        title="Users"
        actions={
          <span
            className="text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            {rows.length} principal{rows.length === 1 ? "" : "s"}
          </span>
        }
      >
        {isLoading ? (
          <div
            className="flex items-center gap-3 py-8"
            style={{ color: "var(--muted-foreground)" }}
            data-ocid="admin.users.loading_state"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading users…
          </div>
        ) : error ? (
          <div className="error-panel" data-ocid="admin.users.error_state">
            {adminErrorMessage(error)}
          </div>
        ) : (
          <AdminTable<UserRow>
            columns={[
              {
                key: "principal",
                header: "Principal",
                render: (row) => (
                  <div className="flex items-center gap-2 min-w-0">
                    <code className="admin-mono">{row.principal.toText()}</code>
                    <CopyButton
                      text={row.principal.toText()}
                      label="Copy"
                      className="shrink-0"
                    />
                  </div>
                ),
              },
              {
                key: "role",
                header: "Role",
                render: (row) => (
                  <span
                    className={`status-pill ${
                      row.role === Role.owner
                        ? "status-pill-warning"
                        : row.role === Role.admin
                          ? "status-pill-positive"
                          : "status-pill-neutral"
                    }`}
                  >
                    {ROLE_LABELS[row.role]}
                  </span>
                ),
              },
              {
                key: "grantedAt",
                header: "Granted",
                render: (row) => (
                  <span className="num">{formatDate(row.grantedAt)}</span>
                ),
              },
              {
                key: "actions",
                header: "Actions",
                render: (row) => (
                  <AdminConfirmDialog
                    trigger={
                      <button
                        type="button"
                        className="btn-sweep"
                        disabled={!canManage || revokePending}
                        data-ocid="admin.users.revoke_button"
                      >
                        Revoke
                      </button>
                    }
                    title="Revoke role"
                    description={`Revoke ${ROLE_LABELS[row.role]} from ${row.principal.toText()}? This removes the account's admin access immediately.`}
                    confirmLabel="Revoke role"
                    cancelLabel="Cancel"
                    tone="negative"
                    onConfirm={() => handleRevoke(row.principal)}
                    pending={revokePending}
                    disabled={!canManage}
                  />
                ),
              },
            ]}
            rows={rows}
            rowKey={(row) => row.principal.toText()}
            emptyMessage="No users have roles yet. Grant a role to a principal above."
          />
        )}
      </AdminPanel>
    </div>
  );
}
