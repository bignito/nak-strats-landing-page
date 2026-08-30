import { ArrowRight, Music, Play } from "lucide-react";
import type React from "react";

interface NAKFeaturedArtistProps {
  onNavigateToArtist: () => void;
}

const NAKFeaturedArtist: React.FC<NAKFeaturedArtistProps> = ({
  onNavigateToArtist,
}) => {
  return (
    <div id="nak-featured-artist" className="px-6 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Compact Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="relative">
              <Music className="w-8 h-8 text-teal-400" />
              <div className="absolute inset-0 rounded-full bg-teal-400/20 blur-xl animate-pulse" />
            </div>
            <h2
              className="text-2xl md:text-3xl font-semibold"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              NAK's Featured Artist
            </h2>
          </div>
        </div>

        {/* Enhanced Horizontal MarsLive Button */}
        <div className="flex justify-center">
          <div className="relative max-w-2xl w-full">
            {/* Enhanced glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/15 to-pink-600/15 rounded-3xl blur-2xl opacity-60 animate-pulse" />

            {/* Prominent horizontal clickable artist button */}
            <button
              type="button"
              onClick={onNavigateToArtist}
              className="relative w-full h-32 card glass-card hover:shadow-2xl transition-all duration-500 hover:scale-105 group cursor-pointer border-2 border-purple-500/30 hover:border-purple-400/50 bg-gradient-to-r from-purple-500/10 to-pink-500/10 flex items-center justify-between px-12 py-8 rounded-3xl overflow-hidden"
            >
              {/* Left side - Artist info */}
              <div className="flex items-center gap-6">
                {/* Music icon with enhanced styling */}
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-xl group-hover:shadow-2xl transition-all duration-300 group-hover:scale-110">
                  <Music className="w-8 h-8 text-white group-hover:rotate-12 transition-transform duration-300" />
                </div>

                {/* Artist Name - prominent horizontal layout */}
                <div className="text-left">
                  <h3
                    className="text-3xl md:text-4xl font-bold text-white group-hover:text-gradient-primary transition-all duration-300 mb-2"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    MarsLive
                  </h3>
                  <p className="text-sm text-gray-300 group-hover:text-gray-200 transition-colors duration-300">
                    Featured Artist • Music & Entertainment
                  </p>
                </div>
              </div>

              {/* Right side - Action indicator */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 opacity-70 group-hover:opacity-100 transition-all duration-300">
                  <Play className="w-5 h-5 text-teal-400" />
                  <span className="text-sm text-gray-300 font-medium">
                    Explore
                  </span>
                </div>
                <ArrowRight className="w-8 h-8 text-teal-400 group-hover:translate-x-2 group-hover:scale-110 transition-all duration-300" />
              </div>

              {/* Enhanced hover shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 rounded-3xl" />

              {/* Additional glow on hover */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Pulsing border effect */}
              <div className="absolute inset-0 rounded-3xl border-2 border-white/20 opacity-0 group-hover:opacity-100 animate-pulse transition-opacity duration-300" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NAKFeaturedArtist;
