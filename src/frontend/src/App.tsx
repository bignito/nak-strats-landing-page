import { useEffect, useState } from "react";
import BubbleBackground from "./components/BubbleBackground";
import LegalDisclaimer from "./components/LegalDisclaimer";
import LegalPage from "./components/LegalPage";
import MainContent from "./components/MainContent";
import MarsLiveArtistPage from "./components/MarsLiveArtistPage";
import MetaTheatrePage from "./components/MetaTheatrePage";
import NAKFeaturedArtist from "./components/NAKFeaturedArtist";
import Navigation from "./components/Navigation";
import ReserveTreasury from "./components/ReserveTreasury";
import TokenInfo from "./components/TokenInfo";

// Pages that explicitly opt in to the emoji-rain background. Kept empty so
// BubbleBackground renders NOWHERE by default; a newly added page value must be
// added here to receive the animation (it never inherits it silently).
const EMOJI_RAIN_PAGES: readonly string[] = [];

function App() {
  const [currentPage, setCurrentPage] = useState<
    | "main"
    | "artist"
    | "metatheatre"
    | "legal"
  >("main");

  // #/legal is the only deep link (no nav entry).
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace(/^#\/?/, "").toLowerCase();
      if (hash === "legal") setCurrentPage("legal");
    };
    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  const navigateToArtistPage = () => {
    setCurrentPage("artist");
  };

  const navigateToMetaTheatrePage = () => {
    setCurrentPage("metatheatre");
  };

  const navigateToMainPage = () => {
    setCurrentPage("main");
  };

  return (
    <>
      <div
        className="min-h-screen relative overflow-x-hidden"
        style={{ backgroundColor: "var(--nak-bg)" }}
      >
        {/* Emoji rain renders ONLY for pages explicitly listed in
            EMOJI_RAIN_PAGES (currently empty), so the storefront and admin
            surfaces stay clean and a newly added page does NOT silently
            inherit the animation. */}
        {EMOJI_RAIN_PAGES.includes(currentPage) && <BubbleBackground />}
        <Navigation
          currentPage={
            currentPage as "main" | "artist" | "metatheatre"
          }
          onNavigateToMain={navigateToMainPage}
          onNavigateToMetaTheatre={navigateToMetaTheatrePage}
        />

        <div className="relative z-10">
          {currentPage === "main" ? (
            <>
              <MainContent />
              <TokenInfo />
              <NAKFeaturedArtist onNavigateToArtist={navigateToArtistPage} />
              <ReserveTreasury />

              {/* Institutional footer — legal disclaimer above, shell mark
                  + copyright row below. */}
              <footer
                id="company"
                className="border-t border-border"
                style={{ borderColor: "var(--border)" }}
              >
                <LegalDisclaimer />
                <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img
                      src="/assets/images/nak-shell.png"
                      alt="New Age Kapital shell mark"
                      className="shell-logo-footer"
                    />
                    <span
                      className="text-sm"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      © 2026 NAK New Age Kapital. All rights reserved.
                    </span>
                  </div>
                </div>
              </footer>
            </>
          ) : currentPage === "artist" ? (
            <MarsLiveArtistPage onNavigateToMain={navigateToMainPage} />
          ) : currentPage === "legal" ? (
            <LegalPage onNavigateToMain={navigateToMainPage} />
          ) : (
            <MetaTheatrePage onNavigateToMain={navigateToMainPage} />
          )}
        </div>
      </div>
    </>
  );
}

export default App;
