# Design Brief

## Direction

NAK STRATS — premium fragrance storefront with a restructured 4-group desktop nav, a pixel-art shell mascot brand mark, a shop product grid, and a 3-step crypto checkout, all on the existing purple/teal/pink-on-black liquid-glass identity.

## Tone

Dark, premium, confident — the established NAK Strat identity carried forward exactly; no new colours or typefaces.

## Differentiation

A pixel-art shell mascot (always crisp-pixelated) as the brand mark across nav/hero/footer, plus a colour-coded checkout countdown and mono amounts that make the crypto payment window legible at a glance.

## Color Palette

| Token       | Value        | Role                                   |
| ----------- | ------------ | -------------------------------------- |
| background  | #000000      | deep black base (existing)             |
| foreground  | #ffffff      | primary text (existing)                |
| primary     | #8b5cf6      | purple brand / current step / hover    |
| accent      | #06b6d4      | teal — highlights, hairline            |
| pink        | #ec4899      | cart badge, critical stock             |
| success     | #34d399      | completed steps, copy-confirmed        |
| warning     | #fbbf24      | countdown < 5min, ledger dot           |
| destructive | #f87171      | sold out, countdown < 1min             |
| mono        | JetBrains Mono | prices, amounts, addresses, order IDs |

## Typography

- Display: Oswald (existing) — headings, wordmark, section titles
- Body: Inter (existing) — nav items, labels, buttons, pills
- Mono: JetBrains Mono (existing) — prices, amount owed, deposit address, order IDs
- Scale: h1 gradient hero, h2 section titles, nav item 0.8125rem, amount owed 1.75rem mono, pills 0.6875rem

## Elevation & Depth

Liquid-glass `.card`/`.glass-card` panels above flat black; hero shell gets a soft purple radial glow; deposit address sits in a dark inset well; shop cards lift `translateY(-3px)` with a purple border on hover.

## Structural Zones

| Zone        | Background         | Border            | Notes                                   |
| ----------- | ------------------ | ----------------- | --------------------------------------- |
| Header      | `.nav-sticky` glass | purple→teal hairline | 4 dropdown groups + Cart badge + Admin |
| Hero        | flat black         | —                 | shell mascot ~160px, glow + drift       |
| Shop grid   | flat black         | —                 | `.shop-card` auto-fill 15rem, 1.25rem gap |
| Checkout    | flat black + glass | —                 | 3-step indicator, 2-col → 1-col <820px |
| Deposit     | `.deposit-surface` | purple/teal edge  | address well, QR, countdown, ledger dot |
| Footer      | existing           | existing          | small 50% opacity shell                 |

## Spacing & Rhythm

Section gaps `py-12`/`py-16`; shop grid `repeat(auto-fill, minmax(15rem,1fr))` with `1.25rem` gap; nav items `0.5rem 0.75rem` padding; tight `gap-3` in checkout panels; micro `gap-2` for status rows.

## Component Patterns

- Buttons: `.btn` smoky glass; primary CTA purple gradient; `.add-to-cart` full-width purple; `.admin-icon-btn` icon-only
- Cards: `.shop-card` rounded-2xl glass, hover lift + purple border; `.card`/`.glass-card` standard
- Badges: `.cart-badge` pink pill; `.inventory-pill` pink/amber 'N left', red 'Sold out'; status chips success/warning/destructive
- Steps: `.checkout-step` with teal/green done, purple current, muted upcoming
- Deposit: `.deposit-address-well` dark inset mono; `.ledger-dot` pulsing amber

## Motion

- Entrance: existing `animate-fade-in-up` on panels
- Hover: card lift `translateY(-3px)` + purple border; button brightness lift
- Decorative: `.shell-drift` 6s ease-in-out (translateY -14px, ±1.5deg) on hero shell; `ledger-pulse` amber dot; `countdown-pulse` timer
- Reduced motion: `prefers-reduced-motion` disables shell-drift and ledger-pulse

## Constraints

- Do NOT modify existing page layout or section order; keep BubbleBackground emoji rain untouched
- Use ONLY existing tokens — no new colours or typefaces
- Pixel-art shell always `image-rendering: pixelated`, never smooth-scaled
- Hide ICP entirely; ckUSDC enabled by default
- Do NOT build product detail modal, search/filter, Stripe, email receipts, or per-account history
- Nav collapses to mobile hamburger at 900px; dropdowns close on outside click / Escape with aria-expanded

## Signature Detail

The pixel-art shell mascot drifting above a purple radial glow in the hero, echoed as a crisp nav brand mark and a ghosted 50% footer shell — a cohesive, unmistakably NAK Strat mascot system.
