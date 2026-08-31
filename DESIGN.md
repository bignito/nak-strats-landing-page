# Design Brief

## Direction

New Age Kapital — institutional rebrand across storefront and admin. A restrained, editorial dark system on #08090a / #0e1011, 1px hairlines, JetBrains Mono tabular numerics, single purple accent. The admin is the same language compressed into a dense, tabbed operations console.

## Tone

Institutional and restrained — deep near-black surfaces, hairlines instead of glows, white-on-dark primary actions, purple reduced to active selections and tab underlines. Admin is a dense ops tool: no emoji, no decoration, maximum information density.

## Differentiation

A "fragrance house ledger" everywhere: every price, address, order ref, balance and cycle figure set in JetBrains Mono tabular-nums so digits align; the admin as a full-width tabbed console where cycle health reads at a glance through green/amber/red bands and a segmented gauge.

## Color Palette

| Token            | OKLCH         | Role                                   |
| ---------------- | ------------- | -------------------------------------- |
| background       | 0.04 0.003 250 | #08090a base                          |
| card / surface   | 0.06 0.003 250 | #0e1011 panels, cells                 |
| surface-hover    | 0.08 0.003 250 | #141719 row/cell hover                |
| border           | 0.16 0.003 250 | hairline rgba(255,255,255,0.09)       |
| border-strong    | 0.25 0.003 250 | strong hairline                       |
| foreground       | 0.95 0.002 250 | #f4f4f5 primary text                  |
| secondary-foreground | 0.68 0.005 250 | #a1a1aa secondary text             |
| muted-foreground | 0.48 0.006 250 | #8a8a93 labels                        |
| primary (purple) | 0.55 0.19 296 | #8b5cf6 active tab underline, ring    |
| positive band    | 0.62 0.13 165 | #10b981 green cycle band              |
| warning band     | 0.77 0.15 85  | #fbbf24 amber cycle band              |
| negative band    | 0.62 0.19 25  | #ef4444 red cycle band                |

## Typography

- Display: Oswald — wordmark only (nav)
- Body/Headings: Inter — weight 500, -0.015em on headings
- Mono: JetBrains Mono — ALL numbers with tabular-nums (.num / .mono-num / .admin-stat-value)
- Labels: 0.6875rem uppercase 0.16em weight 600 muted (.section-label / .admin-tab / .admin-stat-label)

## Elevation & Depth

Flat near-black surfaces separated by 1px hairlines; no glows, no drop-shadows, no scale transforms. Depth from surface alternation (background → card → surface-hover) and border-strong on interactive edges; the gauge track is a recessed inset well.

## Structural Zones

| Zone          | Background  | Border           | Notes                                  |
| ------------- | ----------- | ---------------- | -------------------------------------- |
| Storefront    | background  | —                | nav glass bar, hero, shop lattice      |
| Checkout      | background  | —                | two-col ledger, sticky mono summary    |
| Admin shell   | background  | —                | full-width ops surface, no max-width   |
| Admin header  | card        | 1px border-b     | sticky top bar, title + actions        |
| Admin tabs    | background  | 1px border-b     | sticky, 8 tabs, 2px purple underline   |
| Stat cards    | card        | 1px lattice      | 1px gap grid, mono figures, band edges |
| Cycle gauge   | inset track | 1px border       | recessed, green/amber/red segments     |
| Admin tables  | background  | 1px row dividers | dense cells, right-aligned mono nums   |

## Spacing & Rhythm

Storefront containers max-w-7xl; admin is full-width with 1.5rem gutter. Stat grid 1px gap lattice; tables 0.375rem/0.625rem dense cells; panels 0.875rem/1rem padding; tab gap 1.75rem; storefront sections py-12/py-16, admin keeps tight py-6.

## Component Patterns

- Buttons: 0.25rem radius. Primary white bg + dark text; secondary transparent + 1px border-strong; admin actions compact 0.75rem color-coded (btn-recheck/sweep/email/shipped/export)
- Tabs: 8-tab bar (OVERVIEW, CANISTER, TREASURY, ORDERS, PRODUCTS, SUBMISSIONS, USERS, SETTINGS); active = foreground + 2px purple underline (.admin-tab.is-active)
- Stat cards: 1px lattice grid, mono 1.25rem value, optional 2px left band (positive/warning/negative)
- Cycle gauge: 0.375rem recessed track, colour fill/segments by band
- Tables: admin-table (0.625/0.875) and admin-table-dense (0.375/0.625); numeric columns JetBrains Mono tabular right-aligned
- Status pill: bordered 0.25rem radius, colour by state (positive/warning/negative/muted/neutral)

## Motion

- Entrance: subtle fade-in-up on panels (minimal)
- Hover: surface-hover background; purple border on active cells
- Ledger dot: warning-colour pulse (1.6s)
- Decorative: none on admin — no glows, no button pulse, no scale transforms

## Constraints

- Presentation only — no backend logic, payment, sweep, or access-control changes
- Consume existing --nak-* / institutional tokens; no hardcoded or new colours
- Admin is a dense operations tool — no emoji anywhere on admin
- Do NOT change main page or storefront styling; admin extends the NAK language
- Inter 500 headings; JetBrains Mono tabular for all amounts/refs/balances/cycles
- Hairlines instead of glows; 0.25rem radius buttons, not pills
- Admin payment token shows only 'set' / 'not set', never the stored value

## Signature Detail

The admin as a full-width tabbed operations console: eight uppercase tabs with a 2px purple underline, stat cards where every figure snaps into JetBrains Mono tabular alignment, and a recessed cycle gauge whose green/amber/red segments make treasury health legible at a glance.
