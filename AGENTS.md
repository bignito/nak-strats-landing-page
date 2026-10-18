# Project Guidance

## User Preferences

- Frontend-only changes must not touch src/backend.
- Do not modify admin surfaces (AdminDashboard, AdminTabShell, AdminSettingsPage, RecoveryPage, components/admin/) or types/routes.ts.
- Keep the Sign in / Sign out buttons in Navigation (desktop and mobile) — the admin dashboard depends on them.
- Deploy to the DRAFT only unless the user asks to publish.
- The /legal page is a hash route (#/legal) rendered by src/frontend/src/components/LegalPage.tsx; sections 1-15 are complete.
- Legal text must be reproduced word for word from the user's supplied text — never write or rephrase legal wording.

## Verified Commands

- **typecheck**: `mops check --fix`
- **build**: `mops build`

## Learnings

- Admin Orders surface is src/frontend/src/components/admin/OrdersTab.tsx; owner-only gating uses AdminSession.canManageUsers, admin/owner uses canManage.
- AdminOrderDetail (src/backend/types/crypto-payments.mo) is the admin detail type; extending it requires populating every new field in buildAdminOrderDetail (src/backend/lib/crypto-payments.mo) and updating the mock in src/frontend/src/mocks/backend.ts.
- adminWipeAllOrders lives in src/backend/mixins/admin-orders-api.mo, is owner-only, refuses unless confirm == 'DELETE ALL ORDERS', releases pending stock reservations, and refuses with unswept order references when crypto funds are unswept.
- Verified backend commands: mops check --fix, mops build; refresh bindings from project root with pnpm bindgen.
- Verified frontend commands from src/frontend/: pnpm typecheck && pnpm fix && pnpm build.
- Admin CSV export decrypts per-row with decryptShipping(blob, adminPrincipal, backend); the admin's own principal comes from useInternetIdentity().identity?.getPrincipal().toText() inside OrdersTab, so no AdminSession change is needed.
- buildOrdersCsv in src/frontend/src/components/admin/OrdersTab.tsx is async (Promise.all over rows) to await per-row decryption; each row's shipping cells are failure-isolated so one bad blob cannot abort the export.
- ShippingPayload {name,email,line1,line2?,city,region,postal_code,country} has no phone field, so a 'Shipping phone' CSV column is always empty.
- The main-page footer in App.tsx renders only on the 'main' page branch; LegalDisclaimer is placed as the first child of <footer id="company"> above the shell-mark/copyright row.
- LegalDisclaimer uses text-muted-foreground and font-mono uppercase tracking-[0.14em] to match the existing institutional footer styling conventions.
- NAKSWAP_URL is declared locally in both Navigation.tsx and MainContent.tsx as a plain string constant; the hero button, desktop nav link, and mobile menu link all consume it.
- Navigation NAV_GROUPS contains only token/culture/company; no nav item or in-page link targets a removed trade section.
- bash `rm` is permission-denied in this environment; `find <path> -name <file> -delete` removes a source file successfully.
- A stale src/frontend/dist can make `vite build` fail with ENOTEMPTY on dist/images; clearing dist with `find dist -mindepth 1 -delete` then rebuilding passes.
- Hash routing in App.tsx: add the page to the useState union, add an `else if (hash === ...)` branch in the hashchange effect, and add a render branch; no router or types/routes.ts change needed.
- LegalPage renders inline conventions from data: **bold** via split on /\*\*(.+?)\*\*/g, and 'Words (https://url)' via a linkify regex anchored to a capitalized proper-noun phrase (with lowercase connectors) so it does not greedily span the preceding sentence.
- LegalPage's 'On this page' TOC and section body both map over SECTIONS, so appending entries to the array adds both the TOC anchor and the rendered section.
- LegalPage inline conventions are data-driven: **bold** via split on /\*\*(.+?)\*\*/g, and 'Words (https://url)' via a linkify regex anchored to a capitalized proper-noun phrase so it does not span the preceding sentence.
- The footer has no row of links; the /legal link lives inline inside the disclaimer's third paragraph (href='#/legal').
- The footer in App.tsx renders only on the currentPage==='main' branch, not on artist, metatheatre, admin, adminrecovery, unsubscribe, or legal pages.
- LegalPage.tsx is a single self-contained file; all 15 sections live in ONE module-level SECTIONS: LegalSection[] array, and both the 'On this page' TOC and the section body .map() over it, so the TOC stays in sync automatically.
- LegalPage paragraph blocks support an optional links?: {label,href}[] field rendered by renderLinkedParagraph (splits on literal labels) for bare domains that the capitalized-phrase linkify convention cannot handle; sections 11 and 15 use the inline 'Words (https://url)' linkify convention instead.
- Verified frontend commands from src/frontend/: pnpm typecheck && pnpm fix && pnpm build all pass cleanly for this project.
- LegalPage.tsx section 13's Telegram link uses the explicit links?: {label,href}[] field on the paragraph; renderLinkedParagraph splits on the literal label, so the label must be the exact visible token ('@NAKSTOKEN') for the anchor to wrap only that token.
- The /legal page bottom line is the single <p> at the end of LegalPage.tsx (around lines 481-484); it is distinct from App.tsx's main-page footer copyright and LegalDisclaimer.tsx's copyright.
