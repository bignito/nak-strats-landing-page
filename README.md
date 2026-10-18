# naktoken.lol

The New Age Kapital site: a static single-page app (React + Vite) served from a NAK-owned
canister on the Internet Computer and watched by the NAK Sentinel.

- `src/frontend/` — the site. `pnpm install && pnpm --filter @caffeine/template-frontend build`
  writes `src/frontend/dist/`.
- There is no backend: the site reads nothing from any canister. The NAK price card uses the
  public Dexscreener API; the featured video and the artist-submission link (Telegram) are constants
  in `src/frontend/src/components/NAKFeaturedArtist.tsx`; the reserve dashboard link points at
  `https://treasury.naktoken.lol/`.
- Publishing: `relay/frontend/pack-site.mjs` + `relay/frontend/deploy.mjs` in the NAKSwap repo put
  `dist/` on the asset canister (see `docs/nak-ecosystem-canisters.md` there).

History: this repo began as the Caffeine-built storefront. The store, payments, orders and the admin
console were removed on 2026-10-18 (owner's decision: no store); the site is content only.
