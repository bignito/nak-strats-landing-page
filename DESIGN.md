# Design Brief

## Direction

New Age Kapital — institutional rebrand of the NAK main page: a restrained, editorial dark system built on hairlines, tabular mono figures, and a single restrained purple accent, with the pixel shell demoted to a quiet brand mark.

## Tone

Institutional and restrained — deep near-black surfaces, 1px hairlines instead of glows, white-on-dark primary actions, and purple/teal/pink reduced to subtle accents, never the subject.

## Differentiation

A disciplined "trading terminal" discipline: every number set in JetBrains Mono with tabular-nums so figures align as they tick, Oswald confined to the wordmark, and one 2px purple underline as the only decorative flourish.

## Color Palette

| Token            | OKLCH         | Role                                  |
| ---------------- | ------------- | ------------------------------------- |
| background       | 0.04 0.003 250 | #08090a base                          |
| card / surface   | 0.06 0.003 250 | #0e1011 container                     |
| surface-hover    | 0.08 0.003 250 | #141719 hover                         |
| border           | 0.16 0.003 250 | hairline rgba(255,255,255,0.09)       |
| border-strong    | 0.25 0.003 250 | strong hairline rgba(255,255,255,0.16)|
| foreground       | 0.95 0.002 250 | #f4f4f5 primary text                  |
| secondary-foreground | 0.68 0.005 250 | #a1a1aa secondary text            |
| muted-foreground | 0.48 0.006 250 | #71717a muted / section labels        |
| primary (purple) | 0.55 0.19 296 | #8b5cf6 — nav underline, ::selection, one hover only |
| positive         | 0.62 0.13 165 | #10b981 positive price change only    |
| negative         | 0.62 0.19 25  | #ef4444 negative price change only    |

## Typography

- Display (wordmark only): Oswald — nav "N.A.K." via `.wordmark`
- Body/Headings: Inter — weight 500, letter-spacing -0.02em; hero h1 `clamp(2rem, 4.5vw, 3.25rem)`, not large display sizes
- Mono: JetBrains Mono — all numbers with `font-variant-numeric: tabular-nums` (`.num`)
- Section labels: 0.6875rem, uppercase, letter-spacing 0.16em, weight 600, muted grey (`.section-label`)
- Note: Inter.woff2 and Oswald.woff2 are NOT bundled — frontend must supply via @fontsource or local woff2 in public/assets/fonts/. JetBrains Mono is bundled.

## Elevation & Depth

Flat near-black surfaces separated by 1px hairlines and dividers; no glows, no drop-shadows. Depth comes from surface alternation (background → card → surface-hover) and border-strong for interactive edges.

## Structural Zones

| Zone         | Background   | Border            | Notes                                |
| ------------ | ------------ | ----------------- | ------------------------------------ |
| Nav          | background   | border-b hairline | Oswald wordmark, 2px purple underline on hover/active, 22px shell @0.75 saturate(0.5) |
| Hero         | background   | —                 | h1 Inter 500, section label, primary CTA |
| Metrics      | card         | hairline          | tabular mono figures, positive/negative deltas |
| Culture      | background   | —                 | minimal wording, no over-promising   |
| Trade        | card         | hairline          | spec table with 1px dividers         |
| Shop banner  | card         | border-t/b border-b | thin full-width strip, `.shop-banner` |
| Treasury     | card         | hairline          | mono amounts, spec table             |
| Footer       | background   | border-t hairline | 18px shell @0.4 saturate(0.3), muted  |

## Spacing & Rhythm

Section gaps `py-16`/`py-20` on desktop, `py-12` mobile; containers `max-w-7xl`; hairline-bordered panels `rounded-[0.25rem]`; spec tables `0.625rem 0.75rem` cells; micro `gap-2` for metric rows.

## Component Patterns

- Buttons: 0.25rem radius. Primary `.btn-primary` white bg + dark text; secondary `.btn-secondary` transparent + 1px border-strong
- Cards: `.surface` card bg + hairline border, hover → `.surface-hover`
- Numbers: `.num` JetBrains Mono tabular; deltas `.text-positive` / `.text-negative`
- Labels: `.section-label` uppercase muted
- Tables: `.spec-table` with 1px dividers
- Shell logo: `.shell-logo-nav` 22px @0.75 saturate(0.5), `.shell-logo-footer` 18px @0.4 saturate(0.3), pixelated, no glow/drift

## Motion

- Entrance: subtle `fade-in-up` on panels (kept minimal)
- Hover: surface-hover background; nav 2px purple underline; button brightness 0.97
- Decorative: none on the main page — emoji-rain, shell-drift, shell-glow remain defined but unused (BubbleBackground retained for possible restoration)

## Constraints

- Main page only — do NOT restyle shop/product/cart/checkout/admin (stages 2/3); keep their legacy tokens defined
- PINK retired from the main page; keep legacy pink/teal tokens so other pages do not break
- Purple only for nav underline, ::selection, and one hover accent — nothing else
- Positive/negative only for price change
- Oswald only for the wordmark; Inter for headings/body; JetBrains Mono for all numbers
- Replace glows/shadows with 1px hairlines; buttons 0.25rem radius
- Demote shell logo (22px nav, 18px footer, reduced opacity + saturation, pixelated)
- Do not modify backend logic, payment flows, or access control

## Signature Detail

A restrained "institutional terminal" identity: tabular mono figures that snap into alignment as they update, a single 2px purple underline, and a demoted pixel shell — Oswald whispering the wordmark while Inter and JetBrains Mono carry the numbers.
