import { RefreshCw } from "lucide-react";
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
  marketCapUsd: number;
  change24hPct: number;
  lastUpdated: string;
}

const TokenInfo: React.FC = () => {
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        marketCapUsd: nakPair.marketCap ?? 0,
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
        marketCapUsd: 0,
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

  const formatCompact = (num: number) => {
    if (num === 0) return "0";
    if (num >= 1000000000) {
      return `$${(num / 1000000000).toFixed(2)}B`;
    }
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(2)}M`;
    }
    if (num >= 1000) {
      return `$${(num / 1000).toFixed(2)}K`;
    }
    return `$${num.toFixed(2)}`;
  };

  const changeClass =
    tokenData && tokenData.change24hPct > 0
      ? "text-positive"
      : tokenData && tokenData.change24hPct < 0
        ? "text-negative"
        : "text-muted-foreground";

  const changePrefix = tokenData && tokenData.change24hPct > 0 ? "+" : "";

  const metrics: Array<{
    label: string;
    value: string;
    change?: boolean;
  }> = [
    {
      label: "Price",
      value: tokenData ? `$${formatPrice(tokenData.priceUsd)}` : "—",
    },
    {
      label: "24h Volume",
      value: tokenData ? formatCompact(tokenData.volume24hUsd) : "—",
    },
    {
      label: "Liquidity",
      value: tokenData ? formatCompact(tokenData.liquidityUsd) : "—",
    },
    {
      label: "Market Cap",
      value: tokenData ? formatCompact(tokenData.marketCapUsd) : "—",
    },
  ];

  return (
    <section id="metrics" className="px-6 py-6">
      <div className="max-w-7xl mx-auto">
        <div className="surface">
          {/* Metrics row — four columns divided by 1px vertical borders */}
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-[var(--border)]">
            {metrics.map((metric, _index) => (
              <div
                key={metric.label}
                className="px-6 py-5"
                data-ocid={`metrics.${metric.label.toLowerCase().replace(/\s+/g, "_")}`}
              >
                <p className="section-label mb-2">{metric.label}</p>
                {metric.label === "Price" ? (
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="num text-[1.375rem] leading-tight text-foreground">
                      {metric.value}
                    </span>
                    {tokenData && (
                      <span
                        className={`num text-[1.375rem] leading-tight ${changeClass}`}
                      >
                        {changePrefix}
                        {tokenData.change24hPct.toFixed(2)}%
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="num text-[1.375rem] leading-tight text-foreground">
                    {metric.value}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Chart embed — below the metrics row, same bordered container */}
          <div className="border-t border-[var(--border)]">
            <div className="p-4">
              <iframe
                src="https://dexscreener.com/icp/d6hdt-qiaaa-aaaag-qm76q-cai?embed=1&theme=dark&info=0"
                className="w-full border-0"
                style={{ aspectRatio: "16 / 9", minHeight: "300px" }}
                allowFullScreen
                title="NAK/ICP Trading Chart"
              />
            </div>
          </div>

          {/* Loading / error footer row */}
          <div className="border-t border-[var(--border)] px-6 py-3 flex items-center justify-between">
            {loading && !tokenData ? (
              <span className="text-xs text-muted-foreground flex items-center gap-2">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Loading market data…
              </span>
            ) : error &&
              (!tokenData ||
                (tokenData.priceUsd === 0 && tokenData.volume24hUsd === 0)) ? (
              <span className="text-xs text-negative flex items-center gap-2">
                {error}
                <button
                  type="button"
                  onClick={fetchTokenData}
                  className="btn-secondary text-xs px-3 py-1"
                  data-ocid="metrics.retry_button"
                >
                  Retry
                </button>
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">
                Updated {tokenData?.lastUpdated}
              </span>
            )}
            <button
              type="button"
              onClick={fetchTokenData}
              disabled={loading}
              className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-1 disabled:opacity-50"
              data-ocid="metrics.refresh_button"
              aria-label="Refresh market data"
            >
              <RefreshCw
                className={`w-3 h-3 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TokenInfo;
