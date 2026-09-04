import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import React, { useEffect, useState } from "react";
import AdminDashboard from "./components/AdminDashboard";
import BubbleBackground from "./components/BubbleBackground";
import CancelledPage from "./components/CancelledPage";
import CartPage from "./components/CartPage";
import CheckoutPage from "./components/CheckoutPage";
import MainContent from "./components/MainContent";
import MarsLiveArtistPage from "./components/MarsLiveArtistPage";
import MetaTheatrePage from "./components/MetaTheatrePage";
import MyOrdersPage from "./components/MyOrdersPage";
import NAKFeaturedArtist from "./components/NAKFeaturedArtist";
import Navigation from "./components/Navigation";
import OrderLookupPage from "./components/OrderLookupPage";
import ProductPage from "./components/ProductPage";
import PurchaseNAK from "./components/PurchaseNAK";
import RecoveryPage from "./components/RecoveryPage";
import ReserveTreasury from "./components/ReserveTreasury";
import ResumeBanner from "./components/ResumeBanner";
import ShopBanner from "./components/ShopBanner";
import ShopPage from "./components/ShopPage";
import SuccessPage from "./components/SuccessPage";
import TokenInfo from "./components/TokenInfo";
import UnsubscribePage from "./components/UnsubscribePage";
import { useActiveOrderRef } from "./hooks/useActiveOrderRef";
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
    | "shop"
    | "product"
    | "cart"
    | "checkout"
    | "success"
    | "cancelled"
    | "orderlookup"
    | "myorders"
    | "admin"
    | "adminrecovery"
    | "unsubscribe"
  >("main");

  const { setActiveOrderRef } = useActiveOrderRef();
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

  const [selectedProductSlugOrId, setSelectedProductSlugOrId] = useState<
    string | null
  >(null);

  const [successOrderReference, setSuccessOrderReference] = useState<
    string | null
  >(null);

  const [cancelledOrderReference, setCancelledOrderReference] = useState<
    string | null
  >(null);

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

  // Card checkout redirects back from the payment service with an order_id
  // query param (plus a status marker). Detect it on load and route to the
  // success or cancelled page with the reference, then clean the URL so the
  // query param does not linger. The crypto flow routes via state and is
  // unaffected.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("order_id");
    if (!orderId) return;
    if (params.get("status") === "cancelled") {
      setCancelledOrderReference(orderId);
      setCurrentPage("cancelled");
    } else {
      setSuccessOrderReference(orderId);
      setCurrentPage("success");
    }
    const url = new URL(window.location.href);
    url.search = "";
    window.history.replaceState({}, "", url.toString());
  }, []);

  // Checkout resume: /checkout?resume=REF restores a returning customer's
  // in-progress deposit. Store REF as the active order ref (so CheckoutPage can
  // restore the same address, amount, and remaining time) and route to checkout,
  // then clean the query param so it does not linger.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resumeRef = params.get("resume");
    if (!resumeRef) return;
    setActiveOrderRef(resumeRef);
    setCurrentPage("checkout");
    const url = new URL(window.location.href);
    url.search = "";
    window.history.replaceState({}, "", url.toString());
  }, [setActiveOrderRef]);

  const navigateToArtistPage = () => {
    setCurrentPage("artist");
  };

  const navigateToMetaTheatrePage = () => {
    setCurrentPage("metatheatre");
  };

  const navigateToShopPage = () => {
    setCurrentPage("shop");
  };

  const navigateToProductPage = (slugOrId: string) => {
    setSelectedProductSlugOrId(slugOrId);
    setCurrentPage("product");
  };

  const navigateToCartPage = () => {
    setCurrentPage("cart");
  };

  const navigateToCheckoutPage = () => {
    setCurrentPage("checkout");
  };

  const navigateToSuccessPage = (orderReference: string) => {
    setSuccessOrderReference(orderReference);
    setCurrentPage("success");
  };

  const navigateToOrderLookupPage = () => {
    setCurrentPage("orderlookup");
  };

  const navigateToMyOrdersPage = () => {
    setCurrentPage("myorders");
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
            currentPage as
              | "main"
              | "artist"
              | "metatheatre"
              | "shop"
              | "cart"
              | "checkout"
              | "success"
              | "orderlookup"
              | "myorders"
              | "admin"
          }
          onNavigateToMain={navigateToMainPage}
          onNavigateToMetaTheatre={navigateToMetaTheatrePage}
          onNavigateToShop={navigateToShopPage}
          onNavigateToCart={navigateToCartPage}
          onNavigateToOrderLookup={navigateToOrderLookupPage}
          onNavigateToMyOrders={navigateToMyOrdersPage}
        />

        {/* Resume-order banner for a returning customer with an unexpired
            unpaid order. It reads the stored active order ref and calls
            getResumeInfo itself. */}
        <ResumeBanner onResume={navigateToCheckoutPage} />

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
              <ShopBanner onNavigateToShop={navigateToShopPage} />
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
          ) : currentPage === "shop" ? (
            <ShopPage
              onNavigateToMain={navigateToMainPage}
              onNavigateToProduct={navigateToProductPage}
            />
          ) : currentPage === "product" ? (
            <ProductPage
              slugOrId={selectedProductSlugOrId ?? ""}
              onNavigateToMain={navigateToMainPage}
              onNavigateToShop={navigateToShopPage}
            />
          ) : currentPage === "cart" ? (
            <CartPage
              onNavigateToMain={navigateToMainPage}
              onNavigateToCheckout={navigateToCheckoutPage}
              onNavigateToShop={navigateToShopPage}
            />
          ) : currentPage === "checkout" ? (
            <CheckoutPage
              onNavigateToMain={navigateToMainPage}
              onNavigateToCart={navigateToCartPage}
              onNavigateToSuccess={navigateToSuccessPage}
            />
          ) : currentPage === "success" ? (
            <SuccessPage
              orderReference={successOrderReference ?? ""}
              onNavigateToMain={navigateToMainPage}
              onNavigateToShop={navigateToShopPage}
            />
          ) : currentPage === "cancelled" ? (
            <CancelledPage
              orderReference={cancelledOrderReference ?? ""}
              onNavigateToMain={navigateToMainPage}
              onNavigateToShop={navigateToShopPage}
              onNavigateToCart={navigateToCartPage}
            />
          ) : currentPage === "orderlookup" ? (
            <OrderLookupPage onNavigateToMain={navigateToMainPage} />
          ) : currentPage === "myorders" ? (
            <MyOrdersPage onNavigateToMain={navigateToMainPage} />
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
