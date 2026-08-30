import { Token } from "@/backend";
import {
  useAddAdmin,
  useClaimInitialAdmin,
  useCryptoConfig,
  useIsAdmin,
  useListAdmins,
  usePaymentServiceConfig,
  useRemoveAdmin,
  useUpdateLedgerConfig,
  useUpdatePaymentServiceToken,
  useUpdatePaymentServiceUrl,
  useUpdateTreasury,
} from "@/hooks/useQueries";
import type {
  CryptoPaymentError,
  PaymentServiceError,
} from "@/types/storefront";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { Principal } from "@icp-sdk/core/principal";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Copy,
  CreditCard,
  Landmark,
  Loader2,
  Lock,
  LogIn,
  LogOut,
  Save,
  Settings,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  UserX,
  Wallet,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";

interface AdminSettingsPageProps {
  onNavigateToMain: () => void;
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

const AdminSettingsPage: React.FC<AdminSettingsPageProps> = ({
  onNavigateToMain,
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
              </div>
            )}

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
