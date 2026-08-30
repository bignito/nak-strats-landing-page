# Design Brief

## Direction

NAK Strat Crypto Checkout — extend the established NAK Strat storefront with a native crypto checkout and deposit flow (shop grid, cart, token selection, deposit address/amount/QR/countdown, order lookup, admin settings) on the existing purple/teal/pink-on-black liquid-glass language.

## Tone

Dark, premium, confident — the existing NAK Strat identity carried forward unchanged; new screens feel native, not bolted on.

## Differentiation

Crypto-native clarity inside the NAK Strat aesthetic: monospace deposit addresses on raised liquid-glass panels, teal-selected token cards, and a color-coded 30-minute countdown (idle → amber → red) that makes the payment window legible at a glance.

## Color Palette

| Token            | Value        | Role                                   |
| ---------------- | ------------ | -------------------------------------- |
| background       | #000000      | deep black base (existing)             |
| foreground       | #ffffff      | primary text (existing)                |
| card / glass     | glass vars   | liquid-glass panels (existing)         |
| primary          | #8b5cf6      | purple CTA / brand (existing)          |
| accent           | #06b6d4      | teal — selected token, highlights      |
| pink             | #ec4899      | secondary accent (existing)            |
| success          | #34d399      | paid / confirmed status (new)          |
| warning          | #fbbf24      | countdown / expiring (new)             |
| destructive      | #f87171      | errors / failed (new)                  |
| mono             | JetBrains Mono | addresses, amounts, QR-safe copy (new) |

## Typography

- Display: Oswald (existing) — headings, section titles, amounts
- Body: Inter (existing) — labels, body, buttons
- Mono: JetBrains Mono (new) — deposit address, token amounts, order IDs
- Scale: page title `h2` gradient, section label `text-sm uppercase tracking-widest`, body `text-base`, mono `text-sm`

## Elevation & Depth

Raised `.deposit-surface` panels sit above flat black with a purple/teal top-edge highlight; `.card`/`.glass-card` remain the standard surfaces; selected token cards get a teal ring + soft glow.

## Structural Zones

| Zone           | Background            | Border            | Notes                                   |
| -------------- | --------------------- | ----------------- | --------------------------------------- |
| Header         | existing `.nav-sticky`| existing          | untouched                               |
| Shop grid      | flat black            | —                 | `.card` grid, 1/2/3 cols                |
| Checkout       | flat black + glass    | —                 | token cards + summary panel             |
| Deposit        | `.deposit-surface`    | purple/teal edge  | address, amount, QR, countdown          |
| Admin settings | `.card`               | glass             | warning banners for unset values        |
| Footer         | existing              | existing          | untouched                               |

## Spacing & Rhythm

Section gaps `py-12`/`py-16`; card grids `gap-6`; deposit panel `p-6 md:p-8`; tight `gap-3` between address/amount/QR; micro-spacing `gap-2` for status rows.

## Component Patterns

- Buttons: existing `.btn` smoky glass; primary CTA uses purple border, disabled/hidden states for ICP
- Cards: `.card`/`.glass-card` with `rounded-2xl`; token options use `.token-option` + `.token-option-selected`
- Badges: pill status chips — `.bg-success-soft text-success`, `.bg-warning-soft text-warning`, `.bg-destructive-soft text-destructive`
- Deposit panel: `.deposit-surface` with copy-to-clipboard address and QR

## Motion

- Entrance: existing `animate-fade-in-up` on panels
- Hover: existing card lift + glass shimmer
- Decorative: `countdown-pulse` on the timer when < 5 min; existing `nak-glow` ambient orbs

## Constraints

- Do NOT modify any existing page, token, class, or animation
- Reuse `.card`/`.glass-card` and the `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` pattern
- Do NOT build Stripe, ICP-with-oracle, email receipts, per-account history, or add-to-cart/cart drawer
- Disable/hide ICP token unless a rate oracle is configured; ckUSDC enabled by default
- Ledger canister IDs and treasury principal configurable at runtime (admin), never hardcoded
- Fully responsive desktop / tablet / mobile

## Signature Detail

Monospace deposit address on a raised liquid-glass panel with a live teal-ringed token selection and a color-coded countdown — crypto-native clarity that stays unmistakably NAK Strat.
