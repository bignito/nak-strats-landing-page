import { ArrowDown, Shield, Sparkles, Zap } from "lucide-react";
import type React from "react";

const MainContent: React.FC = () => {
  return (
    <div id="home" className="px-6 py-8 pt-24">
      <div className="max-w-7xl mx-auto text-center">
        {/* Compact Hero Section */}
        <div className="relative mb-12">
          {/* Background Glow */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-[400px] h-[400px] bg-gradient-to-r from-purple-500/8 to-pink-500/8 rounded-full blur-3xl animate-pulse-glow" />
          </div>

          {/* Main Title */}
          <div className="relative">
            <h1
              className="mb-6 animate-title-entrance"
              style={{
                fontFamily: "var(--font-heading)",
                animationDelay: "0.1s",
              }}
            >
              NAK STRATS
            </h1>

            {/* Floating accent elements - smaller */}
            <div
              className="absolute -top-8 -left-8 animate-float opacity-30"
              style={{ animationDelay: "1s" }}
            >
              <Sparkles className="w-6 h-6 text-purple-400" />
            </div>
            <div
              className="absolute -top-6 -right-12 animate-float opacity-30"
              style={{ animationDelay: "2s" }}
            >
              <Zap className="w-5 h-5 text-pink-400" />
            </div>
            <div
              className="absolute -bottom-6 left-16 animate-float opacity-30"
              style={{ animationDelay: "0.5s" }}
            >
              <Shield className="w-5 h-5 text-teal-400" />
            </div>
          </div>
        </div>

        {/* Compact Official Statement Card - Horizontal Design */}
        <div className="relative max-w-5xl mx-auto mb-10">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/8 to-pink-600/8 rounded-2xl blur-xl" />
          <div
            className="relative card glass-card p-6 md:p-8 border shadow-xl animate-fade-in-up"
            style={{ animationDelay: "0.3s" }}
          >
            {/* Main Statement - Horizontal Layout */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-6">
              <p
                className="text-lg md:text-xl lg:text-2xl font-medium text-white"
                style={{ fontFamily: "var(--font-body)" }}
              >
                A Hustle Unit — Proof of Motion, Grind, and Culture on-chain —{" "}
                <span className="text-gradient-primary font-semibold">
                  100% Hustle-Powered
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Compact Scroll Indicator */}
        <div
          className="flex flex-col items-center animate-fade-in-up"
          style={{ animationDelay: "0.5s" }}
        >
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
            <span>Explore NAK ecosystem</span>
          </div>
          <div className="animate-bounce">
            <ArrowDown className="w-4 h-4 text-purple-400" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainContent;
