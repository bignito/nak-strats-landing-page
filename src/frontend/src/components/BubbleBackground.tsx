import type React from "react";

const SHELL_RAIN_ITEMS = Array.from({ length: 15 }, (_, i) => ({
  id: `shell-rain-${i}`,
  left: `${(i * 7.3 + 3) % 100}%`,
  fontSize: `${(i % 5) * 4 + 20}px`,
  animationDelay: `${(i * 0.55) % 8}s`,
  animationDuration: `${(i % 4) * 1 + 8}s`,
}));

const MONEY_RAIN_ITEMS = Array.from({ length: 12 }, (_, i) => ({
  id: `money-rain-${i}`,
  left: `${(i * 8.7 + 1.5) % 100}%`,
  fontSize: `${(i % 4) * 4.5 + 22}px`,
  animationDelay: `${(i * 0.85) % 10}s`,
  animationDuration: `${(i % 3) * 1 + 9}s`,
}));

const SHELL_SLOW_ITEMS = Array.from({ length: 8 }, (_, i) => ({
  id: `shell-slow-${i}`,
  left: `${(i * 13.2 + 6) % 100}%`,
  fontSize: `${(i % 4) * 3 + 16}px`,
  animationDelay: `${(i * 1.55) % 12}s`,
  animationDuration: `${(i % 6) * 1 + 12}s`,
}));

const MONEY_FLOAT_ITEMS = Array.from({ length: 6 }, (_, i) => ({
  id: `money-float-static-${i}`,
  left: `${(i * 17.1 + 4) % 100}%`,
  top: `${(i * 16.3 + 8) % 100}%`,
  fontSize: `${(i % 3) * 5 + 18}px`,
  animationDelay: `${(i * 1.05) % 6}s`,
  animationDuration: `${(i % 4) * 1 + 8}s`,
}));

const BubbleBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Emoji Rain - Shells and Money Bags */}
      {SHELL_RAIN_ITEMS.map((item) => (
        <div
          key={item.id}
          className="absolute animate-emoji-rain opacity-80"
          style={{
            left: item.left,
            fontSize: item.fontSize,
            animationDelay: item.animationDelay,
            animationDuration: item.animationDuration,
            filter: "drop-shadow(0 2px 4px rgba(139, 92, 246, 0.3))",
          }}
        >
          🐚
        </div>
      ))}

      {MONEY_RAIN_ITEMS.map((item) => (
        <div
          key={item.id}
          className="absolute animate-emoji-rain opacity-75"
          style={{
            left: item.left,
            fontSize: item.fontSize,
            animationDelay: item.animationDelay,
            animationDuration: item.animationDuration,
            filter: "drop-shadow(0 2px 4px rgba(6, 182, 212, 0.3))",
          }}
        >
          💰
        </div>
      ))}

      {/* Additional scattered shells for variety */}
      {SHELL_SLOW_ITEMS.map((item) => (
        <div
          key={item.id}
          className="absolute animate-emoji-rain-slow opacity-60"
          style={{
            left: item.left,
            fontSize: item.fontSize,
            animationDelay: item.animationDelay,
            animationDuration: item.animationDuration,
            filter: "drop-shadow(0 1px 2px rgba(139, 92, 246, 0.2))",
          }}
        >
          🐚
        </div>
      ))}

      {/* Floating money bags with different animation */}
      {MONEY_FLOAT_ITEMS.map((item) => (
        <div
          key={item.id}
          className="absolute animate-emoji-float opacity-50"
          style={{
            left: item.left,
            top: item.top,
            fontSize: item.fontSize,
            animationDelay: item.animationDelay,
            animationDuration: item.animationDuration,
            filter: "drop-shadow(0 2px 4px rgba(6, 182, 212, 0.2))",
          }}
        >
          💰
        </div>
      ))}

      {/* Subtle gradient overlays for depth */}
      <div
        className="absolute inset-0 nak-depth-gradient"
        style={{
          background: `
            radial-gradient(ellipse at 50% 0%, rgba(6, 182, 212, 0.02) 0%, transparent 60%),
            radial-gradient(ellipse at 0% 100%, rgba(139, 92, 246, 0.015) 0%, transparent 50%),
            radial-gradient(ellipse at 100% 100%, rgba(139, 92, 246, 0.01) 0%, transparent 50%)
          `,
          backdropFilter: "blur(60px)",
        }}
      />

      {/* Ambient Light */}
      <div
        className="absolute inset-0 opacity-8 nak-ambient"
        style={{
          background: `
            radial-gradient(ellipse at 30% 20%, 
              rgba(6, 182, 212, 0.06) 0%, 
              transparent 40%),
            radial-gradient(ellipse at 70% 80%, 
              rgba(139, 92, 246, 0.04) 0%, 
              transparent 40%)
          `,
          backdropFilter: "blur(80px)",
          animation: "nak-glow 20s ease-in-out infinite",
        }}
      />

      {/* Top gradient for surface effect */}
      <div
        className="absolute top-0 left-0 right-0 h-32 nak-surface opacity-8"
        style={{
          background: `
            linear-gradient(180deg, 
              rgba(6, 182, 212, 0.08) 0%, 
              rgba(6, 182, 212, 0.04) 50%, 
              transparent 100%)
          `,
          backdropFilter: "blur(40px)",
        }}
      />

      {/* Bottom depth gradient */}
      <div
        className="absolute bottom-0 left-0 right-0 h-40 nak-depth opacity-6"
        style={{
          background: `
            linear-gradient(0deg, 
              rgba(139, 92, 246, 0.06) 0%, 
              rgba(76, 29, 149, 0.03) 50%, 
              transparent 100%)
          `,
          backdropFilter: "blur(60px)",
        }}
      />
    </div>
  );
};

export default BubbleBackground;
