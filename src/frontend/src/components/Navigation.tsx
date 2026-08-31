import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { LogIn, LogOut, Menu, Package, ShoppingCart, X } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useCart } from "../hooks/useCart";

interface NavigationProps {
  currentPage:
    | "main"
    | "artist"
    | "metatheatre"
    | "shop"
    | "cart"
    | "checkout"
    | "success"
    | "orderlookup"
    | "myorders"
    | "admin";
  onNavigateToMain: () => void;
  onNavigateToMetaTheatre?: () => void;
  onNavigateToShop?: () => void;
  onNavigateToCart?: () => void;
  onNavigateToOrderLookup?: () => void;
  onNavigateToMyOrders?: () => void;
}

interface NavGroup {
  key: string;
  label: string;
  id: string;
}

const NAV_GROUPS: NavGroup[] = [
  { key: "token", label: "Token", id: "metrics" },
  { key: "culture", label: "Culture", id: "culture" },
  { key: "trade", label: "Trade", id: "trade" },
  { key: "company", label: "Company", id: "company" },
];

const Navigation: React.FC<NavigationProps> = ({
  currentPage,
  onNavigateToMain,
  onNavigateToShop,
  onNavigateToCart,
  onNavigateToMyOrders,
}) => {
  const { itemCount } = useCart();
  const { isAuthenticated, login, clear, isLoggingIn } = useInternetIdentity();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  const scrollToSection = (id: string) => {
    if (currentPage !== "main") {
      onNavigateToMain();
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          const navHeight = 72;
          window.scrollTo({
            top: element.offsetTop - navHeight,
            behavior: "smooth",
          });
        }
      }, 100);
    } else {
      const element = document.getElementById(id);
      if (element) {
        const navHeight = 72;
        window.scrollTo({
          top: element.offsetTop - navHeight,
          behavior: "smooth",
        });
      }
    }
    setIsMenuOpen(false);
  };

  const handleShopClick = () => {
    if (onNavigateToShop) onNavigateToShop();
    setIsMenuOpen(false);
  };

  const handleCartClick = () => {
    if (onNavigateToCart) onNavigateToCart();
    setIsMenuOpen(false);
  };

  // Close the mobile menu on outside click and Escape.
  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMenuOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Scroll spy — highlight the section currently in view on the main page.
  useEffect(() => {
    if (currentPage !== "main") {
      setActiveSection(null);
      return;
    }
    const handleScroll = () => {
      const navHeight = 72;
      let current: string | null = null;
      for (const group of NAV_GROUPS) {
        const element = document.getElementById(group.id);
        if (element && element.offsetTop - navHeight - 100 <= window.scrollY) {
          current = group.key;
        }
      }
      setActiveSection(current);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [currentPage]);

  const isUnderlineActive = (key: string) =>
    hoveredGroup === key || activeSection === key;

  return (
    <nav
      ref={navRef}
      className="fixed top-0 left-0 right-0 z-[9999]"
      style={{
        background: "rgba(8,9,10,0.9)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--nak-border)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-[72px] min-w-0">
          {/* Brand — shell mark + N.A.K. wordmark + secondary text */}
          <div className="flex items-center gap-3 flex-shrink-0 min-w-0">
            <button
              type="button"
              onClick={() => {
                if (currentPage === "main") {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                } else {
                  onNavigateToMain();
                }
              }}
              className="flex items-center gap-3 cursor-pointer bg-transparent border-0 p-0"
              aria-label="New Age Kapital home"
            >
              <img
                src="/assets/images/nak-shell.png"
                alt="New Age Kapital shell mark"
                className="shell-logo-nav"
              />
              <span
                className="wordmark whitespace-nowrap"
                style={{
                  fontSize: "1rem",
                  letterSpacing: "0.14em",
                  fontWeight: 500,
                }}
              >
                N.A.K.
              </span>
            </button>
            <span
              className="hidden min-[620px]:inline-flex items-center pl-[0.625rem]"
              style={{
                borderLeft: "1px solid var(--nak-border-strong)",
                fontSize: "0.6875rem",
                color: "var(--nak-text-muted)",
                whiteSpace: "nowrap",
              }}
            >
              New Age Kapital
            </span>
          </div>

          {/* Desktop nav groups + actions */}
          <div className="hidden lg:flex items-center gap-1 min-w-0">
            {NAV_GROUPS.map((group) => (
              <button
                key={group.key}
                type="button"
                onClick={() => scrollToSection(group.id)}
                onMouseEnter={() => setHoveredGroup(group.key)}
                onMouseLeave={() => setHoveredGroup(null)}
                className={`cursor-pointer bg-transparent border-0 whitespace-nowrap ${
                  isUnderlineActive(group.key) ? "nav-underline" : ""
                }`}
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                  letterSpacing: "0.01em",
                  color: "var(--nak-text-secondary)",
                  padding: "0.5rem 0.75rem",
                }}
                data-ocid={`nav.${group.key}`}
              >
                {group.label}
              </button>
            ))}

            <div className="flex items-center gap-1 ml-2 min-w-0">
              {/* Cart */}
              <button
                type="button"
                onClick={handleCartClick}
                className="relative cursor-pointer bg-transparent border-0 p-2"
                aria-label={`Cart, ${itemCount} item${itemCount === 1 ? "" : "s"}`}
                data-ocid="nav.cart_button"
                style={{ color: "var(--nak-text-secondary)" }}
              >
                <ShoppingCart className="w-4 h-4" />
                {itemCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 min-w-[1rem] h-4 px-1 rounded-full text-[0.625rem] font-bold leading-4 text-center"
                    style={{
                      background: "var(--nak-surface)",
                      color: "var(--nak-text-muted)",
                      border: "1px solid var(--nak-border)",
                    }}
                  >
                    {itemCount}
                  </span>
                )}
              </button>

              {/* Account */}
              {isAuthenticated ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (onNavigateToMyOrders) onNavigateToMyOrders();
                    }}
                    className="cursor-pointer bg-transparent border-0 p-2"
                    aria-label="My orders"
                    data-ocid="nav.my_orders_button"
                    style={{ color: "var(--nak-text-secondary)" }}
                  >
                    <Package className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={clear}
                    className="cursor-pointer bg-transparent border-0 p-2"
                    aria-label="Sign out"
                    data-ocid="nav.sign_out_button"
                    style={{ color: "var(--nak-text-secondary)" }}
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => login()}
                  disabled={isLoggingIn}
                  className="cursor-pointer bg-transparent border-0 p-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Sign in"
                  data-ocid="nav.sign_in_button"
                  style={{ color: "var(--nak-text-secondary)" }}
                >
                  <LogIn className="w-4 h-4" />
                </button>
              )}

              {/* Shop — white primary button */}
              <button
                type="button"
                onClick={handleShopClick}
                className="btn-primary cursor-pointer ml-1"
                data-ocid="nav.shop_button"
                style={{
                  background: "#ffffff",
                  color: "var(--nak-bg)",
                  borderRadius: "var(--radius)",
                  padding: "0.5rem 1rem",
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                }}
              >
                Shop
              </button>
            </div>
          </div>

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            className="lg:hidden cursor-pointer p-2.5"
            aria-expanded={isMenuOpen}
            aria-label="Toggle navigation menu"
            data-ocid="nav.menu_toggle"
            style={{
              background: "transparent",
              border: "1px solid var(--nak-border)",
              borderRadius: "var(--radius)",
              color: "var(--nak-text)",
            }}
          >
            {isMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div
          className="lg:hidden"
          style={{
            background: "rgba(8,9,10,0.98)",
            borderTop: "1px solid var(--nak-border)",
            maxHeight: "80vh",
            overflowY: "auto",
          }}
        >
          <div className="px-4 py-4 space-y-1">
            {NAV_GROUPS.map((group) => (
              <button
                key={group.key}
                type="button"
                onClick={() => scrollToSection(group.id)}
                className="w-full text-left cursor-pointer bg-transparent border-0 px-3 py-3"
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "0.875rem",
                  color: "var(--nak-text-secondary)",
                  borderBottom: "1px solid var(--nak-border)",
                }}
                data-ocid={`nav.mobile_${group.key}`}
              >
                {group.label}
              </button>
            ))}

            <div className="pt-2 space-y-1">
              <button
                type="button"
                onClick={handleShopClick}
                className="btn-primary w-full cursor-pointer"
                data-ocid="nav.mobile_shop_button"
                style={{
                  background: "#ffffff",
                  color: "var(--nak-bg)",
                  borderRadius: "var(--radius)",
                }}
              >
                Shop
              </button>
              <button
                type="button"
                onClick={handleCartClick}
                className="w-full text-left cursor-pointer bg-transparent border-0 px-3 py-3 flex items-center gap-3"
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "0.875rem",
                  color: "var(--nak-text-secondary)",
                }}
                data-ocid="nav.mobile_cart_button"
              >
                <ShoppingCart className="w-4 h-4" />
                <span className="flex-1">Cart</span>
                {itemCount > 0 && (
                  <span
                    className="min-w-[1rem] h-4 px-1 rounded-full text-[0.625rem] font-bold leading-4 text-center"
                    style={{
                      background: "var(--nak-surface)",
                      color: "var(--nak-text-muted)",
                      border: "1px solid var(--nak-border)",
                    }}
                  >
                    {itemCount}
                  </span>
                )}
              </button>

              {isAuthenticated ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (onNavigateToMyOrders) onNavigateToMyOrders();
                      setIsMenuOpen(false);
                    }}
                    className="w-full text-left cursor-pointer bg-transparent border-0 px-3 py-3 flex items-center gap-3"
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "0.875rem",
                      color: "var(--nak-text-secondary)",
                    }}
                    data-ocid="nav.mobile_my_orders_button"
                  >
                    <Package className="w-4 h-4" />
                    <span className="flex-1">My Orders</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      clear();
                      setIsMenuOpen(false);
                    }}
                    className="w-full text-left cursor-pointer bg-transparent border-0 px-3 py-3 flex items-center gap-3"
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "0.875rem",
                      color: "var(--nak-text-secondary)",
                    }}
                    data-ocid="nav.mobile_sign_out_button"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="flex-1">Sign out</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => login()}
                  disabled={isLoggingIn}
                  className="w-full text-left cursor-pointer bg-transparent border-0 px-3 py-3 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "0.875rem",
                    color: "var(--nak-text-secondary)",
                  }}
                  data-ocid="nav.mobile_sign_in_button"
                >
                  <LogIn className="w-4 h-4" />
                  <span className="flex-1">
                    {isLoggingIn ? "Signing in…" : "Sign in"}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;
