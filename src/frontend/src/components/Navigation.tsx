import {
  ArrowLeft,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Coins,
  ExternalLink,
  Home,
  Menu,
  MessageCircle,
  Music,
  Search,
  Settings,
  ShoppingCart,
  Theater,
  Vault,
  X,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";

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
    | "admin";
  onNavigateToMain: () => void;
  onNavigateToMetaTheatre?: () => void;
  onNavigateToShop?: () => void;
  onNavigateToCart?: () => void;
  onNavigateToOrderLookup?: () => void;
  onNavigateToAdmin?: () => void;
}

const Navigation: React.FC<NavigationProps> = ({
  currentPage,
  onNavigateToMain,
  onNavigateToMetaTheatre,
  onNavigateToShop,
  onNavigateToCart,
  onNavigateToOrderLookup,
  onNavigateToAdmin,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [isWideScreen, setIsWideScreen] = useState(false);

  // Check screen width and update layout accordingly
  useEffect(() => {
    const checkScreenWidth = () => {
      const minWidthForFullMenu = 1200;
      setIsWideScreen(window.innerWidth >= minWidthForFullMenu);
    };

    checkScreenWidth();
    window.addEventListener("resize", checkScreenWidth);
    return () => window.removeEventListener("resize", checkScreenWidth);
  }, []);

  const navigationItems = useMemo(
    () => [
      { id: "home", label: "Home", icon: Home, group: "main" },
      { id: "token-info", label: "Token Info", icon: Coins, group: "main" },
      {
        id: "purchase-nak",
        label: "Purchase NAK",
        icon: ShoppingCart,
        group: "trading",
      },
      {
        id: "nak-featured-artist",
        label: "NAK's Featured Artist",
        icon: Music,
        group: "content",
      },
      {
        id: "reserve-treasury",
        label: "Reserve Treasury",
        icon: Vault,
        group: "treasury",
      },
      {
        id: "telegram",
        label: "Telegram",
        icon: MessageCircle,
        group: "community",
      },
    ],
    [],
  );

  const menuGroups = useMemo(
    () => ({
      main: {
        label: "Main",
        items: navigationItems.filter((item) => item.group === "main"),
      },
      trading: {
        label: "Trading",
        items: navigationItems.filter((item) => item.group === "trading"),
      },
      content: {
        label: "Content",
        items: navigationItems.filter((item) => item.group === "content"),
      },
      treasury: {
        label: "Treasury",
        items: navigationItems.filter((item) => item.group === "treasury"),
      },
      community: {
        label: "Community",
        items: navigationItems.filter((item) => item.group === "community"),
      },
    }),
    [navigationItems],
  );

  const scrollToSection = (sectionId: string) => {
    if (currentPage !== "main") {
      onNavigateToMain();
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          const navHeight = 80;
          const elementPosition = element.offsetTop - navHeight;
          window.scrollTo({ top: elementPosition, behavior: "smooth" });
        }
      }, 100);
    } else {
      const element = document.getElementById(sectionId);
      if (element) {
        const navHeight = 80;
        const elementPosition = element.offsetTop - navHeight;
        window.scrollTo({ top: elementPosition, behavior: "smooth" });
      }
    }
    setIsMenuOpen(false);
  };

  const handleTreasuryDashboardClick = () => {
    window.open("https://nakreserve-p6m.caffeine.xyz/", "_blank");
    setIsMenuOpen(false);
  };

  const handleHoudiniswapClick = () => {
    window.open("https://app.houdiniswap.com/", "_blank");
    setIsMenuOpen(false);
  };

  const handleMetaTheatreClick = () => {
    if (onNavigateToMetaTheatre) {
      onNavigateToMetaTheatre();
    }
    setIsMenuOpen(false);
  };

  const handleShopClick = () => {
    if (onNavigateToShop) {
      onNavigateToShop();
    }
    setIsMenuOpen(false);
  };

  const handleCartClick = () => {
    if (onNavigateToCart) {
      onNavigateToCart();
    }
    setIsMenuOpen(false);
  };

  const handleOrderLookupClick = () => {
    if (onNavigateToOrderLookup) {
      onNavigateToOrderLookup();
    }
    setIsMenuOpen(false);
  };

  const handleAdminClick = () => {
    if (onNavigateToAdmin) {
      onNavigateToAdmin();
    }
    setIsMenuOpen(false);
  };

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupKey)
        ? prev.filter((g) => g !== groupKey)
        : [...prev, groupKey],
    );
  };

  useEffect(() => {
    if (currentPage !== "main") return;

    const handleScroll = () => {
      const sections = navigationItems.map((item) => item.id);
      const navHeight = 80;

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = document.getElementById(sections[i]);
        if (section) {
          const sectionTop = section.offsetTop - navHeight - 100;
          if (window.scrollY >= sectionTop) {
            setActiveSection(sections[i]);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [currentPage, navigationItems]);

  return (
    <nav className="nav-sticky">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-20">
          {/* Modern Logo/Brand */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="relative group">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-110">
                <span className="text-white font-bold text-lg">N</span>
              </div>
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 opacity-0 group-hover:opacity-20 blur-xl transition-all duration-300" />
            </div>
            <button
              type="button"
              className="text-xl font-semibold text-white cursor-pointer hover:text-purple-300 transition-colors duration-300 bg-transparent border-0 p-0"
              style={{ fontFamily: "var(--font-heading)" }}
              onClick={() => {
                if (currentPage === "main") {
                  scrollToSection("home");
                } else {
                  onNavigateToMain();
                }
              }}
            >
              NAK STRATS
            </button>
          </div>

          {/* Artist/MetaTheatre Page Back Button */}
          {(currentPage === "artist" ||
            currentPage === "metatheatre" ||
            currentPage === "shop" ||
            currentPage === "cart" ||
            currentPage === "checkout" ||
            currentPage === "success" ||
            currentPage === "orderlookup" ||
            currentPage === "admin") && (
            <div className="hidden lg:flex items-center">
              <button
                type="button"
                onClick={onNavigateToMain}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 text-gray-300 hover:text-white hover:bg-white/5 text-sm"
                style={{ fontFamily: "var(--font-body)" }}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Main Page</span>
              </button>
            </div>
          )}

          {/* Wide Screen Navigation - Optimized Compact Layout */}
          {currentPage === "main" && isWideScreen && (
            <div className="hidden lg:flex items-center space-x-0.5">
              {navigationItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className={`relative flex items-center gap-1.5 px-2.5 py-2 rounded-lg font-medium transition-all duration-300 group ${
                      isActive
                        ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white border border-purple-500/30"
                        : "text-gray-300 hover:text-white hover:bg-white/5"
                    }`}
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "0.7rem",
                    }}
                  >
                    <IconComponent className="w-3 h-3" />
                    <span className="whitespace-nowrap">{item.label}</span>
                    {isActive && (
                      <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 blur-sm" />
                    )}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={handleTreasuryDashboardClick}
                className="relative flex items-center gap-1.5 px-2.5 py-2 rounded-lg font-medium transition-all duration-300 group text-gray-300 hover:text-white hover:bg-white/5"
                style={{ fontFamily: "var(--font-body)", fontSize: "0.7rem" }}
                title="Opens external treasury dashboard"
              >
                <BarChart3 className="w-3 h-3" />
                <span className="whitespace-nowrap">Dashboard</span>
                <ExternalLink className="w-2 h-2 opacity-60" />
              </button>

              <button
                type="button"
                onClick={handleHoudiniswapClick}
                className="relative flex items-center gap-1.5 px-2.5 py-2 rounded-lg font-medium transition-all duration-300 group text-gray-300 hover:text-white hover:bg-white/5"
                style={{ fontFamily: "var(--font-body)", fontSize: "0.7rem" }}
                title="Opens Houdiniswap"
              >
                <ShoppingCart className="w-3 h-3" />
                <span className="whitespace-nowrap">Houdiniswap</span>
                <ExternalLink className="w-2 h-2 opacity-60" />
              </button>

              <button
                type="button"
                onClick={handleMetaTheatreClick}
                className="relative flex items-center gap-1.5 px-2.5 py-2 rounded-lg font-medium transition-all duration-300 group text-gray-300 hover:text-white hover:bg-white/5"
                style={{ fontFamily: "var(--font-body)", fontSize: "0.7rem" }}
              >
                <Theater className="w-3 h-3" />
                <span className="whitespace-nowrap">MetaTheatre</span>
              </button>

              <button
                type="button"
                onClick={handleShopClick}
                className="relative flex items-center gap-1.5 px-2.5 py-2 rounded-lg font-medium transition-all duration-300 group text-gray-300 hover:text-white hover:bg-white/5"
                style={{ fontFamily: "var(--font-body)", fontSize: "0.7rem" }}
              >
                <ShoppingCart className="w-3 h-3" />
                <span className="whitespace-nowrap">Shop</span>
              </button>

              <button
                type="button"
                onClick={handleCartClick}
                className="relative flex items-center gap-1.5 px-2.5 py-2 rounded-lg font-medium transition-all duration-300 group text-gray-300 hover:text-white hover:bg-white/5"
                style={{ fontFamily: "var(--font-body)", fontSize: "0.7rem" }}
              >
                <ShoppingCart className="w-3 h-3" />
                <span className="whitespace-nowrap">Cart</span>
              </button>

              <button
                type="button"
                onClick={handleOrderLookupClick}
                className="relative flex items-center gap-1.5 px-2.5 py-2 rounded-lg font-medium transition-all duration-300 group text-gray-300 hover:text-white hover:bg-white/5"
                style={{ fontFamily: "var(--font-body)", fontSize: "0.7rem" }}
              >
                <Search className="w-3 h-3" />
                <span className="whitespace-nowrap">Order Lookup</span>
              </button>

              <button
                type="button"
                onClick={handleAdminClick}
                className="relative flex items-center gap-1.5 px-2.5 py-2 rounded-lg font-medium transition-all duration-300 group text-gray-300 hover:text-white hover:bg-white/5"
                style={{ fontFamily: "var(--font-body)", fontSize: "0.7rem" }}
              >
                <Settings className="w-3 h-3" />
                <span className="whitespace-nowrap">Admin</span>
              </button>
            </div>
          )}

          {/* Compact Navigation for Medium Screens */}
          {currentPage === "main" && !isWideScreen && (
            <div className="hidden md:flex lg:hidden items-center space-x-1">
              <button
                type="button"
                onClick={() => scrollToSection("home")}
                className={`relative flex items-center gap-1 px-2 py-2 rounded-lg font-medium transition-all duration-300 text-xs ${
                  activeSection === "home"
                    ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white border border-purple-500/30"
                    : "text-gray-300 hover:text-white hover:bg-white/5"
                }`}
              >
                <Home className="w-3 h-3" />
                <span>Home</span>
              </button>

              <button
                type="button"
                onClick={() => scrollToSection("token-info")}
                className={`relative flex items-center gap-1 px-2 py-2 rounded-lg font-medium transition-all duration-300 text-xs ${
                  activeSection === "token-info"
                    ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white border border-purple-500/30"
                    : "text-gray-300 hover:text-white hover:bg-white/5"
                }`}
              >
                <Coins className="w-3 h-3" />
                <span>Token</span>
              </button>

              <button
                type="button"
                onClick={() => scrollToSection("purchase-nak")}
                className={`relative flex items-center gap-1 px-2 py-2 rounded-lg font-medium transition-all duration-300 text-xs ${
                  activeSection === "purchase-nak"
                    ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white border border-purple-500/30"
                    : "text-gray-300 hover:text-white hover:bg-white/5"
                }`}
              >
                <ShoppingCart className="w-3 h-3" />
                <span>Buy</span>
              </button>

              <button
                type="button"
                onClick={handleMetaTheatreClick}
                className="relative flex items-center gap-1 px-2 py-2 rounded-lg font-medium transition-all duration-300 text-xs text-gray-300 hover:text-white hover:bg-white/5"
              >
                <Theater className="w-3 h-3" />
                <span>Theatre</span>
              </button>

              <button
                type="button"
                onClick={handleShopClick}
                className="relative flex items-center gap-1 px-2 py-2 rounded-lg font-medium transition-all duration-300 text-xs text-gray-300 hover:text-white hover:bg-white/5"
              >
                <ShoppingCart className="w-3 h-3" />
                <span>Shop</span>
              </button>

              <button
                type="button"
                onClick={handleCartClick}
                className="relative flex items-center gap-1 px-2 py-2 rounded-lg font-medium transition-all duration-300 text-xs text-gray-300 hover:text-white hover:bg-white/5"
              >
                <ShoppingCart className="w-3 h-3" />
                <span>Cart</span>
              </button>

              <button
                type="button"
                onClick={handleOrderLookupClick}
                className="relative flex items-center gap-1 px-2 py-2 rounded-lg font-medium transition-all duration-300 text-xs text-gray-300 hover:text-white hover:bg-white/5"
              >
                <Search className="w-3 h-3" />
                <span>Orders</span>
              </button>

              <button
                type="button"
                onClick={handleAdminClick}
                className="relative flex items-center gap-1 px-2 py-2 rounded-lg font-medium transition-all duration-300 text-xs text-gray-300 hover:text-white hover:bg-white/5"
              >
                <Settings className="w-3 h-3" />
                <span>Admin</span>
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center gap-1 px-2 py-2 rounded-lg font-medium transition-all duration-300 text-xs text-gray-300 hover:text-white hover:bg-white/5"
                >
                  <Menu className="w-3 h-3" />
                  <span>More</span>
                </button>
              </div>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:flex lg:hidden p-2.5 rounded-xl bg-white/5 text-white hover:bg-white/10 transition-all duration-300 border border-white/10"
          >
            {isMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Collapsible Mobile/Tablet Navigation Menu */}
        {isMenuOpen && (
          <div className="nav-mobile-menu">
            <div className="px-4 py-6 space-y-2">
              {(currentPage === "artist" ||
                currentPage === "metatheatre" ||
                currentPage === "shop" ||
                currentPage === "cart" ||
                currentPage === "checkout" ||
                currentPage === "success" ||
                currentPage === "orderlookup" ||
                currentPage === "admin") && (
                <button
                  type="button"
                  onClick={() => {
                    onNavigateToMain();
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-300 text-gray-300 hover:text-white hover:bg-white/5 text-sm"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Back to Main Page</span>
                </button>
              )}

              {currentPage === "main" && (
                <>
                  {Object.entries(menuGroups).map(([groupKey, group]) => (
                    <div key={groupKey} className="space-y-1">
                      {group.items.length > 1 ? (
                        <>
                          <button
                            type="button"
                            onClick={() => toggleGroup(groupKey)}
                            className="w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium transition-all duration-300 text-gray-400 hover:text-white hover:bg-white/5 text-sm"
                            style={{ fontFamily: "var(--font-body)" }}
                          >
                            <span>{group.label}</span>
                            {expandedGroups.includes(groupKey) ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>

                          {expandedGroups.includes(groupKey) && (
                            <div className="ml-4 space-y-1">
                              {group.items.map((item) => {
                                const IconComponent = item.icon;
                                const isActive = activeSection === item.id;
                                return (
                                  <button
                                    type="button"
                                    key={item.id}
                                    onClick={() => scrollToSection(item.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-300 text-sm ${
                                      isActive
                                        ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white border border-purple-500/30"
                                        : "text-gray-300 hover:text-white hover:bg-white/5"
                                    }`}
                                    style={{ fontFamily: "var(--font-body)" }}
                                  >
                                    <IconComponent className="w-4 h-4" />
                                    <span>{item.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </>
                      ) : (
                        group.items.map((item) => {
                          const IconComponent = item.icon;
                          const isActive = activeSection === item.id;
                          return (
                            <button
                              type="button"
                              key={item.id}
                              onClick={() => scrollToSection(item.id)}
                              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-300 text-sm ${
                                isActive
                                  ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white border border-purple-500/30"
                                  : "text-gray-300 hover:text-white hover:bg-white/5"
                              }`}
                              style={{ fontFamily: "var(--font-body)" }}
                            >
                              <IconComponent className="w-4 h-4" />
                              <span>{item.label}</span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  ))}

                  <div className="pt-4 border-t border-white/10">
                    <div className="text-xs font-medium text-gray-500 px-4 py-2 uppercase tracking-wider">
                      External Links
                    </div>

                    <button
                      type="button"
                      onClick={handleTreasuryDashboardClick}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-300 text-gray-300 hover:text-white hover:bg-white/5 text-sm"
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      <BarChart3 className="w-4 h-4" />
                      <span>Treasury Dashboard</span>
                      <ExternalLink className="w-3 h-3 opacity-60 ml-auto" />
                    </button>

                    <button
                      type="button"
                      onClick={handleHoudiniswapClick}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-300 text-gray-300 hover:text-white hover:bg-white/5 text-sm"
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>Houdiniswap</span>
                      <ExternalLink className="w-3 h-3 opacity-60 ml-auto" />
                    </button>

                    <button
                      type="button"
                      onClick={handleMetaTheatreClick}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-300 text-gray-300 hover:text-white hover:bg-white/5 text-sm"
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      <Theater className="w-4 h-4" />
                      <span>MetaTheatre</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleShopClick}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-300 text-gray-300 hover:text-white hover:bg-white/5 text-sm"
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>Shop</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCartClick}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-300 text-gray-300 hover:text-white hover:bg-white/5 text-sm"
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>Cart</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleOrderLookupClick}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-300 text-gray-300 hover:text-white hover:bg-white/5 text-sm"
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      <Search className="w-4 h-4" />
                      <span>Order Lookup</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAdminClick}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-300 text-gray-300 hover:text-white hover:bg-white/5 text-sm"
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      <Settings className="w-4 h-4" />
                      <span>Admin</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
