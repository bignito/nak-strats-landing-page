import {
  Activity,
  BarChart3,
  Check,
  Coins,
  Copy,
  DollarSign,
  Minus,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  User,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";

interface DexScreenerPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd: string;
  txns: {
    m5: { buys: number; sells: number };
    h1: { buys: number; sells: number };
    h6: { buys: number; sells: number };
    h24: { buys: number; sells: number };
  };
  volume: {
    h24: number;
    h6: number;
    h1: number;
    m5: number;
  };
  priceChange: {
    m5: number;
    h1: number;
    h6: number;
    h24: number;
  };
  liquidity: {
    usd: number;
    base: number;
    quote: number;
  };
  fdv: number;
  marketCap: number;
  pairCreatedAt: number;
  info?: {
    imageUrl?: string;
  };
}

interface DexScreenerSearchResponse {
  schemaVersion: string;
  pairs: DexScreenerPair[];
}

interface TokenResponse {
  tokens: Array<{
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    logoURI?: string;
  }>;
}

interface TokenProfileResponse {
  tokenProfiles: Array<{
    chainId: string;
    tokenAddress: string;
    icon?: string;
  }>;
}

interface TokenData {
  symbol: string;
  pair: string;
  imageUrl: string | null;
  priceUsd: number;
  priceNativeICP: number;
  liquidityUsd: number;
  volume24hUsd: number;
  change24hPct: number;
  lastUpdated: string;
}

const TokenInfo: React.FC = () => {
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCanisterId, setCopiedCanisterId] = useState(false);

  const canisterIdText = "eig2s-waaaa-aaaam-qbg5a-cai";

  const handleCopyCanisterId = async () => {
    try {
      await navigator.clipboard.writeText(canisterIdText);
      setCopiedCanisterId(true);
      setTimeout(() => setCopiedCanisterId(false), 2000);
    } catch (err) {
      console.error("Failed to copy canister ID:", err);
    }
  };

  const fetchTokenImage = useCallback(
    async (chainId: string, tokenAddress: string): Promise<string | null> => {
      try {
        const tokensResponse = await fetch(
          `https://api.dexscreener.com/tokens/v1/${chainId}/${tokenAddress}`,
        );
        if (tokensResponse.ok) {
          const tokensData: TokenResponse = await tokensResponse.json();
          if (
            tokensData.tokens &&
            tokensData.tokens.length > 0 &&
            tokensData.tokens[0].logoURI
          ) {
            return tokensData.tokens[0].logoURI;
          }
        }
      } catch (err) {
        console.warn("Failed to fetch from tokens endpoint:", err);
      }

      try {
        const profilesResponse = await fetch(
          "https://api.dexscreener.com/token-profiles/latest/v1",
        );
        if (profilesResponse.ok) {
          const profilesData: TokenProfileResponse =
            await profilesResponse.json();
          const profile = profilesData.tokenProfiles.find(
            (p) =>
              p.chainId === chainId &&
              p.tokenAddress.toLowerCase() === tokenAddress.toLowerCase(),
          );
          if (profile?.icon) {
            return profile.icon;
          }
        }
      } catch (err) {
        console.warn("Failed to fetch from token profiles endpoint:", err);
      }

      return null;
    },
    [],
  );

  const fetchTokenData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const searchResponse = await fetch(
        "https://api.dexscreener.com/latest/dex/search?q=NAK/ICP",
      );

      if (!searchResponse.ok) {
        throw new Error("Failed to search for NAK/ICP pair");
      }

      const searchData: DexScreenerSearchResponse = await searchResponse.json();

      if (!searchData.pairs || searchData.pairs.length === 0) {
        throw new Error("NAK/ICP pair not found on DexScreener");
      }

      let nakPair = searchData.pairs.find(
        (pair) =>
          pair.baseToken.symbol.toUpperCase() === "NAK" &&
          pair.quoteToken.symbol.toUpperCase() === "ICP" &&
          pair.dexId.toLowerCase().includes("icpswap"),
      );

      if (!nakPair) {
        nakPair = searchData.pairs.find(
          (pair) =>
            (pair.baseToken.symbol.toUpperCase() === "NAK" &&
              pair.quoteToken.symbol.toUpperCase() === "ICP") ||
            (pair.baseToken.symbol.toUpperCase() === "ICP" &&
              pair.quoteToken.symbol.toUpperCase() === "NAK"),
        );
      }

      if (!nakPair) {
        nakPair = searchData.pairs[0];
      }

      if (!nakPair) {
        throw new Error("Could not find suitable NAK/ICP pair");
      }

      let imageUrl = nakPair.info?.imageUrl || null;

      if (!imageUrl) {
        imageUrl = await fetchTokenImage(
          nakPair.chainId,
          nakPair.baseToken.address,
        );
      }

      const formattedData: TokenData = {
        symbol: nakPair.baseToken.symbol,
        pair: `${nakPair.baseToken.symbol}/${nakPair.quoteToken.symbol}`,
        imageUrl,
        priceUsd: Number.parseFloat(nakPair.priceUsd) || 0,
        priceNativeICP: Number.parseFloat(nakPair.priceNative) || 0,
        liquidityUsd: nakPair.liquidity?.usd ?? 0,
        volume24hUsd: nakPair.volume?.h24 ?? 0,
        change24hPct: nakPair.priceChange?.h24 ?? 0,
        lastUpdated: new Date().toLocaleTimeString(),
      };

      setTokenData(formattedData);
    } catch (err) {
      console.error("Error fetching NAK token data:", err);
      setError(
        err instanceof Error ? err.message : "Unable to fetch token data",
      );

      setTokenData({
        symbol: "NAK",
        pair: "NAK/ICP",
        imageUrl: null,
        priceUsd: 0,
        priceNativeICP: 0,
        liquidityUsd: 0,
        volume24hUsd: 0,
        change24hPct: 0,
        lastUpdated: new Date().toLocaleTimeString(),
      });
    } finally {
      setLoading(false);
    }
  }, [fetchTokenImage]);

  useEffect(() => {
    fetchTokenData();
    const interval = setInterval(fetchTokenData, 60000);
    return () => clearInterval(interval);
  }, [fetchTokenData]);

  const getPriceChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-red-400" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getPriceChangeColor = (change: number) => {
    if (change > 0) return "text-green-400";
    if (change < 0) return "text-red-400";
    return "text-gray-400";
  };

  const _formatNumber = (num: number, decimals = 2) => {
    if (num === 0) return "0";
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(decimals)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(decimals)}K`;
    }
    return num.toFixed(decimals);
  };

  const formatPrice = (price: number) => {
    if (price === 0) return "0";
    if (price < 0.000001) {
      return price.toExponential(2);
    }
    if (price < 0.01) {
      return price.toFixed(6);
    }
    return price.toFixed(4);
  };

  return (
    <div id="token-info" className="px-6 py-6">
      <div className="max-w-7xl mx-auto">
        {/* Compact Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="relative">
              <Coins className="w-8 h-8 text-teal-400" />
              <div className="absolute inset-0 rounded-full bg-teal-400/20 blur-xl animate-pulse" />
            </div>
            <h2
              className="text-2xl md:text-3xl font-semibold"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Token Information
            </h2>
          </div>
          <p className="text-base max-w-xl mx-auto text-gray-300">
            Real-time market data for NAK token
          </p>
        </div>

        {/* Compact Token Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Token Details Card - Compact */}
          <div className="card glass-card p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
              <h3
                className="text-lg font-semibold text-white"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Token Details
              </h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                <span className="font-medium text-gray-300 text-sm">Name</span>
                <span className="font-semibold text-white">NAK</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                <span className="font-medium text-gray-300 text-sm">
                  Ticker
                </span>
                <span className="font-semibold text-gradient-primary">
                  $NAK
                </span>
              </div>

              {/* Token Avatar - Compact */}
              {tokenData && (
                <div className="flex items-center justify-center p-4 bg-white/5 rounded-lg border border-white/10">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-400/30 flex items-center justify-center overflow-hidden shadow-lg">
                    {tokenData.imageUrl ? (
                      <img
                        src={tokenData.imageUrl}
                        alt={`${tokenData.symbol} logo`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                          target.nextElementSibling?.classList.remove("hidden");
                        }}
                      />
                    ) : null}
                    <div
                      className={`flex flex-col items-center ${tokenData.imageUrl ? "hidden" : ""}`}
                    >
                      <User className="w-8 h-8 text-purple-300 mb-1" />
                      <span className="text-xs text-purple-300 text-center leading-tight">
                        logo coming soon
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Canister ID Card - Compact */}
          <div className="card glass-card p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              <h3
                className="text-lg font-semibold text-white"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Canister ID
              </h3>
            </div>

            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-gray-300 text-sm">ID</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-xs text-green-400 font-medium">
                    Active
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-black/40 px-3 py-3 rounded-lg border border-white/10">
                <code className="font-mono text-xs flex-1 break-all text-teal-300 font-medium">
                  {canisterIdText}
                </code>
                <button
                  type="button"
                  onClick={handleCopyCanisterId}
                  className="btn flex items-center gap-1 px-3 py-1.5 text-xs hover:scale-105 transition-all duration-300"
                  title="Copy Canister ID to clipboard"
                >
                  {copiedCanisterId ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Live Price Card - Compact */}
          <div className="card glass-card p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse" />
                <h3
                  className="text-lg font-semibold text-white"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Live Price
                </h3>
              </div>
              <button
                type="button"
                onClick={fetchTokenData}
                disabled={loading}
                className="btn flex items-center gap-1 px-2 py-1 rounded-lg transition-all duration-300 disabled:opacity-50 hover:scale-105 text-xs"
              >
                <RefreshCw
                  className={`w-3 h-3 ${loading ? "animate-spin" : ""}`}
                />
              </button>
            </div>

            {loading && !tokenData ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <RefreshCw className="w-6 h-6 animate-spin text-purple-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-300">Loading...</p>
                </div>
              </div>
            ) : error &&
              (!tokenData ||
                (tokenData.priceUsd === 0 && tokenData.volume24hUsd === 0)) ? (
              <div className="text-center py-6">
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <p className="text-red-400 text-xs mb-3">{error}</p>
                  <button
                    type="button"
                    onClick={fetchTokenData}
                    className="btn px-4 py-2 rounded-lg transition-all duration-300 hover:scale-105 text-xs"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            ) : tokenData ? (
              <div className="space-y-3">
                {/* Price Display */}
                <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-lg p-3 border border-green-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="w-4 h-4 text-green-400" />
                    <span className="text-xs font-medium text-gray-300">
                      USD Price
                    </span>
                  </div>
                  <p className="text-lg font-bold text-green-400">
                    ${formatPrice(tokenData.priceUsd)}
                  </p>
                </div>

                {/* 24h Change */}
                <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-lg p-3 border border-purple-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    {getPriceChangeIcon(tokenData.change24hPct)}
                    <span className="text-xs font-medium text-gray-300">
                      24h Change
                    </span>
                  </div>
                  <div
                    className={`flex items-center gap-2 ${getPriceChangeColor(tokenData.change24hPct)}`}
                  >
                    <span className="text-lg font-bold">
                      {tokenData.change24hPct > 0 ? "+" : ""}
                      {tokenData.change24hPct.toFixed(2)}%
                    </span>
                  </div>
                </div>

                {/* Last Updated */}
                <div className="text-center pt-2 border-t border-white/10">
                  <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    <span>Updated: {tokenData.lastUpdated}</span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Compact DexScreener Chart */}
        <div className="card glass-card p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <BarChart3 className="w-6 h-6 text-teal-400" />
              <div className="absolute inset-0 rounded-full bg-teal-400/20 blur-xl animate-pulse" />
            </div>
            <h3
              className="text-xl font-semibold text-white"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              NAK/ICP Trading Chart
            </h3>
          </div>

          <div className="chart-container bg-black/20 rounded-xl border border-white/10 overflow-hidden shadow-inner">
            <iframe
              src="https://dexscreener.com/icp/d6hdt-qiaaa-aaaag-qm76q-cai?embed=1&theme=dark&info=0"
              className="chart-iframe w-full border-0"
              style={{ aspectRatio: "16 / 9", minHeight: "300px" }}
              allowFullScreen
              title="NAK/ICP Trading Chart"
            />
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs flex items-center justify-center gap-2 text-gray-400">
              <BarChart3 className="w-3 h-3" />
              <span>Live trading chart powered by DexScreener</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TokenInfo;
