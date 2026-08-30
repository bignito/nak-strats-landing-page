import type { backendInterface } from "../backend";
import { PaymentMethod, PaymentStatus, Token } from "../backend";

const sampleProduct = {
  id: 1n,
  updated_at: 1700000000000000000n,
  active: true,
  inventory: 10n,
  name: "NAK Shell Tee",
  slug: "nak-shell-tee",
  description: "A premium NAK STRATS tee.",
  variants: [
    {
      id: "v1",
      inventory: 5n,
      name: "Black / M",
      size: "M",
      price: 3500n,
    },
  ],
  created_at: 1700000000000000000n,
  currency: "usd",
  category: "apparel",
  price: 3500n,
  images: [],
};

const sampleOrder = {
  id: 1n,
  tax: 0n,
  updated_at: 1700000000000000000n,
  total: 3500n,
  shipping_address: {
    region: "Kanto",
    country: "Japan",
    city: "Neo Tokyo",
    postal_code: "100-0001",
    line1: "123 Neon Avenue",
  },
  shipping: 0n,
  reference: "NAK-000001",
  created_at: 1700000000000000000n,
  payment_status: PaymentStatus.pending,
  payment_method: PaymentMethod.crypto_ckusdc,
  currency: "usd",
  items: [
    {
      product_id: 1n,
      unit_amount: 3500n,
      name: "NAK Shell Tee",
      variant_id: "v1",
      quantity: 1n,
    },
  ],
  customer_email: "jane@example.com",
  customer_name: "Jane Doe",
  subtotal: 3500n,
};

export const mockBackend: backendInterface = {
  addAdmin: async () => true,
  cancelCardOrder: async () => ({ __kind__: "ok", ok: null }),
  claimInitialAdmin: async () => true,
  isAdmin: async () => true,
  listAdmins: async () => [],
  removeAdmin: async () => true,
  checkCryptoPayment: async () => ({
    __kind__: "ok",
    ok: { __kind__: "awaiting_payment", awaiting_payment: null },
  }),
  confirmCardPayment: async () => ({ __kind__: "ok", ok: PaymentStatus.paid }),
  confirmCryptoPayment: async () => ({
    __kind__: "ok",
    ok: { __kind__: "paid", paid: { blockIndex: 1n } },
  }),
  createCardCheckoutSession: async () => ({
    __kind__: "ok",
    ok: { reference: "NAK-000001", url: "https://checkout.stripe.com/test" },
  }),
  createCheckoutSession: async () => ({
    __kind__: "ok",
    ok: { reference: "NAK-000001" },
  }),
  createOrder: async () => ({ __kind__: "ok", ok: sampleOrder }),
  execute: async () => ({ hasMore: false, rows: [] }),
  getApiDoc: async () => "api doc",
  getCryptoConfig: async () => ({
    icp: {
      fee: 10000n,
      decimals: 8,
      canisterId: "aaaaa-aa" as never,
    },
    ckUSDC: {
      fee: 10000n,
      decimals: 8,
      canisterId: "aaaaa-aa" as never,
    },
    treasuryPrincipal: "aaaaa-aa" as never,
  }),
  getCryptoDepositInfo: async () => ({
    __kind__: "ok",
    ok: {
      decimals: 8,
      token: Token.ckUSDC,
      expiresAt: 1700000000000000000n + 1800000000000n,
      qrPayload: "icp:abc",
      subaccount: new Uint8Array(32),
      reference: "NAK-000001",
      address: "aaaaa-aa" as never,
      amountDue: 3500000000n,
    },
  }),
  getCryptoPaymentStatus: async () => ({
    __kind__: "ok",
    ok: { __kind__: "awaiting_payment", awaiting_payment: null },
  }),
  getDashboardData: async () => "{}",
  getNAKPrice: async () => "1.00",
  getOrderStatus: async () => sampleOrder,
  getPaymentServiceConfig: async () => ({
    url: "",
    tokenSet: false,
  }),
  getPaymentStatus: async () => PaymentStatus.pending,
  getProduct: async () => sampleProduct,
  getTokenImage: async () => "",
  getTokenProfile: async () => "",
  getTreasuryTokens: async () => "[]",
  handlePaymentConfirmation: async () => ({ __kind__: "ok", ok: null }),
  listProducts: async () => [sampleProduct],
  paymentServiceTransform: async (input) => ({
    status: input.response.status,
    body: input.response.body,
    headers: [],
  }),
  releaseExpiredOrders: async () => 0n,
  schema: async () => "{}",
  sweepCryptoToTreasury: async () => ({ __kind__: "ok", ok: 1n }),
  transform: async (input) => ({
    status: input.response.status,
    body: input.response.body,
    headers: [],
  }),
  updateLedgerConfig: async () => ({ __kind__: "ok", ok: null }),
  updatePaymentServiceToken: async () => ({ __kind__: "ok", ok: null }),
  updatePaymentServiceUrl: async () => ({ __kind__: "ok", ok: null }),
  updateTreasury: async () => ({ __kind__: "ok", ok: null }),
};
