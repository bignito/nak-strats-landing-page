import type React from "react";
import { useEffect, useState } from "react";

// Reduced from 41 continuously-animating elements to 12. Each item animates
// only transform + opacity (never filter/backdrop-filter), is promoted to its
// own compositor layer via will-change + contain, and carries no drop-shadow.
const RAIN_ITEMS = Array.from({ length: 12 }, (_, i) => ({
  id: `rain-${i}`,
  emoji: i % 3 === 0 ? "💰" : "🐚",
  left: `${(i * 8.3 + 2) % 100}%`,
  fontSize: `${(i % 4) * 4 + 20}px`,
  animationDelay: `${(i * 0.8) % 9}s`,
  animationDuration: `${(i % 4) * 1 + 8}s`,
}));

const BubbleBackground: React.FC = () => {
  // Pause all animation while the tab is hidden so the compositor does no work
  // in the background. Toggling a class lets the CSS animation-play-state rule
  // (and the prefers-reduced-motion kill-switch) handle the actual pausing.
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return (
    <div
      className={`fixed inset-0 overflow-hidden pointer-events-none ${
        hidden ? "is-paused" : ""
      }`}
      aria-hidden="true"
    >
      {RAIN_ITEMS.map((item) => (
        <div
          key={item.id}
          className="absolute animate-emoji-rain"
          style={{
            left: item.left,
            fontSize: item.fontSize,
            animationDelay: item.animationDelay,
            animationDuration: item.animationDuration,
            // Compositor promotion: animate only transform/opacity, never
            // filter or layout properties.
            willChange: "transform, opacity",
            contain: "layout paint",
          }}
        >
          {item.emoji}
        </div>
      ))}
    </div>
  );
};

export default BubbleBackground;
