import {
  ArrowLeft,
  Check,
  Copy,
  CreditCard,
  DollarSign,
  Film,
  Gift,
  Heart,
  Lock,
  Sparkles,
  Theater,
  Users,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";

interface MetaTheatrePageProps {
  onNavigateToMain: () => void;
}

const MetaTheatrePage: React.FC<MetaTheatrePageProps> = ({
  onNavigateToMain,
}) => {
  const [copiedPID, setCopiedPID] = useState(false);
  const [copiedAccountID, setCopiedAccountID] = useState(false);

  const pidText =
    "ym3yz-lpqvj-spesx-r7efc-opibs-gjpts-erxs6-h4fa6-67wby-dnea7-rqe";
  const accountIdText =
    "4f5723c4c23303b5f6d9046e9d0ecbcf00dc70124c06f8adff4fbaebb50558ed";

  // Automatically scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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

  return (
    <div className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Modern Header */}
        <div className="text-center mb-12 sm:mb-16 px-2">
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="relative">
              <Theater className="w-12 h-12 text-teal-400" />
              <div className="absolute inset-0 rounded-full bg-teal-400/20 blur-xl animate-pulse" />
            </div>
            <h1
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              MetaTheatre
            </h1>
          </div>
        </div>

        {/* Movie Video Section */}
        <div className="relative max-w-6xl mx-auto mb-12 sm:mb-16 px-2">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-purple-600/10 rounded-3xl blur-2xl opacity-60" />

          {/* Video card */}
          <div className="relative card glass-card p-4 sm:p-6 lg:p-10">
            <div className="text-center mb-6 sm:mb-8">
              <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <Film className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400" />
                <h3
                  className="text-xl sm:text-2xl lg:text-3xl font-semibold text-white"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  The Thirteenth Floor (1999)
                </h3>
              </div>
              <p className="text-sm sm:text-base text-gray-300">
                Experience classic cinema in the NAK ecosystem
              </p>
            </div>

            {/* Movie Video Container - Mobile Optimized */}
            <div className="video-container bg-black/30 rounded-2xl sm:rounded-3xl border border-white/10 overflow-hidden shadow-inner relative mx-auto max-w-full">
              {/* Archive.org Embed - Responsive with Mobile Optimization */}
              <div
                className="relative w-full"
                style={{ paddingBottom: "68.57%" /* 560/384 aspect ratio */ }}
              >
                <iframe
                  src="https://archive.org/embed/the.-thirteenth.-floor.-1999.1080p.-blu-ray.x-264.-yify"
                  className="absolute top-0 left-0 w-full h-full border-0 rounded-2xl sm:rounded-3xl"
                  allowFullScreen
                  title="The Thirteenth Floor (1999)"
                  loading="lazy"
                  style={{
                    backgroundColor: "#000",
                    minHeight: "200px", // Minimum height for very small screens
                  }}
                />
              </div>
            </div>

            {/* Movie Info - Mobile Optimized */}
            <div className="mt-6 sm:mt-8 text-center">
              <div className="flex items-center justify-center gap-3 sm:gap-6 mb-3 sm:mb-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                  <span className="text-xs sm:text-sm text-gray-300">
                    Classic Sci-Fi
                  </span>
                </div>
                <div className="w-1 h-1 bg-white/20 rounded-full hidden sm:block" />
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                  <span className="text-xs sm:text-sm text-gray-300">
                    1999 Release
                  </span>
                </div>
                <div className="w-1 h-1 bg-white/20 rounded-full hidden sm:block" />
                <div className="flex items-center gap-2">
                  <Film className="w-3 h-3 sm:w-4 sm:h-4 text-teal-400" />
                  <span className="text-xs sm:text-sm text-gray-300">
                    Archive.org
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Donation Section - Moved directly below video */}
        <div className="relative max-w-5xl mx-auto mb-12 sm:mb-20 px-2">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-teal-600/10 to-green-600/10 rounded-3xl blur-2xl opacity-40" />

          {/* Donation card */}
          <div className="relative card glass-card p-8 sm:p-12">
            <div className="text-center">
              {/* Donation Icon */}
              <div className="flex items-center justify-center mb-8">
                <div className="relative">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-teal-500 to-green-500 flex items-center justify-center shadow-2xl">
                    <Gift className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                  </div>
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-teal-500 to-green-500 opacity-20 blur-2xl animate-pulse" />
                </div>
              </div>

              {/* Donation Message */}
              <h2
                className="text-2xl sm:text-3xl md:text-4xl font-semibold mb-6 text-white animate-title-entrance"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Support Movie Access
              </h2>

              <p className="text-lg sm:text-xl text-gray-300 leading-relaxed max-w-3xl mx-auto mb-8">
                Help us provide free access to classic movies and expand our
                digital cinema collection. Your donations support hosting,
                curation, and bringing more entertainment to the NAK community.
              </p>

              {/* Donation Features */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
                <div className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 rounded-3xl p-6 border border-purple-500/20">
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <Users className="w-6 h-6 text-purple-400" />
                    <span className="text-lg font-semibold text-purple-400">
                      Community
                    </span>
                  </div>
                  <p className="text-sm text-gray-300">
                    Free access for everyone
                  </p>
                </div>

                <div className="bg-gradient-to-br from-teal-500/10 to-green-500/10 rounded-3xl p-6 border border-teal-500/20">
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <Film className="w-6 h-6 text-teal-400" />
                    <span className="text-lg font-semibold text-teal-400">
                      Quality
                    </span>
                  </div>
                  <p className="text-sm text-gray-300">
                    High-definition content
                  </p>
                </div>

                <div className="bg-gradient-to-br from-purple-500/10 to-red-500/10 rounded-3xl p-6 border border-purple-500/20">
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <Sparkles className="w-6 h-6 text-purple-400" />
                    <span className="text-lg font-semibold text-purple-400">
                      Expansion
                    </span>
                  </div>
                  <p className="text-sm text-gray-300">Growing movie library</p>
                </div>
              </div>

              {/* Donation Addresses Section */}
              <div className="bg-gradient-to-r from-purple-500/5 to-indigo-500/5 rounded-3xl p-8 border border-purple-500/20 mb-8">
                <div className="flex items-center justify-center gap-3 mb-8">
                  <DollarSign className="w-8 h-8 text-teal-400" />
                  <h3
                    className="text-2xl font-semibold text-white"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Donation Addresses
                  </h3>
                </div>

                <div className="space-y-8">
                  {/* Principal ID Section */}
                  <div className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 rounded-3xl p-8 border border-purple-500/20">
                    <div className="text-center mb-6">
                      <div className="flex items-center justify-center gap-3 mb-4">
                        <Lock className="w-8 h-8 text-purple-400" />
                        <h4
                          className="text-2xl font-semibold text-white"
                          style={{ fontFamily: "var(--font-heading)" }}
                        >
                          Treasury Principal ID (PID)
                        </h4>
                      </div>
                      <p className="text-gray-300">
                        For direct canister interactions and smart contract
                        operations
                      </p>
                    </div>

                    <div className="flex items-center gap-6 bg-black/30 px-8 py-6 rounded-2xl border border-white/10">
                      <code className="font-mono text-sm flex-1 break-all text-teal-300 font-medium">
                        {pidText}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopyPID}
                        className="btn flex items-center gap-2 px-6 py-3 text-sm hover:scale-105 transition-all duration-300"
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
                  <div className="bg-gradient-to-r from-teal-500/10 to-green-500/10 rounded-3xl p-8 border border-teal-500/20">
                    <div className="text-center mb-6">
                      <div className="flex items-center justify-center gap-3 mb-4">
                        <CreditCard className="w-8 h-8 text-teal-400" />
                        <h4
                          className="text-2xl font-semibold text-white"
                          style={{ fontFamily: "var(--font-heading)" }}
                        >
                          Treasury Account ID
                        </h4>
                      </div>
                      <p className="text-gray-300">
                        For transfers from exchanges and external wallets
                      </p>
                    </div>

                    <div className="flex items-center gap-6 bg-black/30 px-8 py-6 rounded-2xl border border-white/10">
                      <code className="font-mono text-sm flex-1 break-all text-teal-300 font-medium">
                        {accountIdText}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopyAccountID}
                        className="btn flex items-center gap-2 px-6 py-3 text-sm hover:scale-105 transition-all duration-300"
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
                </div>

                {/* Donation Impact */}
                <div className="flex items-center justify-center gap-6 text-sm text-gray-300 flex-wrap mt-8">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span>Transparent Usage</span>
                  </div>
                  <div className="w-1 h-1 bg-white/20 rounded-full hidden sm:block" />
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                    <span>Community Benefit</span>
                  </div>
                  <div className="w-1 h-1 bg-white/20 rounded-full hidden sm:block" />
                  <div className="flex items-center gap-2">
                    <Heart className="w-3 h-3 text-purple-400" />
                    <span>Supporting Arts</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Back to Main Button */}
        <div className="text-center px-2">
          <button
            type="button"
            onClick={onNavigateToMain}
            className="btn inline-flex items-center gap-3 sm:gap-4 px-8 sm:px-12 py-4 sm:py-6 text-lg sm:text-xl font-semibold rounded-2xl sm:rounded-3xl transition-all duration-300 hover:scale-105 hover:shadow-2xl group relative overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg, var(--nak-teal) 0%, var(--nak-purple) 50%, var(--nak-purple-dark) 100%)",
              border: "2px solid rgba(6, 182, 212, 0.3)",
              boxShadow: "0 10px 40px rgba(6, 182, 212, 0.2)",
            }}
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 group-hover:-translate-x-1 transition-transform duration-300" />
            <span className="relative z-10">Back to Main Page</span>

            {/* Button shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MetaTheatrePage;
