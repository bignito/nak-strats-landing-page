import type {
  AdminOrderDetail,
  AdminOrderView,
  CheckoutSession,
  CryptoConfigView,
  CryptoPaymentError,
  CryptoPaymentStatus,
  DepositAccount,
  DepositInfo,
  LatePayment,
  LedgerConfig,
  Order,
  OrderError,
  OrderRecoveryView,
  PaymentMethod,
  PaymentServiceConfigView,
  PaymentServiceError,
  PaymentStatus,
  Product,
  RecheckResult,
  RecoveryError,
  ResumeInfo,
  SweepResult,
  Token,
} from "@/backend";
import { encodeIcrcAccount } from "@dfinity/ledger-icrc";

export type {
  AdminOrderDetail,
  AdminOrderView,
  CheckoutSession,
  CryptoConfigView,
  CryptoPaymentError,
  CryptoPaymentStatus,
  DepositAccount,
  DepositInfo,
  LatePayment,
  LedgerConfig,
  Order,
  OrderError,
  OrderRecoveryView,
  PaymentMethod,
  PaymentServiceConfigView,
  PaymentServiceError,
  PaymentStatus,
  Product,
  RecheckResult,
  RecoveryError,
  ResumeInfo,
  SweepResult,
  Token,
};

/** A single line item in the shopping cart. */
export interface CartItem {
  product: Product;
  variantId: string;
  quantity: number;
}

/**
 * Build the canonical ICRC-1 textual account string for a deposit from its
 * owner principal and (optional) subaccount. When a non-default subaccount is
 * in use this yields `principal-checksum.subaccounthex`; otherwise it is just
 * the bare principal. This is the exact string a wallet must be sent to, so it
 * is used for both the copyable address and the QR value.
 */
export function depositAccountString(deposit: DepositInfo): string {
  return encodeIcrcAccount({
    owner: deposit.address,
    subaccount: deposit.subaccount,
  });
}
