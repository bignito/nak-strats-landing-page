# Design Brief

## Direction

New Age Kapital storefront — the institutional rebrand (stage 2: shop/product/cart) extended to the full purchase flow and admin (stage 3: checkout, deposit, success, cancelled, order lookup, admin). A restrained, editorial dark system built on 1px hairlines, tabular mono figures, and a single restrained purple accent. No pink, no glows, no pills.

## Tone

Institutional and restrained — deep near-black surfaces, 1px hairlines instead of glows, white-on-dark primary actions, purple reduced to a subtle accent for active selections, current-step rings, and tab underlines.

## Differentiation

A disciplined "fragrance house ledger" across the whole storefront: every price, amount, address, order reference, balance and cycle figure set in JetBrains Mono with tabular-nums so digits align; the checkout as a two-column ledger with a sticky order summary; the admin as a dense working table with 1px row dividers and right-aligned mono numerics.

## Color Palette

| Token            | OKLCH         | Role                                  |
| ---------------- | ------------- | ------------------------------------- |
| background       | 0.04 0.003 250 | #08090a base                          |
| card / surface   | 0.06 0.003 250 | #0e1011 panels, cells                 |
| surface-hover    | 0.08 0.003 250 | #141719 cell/row hover                |
| border           | 0.16 0.003 250 | hairline rgba(255,255,255,0.09)       |
| border-strong    | 0.25 0.003 250 | strong hairline rgba(255,255,255,0.16)|
| foreground       | 0.95 0.002 250 | #f4f4f5 primary text                  |
| secondary-foreground | 0.68 0.005 250 | #a1a1aa secondary text            |
| muted-foreground | 0.48 0.006 250 | #8a8a93 muted / section labels        |
| primary (purple) | 0.55 0.19 296 | #8b5cf6 active select, current ring, tab underline |
| positive         | 0.62 0.13 165 | #10b981 paid / completed check        |
| warning          | 0.77 0.15 85  | #fbbf24 countdown, ledger dot          |
| negative         | 0.62 0.19 25  | #ef4444 errors / failed / destructive |

## Typography

- Display: Oswald — wordmark only, in nav (NOT used on storefront/flow pages)
- Body/Headings: Inter — weight 500, letter-spacing -0.015em on headings
- Mono: JetBrains Mono — ALL amounts, addresses, order references, balances, cycle figures, totals with `font-variant-numeric: tabular-nums` (`.num` / `.mono-num`)
- Labels: 0.6875rem, uppercase, letter-spacing 0.16em, weight 600, muted (`.section-label`)
- Deposit amount owed: mono ~1.75rem, primary text, largest element on screen

## Elevation & Depth

Flat near-black surfaces separated by 1px hairlines and dividers; no glows, no drop-shadows, no scale transforms. Depth comes from surface alternation (background → card → surface-hover) and border-strong for interactive edges; the deposit address well is an inset dark well with an inner shadow.

## Structural Zones

| Zone            | Background  | Border            | Notes                                  |
| --------------- | ----------- | ----------------- | -------------------------------------- |
| Checkout        | background  | —                 | two-col desktop / single below 820px   |
| Checkout form   | background  | —                 | left column, fields on card            |
| Order summary   | card        | 1px border        | right column, sticky, mono totals      |
| Deposit screen  | background  | —                 | amount owed largest, countdown top-right |
| Deposit address | #08090a     | 1px inset border  | inset well, mono wrap, copy + QR       |
| Success/Cancelled | background | —               | minimal, calm, centered                |
| Order lookup    | background  | —                 | single input + primary button          |
| Lookup result   | card        | 1px border        | bordered panel, status pills, mono totals |
| Admin           | background  | —                 | dense tables, 1px row dividers, no cards |

## Spacing & Rhythm

Containers `max-w-7xl`; checkout two columns with 1.5rem gap; form fields 1px border with 0.625rem padding and 0.5rem label gap; tables 0.625rem/0.875rem cell padding; section gaps `py-12`/`py-16`; admin favours density — tighter 0.5rem/0.75rem cell padding, no whitespace padding around tables.

## Component Patterns

- Buttons: 0.25rem radius. Primary white bg + dark (#08090a) text — loudest control. Secondary transparent + 1px border-strong
- Step indicator: 3 steps, 1.5rem circles; completed = positive check, current = purple ring, upcoming = muted; 1px connectors between
- Form fields: card bg, 1px border, purple focus border; muted uppercase label above each field
- Payment method: two bordered cells side by side; selected gets purple border + surface-hover bg, no glow
- Deposit: amount owed mono 1.75rem; countdown top-right mono shifting muted→warning→negative; inset address well with copy (confirms positive check ~1.8s); QR encodes same string; warning pulsing ledger dot; prominent mono order reference
- Status pill: small bordered pill, colour by state (positive paid / warning awaiting / muted expired / negative failed)
- Admin tabs: 2px purple underline on active tab
- Admin tables: 1px row dividers, no cards; numeric columns JetBrains Mono tabular right-aligned
- Confirmation steps: bordered confirmation for sweep/remove-admin/edit-price before firing
- Error text: full-length negative-colour, never truncated or summarised

## Motion

- Entrance: subtle `fade-in-up` on panels (kept minimal)
- Hover: surface-hover background; purple border on active cells
- Ledger dot: warning-colour pulse (1.6s)
- Copy confirm: positive check shown ~1.8s then reverts
- Decorative: none — no glows, no pulse on buttons, no scale transforms

## Constraints

- Presentation only — no backend logic, payment flows, verification, sweep logic, or access control changes
- Consume existing `--nak-*` / institutional tokens; no hardcoded or new colours
- PINK retired across the entire app; dead pink tokens removed once nothing references them
- Inter 500 headings (-0.015em); JetBrains Mono tabular for all amounts/addresses/refs/balances/cycles
- Deposit address never truncated — full ICRC-1 account including subaccount suffix, displayed/copied/selectable
- Hairlines instead of glows; buttons 0.25rem radius, not pills
- No email promise on success unless email is configured and actually sending
- Awaiting-payment unexpired orders resume to the live deposit screen with correct remaining time
- Admin payment token shows only 'set' / 'not set', never the stored value
- doNotBuild: printable order receipt for paid orders

## Signature Detail

A restrained "fragrance house ledger" across the whole purchase flow: the checkout as a two-column ledger with sticky mono order summary, the deposit screen with a single oversized mono amount owed and an inset full-address well, and a dense admin table where every figure snaps into alignment in JetBrains Mono tabular numerals.
