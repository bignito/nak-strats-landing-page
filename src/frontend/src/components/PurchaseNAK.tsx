import { ArrowUpRight, ShoppingCart, TrendingUp } from "lucide-react";
import type React from "react";

const PurchaseNAK: React.FC = () => {
  const swapPlatforms = [
    {
      name: "ICPSwap",
      url: "https://app.icpswap.com/swap/pro?input=ryjl3-tyaaa-aaaaa-aaaba-cai&output=eig2s-waaaa-aaaam-qbg5a-cai",
      description: "Professional trading",
      icon: TrendingUp,
      color: "from-blue-500 to-purple-600",
      accent: "text-blue-400",
    },
  ];

  return (
    <div id="purchase-nak" className="px-6 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Compact Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="relative">
              <ShoppingCart className="w-8 h-8 text-teal-400" />
              <div className="absolute inset-0 rounded-full bg-teal-400/20 blur-xl animate-pulse" />
            </div>
            <h2
              className="text-2xl md:text-3xl font-semibold"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Purchase NAK
            </h2>
          </div>
          <p className="text-base max-w-xl mx-auto text-gray-300">
            Buy NAK tokens on these trusted decentralized exchanges
          </p>
        </div>

        {/* Compact Platform Buttons - Horizontal Layout */}
        <div className="max-w-sm mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-1 gap-3 sm:gap-4">
            {swapPlatforms.map((platform, index) => {
              const IconComponent = platform.icon;
              return (
                <div
                  key={platform.name}
                  className="group relative animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* Subtle glow effect */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-r ${platform.color} rounded-xl blur-lg opacity-5 group-hover:opacity-15 transition-all duration-300`}
                  />

                  {/* Compact button card */}
                  <a
                    href={platform.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative block card glass-card p-4 hover:shadow-lg transition-all duration-300 group-hover:scale-[1.02] cursor-pointer border border-white/10 hover:border-white/20"
                  >
                    <div className="flex items-center gap-3">
                      {/* Compact platform icon */}
                      <div
                        className={`w-10 h-10 rounded-lg bg-gradient-to-br ${platform.color} flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300 flex-shrink-0`}
                      >
                        <IconComponent className="w-5 h-5 text-white" />
                      </div>

                      {/* Platform info - compact */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3
                            className="text-sm font-semibold text-white truncate"
                            style={{ fontFamily: "var(--font-heading)" }}
                          >
                            {platform.name}
                          </h3>
                          <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300 flex-shrink-0" />
                        </div>
                        <p className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors duration-300 truncate">
                          {platform.description}
                        </p>
                      </div>
                    </div>

                    {/* Subtle hover shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500 rounded-xl" />
                  </a>
                </div>
              );
            })}
          </div>

          {/* Compact info footer */}
          <div className="text-center mt-6">
            <div className="flex items-center justify-center gap-4 text-xs text-gray-400 flex-wrap">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                <span>Decentralized</span>
              </div>
              <div className="w-0.5 h-0.5 bg-white/20 rounded-full hidden sm:block" />
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                <span>Secure Trading</span>
              </div>
              <div className="w-0.5 h-0.5 bg-white/20 rounded-full hidden sm:block" />
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" />
                <span>Opens in New Tab</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseNAK;
