import type {
  CheckoutSession,
  CryptoConfigView,
  CryptoPaymentError,
  CryptoPaymentStatus,
  DepositInfo,
  LedgerConfig,
  Order,
  PaymentMethod,
  PaymentServiceConfigView,
  PaymentServiceError,
  PaymentStatus,
  Product,
  Token,
} from "@/backend";

export type {
  CheckoutSession,
  CryptoConfigView,
  CryptoPaymentError,
  CryptoPaymentStatus,
  DepositInfo,
  LedgerConfig,
  Order,
  PaymentMethod,
  PaymentServiceConfigView,
  PaymentServiceError,
  PaymentStatus,
  Product,
  Token,
};

/** A single line item in the shopping cart. */
export interface CartItem {
  product: Product;
  variantId: string;
  quantity: number;
}
