# NAK STRATS — Transactional Email Endpoints

This module adds transactional email to the NAK STRATS payment service. The
canister triggers sends via HTTPS outcall; the payment service holds the Resend
API key and formats + sends the branded emails. The key is NEVER stored in the
canister or in this repo — canister state is replicated and not confidential.

## Files

- `email-endpoints.js` — an Express router with the three email endpoints.
  Mount it in your existing payment service (the same service that handles
  Stripe), e.g.:

  ```js
  import emailRouter from "./email-endpoints.js";
  app.use(emailRouter);
  ```

  Requires `express` and `resend` (`npm install resend`).

- `submissions-endpoints.js` — an Express router with the artist submission
  endpoints (`POST /submissions`, `GET /submissions`). Mount it the same way:

  ```js
  import submissionsRouter from "./submissions-endpoints.js";
  app.use(submissionsRouter);
  ```

  Requires `express`, `resend`, and `pg` (`npm install resend pg`).

- `submissions-schema.sql` — the Postgres `CREATE TABLE` for submissions. Run
  it once against your Railway Postgres (the service's `DATABASE_URL`).

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `RESEND_API_KEY` | yes | Resend API key (api.resend.com). NEVER store in the canister or repo. |
| `FROM_EMAIL` | yes | Sender address, e.g. `NAK STRATS <orders@nakstrats.com>` |
| `PAYMENT_SERVICE_TOKEN` | yes | Shared bearer token the canister sends (already used for Stripe). |
| `UNSUBSCRIBE_SECRET` | no | Secret used to sign unsubscribe tokens. Defaults to `PAYMENT_SERVICE_TOKEN`. |
| `SHELL_LOGO_URL` | optional | Hosted URL for the shell logo. Defaults to a placeholder. |
| `ORDER_LOOKUP_URL` | optional | Base URL of the order lookup page, used to build the payment-pending link and unsubscribe link. |

### Submission endpoints env vars

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string (Railway). Used by the submissions endpoints. |
| `SUBMISSIONS_ADMIN_EMAIL` | no | Internal notification recipient for new submissions. If unset, no internal notification is sent. |
| `SUBMISSIONS_REPLY_TO` | no | Reply-to on the acknowledgement email. Defaults to `culture@naktoken.lol`. |
| `SUBMISSIONS_RATE_LIMIT` | no | Max submissions per IP per window. Default `5`. |
| `SUBMISSIONS_RATE_WINDOW_MS` | no | Rate-limit window in ms. Default `3600000` (1 hour). |

## Endpoints

All endpoints require `Authorization: Bearer <PAYMENT_SERVICE_TOKEN>` and return
`{ ok: true, id }` on success or `{ error }` on failure. The exceptions are
`POST /emails/unsubscribe` (returns a `status` field) and
`GET /emails/consent-list` (returns a CSV string). `POST /emails/unsubscribe`
accepts a signed token from the unsubscribe link so a customer can opt out
without the shared bearer token.

### POST /emails/order-confirmation

Sent when a payment is confirmed, for BOTH crypto and card orders. Confirms the
ORDER and what is shipping (distinct from Stripe's payment receipt).

Body:

```json
{
  "reference": "NAK-3",
  "items": [{ "name": "Midnight Oud", "quantity": 1, "unitAmount": 8500 }],
  "subtotal": 8500,
  "tax": 680,
  "shipping": 0,
  "total": 9180,
  "currency": "USD",
  "customerEmail": "customer@example.com",
  "customerName": "Jane Doe",
  "shippingAddress": {
    "line1": "1 Main St",
    "line2": null,
    "city": "Springfield",
    "region": "IL",
    "postal_code": "62701",
    "country": "US"
  },
  "paymentMethod": "crypto_ckusdc"
}
```

### POST /emails/payment-pending

Sent when a crypto order is created, with the order reference and a link back to
the order lookup page, so a customer who closes the tab can still find their
order.

Body:

```json
{
  "reference": "NAK-3",
  "customerEmail": "customer@example.com",
  "customerName": "Jane Doe",
  "lookupUrl": "https://nakstrats.com/order/NAK-3"
}
```

### POST /emails/shipping

Sent when an admin marks an order shipped, including the tracking number when
present.

Body:

```json
{
  "reference": "NAK-3",
  "customerEmail": "customer@example.com",
  "customerName": "Jane Doe",
  "trackingNumber": "1Z999AA10123456784"
}
```

## Artist submissions

The submissions endpoints replace the old `mailto:` culture link (a domain we
do NOT own — it must never appear). The canister routes the
submission form through the payment service via HTTPS outcall authenticated
with the shared bearer token, so the shared secret is never exposed to the
browser. The canister sends the form payload to `POST /submissions`; the
service validates it, stores it in Postgres, and sends the acknowledgement
email.

### POST /submissions

Stores a submission and sends the transactional acknowledgement email to the
submitter plus an internal notification to `SUBMISSIONS_ADMIN_EMAIL`.

Body:

```json
{
  "name": "Jane Doe",
  "email": "artist@example.com",
  "discipline": "Music",
  "link": "https://soundcloud.com/jane/example",
  "message": "Optional note, max 1000 characters.",
  "consent": false,
  "company": ""
}
```

- `name` (required), `email` (required, validated format), `discipline`
  (required, one of `Music` / `Visual Art` / `Video` / `Writing` / `Other`),
  `link` (required, must parse as an `http(s)` URL), `message` (optional, max
  1000 chars).
- `consent` (optional boolean) is the marketing checkbox, UNTICKED by default.
  When `true`, the service stores `consent = true` and a `consented_at`
  timestamp on the submission. Submission addresses are NEVER added to any
  marketing list — the consent flag is stored separately on the submission
  only.
- `company` is the HONEYPOT field. It is hidden from users; bots fill it in.
  When it (or `website` / `homepage`) has a value, the service returns
  `{ ok: true, honeypot: true }` without storing or emailing, so bots are not
  tipped off.
- Per-IP rate limiting: `SUBMISSIONS_RATE_LIMIT` submissions per
  `SUBMISSIONS_RATE_WINDOW_MS`. Exceeding it returns HTTP 429
  `{ error: "rate_limited" }`. No CAPTCHA.

On success returns `{ ok: true, id }`. Validation failures return HTTP 400
with `{ error }`.

### GET /submissions

Admin-only (requires the shared bearer token). Returns submissions for admin
review, newest first:

```json
{
  "submissions": [
    {
      "id": 1,
      "name": "Jane Doe",
      "email": "artist@example.com",
      "discipline": "Music",
      "link": "https://soundcloud.com/jane/example",
      "message": null,
      "consent": false,
      "consented_at": null,
      "created_at": "2026-08-31T12:00:00.000Z"
    }
  ]
}
```

### Acknowledgement email

- From: the configured `FROM_EMAIL` (e.g. `NAK STRATS <orders@naktoken.lol>`).
- Reply-to: `SUBMISSIONS_REPLY_TO` (default `culture@naktoken.lol`).
- Subject: `We received your submission — N.A.K.`
- Body: confirms receipt, echoes back the submitter's name, discipline, and
  link, and sets honest expectations ("We review submissions as we grow the
  roster. We will reach out if there is a fit."). No response-time promise, no
  implication of acceptance.
- Template: dark institutional background, restrained, minimal, small shell
  mark, simple HTML.

This email is TRANSACTIONAL (a direct response to the submitter's action), so
it does not require marketing consent. The internal notification to
`SUBMISSIONS_ADMIN_EMAIL` is sent on every submission so the team knows one
arrived.

### Postgres schema

See `submissions-schema.sql`. The table stores `name`, `email`, `discipline`,
`link`, `message`, `consent` + `consented_at`, `honeypot`, and `created_at`.

## Branding

All templates use the NAK STRATS brand: dark background, purple `#8b5cf6` and
teal `#06b6d4` accents, the shell logo, and minimal readable HTML. The shell
logo asset lives at `src/frontend/public/assets/images/nak-shell.png`; host it
and set `SHELL_LOGO_URL`, or inline it as a data URI in the template.

## Consent

All three send endpoints are TRANSACTIONAL and are exempt from marketing consent
— they must send regardless of the customer's marketing checkbox. Marketing
consent is handled separately; never gate these on it.

### Suppression list

An address on the suppression list is never emailed. `POST /emails/unsubscribe`
adds an address to the suppression list. Transactional emails are exempt from
consent but still respect the suppression list — an opted-out address is not
emailed even for order confirmations.

### Consent endpoints

- `POST /emails/unsubscribe` — body `{ token }` (signed token from the
  unsubscribe link) or `{ email }`. Adds the address to the suppression list.
  Does NOT require the bearer token when a valid signed token is supplied.
  Returns a `status` field the canister parses:
  - `{ "status": "ok" }` — address added to the suppression list.
  - `{ "status": "invalid_token" }` — no valid token/email supplied (HTTP 400).
  - `{ "status": "already_unsubscribed" }` — address was already suppressed.
- `GET /emails/consent-list` — admin-only. Returns an actual CSV string
  (header row `email,consent_at` followed by one row per consenting address),
  so the canister's returned body IS valid CSV. The canister proxies this body
  unchanged to the admin CSV export. Only addresses that opted in to marketing
  are included, so a mailing list can be built without accidentally including
  customers who did not opt in.
- `POST /emails/consent` — admin-only. Records a marketing opt-in
  (`{ email, name?, consentedAt? }`). Called by the consent domain when a
  customer checks the marketing box at checkout.

### Persistence

The suppression and consent lists are stored in `email-store.json` in the
service's working directory by default (in-memory on first run). For a durable
Railway deployment, mount a volume at the working directory or swap the
`loadStore`/`saveStore` helpers for a managed store (Postgres/Redis).

### Unsubscribe link

Every branded email footer includes a token-based unsubscribe link pointing at
`{ORDER_LOOKUP_URL}/unsubscribe?token=...`. The token is HMAC-signed with
`UNSUBSCRIBE_SECRET` (or `PAYMENT_SERVICE_TOKEN`) so it cannot be forged. The
app's unsubscribe page POSTs the token to `/emails/unsubscribe`.
