import { Heart } from "lucide-react";
import React, { useEffect, useState } from "react";
import AdminSettingsPage from "./components/AdminSettingsPage";
import BubbleBackground from "./components/BubbleBackground";
import CancelledPage from "./components/CancelledPage";
import CartPage from "./components/CartPage";
import CheckoutPage from "./components/CheckoutPage";
import MainContent from "./components/MainContent";
import MarsLiveArtistPage from "./components/MarsLiveArtistPage";
import MetaTheatrePage from "./components/MetaTheatrePage";
import NAKFeaturedArtist from "./components/NAKFeaturedArtist";
import Navigation from "./components/Navigation";
import OrderLookupPage from "./components/OrderLookupPage";
import ProductPage from "./components/ProductPage";
import PurchaseNAK from "./components/PurchaseNAK";
import ReserveTreasury from "./components/ReserveTreasury";
import ShopPage from "./components/ShopPage";
import SuccessPage from "./components/SuccessPage";
import TelegramSection from "./components/TelegramSection";
import TokenInfo from "./components/TokenInfo";
import { CartProvider } from "./hooks/useCart";

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
    | "admin"
  >("main");

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

  const navigateToMainPage = () => {
    setCurrentPage("main");
  };

  return (
    <CartProvider>
      <div
        className="min-h-screen relative overflow-x-hidden"
        style={{ backgroundColor: "var(--nak-deep-black)" }}
      >
        <BubbleBackground />
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
              | "admin"
          }
          onNavigateToMain={navigateToMainPage}
          onNavigateToMetaTheatre={navigateToMetaTheatrePage}
          onNavigateToShop={navigateToShopPage}
          onNavigateToCart={navigateToCartPage}
          onNavigateToOrderLookup={navigateToOrderLookupPage}
        />

        <div className="relative z-10">
          {currentPage === "main" ? (
            <>
              <MainContent />
              <TokenInfo />
              <PurchaseNAK />
              <NAKFeaturedArtist onNavigateToArtist={navigateToArtistPage} />
              <ReserveTreasury />
              <TelegramSection />

              {/* Enhanced Footer for Deep Black */}
              <footer
                className="text-center py-12 px-6 border-t border-purple-500/20"
                style={{ color: "var(--text-muted)" }}
              >
                <div className="max-w-4xl mx-auto">
                  <img
                    src="/assets/images/nak-shell.png"
                    alt="NAK STRATS shell mascot"
                    className="pixel-art footer-shell object-contain mx-auto mb-4"
                    style={{ width: "2.5rem", height: "2.5rem" }}
                  />
                  <p className="text-sm flex items-center justify-center gap-2">
                    © 2025. Built with{" "}
                    <Heart className="inline w-4 h-4 text-pink-400 mx-1 animate-pulse" />{" "}
                    using{" "}
                    <a
                      href="https://caffeine.ai"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:opacity-80 transition-opacity underline font-medium"
                      style={{ color: "var(--nak-teal)" }}
                    >
                      caffeine.ai
                    </a>
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
          ) : currentPage === "admin" ? (
            <AdminSettingsPage onNavigateToMain={navigateToMainPage} />
          ) : (
            <MetaTheatrePage onNavigateToMain={navigateToMainPage} />
          )}
        </div>
      </div>
    </CartProvider>
  );
}

export default App;
