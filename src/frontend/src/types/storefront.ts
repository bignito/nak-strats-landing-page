import type {
  CryptoConfigView,
  CryptoPaymentError,
  CryptoPaymentStatus,
  DepositInfo,
  LedgerConfig,
  Order,
  PaymentMethod,
  PaymentStatus,
  Product,
  Token,
} from "@/backend";

export type {
  CryptoConfigView,
  CryptoPaymentError,
  CryptoPaymentStatus,
  DepositInfo,
  LedgerConfig,
  Order,
  PaymentMethod,
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
