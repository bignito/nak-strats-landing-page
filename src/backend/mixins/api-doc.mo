mixin () {
  public query func getApiDoc() : async Text {
    "# NAK Strat Storefront Backend API

## Purpose

The NAK Strat storefront backend manages the cologne product catalogue and
customer orders. It exposes a public product catalogue, order creation and
status lookup, a pluggable payment adapter, and an OQL query layer over the
persisted storefront data. It also provides several HTTP-outcall helpers used
by the frontend to fetch live token pricing, token images, token profiles, and
treasury/dashboard data from external services.

## Public Methods

### Storefront

- `listProducts() : async [Product]` — query. Returns the active products in
  the catalogue (products whose `active` field is `true`). Hidden
  (`admin_only`) products are NEVER included, so the public /shop grid shows
  only the real catalogue.
- `getProduct(slugOrId : Text) : async ?Product` — query. Looks up a product by
  its `slug`, or by its numeric `id` when the argument parses as a `Nat`.
  Returns `null` when no product matches. A hidden (`admin_only`) product is
  returned ONLY to an authenticated admin caller (via a direct product URL or
  an admin-only view); non-admin and anonymous callers get `null` for it, so
  hidden products remain purchasable by an admin but never leak to customers.
- `createProduct(product : Product) : async Bool` — update. ADMIN-OR-OWNER.
  Appends a new product to the catalogue. The caller supplies the full
  `Product` record; every price field (`price`, and each `variant.price`) is an
  integer in cents (never a float) — the frontend converts dollar input to
  cents before calling. Binds the caller at the top of the function, rejects
  the anonymous principal, and traps for a caller that is not a non-anonymous
  ADMIN or OWNER. Returns `true` on success.
- `updateProduct(product : Product) : async Bool` — update. ADMIN-OR-OWNER.
  Replaces the existing product whose `id` matches the supplied record (a
  no-op when no product with that id exists). Prices are integer cents. Binds
  the caller at the top of the function, rejects the anonymous principal, and
  traps for a caller that is not a non-anonymous ADMIN or OWNER. Returns `true`
  on success.
- `createOrder(input : CreateOrderInput) : async Result<Order, OrderError>` —
  update. Validates the order server-side (product exists and is active,
  variant exists, quantity is at least 1, stock is sufficient), computes the
  authoritative subtotal, tax (8%), shipping (free at or above 5000 units,
  otherwise 500), and total from the product records — never from
  browser-submitted prices. Creates the order with `payment_status = #pending`
  and a unique unguessable `reference` of the form `NAK-` followed by 12
  characters drawn from an unambiguous uppercase alphanumeric alphabet
  (excluding `0`, `O`, `1`, `I`, and `L`), generated from IC raw randomness
  (`Random.blob()`) with collision checking — never from a counter, a
  timestamp, or a hash of the order id — then hands it to the payment
  adapter's `createCheckoutSession`. On success returns the created
  order; on failure returns an `OrderError` variant. For crypto payment methods
  (`#crypto_ckusdc`), the order total is checked server-side against the
  configured minimum order total (default $0.25): an order whose total is below
  the minimum is rejected with `#err(#belowMinimumOrder(minimum))` before any
  payment is created, because such an order cannot be swept to the treasury
  after the ledger transfer fee is deducted. While the
  `CKUSDC_CHECKOUT_ENABLED` flag is `false` (ckUSDC checkout temporarily
  disabled), a `#crypto_ckusdc` order is rejected with
  `#err(#ckUSDCDisabled)` before any payment is created — a direct canister
  call cannot create a new ckUSDC order even though the UI no longer offers the
  option. Existing ckUSDC orders are unaffected. Hidden (`admin_only`) test
  items ship free (no shipping cost), so the total is exactly the item price.
- `getOrderStatus(reference : Text) : async ?Order` — query. Returns a
  public-safe view of the order with the given `reference`, or `null` if none
  exists. The view omits `customer_email` — the customer's email is never
  exposed through this public path. This is the guest lookup path: a customer
  who did not sign in can reach their order status this way using the
  reference shown at checkout. Lookup works for both legacy (`NAK-<id>`) and
  new-format (`NAK-` + 12 random characters) references.
- `getMyOrders() : async [Order]` — query. Returns ONLY the orders whose
  `customer_principal` matches the caller. The caller is derived from
  `msg.caller` server-side — never accepted as a parameter. It rejects the
  anonymous principal (returns an empty list), so a guest who did not sign in
  cannot read anyone's orders through this path, and one signed-in customer can
  never read another customer's orders. A signed-in customer's orders are
  attributed to them at creation time via `customer_principal`. Each returned
  record is a public-safe view that omits `customer_email`.

### Payment adapter

- `createCheckoutSession(order : Order) : async Result<CheckoutSession,
  PaymentError>` — update. Delegates to the configured payment adapter. The
  default `cryptoAdapter` creates a crypto payment for `#crypto_ckusdc` orders,
  rejects `#crypto_icp` as disabled, and falls back to the manual adapter for
  other payment methods. While the `CKUSDC_CHECKOUT_ENABLED` flag is `false`,
  the adapter rejects a `#crypto_ckusdc` order with a `#paymentFailed` error
  before creating any payment, so a direct canister call cannot create a ckUSDC
  checkout session either.
- `getPaymentStatus(reference : Text) : async PaymentStatus` — update. Returns
  the current payment status of the order with the given `reference`, or
  `#pending` if no such order exists.
- `handlePaymentConfirmation(payload : Text) : async Result<(), PaymentError>`
  — update. Delegates to the payment adapter to process a payment
  confirmation. The default adapter always returns `#ok()`.

### Admin access control

The backend has a role-based admin model stored in stable state. Each principal
holds one of three roles — `#owner` (full access, manages owners/admins/staff
and roles), `#admin` (everything except managing owners), or `#staff`
(fulfilment only: view orders/shipping, mark shipped, add tracking; CANNOT
change prices, treasury config, payment settings, sweep funds, or manage
users). The roles map starts empty; the first principal claims ownership via
`claimInitialAdmin`. Every privileged method binds its caller at the top of the
function (before any await), explicitly rejects the anonymous principal, and
traps when the caller lacks the required role. There is always at least one
OWNER: the last owner cannot be demoted or revoked.

- `claimInitialAdmin() : async Bool` — update. One-time bootstrap: sets the
  caller as the first OWNER (the highest role). Gated on the persistent
  `initialAdminClaimed` flag being `false` (NOT merely on the roles map being
  empty), so an emptied map can never silently reopen ownership. Permanently
  dead once the flag is `true`. Rejects the anonymous principal (returns
  `false`).
- `bootstrapOwner(p : Principal) : async Bool` — update. Controller-only live
  bootstrap: sets `p` as OWNER and marks `initialAdminClaimed` true WITHOUT
  ever opening the public claim path. Only the canister's controller (verified
  against the IC management canister) may invoke it; any other caller gets
  `false`. This is the distinct, documented live bootstrap the deploy pipeline
  calls once at publish time with the deployer's principal — live never exposes
  an open claim.
- `getMyRole() : async ?Role` — query. Public. Reports only the caller's role
  (`#owner`/`#admin`/`#staff`), or `null` when the caller is unregistered or
  anonymous. Never reveals other principals.
- `adminCount() : async Nat` — query. Public. Returns only the NUMBER of
  principals holding any role, never the principals themselves. This is the
  safe public signal the admin UI uses to decide whether the \"Claim Initial
  Admin\" door is still open (when it returns 0) without leaking who the users
  are.
- `listUsers() : async [(Principal, UserRecord)]` — update. OWNER/ADMIN only.
  Lists every user as a `(principal, { role; grantedAt })` pair. Traps for a
  caller that is not OWNER or ADMIN.
- `listAdmins() : async [Principal]` — update. OWNER/ADMIN only. Lists the
  principals holding OWNER or ADMIN (the \"admin\" tier). Backward-compatible
  with the old listAdmins semantics. Traps for a caller that is not OWNER or
  ADMIN.
- `grantRole(p : Principal, role : Role) : async Bool` — update. Grants (or
  re-grants) a role. `#owner` and `#admin` grants require OWNER; `#staff`
  grants require ADMIN or OWNER. The last owner cannot demote themselves (or
  any owner) below OWNER. Returns `false` for the anonymous target principal.
- `revokeRole(p : Principal) : async Bool` — update. Revokes any role. OWNER
  may revoke owner/admin; ADMIN may revoke STAFF only. The last owner cannot
  revoke themselves. Returns `false` when `p` holds no role.
- `addAdmin(p : Principal) : async Bool` — update. Backward-compatible wrapper
  granting the ADMIN role. Requires OWNER (only the owner may create admins).
  Returns `false` for the anonymous principal.
- `removeAdmin(p : Principal) : async Bool` — update. Backward-compatible
  wrapper revoking any role. Requires OWNER. The last owner cannot remove
  themselves.
- `isAdmin() : async Bool` — query. Public. Reports only on the caller:
  returns `true` when the caller holds OWNER or ADMIN (the \"admin\" tier);
  STAFF reports `false`.
- `resetAdminForMigration() : async Bool` — update. Controller-only. Clears the
  roles map and reopens the one-time claim path (`initialAdminClaimed :=
  false`). This is the safe mechanism for the DRAFT reset: only the canister's
  controller (verified against the IC management canister) may invoke it, so an
  emptied map can never be exploited by a non-controller. The deploy pipeline
  calls it on the DRAFT only; live never invokes it. Returns `false` for any
  non-controller caller.

### IBE shipping-details encryption (vetKD)

Customer shipping details (name, email, and full shipping address) are
encrypted CLIENT-SIDE in the browser using identity-based encryption (IBE) to
every admin principal BEFORE they are ever sent to the canister. The canister
only ever receives and stores the opaque ciphertext (`encrypted_shipping :
?Blob` on the order) and NEVER sees or decrypts the plaintext PII. Decryption
happens only in an authenticated admin's browser, to fulfil an order.

The ONE exception to \"the canister never sees plaintext PII\" is the customer
email address, which must reach the email service for routing the confirmation
email. The confirmation email is sent by the external payment service, so the
customer email is the single field that is sent in plaintext to that service
for routing; the customer name and full shipping address are encrypted and are
NEVER stored or sent in plaintext. The confirmation email itself omits the
plaintext shipping address.

- `getIbePublicKey() : async Blob` — update. PUBLIC. Returns the IBE public
  key for the app's domain separator (`nak_strats_ibe_shipping_v1`), which the
  frontend uses to IBE-encrypt shipping details to admin principals. It is a
  public key, so any caller (including anonymous guests) may fetch it. It is an
  update (not a query) because it makes an inter-canister call to the
  management canister. `vetkd_public_key` costs no cycles.
- `getMyEncryptedIbeKey(transportPublicKey : Blob) : async Blob` — update.
  STAFF-OR-ABOVE. Derives the caller's encrypted IBE vetKey for the app's
  domain separator. Binds the caller at the top of the function, rejects the
  anonymous principal, and traps for a caller that is not a non-anonymous STAFF
  or above. The derivation input is the caller's own principal, so a user can
  only ever derive the key for themselves. The returned blob is the
  ENCRYPTED vetKey (under the caller-supplied transport key) — the canister
  relays it and never sees the raw key. This call costs cycles:
  `vetkd_derive_key` is 26,153,846,153 cycles for `key_1` and 10,000,000,000
  for `test_key_1` (the same locally and on mainnet); the Motoko helper
  attaches the amount and refunds any excess. The admin frontend should derive
  this key ONCE per admin session and cache it client-side, rather than per
  order row, to avoid burning cycles on every row of the orders table.

The domain separator and the derivation input (the admin principal) must be
byte-identical across `getIbePublicKey`, `getMyEncryptedIbeKey`, and the
frontend's `decryptAndVerify` / `IbeCiphertext.decrypt` calls, or the derived
keys will not match.

### Crypto checkout (ckUSDC via ICRC-1)

- `getCryptoConfig() : async CryptoConfigView` — query. Returns the current
  crypto configuration: the treasury principal and subaccount, the ckUSDC
  and ICP ledger configurations (canister id, decimals, fee), the current
  `minimumOrder` (in USD cents) required for crypto checkout, and
  `ckUSDCEnabled : Bool` — whether ckUSDC checkout is currently enabled. The
  `ckUSDCEnabled` field mirrors the compile-time `CKUSDC_CHECKOUT_ENABLED`
  constant: while it is `false`, the checkout UI must not offer ckUSDC and the
  backend rejects NEW ckUSDC orders (see `createOrder` and
  `createCheckoutSession`). Existing ckUSDC orders remain fully visible and
  fulfillable. ICP is present in the config but is DISABLED for payments — no
  rate oracle is configured, so ICP is never offered and any attempt to pay
  with ICP is rejected.
- `getMinimumOrder() : async Nat` — query. Public. Returns the current minimum
  order total (in USD cents) required for crypto checkout. Defaults to `25`
  ($0.25). Crypto orders whose total is below this are rejected server-side
  because they cannot be swept to the treasury after the ledger transfer fee is
  deducted.
- `updateMinimumOrder(minimum : Nat) : async Result<(), CryptoPaymentError>` —
  update. ADMIN-OR-OWNER. Sets the minimum order total (in USD cents) required
  for crypto checkout. Traps for a caller that is not a non-anonymous ADMIN or
  OWNER.
- `getCryptoDepositInfo(reference : Text) : async Result<DepositInfo,
  CryptoPaymentError>` — query. Returns the deposit details for an order's
  crypto payment: the deposit address (this canister's own principal), the
  per-order ICRC-1 subaccount, the exact amount due in the token's smallest
  units, the token decimals, the expiry timestamp, and a QR payload. Returns
  `#err(#notFound)` for an unknown reference.
- `getCryptoPaymentStatus(reference : Text) : async Result<CryptoPaymentStatus,
  CryptoPaymentError>` — query. Returns the stored payment status without
  querying the ledger. Returns `#err(#notFound)` for an unknown reference.
- `checkCryptoPayment(reference : Text) : async Result<CryptoPaymentStatus,
  CryptoPaymentError>` — update. Queries `icrc1_balance_of` on the order's
  subaccount and returns the live status: `#awaiting_payment` (zero balance),
  `#underpayment` (0 < balance < amount due), `#paid` (balance >= amount due),
  or `#err(#expired)` past the deposit window. Overpayment is accepted: any
  balance at least the amount due is reported `#paid` (the excess is swept
  with the principal), so `#overpayment` is never returned by this method. The
  order is only ever considered paid when the on-ledger balance is at least
  the amount due — never from a frontend claim. This method is read-only: it
  only triggers an on-ledger re-check and can never mark an order paid on its
  own.
- `sweepCryptoToTreasury(reference : Text) : async Result<Nat,
  CryptoPaymentError>` — update. ADMIN-OR-OWNER. Transfers the subaccount balance
  minus the ledger transfer fee to the treasury and returns the on-ledger block
  index. Never transfers more than `balance - fee`, so the sweep cannot fail on
  insufficient funds and never leaves the subaccount unable to cover the fee.
  The transfer fee is queried at runtime via `icrc1_fee` on the configured
  ledger and cached briefly between sweeps; the hardcoded ledger fee is used
  only as a fallback when the query fails. When the subaccount balance is not
  greater than the fee, the sweep is skipped, the funds are left in place, and
  a note is recorded on the order (`sweep_note`) rather than failing
  repeatedly. Sweep failures — including low cycles — are recorded as a clear
  note on the order (`sweep_note`) rather than failing silently or trapping.
  Binds the caller at the top of the function, rejects the anonymous principal,
  and traps for a caller that is not a non-anonymous ADMIN or OWNER.
- `updateTreasury(principal : Principal, subaccount : ?Blob) : async
  Result<(), CryptoPaymentError>` — update. ADMIN-OR-OWNER. Updates the
  treasury principal and optional subaccount that confirmed funds are swept
  to. Traps for a caller that is not a non-anonymous ADMIN or OWNER.
- `updateLedgerConfig(token : Token, canisterId : Principal, decimals : Nat8,
  fee : Nat) : async Result<(), CryptoPaymentError>` — update. ADMIN-OR-OWNER.
  Updates the ledger configuration (canister id, decimals, transfer fee) for
  the given token. Traps for a caller that is not a non-anonymous ADMIN or
  OWNER.
- `adminListOrders(filter : Text) : async [AdminOrderView]` — update.
  ADMIN-OR-OWNER. Enumerates orders for the admin UI. Binds the caller at the
  top of the function, rejects the anonymous principal, and traps for a caller
  that is not a non-anonymous ADMIN or OWNER. Each returned view
  carries the order `reference`, `created_at`, `status`, `payment_method`,
  amount owed, `currency`, item count, the customer's email (`customerEmail`),
  the per-order ICRC-1 subaccount as lowercase hex, and the full ICRC-1 deposit
  account text. The `filter` argument
  selects which orders to return:
  - `all` — every order.
  - `awaiting_payment` — crypto orders still awaiting payment.
  - `paid` — orders whose payment is `#paid`.
  - `expired` — orders whose payment is `#expired`.
  - `cancelled` — orders whose payment is `#cancelled`.
  - `needs_review` — orders that need admin attention: paid-but-not-swept,
    expired-but-funded, underpaid, overpaid, and sweep-failed.
- `adminGetOrderDetail(reference : Text) : async ?AdminOrderDetail` — update.
  ADMIN-OR-OWNER. Returns the full detail of a single
  order, including its line items and the customer's email (`customerEmail`),
  for the admin UI. Binds the caller at the top
  of the function, rejects the anonymous principal, and traps for a caller that
  is not a non-anonymous ADMIN or OWNER. Returns
  `null` for an unknown reference.

### Card checkout (Stripe via external payment service)

- `getPaymentServiceConfig() : async PaymentServiceConfigView` — query.
  Returns the payment service configuration view: the configured
  `PAYMENT_SERVICE_URL` and a `tokenSet : Bool` flag indicating whether the
  `PAYMENT_SERVICE_TOKEN` has been set. The token value itself is write-only
  and is NEVER returned — only the boolean flag, so the frontend can decide
  whether to offer card checkout.
- `updatePaymentServiceUrl(url : Text) : async Result<(), PaymentServiceError>`
  — update. ADMIN-OR-OWNER. Sets the payment service base URL. Traps for a
  caller that is not a non-anonymous ADMIN or OWNER.
- `updatePaymentServiceToken(token : Text) : async Result<(), PaymentServiceError>`
  — update. ADMIN-OR-OWNER. Sets the shared bearer token used to
  authenticate HTTPS outcalls to the payment service. The token is stored but
  never returned to any caller (write-only). Traps for a caller that is not a
  non-anonymous ADMIN or OWNER.
- `createCardCheckoutSession(reference : Text, successUrl : Text, cancelUrl :
  Text) : async Result<CheckoutSession, PaymentServiceError>` — update. For a
  pending `#card_stripe` order, makes an HTTPS outcall POST to
  `{PAYMENT_SERVICE_URL}/create-checkout-session` with the authoritative
  server-side order total and line items, and returns the Stripe-hosted
  `checkoutUrl` to redirect the customer to. Returns `#err(#notConfigured)`
  when the URL or token is unset, and `#err(#outcallFailed)` when the payment
  service is unreachable — the order is left `#pending`, never marked paid.
- `confirmCardPayment(reference : Text) : async Result<PaymentStatus,
  PaymentServiceError>` — update. Makes an HTTPS outcall GET to
  `{PAYMENT_SERVICE_URL}/order-status/{reference}` and marks the order `#paid`
  ONLY when the server-side status is `\"paid\"`. Records the returned
  `paymentReference` as the order's `payment_reference` and decrements
  inventory. Idempotent: confirming an already-paid order does not
  double-decrement inventory or duplicate the order. Returns
  `#err(#outcallFailed)` when the payment service is unreachable, leaving the
  order `#pending`.
- `cancelCardOrder(reference : Text) : async Result<(), PaymentServiceError>` —
  update. Cancels a pending `#card_stripe` order and releases its reserved
  inventory. Returns `#err(#notFound)` for an unknown reference.
- `paymentServiceTransform(input : TransformationInput) : async
  TransformationOutput` — query. The HTTP outcall response transform for the
  payment service: strips every response header (Date, request IDs, Stripe
  trace headers) so responses are identical across replicas, returning only the
  stable JSON body.

### Subaccount sweep (admin-only fund recovery by integer index)

These endpoints let an admin query and sweep a SPECIFIC ICRC-1 subaccount by its
integer index on the configured ckUSDC ledger. The subaccount is derived with
the SAME big-endian encoding used to build the displayed deposit address (31
zero bytes followed by the big-endian 32-byte encoding of the integer), so the
subaccount queried/swept here is exactly the one a customer paid into. The
balance query requires STAFF or above; the sweep requires ADMIN or OWNER. Both
surface the exact ledger error on failure (never swallowed).

- `getSubaccountBalance(subaccountIndex : Nat) : async Result<SubaccountBalanceResult, SweepError>` — update. STAFF-OR-ABOVE. Queries `icrc1_balance_of` on the configured ckUSDC ledger for owner = this canister, subaccount = the big-endian 32-byte encoding of `subaccountIndex`, and returns the exact unit count. Binds the caller at the top, rejects the anonymous principal, and traps for a caller that is not a non-anonymous STAFF or above.
- `sweepSubaccount(subaccountIndex : Nat) : async Result<SweepSubaccountResult, SweepError>` — update. ADMIN-OR-OWNER. Sweeps the subaccount at `subaccountIndex` to the treasury principal, returning the exact ledger error (icrc1_transfer error variant) on failure. Binds the caller at the top, rejects the anonymous principal, and traps for a caller that is not a non-anonymous ADMIN or OWNER.

### Transactional email (order confirmation, payment pending, shipping)

The canister has NO email capability of its own and holds NO email provider key.
Transactional emails are sent by the external payment service via Resend
(`api.resend.com`); the Resend key lives only in the payment service's
environment, never in the canister or this repo. The canister triggers a send
via HTTPS outcall to `{PAYMENT_SERVICE_URL}/emails/...` authenticated with the
shared bearer token. All transactional emails are EXEMPT from marketing consent
and send regardless of the checkbox.

- `markOrderShipped(reference : Text, trackingNumber : ?Text) : async Result<(), EmailError>` — update. ADMIN-OR-OWNER. Marks the order shipped (sets `shipping_status = #shipped`, `shipped_at` to now, and `tracking_number` when provided) and triggers the shipping notification email, including the tracking number when present. Transactional — sends regardless of marketing consent. Binds the caller at the top, rejects the anonymous principal, and traps for a caller that is not a non-anonymous ADMIN or OWNER.
- `resendConfirmationEmail(reference : Text) : async Result<(), EmailError>` — update. ADMIN-OR-OWNER. Re-sends the order confirmation email for an order. Transactional — sends regardless of marketing consent. Binds the caller at the top, rejects the anonymous principal, and traps for a caller that is not a non-anonymous ADMIN or OWNER.
- `emailTransform(input : TransformationInput) : async TransformationOutput` — query. The HTTP outcall response transform for the payment service email endpoints: strips every response header so responses are identical across replicas.

Order confirmation emails are sent automatically when a payment is confirmed,
for BOTH crypto and card orders, and carry the order reference, line items
(quantities and prices), totals, and payment method. The confirmation email
OMITS the plaintext shipping address and customer name — those are encrypted
and never stored or sent in plaintext; only the customer email reaches the
email service, for routing. A payment-pending email is sent when a crypto order
is created, carrying the order reference and a link back to the order lookup
page. These sends are triggered by the backend (via the verification timer and
the payment confirmation paths) and are transactional — never gated on
marketing consent.

### Marketing consent (opt-in list and unsubscribe)

- `getConsentListCsv() : async Result<ConsentListExport, ConsentError>` — update. ADMIN-OR-OWNER. Fetches the list of addresses WITH marketing consent from the external payment service and returns it as CSV, so a mailing list can be built without accidentally including customers who did not opt in. The addresses are PII that lives off-canister at the payment service; the canister only proxies them through and never persists them. Binds the caller at the top, rejects the anonymous principal, and traps for a caller that is not a non-anonymous ADMIN or OWNER.
- `unsubscribe(token : Text) : async Result<(), ConsentError>` — update. PUBLIC. Token-based unsubscribe. The token is minted by the payment service and embedded in the unsubscribe link of marketing emails; the canister forwards it to the payment service, which adds the address to its stored suppression list. Suppressed addresses are never sent marketing email; transactional emails remain exempt. The suppression list lives at the payment service.
- `consentServiceTransform(input : TransformationInput) : async TransformationOutput` — query. The HTTP outcall response transform for the payment service consent endpoints: strips every response header so responses are identical across replicas.

### Artist submissions (culture / submit your work)

The backend has NO email capability of its own and holds NO email provider key.
Artist submissions are stored OFF-canister in the external payment service's
Postgres (an email address plus a personal name is PII with the same replication
exposure as customer data, so it is never persisted in canister state). The
canister proxies submissions to the payment service via HTTPS outcall,
authenticated with the shared bearer token held in canister config — the token
is NEVER shipped to the browser. On a successful submission the payment service
sends a transactional acknowledgement email to the submitter (a direct response
to their action, so it does not require marketing consent) and an internal
notification to a configurable admin address. Submission addresses are NEVER
added to any marketing list; the optional consent checkbox is stored separately
(consent + timestamp) only when ticked.

- `submitSubmission(input : SubmissionInput) : async Result<(), SubmissionError>` — update. PUBLIC. Submits an artist work for review. The `SubmissionInput` carries `name`, `email`, `discipline` (one of `#music`, `#visualArt`, `#video`, `#writing`, `#other`), `link`, an optional `message` (max 1000 characters), an optional `marketingConsent` flag with a `marketingConsentAt` timestamp (the checkbox is UNTICKED by default; the frontend sends the submitter's explicit choice), and a `honeypot` field. A submission whose `honeypot` field is filled is rejected with `#err(#honeypot)` BEFORE any outcall is made — it is a bot trap hidden from real users. Submissions are rate-limited per caller principal (the canister cannot see client IPs, so this complements the payment service's per-IP limit): a caller that exceeds the limit within the window receives `#err(#rateLimited)`. The input is validated server-side (`#err(#invalidInput)` for a missing name, malformed email, non-URL link, or a message over 1000 characters). On success the submission is forwarded to `{PAYMENT_SERVICE_URL}/submissions` and `#ok()` is returned; the payment service stores it and sends the acknowledgement email. Returns `#err(#notConfigured)` when the URL or token is unset, and `#err(#outcallFailed)` when the payment service is unreachable.
- `listSubmissions() : async Result<[SubmissionRecord], SubmissionError>` — update. STAFF-OR-ABOVE. Lists submissions for the admin review view, newest first. Binds the caller at the top, rejects the anonymous principal, and traps for a caller that is not a non-anonymous STAFF or above. Each `SubmissionRecord` carries `id`, `name`, `email`, `discipline`, `link`, `message`, `marketingConsent`, `marketingConsentAt`, and `submittedAt`. The records are PII that lives off-canister; the canister only proxies them through and never persists them. Returns `#err(#notConfigured)` when the URL or token is unset, and `#err(#outcallFailed)` when the payment service is unreachable.
- `submissionServiceTransform(input : TransformationInput) : async TransformationOutput` — query. The HTTP outcall response transform for the payment service submission endpoints: strips every response header so responses are identical across replicas.

### HTTP outcall helpers

- `transform(input : TransformationInput) : async TransformationOutput` —
  query. The HTTP outcall response transform function; strips
  non-deterministic headers so outcall responses are deterministic across
  replicas.
- `getNAKPrice() : async Text` — query. Fetches NAK/ICP pricing from
  DexScreener.
- `getTokenImage(chainId : Text, tokenAddress : Text) : async Text` — query.
  Fetches a token image from DexScreener.
- `getTokenProfile(chainId : Text, tokenAddress : Text) : async Text` — query.
  Fetches token profile data from DexScreener.
- `getTreasuryTokens() : async Text` — query. Fetches treasury token data from
  the configured treasury service.
- `getDashboardData() : async Text` — query. Fetches dashboard data from the
  configured dashboard service.

### Recovery (admin-only diagnosis and fund recovery)

These endpoints exist to diagnose and recover real funds held in the canister's
ICRC-1 subaccounts. Every one of them is role-gated (STAFF or above for the
read/diagnostic methods, ADMIN or OWNER for the sweep/mutating methods) except
`getResumeInfo` and `getCycleBalance`, which are public queries used to resume
an in-progress deposit screen and to render the cycle gauge. Ledger errors are
NEVER swallowed — they are returned verbatim in the `error` field of the result
so an admin can act on the exact ledger failure.

- `getCycleBalance() : async Nat` — query. PUBLIC. Returns the canister's
  current cycle balance via `Cycles.balance()`. Low cycles can cause
  inter-canister ledger calls to fail, so this lets an admin confirm the
  canister is funded before attempting a sweep. It is a public query so the
  admin UI can render the cycle gauge without an admin session.
- `getCanisterId() : async Principal` — query. PUBLIC. Returns the canister's
  own principal via `Principal.fromActor(Self)`. Used by the admin UI to
  display the canister's identity and to build deposit addresses.
- `listOrdersForRecovery() : async [OrderRecoveryView]` — update. STAFF-OR-ABOVE.
  Lists every order with its reference, status, payment method, amount owed,
  the full deposit account (owner + subaccount + text address), and the LIVE
  on-ledger balance of each crypto order's subaccount.
- `forceRecheckPayment(reference : Text) : async Result<RecheckResult,
  RecoveryError>` — update. STAFF-OR-ABOVE. Forces verification of a single
  order's payment to run immediately, returning the current balance, status,
  and any error.
- `forceSweepOrder(reference : Text) : async Result<SweepResult,
  RecoveryError>` — update. ADMIN-OR-OWNER. Forces a sweep of a single order's
  subaccount to the treasury, returning the exact ledger error on failure
  (never swallowed).
- `getDefaultSubaccountBalance() : async Result<Nat, RecoveryError>` — update.
  STAFF-OR-ABOVE. Returns the canister's DEFAULT subaccount balance on the
  configured ledger.
- `sweepDefaultSubaccount() : async Result<SweepResult, RecoveryError>` —
  update. ADMIN-OR-OWNER. Sweeps the canister's DEFAULT subaccount balance to the
  treasury, returning the exact ledger error on failure (never swallowed).
- `startVerificationTimer() : async Bool` — update. STAFF-OR-ABOVE. Registers the
  recurring backend payment-verification timer (every 30 seconds). Returns
  `true` when the timer was (re)started. The timer is also auto-registered on
  canister init and post-upgrade, so verification runs even if no admin ever
  calls this.
- `stopVerificationTimer() : async Bool` — update. STAFF-OR-ABOVE. Cancels the
  recurring verification timer. Returns `true` when a timer was running and was
  cancelled, `false` when none was running.
- `getResumeInfo(reference : Text) : async Result<ResumeInfo, RecoveryError>` —
  query. PUBLIC. Returns full deposit info (address, amount, expiry timestamp,
  remaining time, status) for resuming an in-progress deposit screen. Remaining
  time is computed server-side from the stored expiry timestamp, never from a
  client timer that resets on reload.
- `listLatePayments() : async [LatePayment]` — update. STAFF-OR-ABOVE. Lists all
  recorded late payments (received after the deposit window expired, flagged
  for admin review, never discarded).
- `markLatePaymentReviewed(reference : Text) : async Bool` — update.
  STAFF-OR-ABOVE. Marks a late payment as reviewed. Returns `true` when found.

### OQL query layer

- `schema() : async Text` — query. Returns a JSON catalogue of the queryable
  entities (`product`, `order`, `cryptoPayment`, `cryptoConfig`,
  `paymentServiceConfig`, `latePayment`, `admin`), their primary keys, fields,
  and edges.
- `execute(qJson : Text) : async Result` — query. Runs a JSON-encoded OQL query
  and returns matching rows. See the OQL documentation for the query grammar.

## Authentication and Authorization

The storefront does not gate its public methods on a signed-in caller:

- `listProducts`, `getProduct`, `getOrderStatus`, `getMyOrders`, `schema`,
  `execute`, and the HTTP outcall helpers are callable by any caller, including
  anonymous callers. `schema()` and `execute()` enforce per-entity
  authorization against the live caller (see \"OQL per-entity authorization\"
  below): private entities are readable only by the canister controller.
- The public order lookups (`getOrderStatus`, `getMyOrders`) return
  public-safe views that omit `customer_email`. The customer email is exposed
  ONLY through the ADMIN/OWNER-gated `adminListOrders` and
  `adminGetOrderDetail` (and the controller-only OQL `order` entity) — never
  in any public or customer-facing query.
- `createOrder`, `createCheckoutSession`, `getPaymentStatus`, and
  `handlePaymentConfirmation` are update methods and are likewise not
  restricted to a specific principal in the current source.
- The crypto checkout read methods (`getCryptoConfig`, `getMinimumOrder`,
  `getCryptoDepositInfo`, `getCryptoPaymentStatus`, `checkCryptoPayment`) are
  callable by any caller, including anonymous callers. `checkCryptoPayment` is
  read-only and can never mark an order paid — it only triggers an on-ledger
  re-check. There is no `confirmCryptoPayment` method: no arbitrary caller can
  confirm an order and mark it paid on their say-so. Verification is driven by
  the background verification timer and by a customer polling their OWN order
  via `checkCryptoPayment`, which marks an order `#paid` only when the actual
  on-ledger balance is at least the amount due. `sweepCryptoToTreasury` is
  ADMIN-ONLY (see below). `updateMinimumOrder` is admin-gated (see below).
- `isAdmin() : async Bool` is a public query that reports only on the caller:
  it returns `true` when the caller holds OWNER or ADMIN (the \"admin\" tier),
  and `false` otherwise (including STAFF). It never reveals other principals.

### Optional customer sign-in (order history)

Signing in with Internet Identity is OPTIONAL and is entirely separate from the
admin roles map. It is never required to browse, add to cart, check out, or pay
— by crypto or by card. Anonymous guest checkout remains the default path.

- When a customer is signed in (a non-anonymous caller) at the moment
  `createOrder` runs, their principal is stored on the order as
  `customer_principal : ?Principal`. When they are not signed in (the anonymous
  principal), `customer_principal` is `null` and the order proceeds exactly as
  before — it still gets its per-order subaccount and still confirms.
- `getMyOrders()` returns only the orders whose `customer_principal` matches
  the caller. It filters by `msg.caller` server-side and never accepts a
  principal as a parameter, so one customer can never read another customer's
  orders. It rejects the anonymous principal by returning an empty list. The
  returned records are public-safe views that omit `customer_email`.
- A customer who did not sign in has no `customer_principal` on their orders,
  so `getMyOrders()` returns an empty list for them. Their only way back to an
  order's status is the guest lookup `getOrderStatus(reference)` using the
  reference shown at checkout.
- Customer sign-in grants NO admin capability. The admin roles map is a
  separate, principal-based registry; signing in as a customer never grants the
  caller a role and never unlocks any role-gated method.

### Admin roles

Privileged configuration methods are gated by a role-based admin model stored
in stable state (survives upgrades). Each principal holds one of three roles:
`#owner` (full access, manages owners/admins/staff and roles), `#admin`
(everything except managing owners), or `#staff` (fulfilment only). The roles
map starts empty; the first principal claims ownership via
`claimInitialAdmin()`. Every privileged method binds its caller at the top of
the function (before any await), explicitly rejects the anonymous principal
(`2vxsx-fae`), and traps when the caller lacks the required role. There is
always at least one OWNER: the last owner cannot be demoted or revoked.

Admin management methods:

- `claimInitialAdmin() : async Bool` — one-time bootstrap. Sets the caller as
  the first OWNER (the highest role). Gated on the persistent
  `initialAdminClaimed` flag being `false` — NOT merely on the roles map being
  empty — so the one-time claim door stays permanently closed after first use
  even if the map is ever emptied. Returns `false` (and does nothing) when the
  flag is already `true` or the caller is anonymous. While the flag is still
  `false`, this is the recovery path for a locked-out draft admin: whoever
  signs in first (with a non-anonymous principal) can claim initial ownership
  again.
- `bootstrapOwner(p : Principal) : async Bool` — controller-only live
  bootstrap. Sets `p` as OWNER and marks `initialAdminClaimed` true WITHOUT
  ever opening the public claim path. Only the canister's controller (verified
  against the IC management canister) may invoke it; any other caller gets
  `false`. This is the distinct, documented live bootstrap the deploy pipeline
  calls once at publish time with the deployer's principal — live never exposes
  an open claim.
- `getMyRole() : async ?Role` — query. Public. Reports only the caller's role
  (`#owner`/`#admin`/`#staff`), or `null` when the caller is unregistered or
  anonymous. Never reveals other principals.
- `adminCount() : async Nat` — query. Public. Returns only the number of
  principals holding any role, never the principals themselves. A caller can
  use it to learn whether the claim door is open (count 0) without learning who
  the users are.
- `listUsers() : async [(Principal, UserRecord)]` — update. OWNER/ADMIN only.
  Lists every user as a `(principal, { role; grantedAt })` pair. Traps for a
  caller that is not OWNER or ADMIN.
- `listAdmins() : async [Principal]` — update. OWNER/ADMIN only. Returns the
  principals holding OWNER or ADMIN (the \"admin\" tier). Backward-compatible
  with the old listAdmins semantics. Traps for a caller that is not OWNER or
  ADMIN.
- `grantRole(p : Principal, role : Role) : async Bool` — update. Grants (or
  re-grants) a role. `#owner` and `#admin` grants require OWNER; `#staff`
  grants require ADMIN or OWNER. The last owner cannot demote themselves (or
  any owner) below OWNER. Returns `false` for the anonymous target principal.
- `revokeRole(p : Principal) : async Bool` — update. Revokes any role. OWNER
  may revoke owner/admin; ADMIN may revoke STAFF only. The last owner cannot
  revoke themselves. Returns `false` when `p` holds no role.
- `addAdmin(p : Principal) : async Bool` — update. Backward-compatible wrapper
  granting the ADMIN role. Requires OWNER (only the owner may create admins).
  Returns `false` when `p` is the anonymous principal. Traps for a non-owner
  caller.
- `removeAdmin(p : Principal) : async Bool` — update. Backward-compatible
  wrapper revoking any role. Requires OWNER. Returns `false` (and does nothing)
  when the last owner would remove themselves, so the canister can never be
  locked out. Traps for a non-owner caller.
- `isAdmin() : async Bool` — query. Public. Reports only on the caller:
  returns `true` when the caller holds OWNER or ADMIN (the \"admin\" tier);
  STAFF reports `false`.
- `resetAdminForMigration() : async Bool` — update. Controller-only. Clears the
  roles map and reopens the one-time claim path (`initialAdminClaimed :=
  false`). This is the safe mechanism for the DRAFT reset: only the canister's
  controller (verified against the IC management canister) may invoke it, so an
  emptied map can never be exploited by a non-controller. The deploy pipeline
  calls it on the DRAFT only; live never invokes it. Returns `false` for any
  non-controller caller.

### Permission matrix

Every privileged method binds its caller at the top of the function (before any
await), explicitly rejects the anonymous principal (`2vxsx-fae`), and traps
when the caller lacks the required role. The tiers are OWNER (full access),
ADMIN (everything except managing owners), and STAFF (fulfilment and
diagnostics only). STAFF can never change prices, treasury config, payment
settings, sweep funds, or manage users.

OWNER-only (managing owners and roles):

- `grantRole(p, #owner)` and `grantRole(p, #admin)` — granting or re-granting
  an owner or admin role requires OWNER.
- `revokeRole(p)` when `p` holds OWNER or ADMIN — revoking an owner or admin
  requires OWNER.
- `addAdmin(p)` and `removeAdmin(p)` — the backward-compatible admin wrappers
  require OWNER.
- Last-owner protection: when only one OWNER remains, `grantRole` (demoting an
  owner), `revokeRole`, and `removeAdmin` return `false` rather than removing
  the last owner, so the canister can never be locked out.

ADMIN or OWNER (financial, configuration, and order-management tier — STAFF is
never admitted):

- `createProduct`, `updateProduct` — catalogue edits; prices are integer cents.
- `updateMinimumOrder` — minimum crypto order total (USD cents).
- `updateTreasury`, `updateLedgerConfig` — treasury destination and ledger
  configuration.
- `updatePaymentServiceUrl`, `updatePaymentServiceToken` — payment service
  configuration; the token is write-only and never returned.
- `sweepCryptoToTreasury`, `releaseExpiredOrders`, `forceSweepOrder`,
  `sweepDefaultSubaccount`, `sweepSubaccount` — every fund-moving operation.
- `adminListOrders`, `adminGetOrderDetail` — order enumeration and full order
  detail for the admin UI.
- `markOrderShipped`, `resendConfirmationEmail` — shipping state mutation and
  transactional email triggers.
- `getConsentListCsv` — exports the consenting-address mailing list (PII).
- `listUsers`, `listAdmins` — user enumeration.
- `grantRole(p, #staff)` and `revokeRole(p)` on a STAFF target — ADMIN may
  grant and revoke STAFF only.

STAFF or above (fulfilment and diagnostics — the lowest tier):

- `getSubaccountBalance`, `getDefaultSubaccountBalance` — read-only on-ledger
  balance queries.
- `listOrdersForRecovery`, `forceRecheckPayment` — read-only order diagnosis.
- `listLatePayments`, `markLatePaymentReviewed` — late-payment review.
- `startVerificationTimer`, `stopVerificationTimer` — verification timer
  control.
- `listSubmissions` — artist submission review (PII).
- `getMyEncryptedIbeKey` — derives the caller's own IBE decryption key.

Public (no role required):

- `claimInitialAdmin` (one-time, gated on `initialAdminClaimed = false`),
  `getMyRole`, `adminCount`, `isAdmin`, `getResumeInfo`, `getCycleBalance`,
  `getCanisterId`, `getIbePublicKey`, `unsubscribe`, `submitSubmission`, the
  storefront read methods, the crypto read methods, and the HTTP outcall
  helpers.

There is no registration gate for the public storefront methods: no method
requires a signed-in (non-anonymous) caller for the public storefront methods,
and any caller may invoke any other public method. The admin surface is the one
place a role is required: the privileged configuration methods above require
OWNER or ADMIN (never STAFF), and the fulfilment methods require STAFF or
above. A caller is unregistered (holds no role) until it claims initial
ownership or an OWNER/ADMIN grants it a role; a principal that never did so is
unregistered even when it belongs to the app's owner, and a signed-in caller
derived against a different origin is a different principal than the one the
frontend registered.

The app's frontend pins an Internet Identity derivation origin so one II anchor
yields the SAME principal across the draft, live, and custom domains. The
frontend serves `/.well-known/ii-alternative-origins` from public assets,
listing the draft, live, and custom origins so II shares principals across
them. The canonical derivation origin is the deploy-time `env.json`
`ii_derivation_origin` value. An agent already holding the user's Internet
Identity authorization derives the correct per-app principal against that
origin (for example `icp identity link web <name> --app <host>`). Such a
delegation acts with the user's full authority in this app until it expires.

### Migration chain (stable state)

The canister uses the mops-managed enhanced migration chain in
`src/backend/migrations/`. Every stable field — including the `adminUsers`
roles map (`Map<Principal, UserRecord>`, one entry per principal holding a
role) and the persistent `initialAdminClaimed` flag — is declared type-only in
`main.mo` and seeded by the chain, which replays in lexicographic order on
fresh install and only the not-yet-applied files on upgrade. Every migration
carries `adminUsers` and `initialAdminClaimed` forward unchanged: both are part
of the stable signature, so an upgrade can never reset the roles map or reopen
the one-time claim path. Publishing to live can therefore never reset the live
roles map or reopen the claim door — the DRAFT reset is the separate,
controller-only `resetAdminForMigration` operation the deploy pipeline invokes
on the DRAFT only. The flag is what keeps the one-time `claimInitialAdmin` door
permanently closed after first use, even if the roles map is ever emptied.

### OQL per-entity authorization

OQL authorization is per entity and is enforced against the live caller on both
`schema()` and `execute()`:

- `product` — `#public_`: any caller (including anonymous) reads every product
  row.
- `order` — `#controllerOnly`: only the canister controller reads order rows;
  all other callers are denied. Order rows carry `customer_email` but are
  private and are never exposed to end users through OQL.
- `cryptoPayment` — `#controllerOnly`: only the canister controller reads
  crypto payment rows. Each row carries the per-order ICRC-1 subaccount, the
  amount due, and the payment status, so it is never exposed to end users.
- `cryptoConfig` — `#controllerOnly`: only the canister controller reads the
  single crypto configuration row (treasury destination and ledger configs).
  It is never exposed to end users.
- `paymentServiceConfig` — `#controllerOnly`: only the canister controller
  reads the single payment service configuration row. It exposes only the URL
  and a `token_set` boolean — the token value itself is never exposed through
  OQL.
- `latePayment` — `#controllerOnly`: only the canister controller reads late
  payment rows. Each row carries the order reference, token, received and
  expected amounts, the received timestamp, and the review flag. It is never
  exposed to end users.
- `admin` — `#controllerOnly`: only the canister controller reads the admin
  rows (one row per principal holding a role, keyed by the principal). Each row
  exposes the principal, its role (`owner`/`admin`/`staff`), and when the role
  was granted. It is never exposed to end users; role data is readable only
  through the role-gated `listUsers()` and `listAdmins()` methods (OWNER/ADMIN).

## Units and Encodings

- **Money**: `price`, `subtotal`, `tax`, `shipping`, `total`, and
  `unit_amount` are `Nat` values in the smallest currency unit (cents for USD).
  `currency` is a `Text` ISO code, currently `\"USD\"`. For card checkout, the
  `unitAmount` sent to the payment service is an INTEGER in cents (e.g. $35.00
  = 3500) and `quantity` is a positive integer.
- **Timestamps**: `created_at` and `updated_at` are `Int` values in
  nanoseconds since the Unix epoch (`Time.now()`).
- **Identifiers**: `Product.id` and `Order.id` are `Nat`. `Order.reference` is
  a `Text` of the form `NAK-` followed by 12 characters drawn from an
  unambiguous uppercase alphanumeric alphabet (excluding `0`, `O`, `1`, `I`,
  and `L`), generated from IC raw randomness with collision checking; it is the
  stable public lookup key and is NOT derived from the order id. Orders created
  before this scheme (legacy orders) keep their sequential `NAK-<id>`
  references unchanged.
- **Optional values**: `payment_reference` is `?Text` — `null` until a payment
  is recorded. `ShippingAddress.line2` is `?Text`. `shipped_at` is `?Int`
  (nanoseconds since epoch) — `null` until the order is shipped.
  `tracking_number` is `?Text` — `null` until an admin sets one when marking the
  order shipped. `marketing_consent_at` is `?Int` (nanoseconds since epoch) —
  `null` when the customer did not opt in to marketing.
- **Variants**: `payment_method` is one of `#manual`, `#card_stripe`,
  `#crypto_icp`, `#crypto_ckusdc`. `payment_status` is one of `#pending`,
  `#paid`, `#cancelled`, `#expired`. `shipping_status` is one of `#pending`,
  `#shipped` — `#pending` until an admin marks the order shipped.
- **Marketing consent**: `marketing_consent` is a `Bool` recording whether the
  customer opted in to marketing email at checkout. The checkbox is NEVER
  pre-checked; the frontend sends the customer's explicit choice.
  `marketing_consent_at` is the `?Int` timestamp (nanoseconds since epoch) at
  which consent was given — `null` when the customer did not opt in. Recording
  WHEN consent was given makes the record defensible under GDPR/CAN-SPAM.
  Transactional emails (order confirmation, shipping) are EXEMPT from consent
  and send regardless.
- **Crypto amounts**: `CryptoPayment.amountDue` and `DepositInfo.amountDue` are
  `Nat` values in the token's smallest units (e.g. ckUSDC has 6 decimals, so
  the amount due is `order.total * 10^4`). `DepositInfo.decimals` is the
  ledger's decimal count. `CryptoPayment.subaccount` is a 32-byte `Blob`
  (big-endian encoding of the order id) used as the ICRC-1 subaccount under
  this canister's own principal. The subaccount derivation is coupled to the
  sequential order id — NOT to the display reference — so the random-reference
  scheme leaves the derivation, existing orders, and the sweep logic unchanged.
- **Crypto status**: `CryptoPaymentStatus` is one of `#awaiting_payment`,
  `#paid : { blockIndex : Nat }`, `#underpayment`, `#overpayment`, `#expired`.
  `blockIndex` is the on-ledger block index of the sweep transfer.
- **Timestamps**: `CryptoPayment.expiresAt`, `createdAt`, `updatedAt` are `Int`
  values in nanoseconds since the Unix epoch (`Time.now()`). The deposit window
  is 30 minutes from payment creation.
- **OQL encodings**: In the OQL `product` entity, `images` is a comma-joined
  `Text` of the image URLs, `variants` is the `Nat` count of variants, and
  `admin_only` is a `Bool` flag indicating whether the product is hidden from
  the public /shop grid. In the OQL `order` entity, `items` is the `Nat` count
  of line items, `encrypted_shipping` is the IBE ciphertext blob as lowercase
  hex `Text` (or `\"\"` when the order has no encrypted shipping details),
  `has_shipping_details` is a `Bool` indicating whether the order carries
  encrypted shipping details, `payment_method`
  and `payment_status` are their tag names as `Text`, `payment_reference` is
  the reference `Text` or `\"\"` when unset, `sweep_note` is the most recent
  sweep outcome `Text` or `\"\"` when no sweep has been attempted or the last
  sweep succeeded, `shipping_status` is its tag name as `Text`
  (`pending`/`shipped`), `shipped_at` is the `Int` timestamp or `null` when not
  shipped, `tracking_number` is the tracking `Text` or `\"\"` when unset,
  `marketing_consent` is a `Bool`, and `marketing_consent_at` is the `Int`
  consent timestamp or `null` when the customer did not opt in.
- **OQL crypto encodings**: In the OQL `cryptoPayment` entity, `token` and
  `status` are their tag names as `Text` (`ckUSDC`/`ICP` and
  `awaiting_payment`/`paid`/`underpayment`/`overpayment`/`expired`),
  `subaccount` is the 32-byte ICRC-1 subaccount as lowercase hex `Text`,
  `confirmed_block_index` is the on-ledger block index `Nat` or `null` when no
  sweep has been confirmed, and the timestamp fields are `Int` nanoseconds
  since the Unix epoch. In the OQL `cryptoConfig` entity (a single row),
  `treasury_principal` is the treasury principal `Text`,
  `treasury_subaccount` is the optional treasury subaccount as lowercase hex
  `Text` (or `\"\"` when unset), and each ledger is flattened into
  `<token>_canister_id` (`Text`), `<token>_decimals` (`Nat`), and
  `<token>_fee` (`Nat`) columns for `ckusdc` and `icp`.
- **OQL payment service encoding**: In the OQL `paymentServiceConfig` entity (a
  single row), `url` is the configured payment service URL `Text` and
  `token_set` is a `Bool` indicating whether the write-only token has been set.
  The token value itself is never exposed.
- **OQL late payment encoding**: In the OQL `latePayment` entity, `reference`
  is the order reference `Text` (the primary key), `token` is the token tag
  name as `Text` (`ckUSDC`/`ICP`), `received_amount` and `expected_amount` are
  `Nat` values in the token's smallest units, `received_at` is an `Int`
  timestamp in nanoseconds since the Unix epoch, and `reviewed` is a `Bool`
  flag indicating whether an admin has reviewed the late payment.
- **OQL admin encoding**: In the OQL `admin` entity, each row exposes the
  principal key as `principal` (`Text`), the role tag name as `role` (`Text`,
  `owner`/`admin`/`staff`), and `granted_at` (`Int` nanoseconds since the Unix
  epoch — when the role was granted).

## Lifecycle and Polling

An order is created with `payment_status = #pending`. Its status transitions to
`#paid`, `#cancelled`, or `#expired` only through the payment adapter's
confirmation path (`handlePaymentConfirmation`) or status updates. The default
`cryptoAdapter` never changes an order's status on its own, so orders remain
`#pending` until a real payment adapter is configured.

For a crypto order (`#crypto_ckusdc`), the lifecycle is:

1. `createOrder` creates the order and, through the adapter, a
   `CryptoPayment` with status `#awaiting_payment` and a 30-minute deposit
   window. Inventory is reserved (decremented) at order creation. While the
   `CKUSDC_CHECKOUT_ENABLED` flag is `false`, `createOrder` rejects a new
   `#crypto_ckusdc` order with `#err(#ckUSDCDisabled)` and the adapter rejects
   the checkout session, so no new ckUSDC payment is created. This flag governs
   creation only: existing ckUSDC orders continue through the full lifecycle
   below unchanged.
2. The customer sends ckUSDC to the deposit address (this canister's principal)
   with the order's subaccount.
3. The frontend polls `checkCryptoPayment(reference)` (or reads
   `getCryptoPaymentStatus`) to observe `#awaiting_payment`, `#underpayment`,
   or `#paid`. Overpayment is accepted and reported as `#paid` (the excess is
   swept with the principal). `checkCryptoPayment` is read-only: it only
   triggers an on-ledger re-check and can never mark an order paid on its own.
4. When the balance is at least the amount due, the payment is marked `#paid`
   and swept to the treasury. This is driven by the background verification
   timer and by a customer polling their OWN order via
   `checkCryptoPayment(reference)` — which only ever triggers an on-ledger
   re-check and marks the payment `#paid` only when the actual on-ledger
   balance is at least the amount due. No arbitrary caller can confirm an
   arbitrary reference and mark it paid without a real on-ledger balance check.
5. If the deposit window expires without confirmation,
   `releaseInventoryOnExpiry` (admin-only) restores the reserved inventory and
   marks the order and payment `#expired`.

For a card order (`#card_stripe`), the lifecycle is:

1. `createOrder` creates the order with `payment_status = #pending` and
   `payment_method = #card_stripe`. Inventory is reserved (decremented) at
   order creation.
2. `createCardCheckoutSession(reference, successUrl, cancelUrl)` makes an HTTPS
   outcall POST to `{PAYMENT_SERVICE_URL}/create-checkout-session` with the
   authoritative server-side order total and line items, and returns the
   Stripe-hosted `checkoutUrl` to redirect the customer to.
3. Stripe returns the customer to `successUrl` or `cancelUrl` (with the order
   reference). The success page MUST NOT mark the order paid — it polls the
   canister.
4. The frontend polls `confirmCardPayment(reference)`, which makes an HTTPS
   outcall GET to `{PAYMENT_SERVICE_URL}/order-status/{reference}`. Only when
   the server-side status is `\"paid\"` is the order marked `#paid`, the returned
   `paymentReference` recorded as `payment_reference`, and inventory
   decremented.
5. On the cancelled path, `cancelCardOrder(reference)` releases the reserved
   inventory and marks the order `#cancelled`, and the customer is offered a
   return to the cart.

To check an order's status, poll `getOrderStatus(reference)` (a query) or
`getPaymentStatus(reference)`. Polling is safe and idempotent — these methods
only read state and never mutate it. There is no built-in timer; the frontend
drives polling, and a backend timer check can call `checkCryptoPayment` /
`releaseInventoryOnExpiry` to advance expired payments.

### Recurring verification timer

The backend runs a recurring payment-verification timer every 30 seconds
(`Timer.recurringTimer<system>(#seconds(30), ...)`). It is auto-registered on
canister init and post-upgrade (transient fields are re-initialized on every
restart and timers are not persisted across upgrades), so verification runs
independent of any browser tab even if no admin ever calls
`startVerificationTimer`. Each pass (`runVerificationPass`) re-checks pending
crypto payments against the ledger, confirms and sweeps paid ones, releases
inventory on expiry, and records any late payment received after the deposit
window expired. An admin can restart the timer with `startVerificationTimer`
or stop it with `stopVerificationTimer`; both are admin-only.

### Late payment handling

When a payment arrives on an order's subaccount AFTER the deposit window has
expired, it is recorded as a `LatePayment` (reference, token, received and
expected amounts, received timestamp, `reviewed = false`) and is NEVER
discarded. It is surfaced to admins through `listLatePayments()` and through
the OQL `latePayment` entity (controller-only), and an admin marks it reviewed
via `markLatePaymentReviewed(reference)`. This ensures funds that arrive late
are never silently lost and are always flagged for admin recovery.

## Mutation Retry Safety

- `createOrder` is not idempotent: each successful call creates a new order
  with a new `reference` and decrements inventory. Retrying a failed
  `createOrder` (one that returned an `OrderError`) has no side effect because
  the order is only created after full validation succeeds. Do not retry a
  successful `createOrder` expecting the same order — it will create a
  duplicate.
- `createPayment` (invoked through the adapter on `createCheckoutSession`) is
  idempotent: creating a payment for a reference that already has one returns
  the existing payment and does not create a duplicate.
- `checkCryptoPayment` is idempotent and read-only: it only triggers an
  on-ledger re-check and never double-sweeps, never double-decrements inventory
  (inventory is reserved once at order creation and only released on expiry),
  and never duplicates the order. There is no `confirmCryptoPayment` method —
  no arbitrary caller can confirm an order and mark it paid on their say-so.
- `releaseInventoryOnExpiry` is idempotent: it only releases inventory and marks
  the payment `#expired` once; a second call on an already-expired or already-
  paid payment is a no-op.
- `handlePaymentConfirmation` delegates to the payment adapter. The default
  adapter is a no-op.
- `createCheckoutSession` and `getPaymentStatus` are read/forwarding methods
  with no destructive effect in the default adapter.
- `confirmCardPayment` is idempotent: confirming an already-paid order returns
  the existing `#paid` status without re-decrementing inventory or duplicating
  the order. Inventory is reserved once at order creation and only released on
  cancellation or expiry.
- `cancelCardOrder` is idempotent: cancelling an already-cancelled or
  already-paid order is a no-op and does not double-release inventory.
- `createCardCheckoutSession` is safe to retry: it only creates a Stripe
  checkout session and never marks the order paid or mutates inventory.
- `forceSweepOrder` and `sweepDefaultSubaccount` are safe to retry: a sweep
  transfers the current subaccount balance minus the ledger transfer fee to the
  treasury, so a retry after a successful sweep finds a zero (or fee-only)
  balance and is a no-op rather than double-transferring. `forceRecheckPayment`
  only reads the ledger and never mutates state. `markLatePaymentReviewed` is
  idempotent: marking an already-reviewed late payment is a no-op that still
  returns `true` when the reference exists. `startVerificationTimer` /
  `stopVerificationTimer` are idempotent: starting cancels any existing timer
  before registering a fresh one, and stopping a stopped timer returns `false`.

## Errors, Traps, Limits, and Gotchas

- `createOrder` returns an `OrderError` variant rather than trapping for
  caller-correctable problems: `#emptyOrder`, `#unknownProduct(id)`,
  `#productInactive(id)`, `#unknownVariant(id, variantId)`,
  `#outOfStock(id, variantId)`, `#invalidQuantity`, `#paymentFailed(msg)`,
  `#belowMinimumOrder(minimum)` (the crypto order total is below the configured
  minimum order total, in cents), and `#ckUSDCDisabled` (ckUSDC checkout is
  temporarily disabled — the `CKUSDC_CHECKOUT_ENABLED` flag is `false`; a new
  ckUSDC order is rejected while existing ckUSDC orders are unaffected).
- `getProduct` returns `null` for an unknown slug or id — it does not trap.
- `getOrderStatus` and `getPaymentStatus` return `null` / `#pending`
  respectively for an unknown reference — they do not trap.
- The crypto methods return a `CryptoPaymentError` variant for
  caller-correctable problems: `#notFound`, `#expired`, `#underpayment`,
  `#overpayment`, `#unauthorized`, `#invalidConfig`, `#ledgerError`,
  `#sweepFailed`, and `#notCryptoOrder`. They do not trap on these.
- The recovery methods return a `RecoveryError` variant for caller-correctable
  problems: `#notFound`, `#notCryptoOrder`, `#unauthorized`,
  `#invalidConfig(msg)`, `#ledgerError(msg)`, and `#sweepFailed(msg)`. Ledger
  errors are NEVER swallowed — the exact ledger error text is carried in the
  `msg` payload so an admin can act on it. The recovery methods that return a
  `SweepResult` / `RecheckResult` put any ledger error in the result's `error`
  field rather than trapping.
- All recovery methods except `getResumeInfo` and `getCycleBalance` are
  role-gated and TRAP for a caller that is not a non-anonymous STAFF or above
  (ADMIN or OWNER for the sweep/mutating methods) and for the anonymous
  principal. `getResumeInfo` and `getCycleBalance` are public queries and do
  not require a role.
- The admin-gated methods (`updateTreasury`, `updateLedgerConfig`,
  `updatePaymentServiceUrl`, `updatePaymentServiceToken`, `addAdmin`,
  `removeAdmin`, `listAdmins`, `sweepCryptoToTreasury`, `releaseExpiredOrders`,
  `adminListOrders`, `adminGetOrderDetail`, `createProduct`, `updateProduct`)
  TRAP for a caller that is not a non-anonymous ADMIN or OWNER, and for the
  anonymous principal. This is an authorization failure, not a
  caller-correctable error, so it reaches the caller as a reject rather than a
  `Result` error. `claimInitialAdmin` returns `false` (rather than trapping)
  when the persistent `initialAdminClaimed` flag is already `true` or the
  caller is anonymous.
- `checkCryptoPayment` returns `#err(#expired)` once the deposit window has
  passed; it never marks a payment paid from a frontend claim — only an
  on-ledger balance at least the amount due counts. `checkCryptoPayment` is
  read-only (it only triggers an on-ledger re-check and can never mark an order
  paid). There is no `confirmCryptoPayment` method: no arbitrary caller can
  confirm an order and mark it paid on their say-so — verification is driven by
  the background verification timer and by a customer polling their OWN order.
- The sweep transfers `balance - fee` to the treasury and returns
  `#err(#sweepFailed)` when the balance cannot cover the transfer fee. The
  transfer fee is queried at runtime via `icrc1_fee` on the configured ledger
  and cached briefly between sweeps; the hardcoded ledger fee is used only as a
  fallback when the query fails. When the subaccount balance is not greater
  than the fee, the sweep is skipped, the funds are left in the subaccount, and
  a note is recorded on the order (`sweep_note`) rather than failing
  repeatedly. Sweep failures — including low cycles — are recorded as a clear
  note on the order (`sweep_note`) rather than failing silently or trapping.
- ICP payments are disabled: `#crypto_icp` orders are rejected with a
  `#paymentFailed` error because no rate oracle is configured. Do not guess or
  hardcode an ICP exchange rate.
- The HTTP outcall helpers return raw `Text` responses and do not parse or
  validate the payload; the caller is responsible for interpreting the JSON.
- OQL `execute` traps on a malformed query or an unknown entity name (there is
  no structured error envelope). Validate queries against `schema()` first.
- The payment adapter is `transient` and recreated on every restart; the
  default `cryptoAdapter` performs real ckUSDC payment creation and ledger
  sweeps. Configure a real adapter before relying on payment confirmation.
- The card payment methods return a `PaymentServiceError` variant for
  caller-correctable problems: `#notFound`, `#notConfigured(msg)`,
  `#outcallFailed(msg)`, `#invalidResponse(msg)`, `#unauthorized`, and
  `#alreadyPaid`. They do not trap on these.
- `createCardCheckoutSession` returns `#err(#notConfigured)` when
  `PAYMENT_SERVICE_URL` or `PAYMENT_SERVICE_TOKEN` is unset, and
  `#err(#outcallFailed)` when the payment service is unreachable. In both cases
  the order is left `#pending` — never silently marked paid.
- `confirmCardPayment` returns `#err(#outcallFailed)` when the payment service
  is unreachable, leaving the order `#pending`. It never marks an order paid
  from a frontend claim — only a server-side `order-status` of `\"paid\"` counts.
- **No Stripe secret key exists anywhere in the codebase.** Canister state is
  replicated across independent node providers and is not confidential storage.
  Stripe credentials live only in the external payment service, reached over
  HTTPS outcall. The canister authenticates to that service with the shared
  bearer token.
- `PAYMENT_SERVICE_URL` and `PAYMENT_SERVICE_TOKEN` are admin-configurable at
  runtime via `updatePaymentServiceUrl` / `updatePaymentServiceToken` and are
  never hardcoded in source. The token is write-only: it is stored but never
  returned to any caller (including through OQL, which exposes only the URL and
  a `token_set` boolean).
- HTTPS outcalls cost cycles. The outcall is configured with an appropriate
  cycles amount; if an outcall fails due to insufficient cycles, the card
  methods return a clear `#err(#outcallFailed)` error rather than crashing.
- The card checkout transform (`paymentServiceTransform`) strips every response
  header (Date, request IDs, Stripe trace headers) so outcall responses are
  identical across replicas — required for IC consensus.
- The submission methods return a `SubmissionError` variant for
  caller-correctable problems: `#notConfigured(msg)`, `#outcallFailed(msg)`,
  `#invalidResponse(msg)`, `#honeypot`, `#rateLimited`, and `#invalidInput(msg)`.
  They do not trap on these. `submitSubmission` returns `#err(#honeypot)` when
  the honeypot field is filled (a bot), `#err(#rateLimited)` when the caller
  exceeds the per-principal rate limit, and `#err(#invalidInput)` for a missing
  name, malformed email, non-URL link, or a message over 1000 characters.
  `listSubmissions` is role-gated and TRAPS for a caller that is not a
  non-anonymous STAFF or above (and for the anonymous principal) — an
  authorization failure, not a caller-correctable error.
- Submission timestamps (`submittedAt`, `marketingConsentAt`) are `Int` values
  in nanoseconds since the Unix epoch (`Time.now()`), parsed from the payment
  service's ISO-8601 UTC timestamps. `marketingConsentAt` is `null` when the
  submitter did not opt in to marketing.
"
  };
};
