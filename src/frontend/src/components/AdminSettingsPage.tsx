import { Token } from "@/backend";
import {
  useCryptoConfig,
  useUpdateLedgerConfig,
  useUpdateTreasury,
} from "@/hooks/useQueries";
import type { CryptoPaymentError } from "@/types/storefront";
import { Principal } from "@icp-sdk/core/principal";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Copy,
  Landmark,
  Loader2,
  Lock,
  Save,
  Settings,
  ShieldAlert,
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

const AdminSettingsPage: React.FC<AdminSettingsPageProps> = ({
  onNavigateToMain,
}) => {
  const { data: config, isLoading } = useCryptoConfig();
  const updateTreasury = useUpdateTreasury();
  const updateLedger = useUpdateLedgerConfig();

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
                  {treasuryUnset && <li>• Treasury principal is not set.</li>}
                  {icpUnset && <li>• ICP ledger canister ID is not set.</li>}
                  {ckUsdcUnset && (
                    <li>• ckUSDC ledger canister ID is not set.</li>
                  )}
                </ul>
                <p className="mt-2 text-sm text-gray-400">
                  Crypto deposits will not work until these critical values are
                  configured.
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
                    onChange={(e) => setTreasuryPrincipalText(e.target.value)}
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
                  <p className="text-sm text-destructive mt-2">{icpError}</p>
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
                  <p className="text-sm text-destructive mt-2">{ckUsdcError}</p>
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
                    ICP deposits require a rate oracle to convert amounts. ICP
                    is disabled until a rate oracle is configured. ckUSDC
                    deposits remain available.
                  </p>
                </div>
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
            These settings are admin-only. Unauthorized changes are rejected.
          </span>
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsPage;
