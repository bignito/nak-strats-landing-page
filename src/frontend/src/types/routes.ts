import type { Role } from "@/backend";

export type Page =
  | "main"
  | "artist"
  | "metatheatre"
  | "shop"
  | "product"
  | "cart"
  | "checkout"
  | "success"
  | "cancelled"
  | "orderlookup"
  | "myorders"
  | "admin"
  | "adminrecovery"
  | "unsubscribe";

/* ============================================================
   Admin tabbed dashboard — shared contracts consumed by the
   admin page tasks (OVERVIEW, CANISTER, TREASURY, ORDERS,
   PRODUCTS, SUBMISSIONS, USERS, SETTINGS). The foundation owns
   the shell + routing; each tab body is built by a page task and
   registered in the AdminTabRegistry.
   ============================================================ */

/** The 9 admin tabs, in display order. */
export type AdminTabId =
  | "overview"
  | "canister"
  | "treasury"
  | "orders"
  | "products"
  | "categories"
  | "submissions"
  | "users"
  | "settings";

/** Role-based capability flags derived from the caller's role. */
export interface AdminSession {
  /** Actor exists AND not mid-rebuild AND an identity is attached. */
  isActorReady: boolean;
  /** An Internet Identity is attached (not anonymous). */
  isAuthenticated: boolean;
  /** The caller's own role, or null when they have none. */
  role: Role | null;
  /** True while the role query is still loading. */
  roleLoading: boolean;
  /** STAFF and above: can view orders and fulfil (ship). */
  canFulfil: boolean;
  /** ADMIN and above: can see every tab except USERS management. */
  canManage: boolean;
  /** OWNER only: can manage users/roles. */
  canManageUsers: boolean;
}

/** Props every admin tab body receives from the shell. */
export interface AdminTabBodyProps {
  session: AdminSession;
  onNavigateToMain: () => void;
}

/** Maps a tab id to its body component. Page tasks register their body here. */
export type AdminTabRegistry = Record<
  AdminTabId,
  React.ComponentType<AdminTabBodyProps>
>;
