# Project Guidance

## User Preferences

- Frontend-only changes must not touch src/backend.
- Do not delete component, hook, or type files when hiding features — leave them in the repo unimported so the change is reversible.
- Do not modify admin surfaces (AdminDashboard, AdminTabShell, AdminSettingsPage, RecoveryPage, components/admin/) or types/routes.ts.
- Keep the Sign in / Sign out buttons in Navigation (desktop and mobile) — the admin dashboard depends on them.
- Deploy to the DRAFT only unless the user asks to publish.

## Verified Commands

- **typecheck**: `mops check --fix`
- **build**: `mops build`

## Learnings

- Verified commands from src/frontend/: `pnpm typecheck && pnpm fix && pnpm build` all pass cleanly for this project.
- Removing a page union member from App.tsx requires also narrowing the cast passed to Navigation's currentPage prop, or typecheck fails on the widened union.
- Tailwind arbitrary breakpoint variants like min-[860px]:order-1 work for reordering grid children on mobile while preserving desktop order.
- Verified commands from src/frontend/: pnpm typecheck && pnpm fix && pnpm build all pass cleanly for this project.
- Static Open Graph and Twitter Card meta tags belong directly in src/frontend/index.html <head> as plain HTML — X/social crawlers do not run JavaScript, so never inject them from React.
- src/frontend/index.html is the only index.html in the project; its <head> order is charset, viewport, title, description, og:title, og:description, og:type, twitter:card, then favicon/apple-touch-icon links.
- Admin Orders surface is src/frontend/src/components/admin/OrdersTab.tsx; owner-only gating uses AdminSession.canManageUsers, admin/owner uses canManage.
- AdminOrderDetail (src/backend/types/crypto-payments.mo) is the admin detail type; extending it requires populating every new field in buildAdminOrderDetail (src/backend/lib/crypto-payments.mo) and updating the mock in src/frontend/src/mocks/backend.ts.
- adminWipeAllOrders lives in src/backend/mixins/admin-orders-api.mo, is owner-only, refuses unless confirm == 'DELETE ALL ORDERS', releases pending stock reservations, and refuses with unswept order references when crypto funds are unswept.
- Verified backend commands: mops check --fix, mops build; refresh bindings from project root with pnpm bindgen.
- Verified frontend commands from src/frontend/: pnpm typecheck && pnpm fix && pnpm build.
- Admin CSV export decrypts per-row with decryptShipping(blob, adminPrincipal, backend); the admin's own principal comes from useInternetIdentity().identity?.getPrincipal().toText() inside OrdersTab, so no AdminSession change is needed.
- buildOrdersCsv in src/frontend/src/components/admin/OrdersTab.tsx is async (Promise.all over rows) to await per-row decryption; each row's shipping cells are failure-isolated so one bad blob cannot abort the export.
- ShippingPayload {name,email,line1,line2?,city,region,postal_code,country} has no phone field, so a 'Shipping phone' CSV column is always empty.
