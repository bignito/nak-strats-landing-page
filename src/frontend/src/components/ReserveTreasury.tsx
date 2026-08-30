import {
  BarChart3,
  Check,
  Coins,
  Copy,
  CreditCard,
  DollarSign,
  ExternalLink,
  Lock,
  Shield,
  Target,
  Vault,
  Zap,
} from "lucide-react";
import type React from "react";
import { useState } from "react";

const ReserveTreasury: React.FC = () => {
  const [copiedPID, setCopiedPID] = useState(false);
  const [copiedAccountID, setCopiedAccountID] = useState(false);
  const pidText =
    "ym3yz-lpqvj-spesx-r7efc-opibs-gjpts-erxs6-h4fa6-67wby-dnea7-rqe";
  const accountIdText =
    "4f5723c4c23303b5f6d9046e9d0ecbcf00dc70124c06f8adff4fbaebb50558ed";

  const handleCopyPID = async () => {
    try {
      await navigator.clipboard.writeText(pidText);
      setCopiedPID(true);
      setTimeout(() => setCopiedPID(false), 2000);
    } catch (err) {
      console.error("Failed to copy PID:", err);
    }
  };

  const handleCopyAccountID = async () => {
    try {
      await navigator.clipboard.writeText(accountIdText);
      setCopiedAccountID(true);
      setTimeout(() => setCopiedAccountID(false), 2000);
    } catch (err) {
      console.error("Failed to copy Account ID:", err);
    }
  };

  const handleTreasuryDashboardClick = () => {
    window.open("https://nakreserve-p6m.caffeine.xyz/", "_blank");
  };

  return (
    <div id="reserve-treasury" className="px-6 py-12">
      <div className="max-w-7xl mx-auto">
        {/* Compact Header with Prominent Dashboard Button */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="relative">
              <Vault className="w-10 h-10 text-teal-400" />
              <div className="absolute inset-0 rounded-full bg-teal-400/20 blur-xl animate-pulse" />
            </div>
            <h2
              className="text-3xl md:text-4xl font-semibold"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Reserve Treasury
            </h2>
          </div>
          <p className="text-lg max-w-2xl mx-auto text-gray-300 mb-8">
            Strategic asset management for NAK ecosystem growth and value
            preservation
          </p>

          {/* Prominent Treasury Dashboard Button - Positioned directly below title */}
          <div className="relative mb-6">
            {/* Enhanced glow effect for the button */}
            <div className="absolute inset-0 bg-gradient-to-r from-teal-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-60 animate-pulse" />

            <button
              type="button"
              onClick={handleTreasuryDashboardClick}
              className="relative inline-flex items-center gap-3 px-12 py-6 text-xl font-bold rounded-2xl transition-all duration-300 hover:scale-110 hover:shadow-xl group overflow-hidden border-2"
              style={{
                background:
                  "linear-gradient(135deg, var(--nak-teal) 0%, var(--nak-purple) 30%, var(--nak-pink) 70%, #fbbf24 100%)",
                borderColor: "rgba(6, 182, 212, 0.6)",
                boxShadow:
                  "0 15px 45px rgba(6, 182, 212, 0.3), 0 8px 25px rgba(139, 92, 246, 0.2), inset 0 2px 0 rgba(255, 255, 255, 0.2)",
                textShadow: "0 2px 4px rgba(0, 0, 0, 0.3)",
              }}
              title="Opens external treasury dashboard"
            >
              {/* Animated background gradient */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

              {/* Pulsing border effect */}
              <div className="absolute inset-0 rounded-2xl border-2 border-white/30 animate-pulse" />

              <BarChart3 className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300 relative z-10" />
              <span className="relative z-10 font-extrabold tracking-wide">
                VIEW TREASURY DASHBOARD
              </span>
              <ExternalLink className="w-5 h-5 group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform duration-300 relative z-10" />

              {/* Additional shine effect */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/60 to-transparent group-hover:animate-pulse" />
            </button>
          </div>

          <p className="text-sm text-gray-400 flex items-center justify-center gap-2">
            <ExternalLink className="w-4 h-4" />
            <span>Opens in new tab • Live treasury data and analytics</span>
          </p>
        </div>

        {/* Compact Treasury IDs Section */}
        <div className="card glass-card p-8 mb-10">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="relative">
                <Lock className="w-8 h-8 text-teal-400" />
                <div className="absolute inset-0 rounded-full bg-teal-400/20 blur-xl animate-pulse" />
              </div>
              <h3
                className="text-2xl font-semibold text-white"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Treasury Identifiers
              </h3>
            </div>
            <p className="text-gray-300">
              Use these identifiers to interact with the Strategic NAK Reserve
              Treasury
            </p>
          </div>

          <div className="max-w-4xl mx-auto space-y-6">
            {/* Principal ID Section */}
            <div className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 rounded-2xl p-6 border border-purple-500/20">
              <div className="text-center mb-4">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Lock className="w-6 h-6 text-purple-400" />
                  <h4
                    className="text-lg font-semibold text-white"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Treasury Principal ID (PID)
                  </h4>
                </div>
                <p className="text-gray-300 text-sm">
                  For direct canister interactions and smart contract operations
                </p>
              </div>

              <div className="flex items-center gap-4 bg-black/30 px-6 py-4 rounded-xl border border-white/10">
                <code className="font-mono text-sm flex-1 break-all text-teal-300 font-medium">
                  {pidText}
                </code>
                <button
                  type="button"
                  onClick={handleCopyPID}
                  className="btn flex items-center gap-2 px-4 py-2 text-sm hover:scale-105 transition-all duration-300"
                  title="Copy PID to clipboard"
                >
                  {copiedPID ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy PID</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Account ID Section */}
            <div className="bg-gradient-to-r from-teal-500/10 to-green-500/10 rounded-2xl p-6 border border-teal-500/20">
              <div className="text-center mb-4">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <CreditCard className="w-6 h-6 text-teal-400" />
                  <h4
                    className="text-lg font-semibold text-white"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Treasury Account ID
                  </h4>
                </div>
                <p className="text-gray-300 text-sm">
                  For transfers from exchanges and external wallets
                </p>
              </div>

              <div className="flex items-center gap-4 bg-black/30 px-6 py-4 rounded-xl border border-white/10">
                <code className="font-mono text-sm flex-1 break-all text-teal-300 font-medium">
                  {accountIdText}
                </code>
                <button
                  type="button"
                  onClick={handleCopyAccountID}
                  className="btn flex items-center gap-2 px-4 py-2 text-sm hover:scale-105 transition-all duration-300"
                  title="Copy Account ID to clipboard"
                >
                  {copiedAccountID ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Account ID</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 mt-4">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-sm text-green-400 font-medium">
                Treasury Active
              </span>
            </div>
          </div>
        </div>

        {/* Compact Disclaimers Section */}
        <div className="card glass-card p-8 mb-10">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Target className="w-8 h-8 text-orange-400" />
              <h3
                className="text-2xl font-semibold text-white"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Important Disclaimers
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 rounded-2xl p-6 border border-red-500/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <span className="text-red-400 font-bold">⚠️</span>
                </div>
                <h4 className="font-semibold text-red-400">Risk Warning</h4>
              </div>
              <p className="text-sm leading-relaxed text-gray-300">
                Cryptocurrency investments carry significant risk. NAK is
                experimental and should be considered speculative. Past
                performance does not guarantee future results.
              </p>
            </div>

            <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-2xl p-6 border border-yellow-500/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-yellow-400" />
                </div>
                <h4 className="font-semibold text-yellow-400">No Guarantees</h4>
              </div>
              <p className="text-sm leading-relaxed text-gray-300">
                Treasury operations do not guarantee returns or token value
                appreciation. All contributions are voluntary and at your own
                risk.
              </p>
            </div>
          </div>
        </div>

        {/* Compact Call to Action */}
        <div className="card glass-card p-8 text-center">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-6">
              <Zap className="w-8 h-8 text-teal-400 animate-pulse" />
              <h3
                className="text-2xl font-semibold text-white"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Ready to Contribute?
              </h3>
            </div>

            <p className="text-lg mb-6 text-gray-300">
              Join the Strategic NAK Reserve Treasury and help strengthen the
              NAK ecosystem
            </p>

            <div className="flex items-center justify-center gap-4 text-sm text-gray-300">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span>Transparent Operations</span>
              </div>
              <div className="w-1 h-1 bg-white/20 rounded-full" />
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                <span>On-Chain Verification</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReserveTreasury;
