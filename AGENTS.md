# Project Guidance

## User Preferences

- Frontend-only changes must not touch src/backend.
- Do not delete component, hook, or type files when hiding features — leave them in the repo unimported so the change is reversible.
- Do not modify admin surfaces (AdminDashboard, AdminTabShell, AdminSettingsPage, RecoveryPage, components/admin/) or types/routes.ts.
- Keep the Sign in / Sign out buttons in Navigation (desktop and mobile) — the admin dashboard depends on them.

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
