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
  the catalogue (products whose `active` field is `true`).
- `getProduct(slugOrId : Text) : async ?Product` — query. Looks up a product by
  its `slug`, or by its numeric `id` when the argument parses as a `Nat`.
  Returns `null` when no product matches.
- `createOrder(input : CreateOrderInput) : async Result<Order, OrderError>` —
  update. Validates the order server-side (product exists and is active,
  variant exists, quantity is at least 1, stock is sufficient), computes the
  authoritative subtotal, tax (8%), shipping (free at or above 5000 units,
  otherwise 500), and total from the product records — never from
  browser-submitted prices. Creates the order with `payment_status = #pending`
  and a unique `reference` of the form `NAK-<id>`, then hands it to the
  payment adapter's `createCheckoutSession`. On success returns the created
  order; on failure returns an `OrderError` variant.
- `getOrderStatus(reference : Text) : async ?Order` — query. Returns the order
  with the given `reference`, or `null` if none exists.

### Payment adapter

- `createCheckoutSession(order : Order) : async Result<CheckoutSession,
  PaymentError>` — update. Delegates to the configured payment adapter. The
  default `cryptoAdapter` creates a crypto payment for `#crypto_ckusdc` orders,
  rejects `#crypto_icp` as disabled, and falls back to the manual adapter for
  other payment methods.
- `getPaymentStatus(reference : Text) : async PaymentStatus` — update. Returns
  the current payment status of the order with the given `reference`, or
  `#pending` if no such order exists.
- `handlePaymentConfirmation(payload : Text) : async Result<(), PaymentError>`
  — update. Delegates to the payment adapter to process a payment
  confirmation. The default adapter always returns `#ok()`.

### Crypto checkout (ckUSDC via ICRC-1)

- `getCryptoConfig() : async CryptoConfigView` — query. Returns the current
  crypto configuration: the treasury principal and subaccount, and the ckUSDC
  and ICP ledger configurations (canister id, decimals, fee). ICP is present in
  the config but is DISABLED for payments — no rate oracle is configured, so
  ICP is never offered and any attempt to pay with ICP is rejected.
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
  the amount due — never from a frontend claim.
- `confirmCryptoPayment(reference : Text) : async Result<CryptoPaymentStatus,
  CryptoPaymentError>` — update. Verifies the on-ledger balance; when it is at
  least the amount due, sweeps the funds to the treasury, records the on-ledger
  block index, and marks the payment `#paid`. Idempotent: confirming an
  already-paid payment returns the existing status without re-sweeping or
  re-confirming.
- `sweepCryptoToTreasury(reference : Text) : async Result<Nat,
  CryptoPaymentError>` — update. Transfers the subaccount balance minus the
  ledger transfer fee to the treasury and returns the on-ledger block index.
  Never transfers more than `balance - fee`, so the sweep cannot fail on
  insufficient funds and never leaves the subaccount unable to cover the fee.
- `updateTreasury(principal : Principal, subaccount : ?Blob) : async
  Result<(), CryptoPaymentError>` — update. Admin-only (controller). Updates
  the treasury principal and optional subaccount that confirmed funds are swept
  to. Returns `#err(#unauthorized)` for a non-controller caller.
- `updateLedgerConfig(token : Token, canisterId : Principal, decimals : Nat8,
  fee : Nat) : async Result<(), CryptoPaymentError>` — update. Admin-only
  (controller). Updates the ledger configuration (canister id, decimals,
  transfer fee) for the given token. Returns `#err(#unauthorized)` for a
  non-controller caller.

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

### OQL query layer

- `schema() : async Text` — query. Returns a JSON catalogue of the queryable
  entities (`product`, `order`, `cryptoPayment`, `cryptoConfig`), their primary
  keys, fields, and edges.
- `execute(qJson : Text) : async Result` — query. Runs a JSON-encoded OQL query
  and returns matching rows. See the OQL documentation for the query grammar.

## Authentication and Authorization

The storefront does not gate its public methods on a signed-in caller:

- `listProducts`, `getProduct`, `getOrderStatus`, `schema`, `execute`, and the
  HTTP outcall helpers are callable by any caller, including anonymous callers.
- `createOrder`, `createCheckoutSession`, `getPaymentStatus`, and
  `handlePaymentConfirmation` are update methods and are likewise not
  restricted to a specific principal in the current source.
- The crypto checkout read methods (`getCryptoConfig`, `getCryptoDepositInfo`,
  `getCryptoPaymentStatus`, `checkCryptoPayment`, `confirmCryptoPayment`,
  `sweepCryptoToTreasury`) are callable by any caller, including anonymous
  callers.

Two crypto configuration methods are admin-only and require a controller
caller:

- `updateTreasury` and `updateLedgerConfig` check `Principal.isController(caller)`
  and return `#err(#unauthorized)` for any non-controller caller. Only the
  canister controller may change the treasury destination or the ledger
  configuration.

There is no registration gate and no role model in this backend: no method
requires a signed-in (non-anonymous) caller, and no method distinguishes owner,
admin, or anonymous callers beyond the controller check on the two config
methods above. Any caller may invoke any other public method.

The app's frontend pins an Internet Identity derivation origin, published at
`/.well-known/ii-derivation-origin` when available. An agent already holding
the user's Internet Identity authorization derives the correct per-app
principal against that origin (for example `icp identity link web <name>
--app <host>`). Such a delegation acts with the user's full authority in this
app until it expires.

### OQL per-entity authorization

OQL authorization is per entity and is enforced against the live caller on both
`schema()` and `execute()`:

- `product` — `#public_`: any caller (including anonymous) reads every product
  row.
- `order` — `#controllerOnly`: only the canister controller reads order rows;
  all other callers are denied. Order rows are private and are not exposed to
  end users through OQL.
- `cryptoPayment` — `#controllerOnly`: only the canister controller reads
  crypto payment rows. Each row carries the per-order ICRC-1 subaccount, the
  amount due, and the payment status, so it is never exposed to end users.
- `cryptoConfig` — `#controllerOnly`: only the canister controller reads the
  single crypto configuration row (treasury destination and ledger configs).
  It is never exposed to end users.

## Units and Encodings

- **Money**: `price`, `subtotal`, `tax`, `shipping`, `total`, and
  `unit_amount` are `Nat` values in the smallest currency unit (cents for USD).
  `currency` is a `Text` ISO code, currently `\"USD\"`.
- **Timestamps**: `created_at` and `updated_at` are `Int` values in
  nanoseconds since the Unix epoch (`Time.now()`).
- **Identifiers**: `Product.id` and `Order.id` are `Nat`. `Order.reference` is
  a `Text` of the form `NAK-<id>` and is the stable public lookup key.
- **Optional values**: `payment_reference` is `?Text` — `null` until a payment
  is recorded. `ShippingAddress.line2` is `?Text`.
- **Variants**: `payment_method` is one of `#manual`, `#card_stripe`,
  `#crypto_icp`, `#crypto_ckusdc`. `payment_status` is one of `#pending`,
  `#paid`, `#cancelled`, `#expired`.
- **Crypto amounts**: `CryptoPayment.amountDue` and `DepositInfo.amountDue` are
  `Nat` values in the token's smallest units (e.g. ckUSDC has 6 decimals, so
  the amount due is `order.total * 10^4`). `DepositInfo.decimals` is the
  ledger's decimal count. `CryptoPayment.subaccount` is a 32-byte `Blob`
  (big-endian encoding of the order id) used as the ICRC-1 subaccount under
  this canister's own principal.
- **Crypto status**: `CryptoPaymentStatus` is one of `#awaiting_payment`,
  `#paid : { blockIndex : Nat }`, `#underpayment`, `#overpayment`, `#expired`.
  `blockIndex` is the on-ledger block index of the sweep transfer.
- **Timestamps**: `CryptoPayment.expiresAt`, `createdAt`, `updatedAt` are `Int`
  values in nanoseconds since the Unix epoch (`Time.now()`). The deposit window
  is 30 minutes from payment creation.
- **OQL encodings**: In the OQL `product` entity, `images` is a comma-joined
  `Text` of the image URLs, and `variants` is the `Nat` count of variants. In
  the OQL `order` entity, `items` is the `Nat` count of line items,
  `shipping_address` is a comma-joined `Text`, `payment_method` and
  `payment_status` are their tag names as `Text`, and `payment_reference` is
  the reference `Text` or `\"\"` when unset.
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

## Lifecycle and Polling

An order is created with `payment_status = #pending`. Its status transitions to
`#paid`, `#cancelled`, or `#expired` only through the payment adapter's
confirmation path (`handlePaymentConfirmation`) or status updates. The default
`cryptoAdapter` never changes an order's status on its own, so orders remain
`#pending` until a real payment adapter is configured.

For a crypto order (`#crypto_ckusdc`), the lifecycle is:

1. `createOrder` creates the order and, through the adapter, a
   `CryptoPayment` with status `#awaiting_payment` and a 30-minute deposit
   window. Inventory is reserved (decremented) at order creation.
2. The customer sends ckUSDC to the deposit address (this canister's principal)
   with the order's subaccount.
3. The frontend polls `checkCryptoPayment(reference)` (or reads
   `getCryptoPaymentStatus`) to observe `#awaiting_payment`, `#underpayment`,
   or `#paid`. Overpayment is accepted and reported as `#paid` (the excess is
   swept with the principal).
4. When the balance is at least the amount due, `confirmCryptoPayment(reference)`
   sweeps the funds to the treasury, records the block index, and marks the
   payment `#paid`.
5. If the deposit window expires without confirmation,
   `releaseInventoryOnExpiry` restores the reserved inventory and marks the
   order and payment `#expired`.

To check an order's status, poll `getOrderStatus(reference)` (a query) or
`getPaymentStatus(reference)`. Polling is safe and idempotent — these methods
only read state and never mutate it. There is no built-in timer; the frontend
drives polling, and a backend timer check can call `checkCryptoPayment` /
`releaseInventoryOnExpiry` to advance expired payments.

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
- `confirmCryptoPayment` is idempotent: confirming an already-paid payment
  returns the existing `#paid` status without re-sweeping or re-confirming. It
  never double-decrements inventory (inventory is reserved once at order
  creation and only released on expiry) and never duplicates the order.
- `releaseInventoryOnExpiry` is idempotent: it only releases inventory and marks
  the payment `#expired` once; a second call on an already-expired or already-
  paid payment is a no-op.
- `handlePaymentConfirmation` delegates to the payment adapter. The default
  adapter is a no-op.
- `createCheckoutSession` and `getPaymentStatus` are read/forwarding methods
  with no destructive effect in the default adapter.

## Errors, Traps, Limits, and Gotchas

- `createOrder` returns an `OrderError` variant rather than trapping for
  caller-correctable problems: `#emptyOrder`, `#unknownProduct(id)`,
  `#productInactive(id)`, `#unknownVariant(id, variantId)`,
  `#outOfStock(id, variantId)`, `#invalidQuantity`, and `#paymentFailed(msg)`.
- `getProduct` returns `null` for an unknown slug or id — it does not trap.
- `getOrderStatus` and `getPaymentStatus` return `null` / `#pending`
  respectively for an unknown reference — they do not trap.
- The crypto methods return a `CryptoPaymentError` variant for
  caller-correctable problems: `#notFound`, `#expired`, `#underpayment`,
  `#overpayment`, `#unauthorized`, `#invalidConfig`, `#ledgerError`,
  `#sweepFailed`, and `#notCryptoOrder`. They do not trap on these.
- `checkCryptoPayment` and `confirmCryptoPayment` return `#err(#expired)` once
  the deposit window has passed; they never mark a payment paid from a
  frontend claim — only an on-ledger balance at least the amount due counts.
- The sweep transfers `balance - fee` to the treasury and returns
  `#err(#sweepFailed)` when the balance cannot cover the transfer fee.
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
"
  };
};
