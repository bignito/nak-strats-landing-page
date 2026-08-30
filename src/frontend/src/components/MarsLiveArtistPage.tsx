import {
  ArrowLeft,
  ExternalLink,
  Globe,
  Twitter,
  User,
  Video,
  Youtube,
} from "lucide-react";
import type React from "react";
import { useEffect } from "react";

interface MarsLiveArtistPageProps {
  onNavigateToMain: () => void;
}

const MarsLiveArtistPage: React.FC<MarsLiveArtistPageProps> = ({
  onNavigateToMain,
}) => {
  // Automatically scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const traxLinks = [
    {
      name: "Artist Profile",
      url: "https://trax.so/artist/profile/?id=6559f9137cced2cc5155e1e1",
      icon: User,
      color: "from-purple-500 to-indigo-600",
      accent: "text-purple-400",
      description: "View full artist profile",
    },
  ];

  const socialLinks = [
    {
      name: "Website",
      url: "https://www.marsentrecords.com/",
      icon: Globe,
      color: "from-blue-500 to-purple-600",
      accent: "text-blue-400",
    },
    {
      name: "X / Twitter",
      url: "https://x.com/__MarsLive",
      icon: Twitter,
      color: "from-gray-600 to-gray-800",
      accent: "text-gray-300",
    },
    {
      name: "YouTube",
      url: "https://www.youtube.com/channel/UC7ulukfuw2SEJsHe1hvOVKg",
      icon: Youtube,
      color: "from-red-500 to-red-700",
      accent: "text-red-400",
    },
  ];

  return (
    <div className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Modern Header */}
        <div className="text-center mb-12 sm:mb-16 px-2">
          <h1
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold mb-6 sm:mb-8 leading-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            NAK's Featured Artist: MarsLive
          </h1>
        </div>

        {/* Artist Name Section */}
        <div className="relative max-w-4xl mx-auto mb-12 sm:mb-20 px-2">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-pink-600/10 rounded-3xl blur-2xl opacity-60" />

          {/* Main artist card */}
          <div className="relative card glass-card p-8 sm:p-12 lg:p-16">
            <div className="text-center">
              {/* Artist Name */}
              <h2
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 sm:mb-8 text-white animate-title-entrance leading-tight"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                MarsLive
              </h2>
            </div>
          </div>
        </div>

        {/* YouTube Music Video Section - Optimized for Mobile */}
        <div className="relative max-w-6xl mx-auto mb-12 sm:mb-20 px-2">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-red-600/10 to-pink-600/10 rounded-3xl blur-2xl opacity-40" />

          {/* Video card */}
          <div className="relative card glass-card p-4 sm:p-6 lg:p-10">
            <div className="text-center mb-6 sm:mb-8">
              <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <Video className="w-6 h-6 sm:w-8 sm:h-8 text-red-400" />
                <h3
                  className="text-xl sm:text-2xl lg:text-3xl font-semibold text-white"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  "Now" - Official Music Video
                </h3>
              </div>
              <p className="text-sm sm:text-base text-gray-300">
                Experience MarsLive's latest musical creation
              </p>
            </div>

            {/* YouTube Video Container - Mobile Optimized */}
            <div className="video-container bg-black/30 rounded-2xl sm:rounded-3xl border border-white/10 overflow-hidden shadow-inner relative mx-auto max-w-full">
              {/* YouTube Embed - Responsive with Mobile Optimization */}
              <div
                className="relative w-full"
                style={{ paddingBottom: "56.25%" /* 16:9 aspect ratio */ }}
              >
                <iframe
                  src="https://www.youtube.com/embed/QmRfjWppYvs"
                  className="absolute top-0 left-0 w-full h-full border-0 rounded-2xl sm:rounded-3xl"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  title="MarsLive - Now (Official Music Video)"
                  loading="lazy"
                  style={{
                    backgroundColor: "#000",
                    minHeight: "200px", // Minimum height for very small screens
                  }}
                />
              </div>
            </div>

            {/* Video Info - Mobile Optimized */}
            <div className="mt-6 sm:mt-8 text-center">
              <div className="flex items-center justify-center gap-3 sm:gap-6 mb-3 sm:mb-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                  <span className="text-xs sm:text-sm text-gray-300">
                    Official Music Video
                  </span>
                </div>
                <div className="w-1 h-1 bg-white/20 rounded-full hidden sm:block" />
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                  <span className="text-xs sm:text-sm text-gray-300">
                    Latest Release
                  </span>
                </div>
                <div className="w-1 h-1 bg-white/20 rounded-full hidden sm:block" />
                <div className="flex items-center gap-2">
                  <Youtube className="w-3 h-3 sm:w-4 sm:h-4 text-red-400" />
                  <span className="text-xs sm:text-sm text-gray-300">
                    YouTube
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trax Links Section - Mobile Optimized */}
        <div className="relative max-w-4xl mx-auto mb-12 sm:mb-20 px-2">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 to-purple-600/10 rounded-3xl blur-2xl opacity-40" />

          {/* Trax links card */}
          <div className="relative card glass-card p-6 sm:p-8 lg:p-12">
            <div className="text-center mb-8 sm:mb-12">
              <h3
                className="text-2xl sm:text-3xl font-semibold text-white mb-3 sm:mb-4"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Featured on Trax
              </h3>
              <p className="text-sm sm:text-base text-gray-300">
                Discover MarsLive's music on the Trax platform
              </p>
            </div>

            {/* Trax Links Grid */}
            <div className="grid grid-cols-1 gap-4 sm:gap-6 mb-6 sm:mb-8 max-w-md mx-auto">
              {traxLinks.map((link, index) => {
                const IconComponent = link.icon;
                return (
                  <div
                    key={link.name}
                    className="group relative animate-fade-in-up"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {/* Glow effect */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-r ${link.color} rounded-2xl blur-xl opacity-10 group-hover:opacity-20 transition-all duration-500`}
                    />

                    {/* Link card */}
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative block card glass-card p-6 sm:p-8 hover:shadow-2xl transition-all duration-500 group-hover:scale-105 text-center"
                    >
                      {/* Icon */}
                      <div className="flex items-center justify-center mb-4 sm:mb-6">
                        <div
                          className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${link.color} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300`}
                        >
                          <IconComponent className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                        </div>
                      </div>

                      {/* Link name */}
                      <h4
                        className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3 text-white"
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        {link.name}
                      </h4>

                      {/* Description */}
                      <p className="text-xs sm:text-sm text-gray-400 mb-3 sm:mb-4">
                        {link.description}
                      </p>

                      {/* External link indicator */}
                      <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                        <ExternalLink className="w-3 h-3" />
                        <span>Opens in new tab</span>
                      </div>
                    </a>
                  </div>
                );
              })}
            </div>

            {/* Trax Platform Info */}
            <div className="text-center">
              <div className="bg-gradient-to-r from-purple-500/5 to-indigo-500/5 rounded-2xl p-4 sm:p-6 border border-purple-500/20">
                <div className="flex items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm text-gray-300 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                    <span>Trax Platform</span>
                  </div>
                  <div className="w-1 h-1 bg-white/20 rounded-full hidden sm:block" />
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse" />
                    <span>Official Content</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Social Links Section - Mobile Optimized */}
        <div className="relative max-w-4xl mx-auto mb-12 sm:mb-20 px-2">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-teal-600/10 to-green-600/10 rounded-3xl blur-2xl opacity-40" />

          {/* Social links card */}
          <div className="relative card glass-card p-6 sm:p-8 lg:p-12">
            <div className="text-center mb-8 sm:mb-12">
              <h3
                className="text-2xl sm:text-3xl font-semibold text-white mb-3 sm:mb-4"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Connect with MarsLive
              </h3>
              <p className="text-sm sm:text-base text-gray-300">
                Follow MarsLive across social platforms
              </p>
            </div>

            {/* Social Links Grid - Mobile Responsive */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {socialLinks.map((link, index) => {
                const IconComponent = link.icon;
                return (
                  <div
                    key={link.name}
                    className="group relative animate-fade-in-up"
                    style={{ animationDelay: `${(index + 1) * 0.1}s` }}
                  >
                    {/* Glow effect */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-r ${link.color} rounded-2xl blur-xl opacity-10 group-hover:opacity-20 transition-all duration-500`}
                    />

                    {/* Link card */}
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative block card glass-card p-6 sm:p-8 hover:shadow-2xl transition-all duration-500 group-hover:scale-105 text-center"
                    >
                      {/* Icon */}
                      <div className="flex items-center justify-center mb-4 sm:mb-6">
                        <div
                          className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${link.color} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300`}
                        >
                          <IconComponent className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                        </div>
                      </div>

                      {/* Link name */}
                      <h4
                        className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-white"
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        {link.name}
                      </h4>

                      {/* External link indicator */}
                      <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                        <ExternalLink className="w-3 h-3" />
                        <span>Opens in new tab</span>
                      </div>
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Back to Main Button - Mobile Optimized */}
        <div className="text-center px-2">
          <button
            type="button"
            onClick={onNavigateToMain}
            className="btn inline-flex items-center gap-3 sm:gap-4 px-8 sm:px-12 py-4 sm:py-6 text-lg sm:text-xl font-semibold rounded-2xl sm:rounded-3xl transition-all duration-300 hover:scale-105 hover:shadow-2xl group relative overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg, var(--nak-teal) 0%, var(--nak-purple) 50%, var(--nak-pink) 100%)",
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

export default MarsLiveArtistPage;
