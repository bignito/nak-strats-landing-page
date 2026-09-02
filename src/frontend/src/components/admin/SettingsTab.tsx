import { Token } from "@/backend";
import {
  adminErrorMessage,
  useCryptoConfig,
  useGetMinimumOrder,
  usePaymentServiceConfig,
  useUpdateLedgerConfig,
  useUpdateMinimumOrder,
  useUpdatePaymentServiceToken,
  useUpdatePaymentServiceUrl,
  useUpdateTreasury,
} from "@/hooks/useQueries";
import { formatPrice } from "@/lib/currency";
import type { AdminTabBodyProps } from "@/types/routes";
import { Principal } from "@icp-sdk/core/principal";
import { Loader2, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { AdminConfirmDialog } from "./AdminConfirmDialog";
import { AdminPanel } from "./AdminPanel";
import { AdminStatCard } from "./AdminStatCard";

function formatE8s(value: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = value / divisor;
  const fraction = value % divisor;
  if (fraction === 0n) return whole.toString();
  const padded = fraction.toString().padStart(decimals, "0");
  return `${whole}.${padded.replace(/0+$/, "")}`;
}

/**
 * SETTINGS tab — ADMIN/OWNER financial and payment configuration. Every field
 * is a write-only or read-only surface: the payment service token is never
 * rendered back (only set/not set), and every mutation passes through an
 * explicit confirmation step. Ledger and outcall errors are displayed
 * verbatim via adminErrorMessage.
 */
export function SettingsTab({ session }: AdminTabBodyProps) {
  const canManage = session.canManage;

  const {
    data: cryptoConfig,
    isLoading: cryptoLoading,
    error: cryptoError,
  } = useCryptoConfig();
  const {
    data: paymentConfig,
    isLoading: paymentLoading,
    error: paymentError,
  } = usePaymentServiceConfig();
  const { data: minimumOrder, isLoading: minimumLoading } =
    useGetMinimumOrder();

  const updateTreasury = useUpdateTreasury();
  const updateLedgerConfig = useUpdateLedgerConfig();
  const updatePaymentServiceUrl = useUpdatePaymentServiceUrl();
  const updatePaymentServiceToken = useUpdatePaymentServiceToken();
  const updateMinimumOrder = useUpdateMinimumOrder();

  const [treasuryInput, setTreasuryInput] = useState("");
  const [treasuryError, setTreasuryError] = useState<string | null>(null);

  const [icpCanisterInput, setIcpCanisterInput] = useState("");
  const [icpDecimalsInput, setIcpDecimalsInput] = useState("");
  const [icpFeeInput, setIcpFeeInput] = useState("");
  const [icpError, setIcpError] = useState<string | null>(null);

  const [usdcCanisterInput, setUsdcCanisterInput] = useState("");
  const [usdcDecimalsInput, setUsdcDecimalsInput] = useState("");
  const [usdcFeeInput, setUsdcFeeInput] = useState("");
  const [usdcError, setUsdcError] = useState<string | null>(null);

  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);

  const [tokenInput, setTokenInput] = useState("");
  const [tokenError, setTokenError] = useState<string | null>(null);

  const [minimumInput, setMinimumInput] = useState("");
  const [minimumError, setMinimumError] = useState<string | null>(null);

  const handleUpdateTreasury = () => {
    setTreasuryError(null);
    let principal: Principal;
    try {
      principal = Principal.fromText(treasuryInput.trim());
    } catch {
      setTreasuryError(
        "Invalid principal — enter a valid Internet Computer principal.",
      );
      return;
    }
    updateTreasury.mutate(
      { principal, subaccount: null },
      {
        onError: (err) => setTreasuryError(adminErrorMessage(err)),
        onSuccess: () => setTreasuryInput(""),
      },
    );
  };

  const handleUpdateLedger = (token: Token) => {
    const canisterInput =
      token === Token.ICP ? icpCanisterInput : usdcCanisterInput;
    const decimalsInput =
      token === Token.ICP ? icpDecimalsInput : usdcDecimalsInput;
    const feeInput = token === Token.ICP ? icpFeeInput : usdcFeeInput;
    const setError = token === Token.ICP ? setIcpError : setUsdcError;

    setError(null);
    let canisterId: Principal;
    try {
      canisterId = Principal.fromText(canisterInput.trim());
    } catch {
      setError(
        "Invalid canister ID — enter a valid Internet Computer principal.",
      );
      return;
    }
    const decimals = Number(decimalsInput.trim());
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
      setError("Decimals must be an integer between 0 and 18.");
      return;
    }
    let fee: bigint;
    try {
      fee = BigInt(feeInput.trim());
    } catch {
      setError("Fee must be a non-negative integer.");
      return;
    }
    if (fee < 0n) {
      setError("Fee must be a non-negative integer.");
      return;
    }
    updateLedgerConfig.mutate(
      { token, canisterId, decimals, fee },
      {
        onError: (err) => setError(adminErrorMessage(err)),
        onSuccess: () => {
          if (token === Token.ICP) {
            setIcpCanisterInput("");
            setIcpDecimalsInput("");
            setIcpFeeInput("");
          } else {
            setUsdcCanisterInput("");
            setUsdcDecimalsInput("");
            setUsdcFeeInput("");
          }
        },
      },
    );
  };

  const handleUpdateUrl = () => {
    setUrlError(null);
    const url = urlInput.trim();
    if (!url) {
      setUrlError("URL cannot be empty.");
      return;
    }
    updatePaymentServiceUrl.mutate(url, {
      onError: (err) => setUrlError(adminErrorMessage(err)),
      onSuccess: () => setUrlInput(""),
    });
  };

  const handleUpdateToken = () => {
    setTokenError(null);
    const token = tokenInput.trim();
    if (!token) {
      setTokenError("Token cannot be empty.");
      return;
    }
    updatePaymentServiceToken.mutate(token, {
      onError: (err) => setTokenError(adminErrorMessage(err)),
      onSuccess: () => setTokenInput(""),
    });
  };

  const handleUpdateMinimum = () => {
    setMinimumError(null);
    const dollars = Number(minimumInput.trim());
    if (!Number.isFinite(dollars) || dollars < 0) {
      setMinimumError("Minimum must be a non-negative dollar amount.");
      return;
    }
    updateMinimumOrder.mutate(dollars, {
      onError: (err) => setMinimumError(adminErrorMessage(err)),
      onSuccess: () => setMinimumInput(""),
    });
  };

  const icp = cryptoConfig?.icp;
  const usdc = cryptoConfig?.ckUSDC;
  const treasuryPrincipal = cryptoConfig?.treasuryPrincipal;

  return (
    <div className="flex flex-col gap-4">
      {/* Role gate */}
      {!canManage && (
        <div
          className="flex items-start gap-3 p-4"
          style={{
            background: "var(--error-panel-bg)",
            border: "1px solid var(--error-panel-border)",
            borderRadius: "var(--radius)",
          }}
          data-ocid="admin.settings.role_gate"
        >
          <ShieldAlert
            className="w-5 h-5 shrink-0 mt-0.5"
            style={{ color: "var(--nak-warning)" }}
          />
          <div>
            <p
              className="font-medium"
              style={{ color: "var(--foreground)", fontSize: "0.875rem" }}
            >
              Read-only view
            </p>
            <p
              style={{
                color: "var(--muted-foreground)",
                fontSize: "0.8125rem",
              }}
            >
              Financial and payment configuration requires ADMIN or OWNER. Your
              role can view these values but cannot change them.
            </p>
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div className="admin-stat-grid" data-ocid="admin.settings.stats">
        <AdminStatCard
          label="Treasury"
          value={
            treasuryPrincipal ? (
              <code className="text-xs">{treasuryPrincipal.toText()}</code>
            ) : (
              "—"
            )
          }
        />
        <AdminStatCard
          label="Payment service"
          value={paymentConfig?.url ? "Configured" : "Not set"}
          band={paymentConfig?.url ? "positive" : "warning"}
        />
        <AdminStatCard
          label="Service token"
          value={paymentConfig?.tokenSet ? "Set" : "Not set"}
          band={paymentConfig?.tokenSet ? "positive" : "warning"}
        />
        <AdminStatCard
          label="Min order"
          value={minimumOrder !== undefined ? formatPrice(minimumOrder) : "—"}
        />
      </div>

      {/* Treasury */}
      <AdminPanel
        title="Treasury"
        actions={
          <span
            className="text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            ADMIN / OWNER
          </span>
        }
      >
        {cryptoLoading ? (
          <div
            className="flex items-center gap-3 py-6"
            style={{ color: "var(--muted-foreground)" }}
            data-ocid="admin.settings.loading_state"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading configuration…
          </div>
        ) : cryptoError ? (
          <div className="error-panel" data-ocid="admin.settings.error_state">
            {adminErrorMessage(cryptoError)}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="field-label" htmlFor="settings-treasury">
                Treasury principal
              </label>
              <input
                id="settings-treasury"
                className="field-input"
                placeholder={treasuryPrincipal?.toText() ?? "aaaaa-aaaaa-…"}
                value={treasuryInput}
                onChange={(e) => setTreasuryInput(e.target.value)}
                disabled={!canManage}
                data-ocid="admin.settings.treasury_input"
              />
            </div>
            <div className="flex items-center gap-3">
              <AdminConfirmDialog
                trigger={
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!canManage || !treasuryInput.trim()}
                    data-ocid="admin.settings.treasury_button"
                  >
                    Update treasury
                  </button>
                }
                title="Update treasury"
                description={`Set the treasury principal to ${treasuryInput.trim() || "this principal"}? All swept funds are sent to this account.`}
                confirmLabel="Update treasury"
                cancelLabel="Cancel"
                tone="warning"
                onConfirm={handleUpdateTreasury}
                pending={updateTreasury.isPending}
                disabled={!canManage || !treasuryInput.trim()}
              />
              {updateTreasury.isPending && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
            </div>
            {treasuryError && (
              <div
                className="error-panel"
                data-ocid="admin.settings.treasury_error"
              >
                {treasuryError}
              </div>
            )}
          </div>
        )}
      </AdminPanel>

      {/* Ledger configs */}
      <AdminPanel
        title="Ledger canisters"
        actions={
          <span
            className="text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            ADMIN / OWNER
          </span>
        }
      >
        {cryptoLoading ? (
          <div
            className="flex items-center gap-3 py-6"
            style={{ color: "var(--muted-foreground)" }}
            data-ocid="admin.settings.loading_state"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading configuration…
          </div>
        ) : cryptoError ? (
          <div className="error-panel" data-ocid="admin.settings.error_state">
            {adminErrorMessage(cryptoError)}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* ICP ledger */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="section-heading text-sm">ICP ledger</span>
                {icp && (
                  <span
                    className="text-xs"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Current:{" "}
                    <code className="admin-mono">
                      {icp.canisterId.toText()}
                    </code>{" "}
                    · {icp.decimals} decimals · fee{" "}
                    {formatE8s(icp.fee, icp.decimals)}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label
                    className="field-label"
                    htmlFor="settings-icp-canister"
                  >
                    Canister ID
                  </label>
                  <input
                    id="settings-icp-canister"
                    className="field-input"
                    placeholder={
                      icp?.canisterId.toText() ?? "ryjl3-tyaaa-aaaaa-aaaba-cai"
                    }
                    value={icpCanisterInput}
                    onChange={(e) => setIcpCanisterInput(e.target.value)}
                    disabled={!canManage}
                    data-ocid="admin.settings.icp_canister_input"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label
                    className="field-label"
                    htmlFor="settings-icp-decimals"
                  >
                    Decimals
                  </label>
                  <input
                    id="settings-icp-decimals"
                    className="field-input"
                    inputMode="numeric"
                    placeholder={icp ? String(icp.decimals) : "8"}
                    value={icpDecimalsInput}
                    onChange={(e) => setIcpDecimalsInput(e.target.value)}
                    disabled={!canManage}
                    data-ocid="admin.settings.icp_decimals_input"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="field-label" htmlFor="settings-icp-fee">
                    Fee (base units)
                  </label>
                  <input
                    id="settings-icp-fee"
                    className="field-input"
                    inputMode="numeric"
                    placeholder={
                      icp ? formatE8s(icp.fee, icp.decimals) : "10000"
                    }
                    value={icpFeeInput}
                    onChange={(e) => setIcpFeeInput(e.target.value)}
                    disabled={!canManage}
                    data-ocid="admin.settings.icp_fee_input"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <AdminConfirmDialog
                  trigger={
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={
                        !canManage ||
                        (!icpCanisterInput.trim() &&
                          !icpDecimalsInput.trim() &&
                          !icpFeeInput.trim())
                      }
                      data-ocid="admin.settings.icp_button"
                    >
                      Update ICP ledger
                    </button>
                  }
                  title="Update ICP ledger"
                  description="Change the ICP ledger canister, decimals, or fee? Payments and sweeps use this configuration immediately."
                  confirmLabel="Update ICP ledger"
                  cancelLabel="Cancel"
                  tone="warning"
                  onConfirm={() => handleUpdateLedger(Token.ICP)}
                  pending={updateLedgerConfig.isPending}
                  disabled={
                    !canManage ||
                    (!icpCanisterInput.trim() &&
                      !icpDecimalsInput.trim() &&
                      !icpFeeInput.trim())
                  }
                />
                {updateLedgerConfig.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
              </div>
              {icpError && (
                <div
                  className="error-panel"
                  data-ocid="admin.settings.icp_error"
                >
                  {icpError}
                </div>
              )}
            </div>

            {/* ckUSDC ledger */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="section-heading text-sm">ckUSDC ledger</span>
                {usdc && (
                  <span
                    className="text-xs"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Current:{" "}
                    <code className="admin-mono">
                      {usdc.canisterId.toText()}
                    </code>{" "}
                    · {usdc.decimals} decimals · fee{" "}
                    {formatE8s(usdc.fee, usdc.decimals)}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label
                    className="field-label"
                    htmlFor="settings-usdc-canister"
                  >
                    Canister ID
                  </label>
                  <input
                    id="settings-usdc-canister"
                    className="field-input"
                    placeholder={
                      usdc?.canisterId.toText() ?? "xevnm-gaaaa-aaaar-qafnq-cai"
                    }
                    value={usdcCanisterInput}
                    onChange={(e) => setUsdcCanisterInput(e.target.value)}
                    disabled={!canManage}
                    data-ocid="admin.settings.usdc_canister_input"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label
                    className="field-label"
                    htmlFor="settings-usdc-decimals"
                  >
                    Decimals
                  </label>
                  <input
                    id="settings-usdc-decimals"
                    className="field-input"
                    inputMode="numeric"
                    placeholder={usdc ? String(usdc.decimals) : "6"}
                    value={usdcDecimalsInput}
                    onChange={(e) => setUsdcDecimalsInput(e.target.value)}
                    disabled={!canManage}
                    data-ocid="admin.settings.usdc_decimals_input"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="field-label" htmlFor="settings-usdc-fee">
                    Fee (base units)
                  </label>
                  <input
                    id="settings-usdc-fee"
                    className="field-input"
                    inputMode="numeric"
                    placeholder={
                      usdc ? formatE8s(usdc.fee, usdc.decimals) : "10000"
                    }
                    value={usdcFeeInput}
                    onChange={(e) => setUsdcFeeInput(e.target.value)}
                    disabled={!canManage}
                    data-ocid="admin.settings.usdc_fee_input"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <AdminConfirmDialog
                  trigger={
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={
                        !canManage ||
                        (!usdcCanisterInput.trim() &&
                          !usdcDecimalsInput.trim() &&
                          !usdcFeeInput.trim())
                      }
                      data-ocid="admin.settings.usdc_button"
                    >
                      Update ckUSDC ledger
                    </button>
                  }
                  title="Update ckUSDC ledger"
                  description="Change the ckUSDC ledger canister, decimals, or fee? Payments and sweeps use this configuration immediately."
                  confirmLabel="Update ckUSDC ledger"
                  cancelLabel="Cancel"
                  tone="warning"
                  onConfirm={() => handleUpdateLedger(Token.ckUSDC)}
                  pending={updateLedgerConfig.isPending}
                  disabled={
                    !canManage ||
                    (!usdcCanisterInput.trim() &&
                      !usdcDecimalsInput.trim() &&
                      !usdcFeeInput.trim())
                  }
                />
                {updateLedgerConfig.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
              </div>
              {usdcError && (
                <div
                  className="error-panel"
                  data-ocid="admin.settings.usdc_error"
                >
                  {usdcError}
                </div>
              )}
            </div>
          </div>
        )}
      </AdminPanel>

      {/* Payment service */}
      <AdminPanel
        title="Payment service"
        actions={
          <span
            className="text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            ADMIN / OWNER
          </span>
        }
      >
        {paymentLoading ? (
          <div
            className="flex items-center gap-3 py-6"
            style={{ color: "var(--muted-foreground)" }}
            data-ocid="admin.settings.loading_state"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading configuration…
          </div>
        ) : paymentError ? (
          <div className="error-panel" data-ocid="admin.settings.error_state">
            {adminErrorMessage(paymentError)}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* URL */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="section-heading text-sm">Service URL</span>
                <span
                  className="text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Current:{" "}
                  {paymentConfig?.url ? (
                    <code className="admin-mono">{paymentConfig.url}</code>
                  ) : (
                    "not set"
                  )}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="field-label" htmlFor="settings-payment-url">
                  PAYMENT_SERVICE_URL
                </label>
                <input
                  id="settings-payment-url"
                  className="field-input"
                  placeholder="https://pay.example.com"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  disabled={!canManage}
                  data-ocid="admin.settings.url_input"
                />
              </div>
              <div className="flex items-center gap-3">
                <AdminConfirmDialog
                  trigger={
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={!canManage || !urlInput.trim()}
                      data-ocid="admin.settings.url_button"
                    >
                      Update URL
                    </button>
                  }
                  title="Update payment service URL"
                  description={`Set PAYMENT_SERVICE_URL to ${urlInput.trim() || "this URL"}? Card payments and submissions are routed to this endpoint.`}
                  confirmLabel="Update URL"
                  cancelLabel="Cancel"
                  tone="warning"
                  onConfirm={handleUpdateUrl}
                  pending={updatePaymentServiceUrl.isPending}
                  disabled={!canManage || !urlInput.trim()}
                />
                {updatePaymentServiceUrl.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
              </div>
              {urlError && (
                <div
                  className="error-panel"
                  data-ocid="admin.settings.url_error"
                >
                  {urlError}
                </div>
              )}
            </div>

            {/* Token — write-only */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="section-heading text-sm">Service token</span>
                <span
                  className={`status-pill ${
                    paymentConfig?.tokenSet
                      ? "status-pill-positive"
                      : "status-pill-warning"
                  }`}
                  data-ocid="admin.settings.token_status"
                >
                  {paymentConfig?.tokenSet ? "Set" : "Not set"}
                </span>
              </div>
              <p
                className="text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
                Write-only. The token value is never displayed — only whether it
                is set. Entering a new value replaces the stored token.
              </p>
              <div className="flex flex-col gap-1.5">
                <label className="field-label" htmlFor="settings-payment-token">
                  PAYMENT_SERVICE_TOKEN
                </label>
                <input
                  id="settings-payment-token"
                  className="field-input"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••••••••••"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  disabled={!canManage}
                  data-ocid="admin.settings.token_input"
                />
              </div>
              <div className="flex items-center gap-3">
                <AdminConfirmDialog
                  trigger={
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={!canManage || !tokenInput.trim()}
                      data-ocid="admin.settings.token_button"
                    >
                      Update token
                    </button>
                  }
                  title="Update payment service token"
                  description="Replace the stored PAYMENT_SERVICE_TOKEN? The new value takes effect immediately and the old token stops working."
                  confirmLabel="Update token"
                  cancelLabel="Cancel"
                  tone="warning"
                  onConfirm={handleUpdateToken}
                  pending={updatePaymentServiceToken.isPending}
                  disabled={!canManage || !tokenInput.trim()}
                />
                {updatePaymentServiceToken.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
              </div>
              {tokenError && (
                <div
                  className="error-panel"
                  data-ocid="admin.settings.token_error"
                >
                  {tokenError}
                </div>
              )}
            </div>
          </div>
        )}
      </AdminPanel>

      {/* Minimum order */}
      <AdminPanel
        title="Minimum order"
        actions={
          <span
            className="text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            ADMIN / OWNER
          </span>
        }
      >
        {minimumLoading ? (
          <div
            className="flex items-center gap-3 py-6"
            style={{ color: "var(--muted-foreground)" }}
            data-ocid="admin.settings.loading_state"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading configuration…
          </div>
        ) : minimumError ? (
          <div className="error-panel" data-ocid="admin.settings.error_state">
            {adminErrorMessage(minimumError)}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="section-heading text-sm">
                Minimum order total
              </span>
              <span
                className="text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
                Current:{" "}
                <span className="num">{formatPrice(minimumOrder ?? 0)}</span>
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="field-label" htmlFor="settings-minimum">
                Minimum order total (USD)
              </label>
              <input
                id="settings-minimum"
                className="field-input"
                inputMode="decimal"
                placeholder={(minimumOrder ?? 0).toFixed(2)}
                value={minimumInput}
                onChange={(e) => setMinimumInput(e.target.value)}
                disabled={!canManage}
                data-ocid="admin.settings.minimum_input"
              />
            </div>
            <div className="flex items-center gap-3">
              <AdminConfirmDialog
                trigger={
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!canManage || !minimumInput.trim()}
                    data-ocid="admin.settings.minimum_button"
                  >
                    Update minimum
                  </button>
                }
                title="Update minimum order"
                description={`Set the minimum crypto order total to $${minimumInput.trim() || "0.00"}? Orders below this amount are rejected at checkout.`}
                confirmLabel="Update minimum"
                cancelLabel="Cancel"
                tone="warning"
                onConfirm={handleUpdateMinimum}
                pending={updateMinimumOrder.isPending}
                disabled={!canManage || !minimumInput.trim()}
              />
              {updateMinimumOrder.isPending && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
            </div>
            {minimumError && (
              <div
                className="error-panel"
                data-ocid="admin.settings.minimum_error"
              >
                {minimumError}
              </div>
            )}
          </div>
        )}
      </AdminPanel>
    </div>
  );
}
