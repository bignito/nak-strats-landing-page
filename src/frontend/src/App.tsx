import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import React, { useEffect, useState } from "react";
import AdminDashboard from "./components/AdminDashboard";
import BubbleBackground from "./components/BubbleBackground";
import MainContent from "./components/MainContent";
import MarsLiveArtistPage from "./components/MarsLiveArtistPage";
import MetaTheatrePage from "./components/MetaTheatrePage";
import NAKFeaturedArtist from "./components/NAKFeaturedArtist";
import Navigation from "./components/Navigation";
import PurchaseNAK from "./components/PurchaseNAK";
import RecoveryPage from "./components/RecoveryPage";
import ReserveTreasury from "./components/ReserveTreasury";
import TokenInfo from "./components/TokenInfo";
import UnsubscribePage from "./components/UnsubscribePage";
import { CartProvider } from "./hooks/useCart";
import { useIsAdmin } from "./hooks/useQueries";

// Pages that explicitly opt in to the emoji-rain background. Kept empty so
// BubbleBackground renders NOWHERE by default; a newly added page value must be
// added here to receive the animation (it never inherits it silently).
const EMOJI_RAIN_PAGES: readonly string[] = [];

function App() {
  const [currentPage, setCurrentPage] = useState<
    | "main"
    | "artist"
    | "metatheatre"
    | "admin"
    | "adminrecovery"
    | "unsubscribe"
  >("main");

  const { data: isAdmin } = useIsAdmin();

  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const [lastIdentityKey, setLastIdentityKey] = useState<string | null>(null);

  // Invalidate every react-query cache whenever the Internet Identity changes
  // (sign-in, sign-out, session restore) so a stale anonymous isAdmin:false is
  // never reused after auth state changes. The actor query itself is keyed by
  // principal and rebuilt by useActor; invalidating the rest forces refetches
  // against the new identity.
  useEffect(() => {
    const identityKey = identity?.getPrincipal().toString() ?? "anonymous";
    if (lastIdentityKey !== null && lastIdentityKey !== identityKey) {
      void queryClient.invalidateQueries();
    }
    setLastIdentityKey(identityKey);
  }, [identity, lastIdentityKey, queryClient]);

  // Admin is intentionally kept out of both navs (per requirement) but must
  // stay reachable so the user can sign in and claim initial admin. Route to
  // it directly via a URL hash (#/admin or #admin) without any nav link.
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace(/^#\/?/, "").toLowerCase();
      if (hash === "admin") {
        setCurrentPage("admin");
      } else if (hash === "admin/recovery") {
        setCurrentPage("adminrecovery");
      } else if (hash === "unsubscribe") {
        setCurrentPage("unsubscribe");
      }
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
    <CartProvider>
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
            currentPage as "main" | "artist" | "metatheatre" | "admin"
          }
          onNavigateToMain={navigateToMainPage}
          onNavigateToMetaTheatre={navigateToMetaTheatrePage}
        />

        {/* Admin-only Payment Recovery link, shown only to admins. */}
        {isAdmin && (
          <div className="relative z-10 flex justify-end px-4 sm:px-6 pt-3">
            <button
              type="button"
              onClick={() => setCurrentPage("adminrecovery")}
              className="nav-item flex items-center gap-2"
              data-ocid="nav.payment_recovery_link"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Payment Recovery</span>
            </button>
          </div>
        )}

        <div className="relative z-10">
          {currentPage === "main" ? (
            <>
              <MainContent />
              <TokenInfo />
              <NAKFeaturedArtist onNavigateToArtist={navigateToArtistPage} />
              <PurchaseNAK />
              <ReserveTreasury />

              {/* Institutional footer — shell mark + copyright left, risk
                  disclaimer right. */}
              <footer
                id="company"
                className="border-t border-border"
                style={{ borderColor: "var(--border)" }}
              >
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
                      © 2026 New Age Kapital
                    </span>
                  </div>
                  <p
                    className="text-xs text-right"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Digital assets carry risk. Nothing here constitutes
                    investment advice.
                  </p>
                </div>
              </footer>
            </>
          ) : currentPage === "artist" ? (
            <MarsLiveArtistPage onNavigateToMain={navigateToMainPage} />
          ) : currentPage === "admin" ? (
            <AdminDashboard onNavigateToMain={navigateToMainPage} />
          ) : currentPage === "adminrecovery" ? (
            <RecoveryPage
              onNavigateToAdmin={() => setCurrentPage("admin")}
              onNavigateToMain={navigateToMainPage}
            />
          ) : currentPage === "unsubscribe" ? (
            <UnsubscribePage onNavigateToMain={navigateToMainPage} />
          ) : (
            <MetaTheatrePage onNavigateToMain={navigateToMainPage} />
          )}
        </div>
      </div>
    </CartProvider>
  );
}

export default App;
