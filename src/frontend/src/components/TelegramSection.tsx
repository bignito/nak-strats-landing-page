import { ExternalLink, MessageCircle, Send } from "lucide-react";
import type React from "react";

const TelegramSection: React.FC = () => {
  return (
    <div id="telegram" className="px-6 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Compact Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="relative">
              <MessageCircle className="w-8 h-8 text-teal-400" />
              <div className="absolute inset-0 rounded-full bg-teal-400/20 blur-xl animate-pulse" />
            </div>
            <h2
              className="text-2xl md:text-3xl font-semibold"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Official Telegram Group of NAK
            </h2>
          </div>
          <p className="text-base max-w-xl mx-auto text-gray-300">
            Connect with the NAK community
          </p>
        </div>

        {/* Compact Main Card */}
        <div className="relative max-w-2xl mx-auto">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/8 to-purple-600/8 rounded-2xl blur-xl opacity-60" />

          {/* Main card */}
          <div className="relative card glass-card p-8">
            <div className="text-center">
              {/* Compact Telegram Icon */}
              <div className="flex items-center justify-center mb-6">
                <div className="relative">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-xl">
                    <Send className="w-8 h-8 text-white" />
                  </div>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 opacity-20 blur-xl animate-pulse" />
                </div>
              </div>

              {/* Main CTA Button */}
              <div className="mb-6">
                <a
                  href="https://t.me/NAKSTOKEN"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn inline-flex items-center gap-3 px-8 py-4 text-lg font-semibold rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-xl group relative overflow-hidden"
                  style={{
                    background:
                      "linear-gradient(135deg, #0088cc 0%, var(--nak-purple) 50%, var(--nak-pink) 100%)",
                    border: "2px solid rgba(139, 92, 246, 0.3)",
                    boxShadow: "0 8px 32px rgba(0, 136, 204, 0.2)",
                  }}
                >
                  <MessageCircle className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
                  <span className="relative z-10">Join NAK Telegram</span>
                  <ExternalLink className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300" />

                  {/* Button shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                </a>
              </div>

              {/* Additional Info */}
              <div className="bg-gradient-to-r from-purple-500/5 to-indigo-500/5 rounded-xl p-4 border border-purple-500/20">
                <div className="flex items-center justify-center gap-4 text-xs text-gray-300">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    <span>Official Channel</span>
                  </div>
                  <div className="w-0.5 h-0.5 bg-white/20 rounded-full" />
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                    <span>24/7 Active</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TelegramSection;
