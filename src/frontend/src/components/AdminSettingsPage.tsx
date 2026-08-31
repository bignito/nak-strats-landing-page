import { PaymentMethod, PaymentStatus, Token } from "@/backend";
import type {
  ConsentError,
  EmailError,
  Product,
  ProductVariant,
  SweepError,
} from "@/backend";
import {
  useAddAdmin,
  useAdminListOrders,
  useClaimInitialAdmin,
  useCreateProduct,
  useCryptoConfig,
  useForceRecheckPayment,
  useForceSweepOrder,
  useGetCanisterId,
  useGetConsentListCsv,
  useGetCycleBalance,
  useGetDefaultSubaccountBalance,
  useGetMinimumOrder,
  useGetSubaccountBalance,
  useGetTreasuryTokens,
  useIsAdmin,
  useListAdmins,
  useListOrdersForRecovery,
  useMarkOrderShipped,
  usePaymentServiceConfig,
  useProducts,
  useRemoveAdmin,
  useResendConfirmationEmail,
  useSweepDefaultSubaccount,
  useSweepSubaccount,
  useUpdateLedgerConfig,
  useUpdateMinimumOrder,
  useUpdatePaymentServiceToken,
  useUpdatePaymentServiceUrl,
  useUpdateProduct,
  useUpdateTreasury,
} from "@/hooks/useQueries";
import { dollarsToCents, formatPrice } from "@/lib/currency";
import type {
  AdminOrderView,
  CryptoPaymentError,
  CryptoPaymentStatus,
  PaymentServiceError,
  RecoveryError,
} from "@/types/storefront";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { Principal } from "@icp-sdk/core/principal";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BadgeDollarSign,
  Check,
  CheckCircle2,
  Coins,
  Copy,
  CreditCard,
  Download,
  FlaskConical,
  Gauge,
  Landmark,
  Loader2,
  Lock,
  LogIn,
  LogOut,
  Mail,
  Package,
  RefreshCw,
  Save,
  Send,
  Server,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Truck,
  UserPlus,
  UserX,
  Wallet,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";

interface AdminSettingsPageProps {
  onNavigateToMain: () => void;
  onNavigateToProduct: (slugOrId: string) => void;
}

const DEFAULT_TREASURY_PRINCIPAL =
  "ttfax-iely3-bkfh4-tb7o3-dso2i-acf6j-yh6w5-jclgp-7mnhg-lxbzi-qae";

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array | null {
  const clean = hex.replace(/^0x/i, "").trim();
  if (!clean) return null;
  if (!/^[0-9a-fA-F]+$/.test(clean) || clean.length % 2 !== 0) return null;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function formatCryptoError(err: CryptoPaymentError): string {
  switch (err.__kind__) {
    case "unauthorized":
      return "You are not authorized to change this setting. Admin access is required.";
    case "invalidConfig":
      return `Invalid configuration: ${err.invalidConfig}`;
    case "ledgerError":
      return `Ledger error: ${err.ledgerError}`;
    case "notFound":
      return "Configuration not found.";
    case "alreadyPaid":
      return "Already paid.";
    case "expired":
      return "Expired.";
    case "overpayment":
      return "Overpayment detected.";
    case "underpayment":
      return "Underpayment detected.";
    case "sweepFailed":
      return `Sweep failed: ${err.sweepFailed}`;
    case "notCryptoOrder":
      return "Not a crypto order.";
    case "belowMinimumOrder":
      return `Orders must be at least $${(
        Number(err.belowMinimumOrder) / 100
      ).toFixed(2)} for crypto payment.`;
    default:
      return "An unknown error occurred.";
  }
}

function formatPaymentServiceError(err: PaymentServiceError): string {
  switch (err.__kind__) {
    case "unauthorized":
      return "You are not authorized to change this setting. Admin access is required.";
    case "notConfigured":
      return `Payment service not configured: ${err.notConfigured}`;
    case "notFound":
      return "Payment service configuration not found.";
    case "outcallFailed":
      return `Payment service call failed: ${err.outcallFailed}`;
    case "invalidResponse":
      return `Invalid payment service response: ${err.invalidResponse}`;
    case "alreadyPaid":
      return "Already paid.";
    default:
      return "An unknown error occurred.";
  }
}

/** Format a cycle balance as trillions, e.g. 1.24T. */
function formatCycles(cycles: bigint): string {
  const t = Number(cycles) / 1e12;
  return `${t.toFixed(2)}T`;
}

/** Format a token amount from raw ledger units (default 6 decimals for ckUSDC). */
function formatTokenAmount(units: bigint, decimals = 6): string {
  const value = Number(units) / 10 ** decimals;
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  });
}

/** Map a RecoveryError to a human-readable message, preserving exact ledger text. */
function recoveryErrorMessage(err: RecoveryError): string {
  switch (err.__kind__) {
    case "unauthorized":
      return "You are not authorized to perform this action.";
    case "notFound":
      return "Order not found.";
    case "notCryptoOrder":
      return "This order is not a crypto order.";
    case "ledgerError":
      return `Ledger error: ${err.ledgerError}`;
    case "sweepFailed":
      return `Sweep failed: ${err.sweepFailed}`;
    case "invalidConfig":
      return `Invalid configuration: ${err.invalidConfig}`;
    default:
      return "An unknown error occurred.";
  }
}

/** Map an EmailError to a human-readable message, preserving exact backend text. */
function emailErrorMessage(err: EmailError): string {
  switch (err.__kind__) {
    case "unauthorized":
      return "You are not authorized to perform this action.";
    case "notFound":
      return "Order not found.";
    case "notShippable":
      return "This order cannot be shipped (no shipping address on file).";
    case "notConfigured":
      return `Email service not configured: ${err.notConfigured}`;
    case "outcallFailed":
      return `Email send failed: ${err.outcallFailed}`;
    case "invalidResponse":
      return `Invalid email service response: ${err.invalidResponse}`;
    default:
      return "An unknown error occurred.";
  }
}

/** Map a ConsentError to a human-readable message, preserving exact backend text. */
function consentErrorMessage(err: ConsentError): string {
  switch (err.__kind__) {
    case "unauthorized":
      return "You are not authorized to perform this action.";
    case "alreadyUnsubscribed":
      return "This address is already unsubscribed.";
    case "invalidToken":
      return "The unsubscribe token is invalid or expired.";
    case "notConfigured":
      return `Email service not configured: ${err.notConfigured}`;
    case "outcallFailed":
      return `Email service call failed: ${err.outcallFailed}`;
    case "invalidResponse":
      return `Invalid email service response: ${err.invalidResponse}`;
    default:
      return "An unknown error occurred.";
  }
}

/** Map a SweepError to a human-readable message, preserving exact ledger text. */
function sweepErrorMessage(err: SweepError): string {
  switch (err.__kind__) {
    case "unauthorized":
      return "You are not authorized to perform this action.";
    case "ledgerError":
      return `Ledger error: ${err.ledgerError}`;
    case "sweepFailed":
      return `Sweep failed: ${err.sweepFailed}`;
    case "invalidConfig":
      return `Invalid configuration: ${err.invalidConfig}`;
    default:
      return "An unknown error occurred.";
  }
}

/** Extract a readable message from an unknown thrown value. */
function errorText(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "An unknown error occurred.";
}

/** Tailwind text color class for a payment status. */
function statusTone(status: PaymentStatus): string {
  switch (status) {
    case PaymentStatus.paid:
      return "text-success";
    case PaymentStatus.pending:
      return "text-warning";
    case PaymentStatus.expired:
      return "text-destructive";
    case PaymentStatus.cancelled:
      return "text-gray-400";
    default:
      return "text-gray-300";
  }
}

/** Human label for a payment method. */
function paymentMethodLabel(method: PaymentMethod): string {
  switch (method) {
    case PaymentMethod.crypto_ckusdc:
      return "ckUSDC";
    case PaymentMethod.crypto_icp:
      return "ICP";
    case PaymentMethod.card_stripe:
      return "Card";
    case PaymentMethod.manual:
      return "Manual";
    default:
      return method;
  }
}

/** Human label for a crypto payment status. */
function cryptoStatusLabel(status: CryptoPaymentStatus): string {
  switch (status.__kind__) {
    case "awaiting_payment":
      return "Awaiting payment";
    case "paid":
      return "Paid";
    case "expired":
      return "Expired";
    case "underpayment":
      return "Underpayment";
    case "overpayment":
      return "Overpayment";
  }
}

/** Editable product form draft. Prices are held as dollar strings and converted
 * to integer cents only when saving. Complex fields (variants, images) are
 * preserved as-is so editing a product never drops them. */
interface ProductDraft {
  name: string;
  slug: string;
  description: string;
  category: string;
  currency: string;
  priceText: string;
  inventoryText: string;
  active: boolean;
  adminOnly: boolean;
  images: string[];
  variants: ProductVariant[];
}

const EMPTY_PRODUCT_DRAFT: ProductDraft = {
  name: "",
  slug: "",
  description: "",
  category: "",
  currency: "USD",
  priceText: "",
  inventoryText: "",
  active: true,
  adminOnly: false,
  images: [],
  variants: [],
};

/** Convert a stored Product into an editable draft, rendering its cent price
 * back as a dollar string. */
function productToDraft(product: Product): ProductDraft {
  return {
    name: product.name,
    slug: product.slug,
    description: product.description,
    category: product.category,
    currency: product.currency,
    priceText: (Number(product.price) / 100).toFixed(2),
    inventoryText: product.inventory.toString(),
    active: product.active,
    adminOnly: product.admin_only,
    images: [...product.images],
    variants: product.variants.map((v) => ({ ...v })),
  };
}

const AdminSettingsPage: React.FC<AdminSettingsPageProps> = ({
  onNavigateToMain,
  onNavigateToProduct,
}) => {
  const {
    identity,
    login,
    clear,
    isAuthenticated,
    isLoggingIn,
    isInitializing,
  } = useInternetIdentity();
  const { data: isAdmin, isLoading: isAdminLoading } = useIsAdmin();
  const claimInitialAdmin = useClaimInitialAdmin();
  const addAdmin = useAddAdmin();
  const removeAdmin = useRemoveAdmin();
  const { data: admins } = useListAdmins();

  const { data: config, isLoading } = useCryptoConfig();
  const updateTreasury = useUpdateTreasury();
  const updateLedger = useUpdateLedgerConfig();
  const { data: paymentConfig } = usePaymentServiceConfig();
  const updatePaymentUrl = useUpdatePaymentServiceUrl();
  const updatePaymentToken = useUpdatePaymentServiceToken();

  const { data: minimumOrder } = useGetMinimumOrder();
  const updateMinimumOrder = useUpdateMinimumOrder();

  // Canister health
  const { data: cycleBalance } = useGetCycleBalance();
  const { data: canisterId } = useGetCanisterId();
  const [canisterCopied, setCanisterCopied] = useState(false);

  // Orders
  const [orderFilter, setOrderFilter] = useState("all");
  const { data: orders, isLoading: ordersLoading } =
    useAdminListOrders(orderFilter);
  const forceRecheck = useForceRecheckPayment();
  const forceSweep = useForceSweepOrder();
  const [orderActionError, setOrderActionError] = useState<string | null>(null);

  // Email & shipping actions
  const markShipped = useMarkOrderShipped();
  const resendEmail = useResendConfirmationEmail();
  const [trackingDraft, setTrackingDraft] = useState<Record<string, string>>(
    {},
  );
  const [shippedError, setShippedError] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);

  // Consent list export
  const consentCsv = useGetConsentListCsv();
  const [consentError, setConsentError] = useState<string | null>(null);
  const [consentSuccess, setConsentSuccess] = useState(false);

  // Subaccount sweep control
  const [subaccountIndexText, setSubaccountIndexText] = useState("");
  const [subaccountIndex, setSubaccountIndex] = useState<bigint | null>(null);
  const { data: subaccountBalance, error: subaccountBalanceError } =
    useGetSubaccountBalance(subaccountIndex);
  const sweepSubaccount = useSweepSubaccount();
  const [subaccountSweepError, setSubaccountSweepError] = useState<
    string | null
  >(null);
  const [subaccountSweepSuccess, setSubaccountSweepSuccess] = useState<
    string | null
  >(null);

  // Funds
  const { data: defaultSubaccountBalance } = useGetDefaultSubaccountBalance();
  const sweepDefault = useSweepDefaultSubaccount();
  const { data: treasuryTokens } = useGetTreasuryTokens();
  const { data: recoveryOrders } = useListOrdersForRecovery();
  const [sweepError, setSweepError] = useState<string | null>(null);

  // ckUSDC balance held by the treasury, parsed defensively from the raw JSON
  // string returned by useGetTreasuryTokens().
  const treasuryCkUsdcBalance = useMemo(() => {
    if (!treasuryTokens) return null;
    try {
      const parsed: unknown = JSON.parse(treasuryTokens);
      if (parsed && typeof parsed === "object") {
        const record = parsed as Record<string, unknown>;
        const ckUsdc = record.ckUSDC ?? record.ckusdc ?? record.ckUsdc;
        if (typeof ckUsdc === "number") return ckUsdc;
        if (typeof ckUsdc === "string") {
          const n = Number(ckUsdc);
          if (Number.isFinite(n)) return n;
        }
      }
    } catch {
      // fall through to null on malformed JSON
    }
    return null;
  }, [treasuryTokens]);

  // Total live on-ledger balance across all crypto orders awaiting recovery.
  const unsweptTotal = useMemo(() => {
    if (!recoveryOrders || recoveryOrders.length === 0) return null;
    return recoveryOrders.reduce((sum, order) => sum + order.liveBalance, 0n);
  }, [recoveryOrders]);

  // Admin management form state
  const [addAdminText, setAddAdminText] = useState("");
  const [addAdminError, setAddAdminError] = useState<string | null>(null);
  const [addAdminSuccess, setAddAdminSuccess] = useState(false);
  const [removeAdminError, setRemoveAdminError] = useState<string | null>(null);
  const [principalCopied, setPrincipalCopied] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  const userPrincipalText = identity?.getPrincipal().toText() ?? "";

  const handleCopyPrincipal = async () => {
    try {
      await navigator.clipboard.writeText(userPrincipalText);
      setPrincipalCopied(true);
      setTimeout(() => setPrincipalCopied(false), 2000);
    } catch {
      setPrincipalCopied(false);
    }
  };

  const handleClaimInitialAdmin = () => {
    setClaimError(null);
    claimInitialAdmin.mutate(undefined, {
      onError: () => setClaimError("Failed to claim initial admin."),
    });
  };

  const handleAddAdmin = () => {
    const text = addAdminText.trim();
    if (!text) {
      setAddAdminError("Enter a principal to add.");
      return;
    }
    let principal: Principal;
    try {
      principal = Principal.fromText(text);
    } catch {
      setAddAdminError("Invalid principal. Check the format and try again.");
      return;
    }
    setAddAdminError(null);
    setAddAdminSuccess(false);
    addAdmin.mutate(principal, {
      onSuccess: (ok) => {
        if (ok) {
          setAddAdminText("");
          setAddAdminSuccess(true);
        } else {
          setAddAdminError("Could not add that principal as an admin.");
        }
      },
      onError: () => setAddAdminError("Failed to add admin."),
    });
  };

  const handleRemoveAdmin = (principal: Principal) => {
    setRemoveAdminError(null);
    removeAdmin.mutate(principal, {
      onError: () => setRemoveAdminError("Failed to remove admin."),
    });
  };

  // Treasury form state (one-time init from config)
  const [treasuryPrincipalText, setTreasuryPrincipalText] = useState("");
  const [subaccountText, setSubaccountText] = useState("");
  const [treasuryInit, setTreasuryInit] = useState(false);
  const [treasuryError, setTreasuryError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Ledger form state (one-time init from config)
  const [icpCanisterText, setIcpCanisterText] = useState("");
  const [ckUsdcCanisterText, setCkUsdcCanisterText] = useState("");
  const [ledgerInit, setLedgerInit] = useState(false);
  const [icpError, setIcpError] = useState<string | null>(null);
  const [ckUsdcError, setCkUsdcError] = useState<string | null>(null);

  // Payment service form state (draft only; token is never displayed back)
  const [paymentUrlText, setPaymentUrlText] = useState("");
  const [paymentTokenText, setPaymentTokenText] = useState("");
  const [paymentUrlError, setPaymentUrlError] = useState<string | null>(null);
  const [paymentTokenError, setPaymentTokenError] = useState<string | null>(
    null,
  );

  // Minimum order form state (one-time init from config)
  const [minimumOrderText, setMinimumOrderText] = useState("");
  const [minimumOrderInit, setMinimumOrderInit] = useState(false);
  const [minimumOrderError, setMinimumOrderError] = useState<string | null>(
    null,
  );

  // Product create/edit form state
  const { data: products, isLoading: productsLoading } = useProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const [productMode, setProductMode] = useState<"create" | "edit">("create");
  const [selectedProductId, setSelectedProductId] = useState<bigint | null>(
    null,
  );
  const [productDraft, setProductDraft] =
    useState<ProductDraft>(EMPTY_PRODUCT_DRAFT);
  const [productError, setProductError] = useState<string | null>(null);
  const [productSuccess, setProductSuccess] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (config && !treasuryInit) {
      setTreasuryPrincipalText(
        config.treasuryPrincipal.isAnonymous()
          ? DEFAULT_TREASURY_PRINCIPAL
          : config.treasuryPrincipal.toText(),
      );
      setSubaccountText(
        config.treasurySubaccount ? bytesToHex(config.treasurySubaccount) : "",
      );
      setTreasuryInit(true);
    }
  }, [config, treasuryInit]);

  useEffect(() => {
    if (config && !ledgerInit) {
      setIcpCanisterText(config.icp.canisterId.toText());
      setCkUsdcCanisterText(config.ckUSDC.canisterId.toText());
      setLedgerInit(true);
    }
  }, [config, ledgerInit]);

  useEffect(() => {
    if (minimumOrder !== undefined && !minimumOrderInit) {
      setMinimumOrderText((Number(minimumOrder) / 100).toFixed(2));
      setMinimumOrderInit(true);
    }
  }, [minimumOrder, minimumOrderInit]);

  const treasuryUnset = !config || config.treasuryPrincipal.isAnonymous();
  const icpUnset = !config || config.icp.canisterId.isAnonymous();
  const ckUsdcUnset = !config || config.ckUSDC.canisterId.isAnonymous();
  const hasWarnings = treasuryUnset || icpUnset || ckUsdcUnset;

  const paymentUrlUnset = !paymentConfig || !paymentConfig.url;
  const paymentTokenUnset = !paymentConfig || !paymentConfig.tokenSet;
  const hasPaymentWarnings = paymentUrlUnset || paymentTokenUnset;

  const treasuryMutationError =
    updateTreasury.data?.__kind__ === "err"
      ? formatCryptoError(updateTreasury.data.err)
      : null;
  const treasurySaved = updateTreasury.data?.__kind__ === "ok";

  const icpMutationError =
    updateLedger.data?.__kind__ === "err"
      ? formatCryptoError(updateLedger.data.err)
      : null;
  const icpSaved = updateLedger.data?.__kind__ === "ok";

  const paymentUrlMutationError =
    updatePaymentUrl.data?.__kind__ === "err"
      ? formatPaymentServiceError(updatePaymentUrl.data.err)
      : null;
  const paymentUrlSaved = updatePaymentUrl.data?.__kind__ === "ok";

  const paymentTokenMutationError =
    updatePaymentToken.data?.__kind__ === "err"
      ? formatPaymentServiceError(updatePaymentToken.data.err)
      : null;
  const paymentTokenSaved = updatePaymentToken.data?.__kind__ === "ok";

  const handleCopyTreasury = async () => {
    try {
      await navigator.clipboard.writeText(treasuryPrincipalText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleSaveTreasury = () => {
    let principal: Principal;
    try {
      principal = Principal.fromText(treasuryPrincipalText.trim());
    } catch {
      setTreasuryError("Invalid principal. Check the format and try again.");
      return;
    }
    const subaccount = hexToBytes(subaccountText);
    if (subaccountText.trim() && !subaccount) {
      setTreasuryError(
        "Invalid subaccount. Enter a valid hex string or leave it blank.",
      );
      return;
    }
    setTreasuryError(null);
    updateTreasury.mutate({ principal, subaccount });
  };

  const handleSaveIcp = () => {
    let canisterId: Principal;
    try {
      canisterId = Principal.fromText(icpCanisterText.trim());
    } catch {
      setIcpError("Invalid canister ID. Check the format and try again.");
      return;
    }
    setIcpError(null);
    updateLedger.mutate({
      token: Token.ICP,
      canisterId,
      decimals: config?.icp.decimals ?? 8,
      fee: config?.icp.fee ?? 10000n,
    });
  };

  const handleSaveCkUsdc = () => {
    let canisterId: Principal;
    try {
      canisterId = Principal.fromText(ckUsdcCanisterText.trim());
    } catch {
      setCkUsdcError("Invalid canister ID. Check the format and try again.");
      return;
    }
    setCkUsdcError(null);
    updateLedger.mutate({
      token: Token.ckUSDC,
      canisterId,
      decimals: config?.ckUSDC.decimals ?? 8,
      fee: config?.ckUSDC.fee ?? 10000n,
    });
  };

  const handleSavePaymentUrl = () => {
    const url = paymentUrlText.trim();
    if (!url) {
      setPaymentUrlError("Enter the payment service URL.");
      return;
    }
    setPaymentUrlError(null);
    updatePaymentUrl.mutate(url);
  };

  const handleSavePaymentToken = () => {
    const token = paymentTokenText.trim();
    if (!token) {
      setPaymentTokenError("Enter the payment service token.");
      return;
    }
    setPaymentTokenError(null);
    updatePaymentToken.mutate(token);
  };

  const minimumOrderMutationError =
    updateMinimumOrder.data?.__kind__ === "err"
      ? formatCryptoError(updateMinimumOrder.data.err)
      : null;
  const minimumOrderSaved = updateMinimumOrder.data?.__kind__ === "ok";

  const handleSaveMinimumOrder = () => {
    const dollars = Number(minimumOrderText.trim());
    if (!minimumOrderText.trim() || Number.isNaN(dollars) || dollars <= 0) {
      setMinimumOrderError("Enter a positive minimum order amount in dollars.");
      return;
    }
    setMinimumOrderError(null);
    updateMinimumOrder.mutate(BigInt(Math.round(dollars * 100)));
  };

  /** Mark an order as shipped, sending the shipping notification email. */
  const handleMarkShipped = (reference: string) => {
    setShippedError(null);
    const tracking = trackingDraft[reference]?.trim() || null;
    markShipped.mutate(
      { reference, trackingNumber: tracking },
      {
        onError: (err) =>
          setShippedError(
            err && typeof err === "object" && "__kind__" in err
              ? emailErrorMessage(err as unknown as EmailError)
              : errorText(err),
          ),
      },
    );
  };

  /** Resend the order confirmation email (admin-only). */
  const handleResendEmail = (reference: string) => {
    setResendError(null);
    setResendSuccess(null);
    resendEmail.mutate(reference, {
      onSuccess: () => setResendSuccess(reference),
      onError: (err) =>
        setResendError(
          err && typeof err === "object" && "__kind__" in err
            ? emailErrorMessage(err as unknown as EmailError)
            : errorText(err),
        ),
    });
  };

  /** Download the CSV of consenting addresses as a file. */
  const handleExportConsentCsv = () => {
    setConsentError(null);
    setConsentSuccess(false);
    if (!consentCsv.data) {
      setConsentError("No consent list is available yet. Try again.");
      return;
    }
    const blob = new Blob([consentCsv.data.csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "nak-consent-list.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setConsentSuccess(true);
  };

  /** Query a specific deposit subaccount balance by integer index. */
  const handleQuerySubaccount = () => {
    const text = subaccountIndexText.trim();
    if (!text || !/^\d+$/.test(text)) {
      setSubaccountSweepError("Enter a non-negative integer subaccount index.");
      return;
    }
    setSubaccountSweepError(null);
    setSubaccountSweepSuccess(null);
    setSubaccountIndex(BigInt(text));
  };

  /** Sweep a specific deposit subaccount to treasury, surfacing exact errors. */
  const handleSweepSubaccount = () => {
    if (subaccountIndex === null) {
      setSubaccountSweepError("Query a subaccount balance first.");
      return;
    }
    setSubaccountSweepError(null);
    setSubaccountSweepSuccess(null);
    sweepSubaccount.mutate(subaccountIndex, {
      onSuccess: (result) => {
        if (result.error) {
          setSubaccountSweepError(result.error);
        } else {
          setSubaccountSweepSuccess(
            `Subaccount ${subaccountIndex.toString()} swept to treasury (block ${result.blockIndex?.toString() ?? "n/a"}).`,
          );
        }
      },
      onError: (err) =>
        setSubaccountSweepError(
          err && typeof err === "object" && "__kind__" in err
            ? sweepErrorMessage(err as unknown as SweepError)
            : errorText(err),
        ),
    });
  };

  const handleSelectProduct = (id: bigint) => {
    const product = products?.find((p) => p.id === id);
    if (!product) return;
    setSelectedProductId(id);
    setProductMode("edit");
    setProductDraft(productToDraft(product));
    setProductError(null);
    setProductSuccess(false);
  };

  const handleCreateNewProduct = () => {
    setSelectedProductId(null);
    setProductMode("create");
    setProductDraft(EMPTY_PRODUCT_DRAFT);
    setProductError(null);
    setProductSuccess(false);
  };

  const handleSaveProduct = () => {
    const name = productDraft.name.trim();
    const slug = productDraft.slug.trim();
    if (!name) {
      setProductError("Enter a product name.");
      return;
    }
    if (!slug) {
      setProductError("Enter a product slug.");
      return;
    }
    const priceCents = dollarsToCents(productDraft.priceText);
    if (priceCents === null) {
      setProductError(
        "Enter a valid price in dollars (e.g. 35.00 or 78.54) with no more than 2 decimal places.",
      );
      return;
    }
    const inventory = Number(productDraft.inventoryText);
    if (
      !productDraft.inventoryText.trim() ||
      !Number.isInteger(inventory) ||
      inventory < 0
    ) {
      setProductError("Enter a valid non-negative whole-number inventory.");
      return;
    }
    setProductError(null);
    setProductSuccess(false);

    const description = productDraft.description.trim();
    const category = productDraft.category.trim();
    const currency = productDraft.currency.trim() || "USD";

    if (productMode === "create") {
      const maxId =
        products && products.length > 0
          ? products.reduce((m, p) => (p.id > m ? p.id : m), 0n)
          : 0n;
      const now = BigInt(Date.now()) * 1_000_000n;
      const product: Product = {
        id: maxId + 1n,
        created_at: now,
        updated_at: now,
        active: productDraft.active,
        inventory: BigInt(inventory),
        name,
        slug,
        description,
        variants: productDraft.variants,
        currency,
        admin_only: productDraft.adminOnly,
        category,
        price: BigInt(priceCents),
        images: productDraft.images,
      };
      createProduct.mutate(product, {
        onSuccess: (ok) => {
          if (ok) {
            setProductSuccess(true);
            setProductDraft(EMPTY_PRODUCT_DRAFT);
          } else {
            setProductError("Could not create the product.");
          }
        },
        onError: () => setProductError("Failed to create the product."),
      });
      return;
    }

    if (selectedProductId === null) {
      setProductError("Select a product to edit.");
      return;
    }
    const original = products?.find((p) => p.id === selectedProductId);
    if (!original) {
      setProductError("The selected product no longer exists.");
      return;
    }
    const product: Product = {
      ...original,
      active: productDraft.active,
      inventory: BigInt(inventory),
      name,
      slug,
      description,
      variants: productDraft.variants,
      currency,
      admin_only: productDraft.adminOnly,
      category,
      price: BigInt(priceCents),
      images: productDraft.images,
    };
    updateProduct.mutate(product, {
      onSuccess: (ok) => {
        if (ok) {
          setProductSuccess(true);
        } else {
          setProductError("Could not update the product.");
        }
      },
      onError: () => setProductError("Failed to update the product."),
    });
  };

  const inputClass =
    "w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 font-mono-nak";

  return (
    <div className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-14 px-2">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="relative">
              <Settings className="w-12 h-12 text-teal-400" />
              <div className="absolute inset-0 rounded-full bg-teal-400/20 blur-xl animate-pulse" />
            </div>
            <h1
              className="text-3xl sm:text-4xl md:text-5xl font-semibold leading-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Admin Settings
            </h1>
          </div>
          <p className="text-sm sm:text-base text-gray-300 max-w-2xl mx-auto">
            Manage the treasury principal and ledger canister configuration.
            Changes require admin authorization.
          </p>
          <button
            type="button"
            onClick={onNavigateToMain}
            data-ocid="admin.back_button"
            className="btn mt-6 px-6 py-3 text-sm font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Main
          </button>
        </div>

        {/* Authentication gate */}
        {isInitializing ? (
          <div
            className="max-w-4xl mx-auto flex items-center justify-center gap-3 text-gray-300"
            data-ocid="admin.auth_loading"
          >
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Checking authentication…</span>
          </div>
        ) : !isAuthenticated ? (
          <div
            className="max-w-4xl mx-auto card glass-card p-8 sm:p-12 text-center"
            data-ocid="admin.sign_in_state"
          >
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="relative">
                <Lock className="w-10 h-10 text-purple-400" />
                <div className="absolute inset-0 rounded-full bg-purple-400/20 blur-xl animate-pulse" />
              </div>
              <h2
                className="text-2xl sm:text-3xl font-semibold text-white"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Sign in required
              </h2>
            </div>
            <p className="text-sm sm:text-base text-gray-300 max-w-xl mx-auto mb-8">
              Admin settings are restricted. Sign in with Internet Identity to
              verify your principal before accessing this page.
            </p>
            <button
              type="button"
              onClick={login}
              disabled={isLoggingIn}
              data-ocid="admin.sign_in_button"
              className="btn px-8 py-3 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign in with Internet Identity
                </>
              )}
            </button>
          </div>
        ) : isAdminLoading ? (
          <div
            className="max-w-4xl mx-auto flex items-center justify-center gap-3 text-gray-300"
            data-ocid="admin.auth_loading"
          >
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Checking admin authorization…</span>
          </div>
        ) : !isAdmin ? (
          <div
            className="max-w-4xl mx-auto card glass-card p-8 sm:p-12 text-center"
            data-ocid="admin.not_authorized_state"
          >
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="relative">
                <ShieldAlert className="w-10 h-10 text-warning" />
                <div className="absolute inset-0 rounded-full bg-yellow-500/20 blur-xl animate-pulse" />
              </div>
              <h2
                className="text-2xl sm:text-3xl font-semibold text-white"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Not authorized
              </h2>
            </div>
            <p className="text-sm sm:text-base text-gray-300 max-w-xl mx-auto mb-6">
              Your principal is not an admin, so you cannot view or change these
              settings.
            </p>

            {/* Signed-in principal with copy affordance */}
            <div className="max-w-xl mx-auto mb-8">
              <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">
                Your Principal
              </p>
              <div className="flex items-center gap-3 bg-black/30 px-4 py-3 rounded-xl border border-white/10">
                <code className="font-mono-nak text-sm flex-1 break-all text-teal-300">
                  {userPrincipalText}
                </code>
                <button
                  type="button"
                  onClick={handleCopyPrincipal}
                  data-ocid="admin.copy_principal_button"
                  className="btn flex items-center gap-2 px-3 py-2 text-xs"
                  title="Copy your principal"
                >
                  {principalCopied ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  {principalCopied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            {/* One-time initial admin bootstrap */}
            <div className="max-w-xl mx-auto border-t border-white/10 pt-6">
              <p className="text-sm text-gray-300 mb-4">
                If this is the first deployment, claim the initial admin role to
                bootstrap access.
              </p>
              {claimError && (
                <p
                  className="text-sm text-destructive mb-3"
                  data-ocid="admin.claim_error"
                >
                  {claimError}
                </p>
              )}
              {claimInitialAdmin.isSuccess && (
                <p
                  className="text-sm text-success flex items-center justify-center gap-2 mb-3"
                  data-ocid="admin.claim_success"
                >
                  <Check className="w-4 h-4" />
                  Initial admin claimed successfully.
                </p>
              )}
              <button
                type="button"
                onClick={handleClaimInitialAdmin}
                disabled={claimInitialAdmin.isPending}
                data-ocid="admin.claim_admin_button"
                className="btn px-6 py-3 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {claimInitialAdmin.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Claiming…
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Claim Initial Admin
                  </>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={clear}
              data-ocid="admin.sign_out_button"
              className="btn mt-8 px-6 py-3 text-sm font-semibold"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        ) : (
          <>
            {/* Signed-in admin identity bar */}
            <div
              className="max-w-6xl mx-auto mb-8 card glass-card p-5"
              data-ocid="admin.identity_bar"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">
                    Signed in as
                  </p>
                  <div className="flex items-center gap-3 bg-black/30 px-4 py-3 rounded-xl border border-white/10">
                    <ShieldCheck className="w-4 h-4 text-success shrink-0" />
                    <code className="font-mono-nak text-sm flex-1 break-all text-teal-300">
                      {userPrincipalText}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyPrincipal}
                      data-ocid="admin.copy_principal_button"
                      className="btn flex items-center gap-2 px-3 py-2 text-xs"
                      title="Copy your principal"
                    >
                      {principalCopied ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      {principalCopied ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clear}
                  data-ocid="admin.sign_out_button"
                  className="btn px-5 py-2.5 text-sm font-semibold shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </div>

            {/* Admin management card */}
            <div
              className="max-w-6xl mx-auto mb-8 card glass-card p-6 sm:p-8"
              data-ocid="admin.admins_panel"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="relative">
                  <ShieldCheck className="w-8 h-8 text-purple-400" />
                  <div className="absolute inset-0 rounded-full bg-purple-400/20 blur-xl animate-pulse" />
                </div>
                <div>
                  <h3
                    className="text-2xl font-semibold text-white"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Admin Access
                  </h3>
                  <p className="text-sm text-gray-400">
                    Manage who can change these settings
                  </p>
                </div>
              </div>

              {/* Add admin */}
              <div className="mb-6">
                <label
                  htmlFor="add-admin-principal"
                  className="block text-sm text-gray-300 mb-2"
                >
                  Add an Admin
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    id="add-admin-principal"
                    type="text"
                    value={addAdminText}
                    onChange={(e) => setAddAdminText(e.target.value)}
                    placeholder="Enter a principal to grant admin access"
                    data-ocid="admin.add_admin_input"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={handleAddAdmin}
                    disabled={addAdmin.isPending}
                    data-ocid="admin.add_admin_button"
                    className="btn px-6 py-3 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    {addAdmin.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Adding…
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        Add Admin
                      </>
                    )}
                  </button>
                </div>
                {addAdminError && (
                  <p
                    className="text-sm text-destructive mt-2"
                    data-ocid="admin.add_admin_error"
                  >
                    {addAdminError}
                  </p>
                )}
                {addAdminSuccess && (
                  <p
                    className="text-sm text-success flex items-center gap-2 mt-2"
                    data-ocid="admin.add_admin_success"
                  >
                    <Check className="w-4 h-4" />
                    Admin added successfully.
                  </p>
                )}
              </div>

              {/* List admins */}
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">
                  Current Admins
                </p>
                {removeAdminError && (
                  <p
                    className="text-sm text-destructive mb-2"
                    data-ocid="admin.remove_admin_error"
                  >
                    {removeAdminError}
                  </p>
                )}
                {admins && admins.length > 0 ? (
                  <ul className="space-y-2">
                    {admins.map((admin, index) => {
                      const isSelf = admin.toText() === userPrincipalText;
                      return (
                        <li
                          key={admin.toText()}
                          data-ocid={`admin.admin_item.${index + 1}`}
                          className="flex items-center gap-3 bg-black/30 px-4 py-3 rounded-xl border border-white/10"
                        >
                          <code className="font-mono-nak text-sm flex-1 break-all text-teal-300">
                            {admin.toText()}
                          </code>
                          {isSelf && (
                            <span className="text-xs text-success shrink-0">
                              you
                            </span>
                          )}
                          {!isSelf && (
                            <button
                              type="button"
                              onClick={() => handleRemoveAdmin(admin)}
                              disabled={removeAdmin.isPending}
                              data-ocid={`admin.remove_admin_button.${index + 1}`}
                              className="btn flex items-center gap-2 px-3 py-2 text-xs disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                              title="Remove this admin"
                            >
                              <UserX className="w-4 h-4" />
                              Remove
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p
                    className="text-sm text-gray-400"
                    data-ocid="admin.admins_empty"
                  >
                    No admins configured yet.
                  </p>
                )}
              </div>
            </div>

            {/* Warning banner */}
            {hasWarnings && (
              <div
                className="max-w-4xl mx-auto mb-8"
                data-ocid="admin.warning_banner"
              >
                <div className="bg-warning-soft border border-yellow-500/30 rounded-2xl p-5 flex items-start gap-4">
                  <AlertTriangle className="w-6 h-6 text-warning shrink-0 mt-0.5" />
                  <div>
                    <h3
                      className="text-lg font-semibold text-warning"
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      Configuration Incomplete
                    </h3>
                    <ul className="mt-2 space-y-1 text-sm text-gray-300">
                      {treasuryUnset && (
                        <li>• Treasury principal is not set.</li>
                      )}
                      {icpUnset && (
                        <li>• ICP ledger canister ID is not set.</li>
                      )}
                      {ckUsdcUnset && (
                        <li>• ckUSDC ledger canister ID is not set.</li>
                      )}
                    </ul>
                    <p className="mt-2 text-sm text-gray-400">
                      Crypto deposits will not work until these critical values
                      are configured.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Payment service warning banner */}
            {hasPaymentWarnings && (
              <div
                className="max-w-4xl mx-auto mb-8"
                data-ocid="admin.payment_warning_banner"
              >
                <div className="bg-warning-soft border border-yellow-500/30 rounded-2xl p-5 flex items-start gap-4">
                  <AlertTriangle className="w-6 h-6 text-warning shrink-0 mt-0.5" />
                  <div>
                    <h3
                      className="text-lg font-semibold text-warning"
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      Payment Service Incomplete
                    </h3>
                    <ul className="mt-2 space-y-1 text-sm text-gray-300">
                      {paymentUrlUnset && (
                        <li>• Payment service URL is not set.</li>
                      )}
                      {paymentTokenUnset && (
                        <li>• Payment service token is not set.</li>
                      )}
                    </ul>
                    <p className="mt-2 text-sm text-gray-400">
                      Card checkout will not work until the payment service URL
                      and token are configured.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isLoading ? (
              <div
                className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6"
                data-ocid="admin.loading_state"
              >
                <div className="card glass-card p-6 sm:p-8 loading-shimmer h-72" />
                <div className="card glass-card p-6 sm:p-8 loading-shimmer h-72" />
                <div className="card glass-card p-6 sm:p-8 loading-shimmer h-72" />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
                {/* Treasury card */}
                <div
                  className="card glass-card p-6 sm:p-8"
                  data-ocid="admin.treasury_panel"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="relative">
                      <Wallet className="w-8 h-8 text-purple-400" />
                      <div className="absolute inset-0 rounded-full bg-purple-400/20 blur-xl animate-pulse" />
                    </div>
                    <div>
                      <h3
                        className="text-2xl font-semibold text-white"
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        Treasury
                      </h3>
                      <p className="text-sm text-gray-400">
                        Where crypto deposits are swept
                      </p>
                    </div>
                  </div>

                  {/* Current principal */}
                  <div className="mb-6">
                    <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">
                      Current Treasury Principal
                    </p>
                    <div className="flex items-center gap-3 bg-black/30 px-4 py-3 rounded-xl border border-white/10">
                      <code className="font-mono-nak text-sm flex-1 break-all text-teal-300">
                        {config?.treasuryPrincipal.isAnonymous()
                          ? "Not set"
                          : config?.treasuryPrincipal.toText()}
                      </code>
                      {config && !config.treasuryPrincipal.isAnonymous() && (
                        <button
                          type="button"
                          onClick={handleCopyTreasury}
                          data-ocid="admin.copy_treasury_button"
                          className="btn flex items-center gap-2 px-3 py-2 text-xs"
                          title="Copy treasury principal"
                        >
                          {copied ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                          {copied ? "Copied" : "Copy"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Form */}
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="treasury-principal"
                        className="block text-sm text-gray-300 mb-2"
                      >
                        Treasury Principal
                      </label>
                      <input
                        id="treasury-principal"
                        type="text"
                        value={treasuryPrincipalText}
                        onChange={(e) =>
                          setTreasuryPrincipalText(e.target.value)
                        }
                        placeholder={DEFAULT_TREASURY_PRINCIPAL}
                        data-ocid="admin.treasury_principal_input"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="treasury-subaccount"
                        className="block text-sm text-gray-300 mb-2"
                      >
                        Treasury Subaccount{" "}
                        <span className="text-gray-500">(optional, hex)</span>
                      </label>
                      <input
                        id="treasury-subaccount"
                        type="text"
                        value={subaccountText}
                        onChange={(e) => setSubaccountText(e.target.value)}
                        placeholder="Leave blank for the default subaccount"
                        data-ocid="admin.subaccount_input"
                        className={inputClass}
                      />
                    </div>

                    {treasuryError && (
                      <p
                        className="text-sm text-destructive"
                        data-ocid="admin.treasury_error"
                      >
                        {treasuryError}
                      </p>
                    )}
                    {treasuryMutationError && (
                      <p
                        className="text-sm text-destructive"
                        data-ocid="admin.treasury_error"
                      >
                        {treasuryMutationError}
                      </p>
                    )}
                    {treasurySaved && (
                      <p
                        className="text-sm text-success flex items-center gap-2"
                        data-ocid="admin.treasury_success"
                      >
                        <Check className="w-4 h-4" />
                        Treasury updated successfully.
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={handleSaveTreasury}
                      disabled={updateTreasury.isPending}
                      data-ocid="admin.save_treasury_button"
                      className="btn w-full px-6 py-3 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updateTreasury.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving…
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save Treasury
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Ledger card */}
                <div
                  className="card glass-card p-6 sm:p-8"
                  data-ocid="admin.ledger_panel"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="relative">
                      <Landmark className="w-8 h-8 text-teal-400" />
                      <div className="absolute inset-0 rounded-full bg-teal-400/20 blur-xl animate-pulse" />
                    </div>
                    <div>
                      <h3
                        className="text-2xl font-semibold text-white"
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        Ledger Canisters
                      </h3>
                      <p className="text-sm text-gray-400">
                        Token ledger canister IDs
                      </p>
                    </div>
                  </div>

                  {/* ICP */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-sm font-semibold text-white">ICP</p>
                      {icpUnset && (
                        <span className="text-xs text-warning">not set</span>
                      )}
                    </div>
                    <div className="bg-black/30 px-4 py-3 rounded-xl border border-white/10 mb-3">
                      <code className="font-mono-nak text-sm break-all text-teal-300">
                        {config?.icp.canisterId.isAnonymous()
                          ? "Not set"
                          : config?.icp.canisterId.toText()}
                      </code>
                    </div>
                    <input
                      type="text"
                      value={icpCanisterText}
                      onChange={(e) => setIcpCanisterText(e.target.value)}
                      placeholder="ICP ledger canister ID"
                      data-ocid="admin.icp_canister_input"
                      className={inputClass}
                    />
                    {icpError && (
                      <p className="text-sm text-destructive mt-2">
                        {icpError}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={handleSaveIcp}
                      disabled={updateLedger.isPending}
                      data-ocid="admin.save_icp_button"
                      className="btn w-full mt-3 px-6 py-3 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updateLedger.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving…
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save ICP Ledger
                        </>
                      )}
                    </button>
                  </div>

                  {/* ckUSDC */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-sm font-semibold text-white">ckUSDC</p>
                      {ckUsdcUnset && (
                        <span className="text-xs text-warning">not set</span>
                      )}
                    </div>
                    <div className="bg-black/30 px-4 py-3 rounded-xl border border-white/10 mb-3">
                      <code className="font-mono-nak text-sm break-all text-teal-300">
                        {config?.ckUSDC.canisterId.isAnonymous()
                          ? "Not set"
                          : config?.ckUSDC.canisterId.toText()}
                      </code>
                    </div>
                    <input
                      type="text"
                      value={ckUsdcCanisterText}
                      onChange={(e) => setCkUsdcCanisterText(e.target.value)}
                      placeholder="ckUSDC ledger canister ID"
                      data-ocid="admin.ckusdc_canister_input"
                      className={inputClass}
                    />
                    {ckUsdcError && (
                      <p className="text-sm text-destructive mt-2">
                        {ckUsdcError}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={handleSaveCkUsdc}
                      disabled={updateLedger.isPending}
                      data-ocid="admin.save_ckusdc_button"
                      className="btn w-full mt-3 px-6 py-3 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updateLedger.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving…
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save ckUSDC Ledger
                        </>
                      )}
                    </button>
                  </div>

                  {icpMutationError && (
                    <p
                      className="text-sm text-destructive"
                      data-ocid="admin.ledger_error"
                    >
                      {icpMutationError}
                    </p>
                  )}
                  {icpSaved && (
                    <p
                      className="text-sm text-success flex items-center gap-2"
                      data-ocid="admin.ledger_success"
                    >
                      <Check className="w-4 h-4" />
                      Ledger configuration updated successfully.
                    </p>
                  )}

                  {/* ICP rate oracle warning */}
                  <div className="bg-warning-soft border border-yellow-500/30 rounded-xl p-4 flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-warning">
                        ICP payments disabled
                      </p>
                      <p className="text-xs text-gray-300 mt-1">
                        ICP deposits require a rate oracle to convert amounts.
                        ICP is disabled until a rate oracle is configured.
                        ckUSDC deposits remain available.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Payment service card */}
                <div
                  className="card glass-card p-6 sm:p-8"
                  data-ocid="admin.payment_service_panel"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="relative">
                      <CreditCard className="w-8 h-8 text-pink-400" />
                      <div className="absolute inset-0 rounded-full bg-pink-400/20 blur-xl animate-pulse" />
                    </div>
                    <div>
                      <h3
                        className="text-2xl font-semibold text-white"
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        Payment Service
                      </h3>
                      <p className="text-sm text-gray-400">
                        Card checkout endpoint and auth token
                      </p>
                    </div>
                  </div>

                  {/* Current URL */}
                  <div className="mb-6">
                    <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">
                      Current Payment Service URL
                    </p>
                    <div className="flex items-center gap-3 bg-black/30 px-4 py-3 rounded-xl border border-white/10">
                      <code className="font-mono-nak text-sm flex-1 break-all text-teal-300">
                        {paymentConfig?.url ? paymentConfig.url : "Not set"}
                      </code>
                    </div>
                  </div>

                  {/* URL form */}
                  <div className="space-y-4 mb-6">
                    <div>
                      <label
                        htmlFor="payment-service-url"
                        className="block text-sm text-gray-300 mb-2"
                      >
                        PAYMENT_SERVICE_URL
                      </label>
                      <input
                        id="payment-service-url"
                        type="text"
                        value={paymentUrlText}
                        onChange={(e) => setPaymentUrlText(e.target.value)}
                        placeholder="https://payment.example.com"
                        data-ocid="admin.payment_url_input"
                        className={inputClass}
                      />
                    </div>
                    {paymentUrlError && (
                      <p
                        className="text-sm text-destructive"
                        data-ocid="admin.payment_url_error"
                      >
                        {paymentUrlError}
                      </p>
                    )}
                    {paymentUrlMutationError && (
                      <p
                        className="text-sm text-destructive"
                        data-ocid="admin.payment_url_error"
                      >
                        {paymentUrlMutationError}
                      </p>
                    )}
                    {paymentUrlSaved && (
                      <p
                        className="text-sm text-success flex items-center gap-2"
                        data-ocid="admin.payment_url_success"
                      >
                        <Check className="w-4 h-4" />
                        Payment service URL updated successfully.
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={handleSavePaymentUrl}
                      disabled={updatePaymentUrl.isPending}
                      data-ocid="admin.save_payment_url_button"
                      className="btn w-full px-6 py-3 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updatePaymentUrl.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving…
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save Payment Service URL
                        </>
                      )}
                    </button>
                  </div>

                  {/* Token status */}
                  <div className="mb-6">
                    <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">
                      Payment Service Token
                    </p>
                    <div className="flex items-center gap-3 bg-black/30 px-4 py-3 rounded-xl border border-white/10">
                      <Lock className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="text-sm text-gray-300">
                        {paymentConfig?.tokenSet ? (
                          <span className="text-success">set</span>
                        ) : (
                          <span className="text-warning">not set</span>
                        )}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      The token value is write-only and is never displayed.
                      Enter a new value to replace it.
                    </p>
                  </div>

                  {/* Token form */}
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="payment-service-token"
                        className="block text-sm text-gray-300 mb-2"
                      >
                        PAYMENT_SERVICE_TOKEN
                      </label>
                      <input
                        id="payment-service-token"
                        type="password"
                        value={paymentTokenText}
                        onChange={(e) => setPaymentTokenText(e.target.value)}
                        placeholder="Enter a new token"
                        autoComplete="new-password"
                        data-ocid="admin.payment_token_input"
                        className={inputClass}
                      />
                    </div>
                    {paymentTokenError && (
                      <p
                        className="text-sm text-destructive"
                        data-ocid="admin.payment_token_error"
                      >
                        {paymentTokenError}
                      </p>
                    )}
                    {paymentTokenMutationError && (
                      <p
                        className="text-sm text-destructive"
                        data-ocid="admin.payment_token_error"
                      >
                        {paymentTokenMutationError}
                      </p>
                    )}
                    {paymentTokenSaved && (
                      <p
                        className="text-sm text-success flex items-center gap-2"
                        data-ocid="admin.payment_token_success"
                      >
                        <Check className="w-4 h-4" />
                        Payment service token updated successfully.
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={handleSavePaymentToken}
                      disabled={updatePaymentToken.isPending}
                      data-ocid="admin.save_payment_token_button"
                      className="btn w-full px-6 py-3 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updatePaymentToken.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving…
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save Payment Service Token
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Minimum Order card */}
                <div
                  className="card glass-card p-6 sm:p-8"
                  data-ocid="admin.minimum_order_panel"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="relative">
                      <BadgeDollarSign className="w-8 h-8 text-teal-400" />
                      <div className="absolute inset-0 rounded-full bg-teal-400/20 blur-xl animate-pulse" />
                    </div>
                    <div>
                      <h3
                        className="text-2xl font-semibold text-white"
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        Minimum Order
                      </h3>
                      <p className="text-sm text-gray-400">
                        Lowest crypto order total accepted
                      </p>
                    </div>
                  </div>

                  {/* Current minimum */}
                  <div className="mb-6">
                    <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">
                      Current Minimum
                    </p>
                    <div className="flex items-center gap-3 bg-black/30 px-4 py-3 rounded-xl border border-white/10">
                      <BadgeDollarSign className="w-5 h-5 text-teal-400 shrink-0" />
                      <span className="text-sm text-white">
                        {minimumOrder !== undefined
                          ? `$${(Number(minimumOrder) / 100).toFixed(2)}`
                          : "—"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Crypto checkout is rejected below this total. The default
                      is $0.25.
                    </p>
                  </div>

                  {/* Form */}
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="minimum-order"
                        className="block text-sm text-gray-300 mb-2"
                      >
                        Minimum Order Total (USD)
                      </label>
                      <input
                        id="minimum-order"
                        type="number"
                        min="0"
                        step="0.01"
                        value={minimumOrderText}
                        onChange={(e) => setMinimumOrderText(e.target.value)}
                        placeholder="0.25"
                        data-ocid="admin.minimum_order_input"
                        className={inputClass}
                      />
                    </div>

                    {minimumOrderError && (
                      <p
                        className="text-sm text-destructive"
                        data-ocid="admin.minimum_order_error"
                      >
                        {minimumOrderError}
                      </p>
                    )}
                    {minimumOrderMutationError && (
                      <p
                        className="text-sm text-destructive"
                        data-ocid="admin.minimum_order_error"
                      >
                        {minimumOrderMutationError}
                      </p>
                    )}
                    {minimumOrderSaved && (
                      <p
                        className="text-sm text-success flex items-center gap-2"
                        data-ocid="admin.minimum_order_success"
                      >
                        <Check className="w-4 h-4" />
                        Minimum order updated successfully.
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={handleSaveMinimumOrder}
                      disabled={updateMinimumOrder.isPending}
                      data-ocid="admin.save_minimum_order_button"
                      className="btn w-full px-6 py-3 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updateMinimumOrder.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving…
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save Minimum Order
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Products card */}
                <div
                  className="card glass-card p-6 sm:p-8 lg:col-span-2"
                  data-ocid="admin.products_panel"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="relative">
                      <Package className="w-8 h-8 text-purple-400" />
                      <div className="absolute inset-0 rounded-full bg-purple-400/20 blur-xl animate-pulse" />
                    </div>
                    <div>
                      <h3
                        className="text-2xl font-semibold text-white"
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        Products
                      </h3>
                      <p className="text-sm text-gray-400">
                        Create new products or edit existing ones
                      </p>
                    </div>
                  </div>

                  {/* Mode selector */}
                  <div className="mb-6">
                    <label
                      htmlFor="product-select"
                      className="block text-sm text-gray-300 mb-2"
                    >
                      Product
                    </label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <select
                        id="product-select"
                        value={
                          productMode === "edit" && selectedProductId !== null
                            ? selectedProductId.toString()
                            : ""
                        }
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === "") {
                            handleCreateNewProduct();
                          } else {
                            handleSelectProduct(BigInt(v));
                          }
                        }}
                        data-ocid="admin.product_select"
                        className={inputClass}
                      >
                        <option value="">Create new product…</option>
                        {productsLoading ? (
                          <option disabled>Loading products…</option>
                        ) : (
                          products?.map((p) => (
                            <option
                              key={p.id.toString()}
                              value={p.id.toString()}
                            >
                              {p.name} ({formatPrice(p.price)})
                            </option>
                          ))
                        )}
                      </select>
                      <button
                        type="button"
                        onClick={handleCreateNewProduct}
                        data-ocid="admin.new_product_button"
                        className="btn px-6 py-3 text-sm font-semibold shrink-0"
                      >
                        <Package className="w-4 h-4" />
                        New Product
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {productMode === "edit"
                        ? "Editing an existing product. Prices are stored as integer cents."
                        : "Creating a new product. Prices are stored as integer cents."}
                    </p>
                  </div>

                  {/* Form */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="product-name"
                        className="block text-sm text-gray-300 mb-2"
                      >
                        Name
                      </label>
                      <input
                        id="product-name"
                        type="text"
                        value={productDraft.name}
                        onChange={(e) =>
                          setProductDraft((d) => ({
                            ...d,
                            name: e.target.value,
                          }))
                        }
                        placeholder="Product name"
                        data-ocid="admin.product_name_input"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="product-slug"
                        className="block text-sm text-gray-300 mb-2"
                      >
                        Slug
                      </label>
                      <input
                        id="product-slug"
                        type="text"
                        value={productDraft.slug}
                        onChange={(e) =>
                          setProductDraft((d) => ({
                            ...d,
                            slug: e.target.value,
                          }))
                        }
                        placeholder="product-slug"
                        data-ocid="admin.product_slug_input"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="product-category"
                        className="block text-sm text-gray-300 mb-2"
                      >
                        Category
                      </label>
                      <input
                        id="product-category"
                        type="text"
                        value={productDraft.category}
                        onChange={(e) =>
                          setProductDraft((d) => ({
                            ...d,
                            category: e.target.value,
                          }))
                        }
                        placeholder="Category"
                        data-ocid="admin.product_category_input"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="product-currency"
                        className="block text-sm text-gray-300 mb-2"
                      >
                        Currency
                      </label>
                      <input
                        id="product-currency"
                        type="text"
                        value={productDraft.currency}
                        onChange={(e) =>
                          setProductDraft((d) => ({
                            ...d,
                            currency: e.target.value,
                          }))
                        }
                        placeholder="USD"
                        data-ocid="admin.product_currency_input"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="product-price"
                        className="block text-sm text-gray-300 mb-2"
                      >
                        Price (USD)
                      </label>
                      <input
                        id="product-price"
                        type="text"
                        inputMode="decimal"
                        value={productDraft.priceText}
                        onChange={(e) =>
                          setProductDraft((d) => ({
                            ...d,
                            priceText: e.target.value,
                          }))
                        }
                        placeholder="35.00"
                        data-ocid="admin.product_price_input"
                        className={inputClass}
                      />
                      {productDraft.priceText &&
                        dollarsToCents(productDraft.priceText) !== null && (
                          <p className="text-xs text-gray-400 mt-1">
                            Stored as{" "}
                            <span className="admin-mono text-teal-300">
                              {dollarsToCents(productDraft.priceText)} cents
                            </span>
                          </p>
                        )}
                    </div>
                    <div>
                      <label
                        htmlFor="product-inventory"
                        className="block text-sm text-gray-300 mb-2"
                      >
                        Inventory
                      </label>
                      <input
                        id="product-inventory"
                        type="number"
                        min="0"
                        step="1"
                        value={productDraft.inventoryText}
                        onChange={(e) =>
                          setProductDraft((d) => ({
                            ...d,
                            inventoryText: e.target.value,
                          }))
                        }
                        placeholder="0"
                        data-ocid="admin.product_inventory_input"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  {/* Toggles */}
                  <div className="flex flex-wrap gap-6 mt-4">
                    <label className="flex items-center gap-2 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        checked={productDraft.active}
                        onChange={(e) =>
                          setProductDraft((d) => ({
                            ...d,
                            active: e.target.checked,
                          }))
                        }
                        data-ocid="admin.product_active_toggle"
                        className="w-4 h-4 accent-purple-500"
                      />
                      Active
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        checked={productDraft.adminOnly}
                        onChange={(e) =>
                          setProductDraft((d) => ({
                            ...d,
                            adminOnly: e.target.checked,
                          }))
                        }
                        data-ocid="admin.product_admin_only_toggle"
                        className="w-4 h-4 accent-purple-500"
                      />
                      Admin only (hidden from public shop)
                    </label>
                  </div>

                  {/* Description */}
                  <div className="mt-4">
                    <label
                      htmlFor="product-description"
                      className="block text-sm text-gray-300 mb-2"
                    >
                      Description
                    </label>
                    <textarea
                      id="product-description"
                      value={productDraft.description}
                      onChange={(e) =>
                        setProductDraft((d) => ({
                          ...d,
                          description: e.target.value,
                        }))
                      }
                      rows={3}
                      placeholder="Product description"
                      data-ocid="admin.product_description_input"
                      className={`${inputClass} resize-y`}
                    />
                  </div>

                  {/* Complex field note */}
                  <p className="text-xs text-gray-500 mt-3">
                    Variants and images are preserved from the existing product
                    when editing and are not modified by this form.
                  </p>

                  {productError && (
                    <p
                      className="text-sm text-destructive mt-3"
                      data-ocid="admin.product_error"
                    >
                      {productError}
                    </p>
                  )}
                  {productSuccess && (
                    <p
                      className="text-sm text-success flex items-center gap-2 mt-3"
                      data-ocid="admin.product_success"
                    >
                      <Check className="w-4 h-4" />
                      {productMode === "create"
                        ? "Product created successfully."
                        : "Product updated successfully."}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleSaveProduct}
                    disabled={
                      createProduct.isPending || updateProduct.isPending
                    }
                    data-ocid="admin.save_product_button"
                    className="btn w-full mt-4 px-6 py-3 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {createProduct.isPending || updateProduct.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        {productMode === "create"
                          ? "Create Product"
                          : "Save Product"}
                      </>
                    )}
                  </button>
                </div>

                {/* Test Product card */}
                <div
                  className="card glass-card p-6 sm:p-8"
                  data-ocid="admin.test_product_panel"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="relative">
                      <FlaskConical className="w-8 h-8 text-pink-400" />
                      <div className="absolute inset-0 rounded-full bg-pink-400/20 blur-xl animate-pulse" />
                    </div>
                    <div>
                      <h3
                        className="text-2xl font-semibold text-white"
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        Test Product
                      </h3>
                      <p className="text-sm text-gray-400">
                        Hidden internal payment test item
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-gray-300 mb-4">
                    The test product is hidden from the public shop grid. As an
                    admin you can open it directly to verify crypto checkout end
                    to end without affecting public listings.
                  </p>

                  <button
                    type="button"
                    onClick={() => onNavigateToProduct("6")}
                    data-ocid="admin.open_test_product_button"
                    className="btn w-full px-6 py-3 text-sm font-semibold"
                  >
                    <FlaskConical className="w-4 h-4" />
                    Open Test Product
                  </button>
                </div>
              </div>
            )}

            {/* ============================================================
               Canister Health
               ============================================================ */}
            <div
              className="max-w-6xl mx-auto mb-8 card glass-card p-6 sm:p-8"
              data-ocid="admin.canister_health_panel"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="relative">
                  <Activity className="w-8 h-8 text-teal-400" />
                  <div className="absolute inset-0 rounded-full bg-teal-400/20 blur-xl animate-pulse" />
                </div>
                <div>
                  <h3
                    className="text-2xl font-semibold text-white"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Canister Health
                  </h3>
                  <p className="text-sm text-gray-400">
                    Cycle funding and canister identity
                  </p>
                </div>
              </div>

              {/* Cycle balance with color band + gauge */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs uppercase tracking-wider text-gray-400">
                    Cycle Balance
                  </p>
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={{
                      color:
                        cycleBalance === undefined
                          ? "#fbbf24"
                          : cycleBalance > 2_000_000_000_000n
                            ? "#34d399"
                            : cycleBalance >= 500_000_000_000n
                              ? "#fbbf24"
                              : "#f87171",
                      backgroundColor: `${
                        cycleBalance === undefined
                          ? "#fbbf24"
                          : cycleBalance > 2_000_000_000_000n
                            ? "#34d399"
                            : cycleBalance >= 500_000_000_000n
                              ? "#fbbf24"
                              : "#f87171"
                      }1f`,
                      border: `1px solid ${
                        cycleBalance === undefined
                          ? "#fbbf24"
                          : cycleBalance > 2_000_000_000_000n
                            ? "#34d399"
                            : cycleBalance >= 500_000_000_000n
                              ? "#fbbf24"
                              : "#f87171"
                      }55`,
                    }}
                    data-ocid="admin.cycle_balance_badge"
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor:
                          cycleBalance === undefined
                            ? "#fbbf24"
                            : cycleBalance > 2_000_000_000_000n
                              ? "#34d399"
                              : cycleBalance >= 500_000_000_000n
                                ? "#fbbf24"
                                : "#f87171",
                      }}
                    />
                    {cycleBalance !== undefined
                      ? formatCycles(cycleBalance)
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-3 rounded-full bg-black/40 border border-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${
                          cycleBalance === undefined
                            ? 0
                            : Math.min(
                                100,
                                (Number(cycleBalance) / 2_000_000_000_000) *
                                  100,
                              )
                        }%`,
                        backgroundColor:
                          cycleBalance === undefined
                            ? "#fbbf24"
                            : cycleBalance > 2_000_000_000_000n
                              ? "#34d399"
                              : cycleBalance >= 500_000_000_000n
                                ? "#fbbf24"
                                : "#f87171",
                      }}
                      data-ocid="admin.cycle_gauge"
                    />
                  </div>
                  <span
                    className="text-xs text-gray-400 shrink-0"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    2T threshold
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Low cycles can cause inter-canister ledger calls to fail. Keep
                  the balance above 2T cycles.
                </p>
              </div>

              {/* Canister ID with copy + DRAFT/LIVE label */}
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">
                  Canister ID
                </p>
                <div className="flex items-center gap-3 bg-black/30 px-4 py-3 rounded-xl border border-white/10">
                  <Server className="w-4 h-4 text-teal-400 shrink-0" />
                  <code className="font-mono-nak text-sm flex-1 break-all text-teal-300">
                    {canisterId ?? "—"}
                  </code>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!canisterId) return;
                      try {
                        await navigator.clipboard.writeText(canisterId);
                        setCanisterCopied(true);
                        setTimeout(() => setCanisterCopied(false), 2000);
                      } catch {
                        setCanisterCopied(false);
                      }
                    }}
                    data-ocid="admin.copy_canister_button"
                    className="btn flex items-center gap-2 px-3 py-2 text-xs"
                    title="Copy canister ID"
                  >
                    {canisterCopied ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    {canisterCopied ? "Copied" : "Copy"}
                  </button>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold shrink-0 ${
                      canisterId === "vm5zh-yaaaa-aaaaj-qoaza-cai" ||
                      window.location.hostname.includes("draft")
                        ? "bg-warning-soft text-warning border border-amber-500/30"
                        : "bg-success-soft text-success border border-emerald-500/30"
                    }`}
                    data-ocid="admin.env_label"
                  >
                    {canisterId === "vm5zh-yaaaa-aaaaj-qoaza-cai" ||
                    window.location.hostname.includes("draft")
                      ? "DRAFT"
                      : "LIVE"}
                  </span>
                </div>
              </div>
            </div>

            {/* ============================================================
               Orders
               ============================================================ */}
            <div
              className="max-w-6xl mx-auto mb-8 card glass-card p-6 sm:p-8"
              data-ocid="admin.orders_panel"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="relative">
                  <RefreshCw className="w-8 h-8 text-purple-400" />
                  <div className="absolute inset-0 rounded-full bg-purple-400/20 blur-xl animate-pulse" />
                </div>
                <div>
                  <h3
                    className="text-2xl font-semibold text-white"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Orders
                  </h3>
                  <p className="text-sm text-gray-400">
                    Filter, re-check, and sweep crypto orders
                  </p>
                </div>
              </div>

              {/* Filter buttons */}
              <div className="flex flex-wrap gap-2 mb-6">
                {[
                  "all",
                  "awaiting_payment",
                  "paid",
                  "expired",
                  "cancelled",
                  "needs_review",
                ].map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setOrderFilter(filter)}
                    data-ocid={`admin.order_filter.${filter}`}
                    className={`btn px-4 py-2 text-xs font-semibold ${
                      orderFilter === filter
                        ? "opacity-100"
                        : "opacity-50 hover:opacity-80"
                    }`}
                  >
                    {filter.replace(/_/g, " ")}
                  </button>
                ))}
              </div>

              {/* Per-row action error (exact ledger text) */}
              {orderActionError && (
                <div className="mb-4">
                  <div
                    className="error-panel relative flex items-start gap-2"
                    role="alert"
                    data-ocid="admin.order_action_error"
                  >
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span className="min-w-0">{orderActionError}</span>
                  </div>
                </div>
              )}

              {ordersLoading ? (
                <div
                  className="loading-shimmer h-40 rounded-xl"
                  data-ocid="admin.orders_loading"
                />
              ) : !orders || orders.length === 0 ? (
                <div
                  className="text-center py-10 text-gray-400"
                  data-ocid="admin.orders_empty"
                >
                  <p className="text-sm">No orders match the current filter.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Reference</th>
                        <th>Status</th>
                        <th className="text-right">Amount</th>
                        <th>Method</th>
                        <th>Deposit Address</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order, index) => {
                        const decimals = order.currency === "ICP" ? 8 : 6;
                        return (
                          <tr
                            key={order.reference}
                            data-ocid={`admin.order_row.${index + 1}`}
                          >
                            <td className="admin-mono">{order.reference}</td>
                            <td>
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusTone(
                                  order.status,
                                )}`}
                              >
                                {order.status}
                              </span>
                              {order.cryptoStatus && (
                                <span className="block text-xs text-gray-400 mt-1">
                                  {cryptoStatusLabel(order.cryptoStatus)}
                                </span>
                              )}
                            </td>
                            <td className="admin-mono text-right">
                              {formatTokenAmount(order.amountOwed, decimals)}{" "}
                              {order.currency}
                            </td>
                            <td className="admin-mono">
                              {paymentMethodLabel(order.paymentMethod)}
                            </td>
                            <td className="admin-mono max-w-[16rem]">
                              <span className="block break-all">
                                {order.depositAccountText}
                              </span>
                            </td>
                            <td>
                              <div className="flex flex-col gap-2 min-w-[15rem]">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    className="btn-recheck"
                                    onClick={() =>
                                      forceRecheck.mutate(order.reference, {
                                        onError: (err) =>
                                          setOrderActionError(
                                            err &&
                                              typeof err === "object" &&
                                              "__kind__" in err
                                              ? recoveryErrorMessage(
                                                  err as unknown as RecoveryError,
                                                )
                                              : errorText(err),
                                          ),
                                      })
                                    }
                                    disabled={forceRecheck.isPending}
                                    data-ocid={`admin.recheck_button.${index + 1}`}
                                  >
                                    <RefreshCw className="w-3 h-3" />
                                    {forceRecheck.isPending
                                      ? "Checking…"
                                      : "Re-check payment"}
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-sweep"
                                    onClick={() =>
                                      forceSweep.mutate(order.reference, {
                                        onError: (err) =>
                                          setOrderActionError(
                                            err &&
                                              typeof err === "object" &&
                                              "__kind__" in err
                                              ? recoveryErrorMessage(
                                                  err as unknown as RecoveryError,
                                                )
                                              : errorText(err),
                                          ),
                                      })
                                    }
                                    disabled={forceSweep.isPending}
                                    data-ocid={`admin.sweep_button.${index + 1}`}
                                  >
                                    {forceSweep.isPending
                                      ? "Sweeping…"
                                      : "Sweep now"}
                                  </button>
                                </div>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={trackingDraft[order.reference] ?? ""}
                                    onChange={(e) =>
                                      setTrackingDraft((d) => ({
                                        ...d,
                                        [order.reference]: e.target.value,
                                      }))
                                    }
                                    placeholder="Tracking # (optional)"
                                    data-ocid={`admin.tracking_input.${index + 1}`}
                                    className="flex-1 min-w-0 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
                                  />
                                  <button
                                    type="button"
                                    className="btn-shipped"
                                    onClick={() =>
                                      handleMarkShipped(order.reference)
                                    }
                                    disabled={markShipped.isPending}
                                    data-ocid={`admin.mark_shipped_button.${index + 1}`}
                                  >
                                    <Truck className="w-3 h-3" />
                                    {markShipped.isPending
                                      ? "Shipping…"
                                      : "Mark shipped"}
                                  </button>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    className="btn-email"
                                    onClick={() =>
                                      handleResendEmail(order.reference)
                                    }
                                    disabled={resendEmail.isPending}
                                    data-ocid={`admin.resend_email_button.${index + 1}`}
                                  >
                                    <Mail className="w-3 h-3" />
                                    {resendEmail.isPending
                                      ? "Sending…"
                                      : "Resend confirmation email"}
                                  </button>
                                </div>
                                {shippedError && (
                                  <p
                                    className="text-xs text-destructive"
                                    data-ocid={`admin.shipped_error.${index + 1}`}
                                  >
                                    {shippedError}
                                  </p>
                                )}
                                {resendError && (
                                  <p
                                    className="text-xs text-destructive"
                                    data-ocid={`admin.resend_error.${index + 1}`}
                                  >
                                    {resendError}
                                  </p>
                                )}
                                {resendSuccess === order.reference && (
                                  <p
                                    className="text-xs text-success flex items-center gap-1"
                                    data-ocid={`admin.resend_success.${index + 1}`}
                                  >
                                    <Check className="w-3 h-3" />
                                    Confirmation email resent.
                                  </p>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ============================================================
               Consent List
               ============================================================ */}
            <div
              className="max-w-6xl mx-auto mb-8 card glass-card p-6 sm:p-8"
              data-ocid="admin.consent_panel"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="relative">
                  <Mail className="w-8 h-8 text-teal-400" />
                  <div className="absolute inset-0 rounded-full bg-teal-400/20 blur-xl animate-pulse" />
                </div>
                <div>
                  <h3
                    className="text-2xl font-semibold text-white"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Consent List
                  </h3>
                  <p className="text-sm text-gray-400">
                    Addresses that opted into marketing email
                  </p>
                </div>
              </div>

              <p className="text-sm text-gray-300 mb-4">
                Export the addresses that have given marketing consent as a CSV.
                Suppressed (unsubscribed) addresses are excluded, and
                transactional emails are never affected.
              </p>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <button
                  type="button"
                  className="btn-export"
                  onClick={handleExportConsentCsv}
                  disabled={consentCsv.isFetching}
                  data-ocid="admin.export_consent_button"
                >
                  <Download className="w-4 h-4" />
                  {consentCsv.isFetching
                    ? "Loading…"
                    : "Export consent list (CSV)"}
                </button>
                {consentCsv.isFetching && (
                  <span className="text-xs text-gray-400 flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Fetching consent list…
                  </span>
                )}
              </div>

              {consentCsv.error && (
                <div className="mt-4">
                  <div
                    className="error-panel relative flex items-start gap-2"
                    role="alert"
                    data-ocid="admin.consent_query_error"
                  >
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span className="min-w-0">
                      {consentErrorMessage(
                        consentCsv.error as unknown as ConsentError,
                      )}
                    </span>
                  </div>
                </div>
              )}
              {consentError && (
                <div className="mt-4">
                  <div
                    className="error-panel relative flex items-start gap-2"
                    role="alert"
                    data-ocid="admin.consent_error"
                  >
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span className="min-w-0">{consentError}</span>
                  </div>
                </div>
              )}
              {consentSuccess && (
                <p
                  className="text-sm text-success flex items-center gap-2 mt-4"
                  data-ocid="admin.consent_success"
                >
                  <Check className="w-4 h-4" />
                  Consent list downloaded.
                </p>
              )}
            </div>

            {/* ============================================================
               Subaccount Sweep
               ============================================================ */}
            <div
              className="max-w-6xl mx-auto mb-8 card glass-card p-6 sm:p-8"
              data-ocid="admin.subaccount_sweep_panel"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="relative">
                  <Wallet className="w-8 h-8 text-purple-400" />
                  <div className="absolute inset-0 rounded-full bg-purple-400/20 blur-xl animate-pulse" />
                </div>
                <div>
                  <h3
                    className="text-2xl font-semibold text-white"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Subaccount Sweep
                  </h3>
                  <p className="text-sm text-gray-400">
                    Inspect and sweep a specific deposit subaccount
                  </p>
                </div>
              </div>

              <p className="text-sm text-gray-300 mb-4">
                Query a deposit subaccount by its integer index to see its live
                on-ledger balance, then sweep it to the treasury. Any ledger
                error is surfaced exactly here.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  inputMode="numeric"
                  value={subaccountIndexText}
                  onChange={(e) => setSubaccountIndexText(e.target.value)}
                  placeholder="Subaccount index (e.g. 0)"
                  data-ocid="admin.subaccount_index_input"
                  className="flex-1 min-w-0 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 font-mono-nak"
                />
                <button
                  type="button"
                  className="btn-recheck"
                  onClick={handleQuerySubaccount}
                  data-ocid="admin.query_subaccount_button"
                >
                  <Gauge className="w-4 h-4" />
                  Query balance
                </button>
                <button
                  type="button"
                  className="btn-sweep"
                  onClick={handleSweepSubaccount}
                  disabled={sweepSubaccount.isPending}
                  data-ocid="admin.sweep_subaccount_button"
                >
                  {sweepSubaccount.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sweeping…
                    </>
                  ) : (
                    <>
                      <Coins className="w-4 h-4" />
                      Sweep to treasury
                    </>
                  )}
                </button>
              </div>

              {subaccountBalance && (
                <div className="mt-4 bg-black/30 border border-white/10 rounded-xl p-4">
                  <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">
                    Subaccount {subaccountBalance.subaccountIndex.toString()}
                  </p>
                  <p className="text-sm text-gray-300">
                    Balance:{" "}
                    <span className="admin-mono text-white">
                      {formatTokenAmount(subaccountBalance.balance)} ckUSDC
                    </span>
                  </p>
                  <code className="font-mono-nak text-xs break-all text-teal-300 block mt-2">
                    {subaccountBalance.subaccountHex}
                  </code>
                </div>
              )}
              {subaccountBalanceError && (
                <div className="mt-4">
                  <div
                    className="error-panel relative flex items-start gap-2"
                    role="alert"
                    data-ocid="admin.subaccount_balance_error"
                  >
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span className="min-w-0">
                      {subaccountBalanceError instanceof Error
                        ? subaccountBalanceError.message
                        : "Failed to query subaccount balance."}
                    </span>
                  </div>
                </div>
              )}
              {subaccountSweepError && (
                <div className="mt-4">
                  <div
                    className="error-panel relative flex items-start gap-2"
                    role="alert"
                    data-ocid="admin.subaccount_sweep_error"
                  >
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span className="min-w-0">{subaccountSweepError}</span>
                  </div>
                </div>
              )}
              {subaccountSweepSuccess && (
                <p
                  className="text-sm text-success flex items-center gap-2 mt-4"
                  data-ocid="admin.subaccount_sweep_success"
                >
                  <Check className="w-4 h-4" />
                  {subaccountSweepSuccess}
                </p>
              )}
            </div>

            {/* ============================================================
               Funds
               ============================================================ */}
            <div
              className="max-w-6xl mx-auto mb-8 card glass-card p-6 sm:p-8"
              data-ocid="admin.funds_panel"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="relative">
                  <Coins className="w-8 h-8 text-pink-400" />
                  <div className="absolute inset-0 rounded-full bg-pink-400/20 blur-xl animate-pulse" />
                </div>
                <div>
                  <h3
                    className="text-2xl font-semibold text-white"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Funds
                  </h3>
                  <p className="text-sm text-gray-400">
                    Treasury, default subaccount, and unswept order funds
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Treasury */}
                <div className="bg-black/30 border border-white/10 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Landmark className="w-4 h-4 text-purple-400" />
                    <p className="text-xs uppercase tracking-wider text-gray-400">
                      Treasury
                    </p>
                  </div>
                  <code className="font-mono-nak text-xs break-all text-teal-300 block mb-3">
                    {DEFAULT_TREASURY_PRINCIPAL}
                  </code>
                  <p className="text-sm text-gray-300">
                    ckUSDC balance:{" "}
                    <span className="admin-mono text-white">
                      {treasuryCkUsdcBalance}
                    </span>
                  </p>
                </div>

                {/* Default subaccount */}
                <div className="bg-black/30 border border-white/10 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Wallet className="w-4 h-4 text-teal-400" />
                    <p className="text-xs uppercase tracking-wider text-gray-400">
                      Default Subaccount
                    </p>
                  </div>
                  <p className="text-sm text-gray-300 mb-3">
                    Balance:{" "}
                    <span className="admin-mono text-white">
                      {defaultSubaccountBalance == null
                        ? "—"
                        : `${formatTokenAmount(defaultSubaccountBalance)} ckUSDC`}
                    </span>
                  </p>
                  <button
                    type="button"
                    className="btn-sweep"
                    onClick={() =>
                      sweepDefault.mutate(undefined, {
                        onError: (err) =>
                          setSweepError(
                            err && typeof err === "object" && "__kind__" in err
                              ? recoveryErrorMessage(
                                  err as unknown as RecoveryError,
                                )
                              : errorText(err),
                          ),
                      })
                    }
                    disabled={sweepDefault.isPending}
                    data-ocid="admin.sweep_default_button"
                  >
                    {sweepDefault.isPending ? "Sweeping…" : "Sweep to treasury"}
                  </button>
                  {sweepError && (
                    <div className="mt-3">
                      <div
                        className="error-panel relative flex items-start gap-2"
                        role="alert"
                        data-ocid="admin.sweep_error"
                      >
                        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                        <span className="min-w-0">{sweepError}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Unswept order funds */}
                <div className="bg-black/30 border border-white/10 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Coins className="w-4 h-4 text-pink-400" />
                    <p className="text-xs uppercase tracking-wider text-gray-400">
                      Unswept Order Funds
                    </p>
                  </div>
                  <p className="text-sm text-gray-300">
                    Total across order subaccounts:{" "}
                    <span className="admin-mono text-white">
                      {unsweptTotal == null
                        ? "—"
                        : `${formatTokenAmount(unsweptTotal)} ckUSDC`}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Live on-ledger balances from {recoveryOrders?.length ?? 0}{" "}
                    crypto order(s).
                  </p>
                </div>
              </div>
            </div>

            {/* Admin authorization note */}
            <div
              className="max-w-6xl mx-auto mt-8 flex items-center justify-center gap-2 text-sm text-gray-400"
              data-ocid="admin.auth_note"
            >
              <Lock className="w-4 h-4" />
              <span>
                These settings are admin-only. Unauthorized changes are
                rejected.
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminSettingsPage;
