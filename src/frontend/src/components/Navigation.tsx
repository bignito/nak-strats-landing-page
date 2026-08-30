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
  ShoppingCart,
  Theater,
  Vault,
  X,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
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
    | "admin";
  onNavigateToMain: () => void;
  onNavigateToMetaTheatre?: () => void;
  onNavigateToShop?: () => void;
  onNavigateToCart?: () => void;
  onNavigateToOrderLookup?: () => void;
}

type NavItem =
  | {
      key: string;
      kind: "section";
      id: string;
      label: string;
      icon: typeof Home;
    }
  | {
      key: string;
      kind: "external";
      label: string;
      icon: typeof Home;
      url: string;
    }
  | {
      key: string;
      kind: "page";
      label: string;
      icon: typeof Home;
      page: "shop" | "orderlookup" | "metatheatre";
    };

interface NavGroup {
  key: string;
  label: string;
  items: NavItem[];
}

const Navigation: React.FC<NavigationProps> = ({
  currentPage,
  onNavigateToMain,
  onNavigateToMetaTheatre,
  onNavigateToShop,
  onNavigateToCart,
  onNavigateToOrderLookup,
}) => {
  const { itemCount } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [isWideScreen, setIsWideScreen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  // Check screen width and update layout accordingly (collapse at 900px)
  useEffect(() => {
    const checkScreenWidth = () => {
      const minWidthForFullMenu = 900;
      setIsWideScreen(window.innerWidth >= minWidthForFullMenu);
    };

    checkScreenWidth();
    window.addEventListener("resize", checkScreenWidth);
    return () => window.removeEventListener("resize", checkScreenWidth);
  }, []);

  const dropdownGroups = useMemo<NavGroup[]>(
    () => [
      {
        key: "token",
        label: "Token",
        items: [
          {
            key: "home",
            kind: "section",
            id: "home",
            label: "Home",
            icon: Home,
          },
          {
            key: "token-info",
            kind: "section",
            id: "token-info",
            label: "Token Info",
            icon: Coins,
          },
          {
            key: "reserve-treasury",
            kind: "section",
            id: "reserve-treasury",
            label: "Reserve Treasury",
            icon: Vault,
          },
          {
            key: "treasury-dashboard",
            kind: "external",
            label: "Treasury Dashboard",
            icon: BarChart3,
            url: "https://nakreserve-p6m.caffeine.xyz/",
          },
        ],
      },
      {
        key: "trade",
        label: "Trade",
        items: [
          {
            key: "purchase-nak",
            kind: "section",
            id: "purchase-nak",
            label: "Purchase NAK",
            icon: ShoppingCart,
          },
          {
            key: "houdiniswap",
            kind: "external",
            label: "Houdiniswap",
            icon: ExternalLink,
            url: "https://app.houdiniswap.com/",
          },
        ],
      },
      {
        key: "shop",
        label: "Shop",
        items: [
          {
            key: "browse-products",
            kind: "page",
            label: "Browse Products",
            icon: ShoppingCart,
            page: "shop",
          },
          {
            key: "track-order",
            kind: "page",
            label: "Track an Order",
            icon: Search,
            page: "orderlookup",
          },
        ],
      },
      {
        key: "media",
        label: "Media",
        items: [
          {
            key: "featured-artist",
            kind: "section",
            id: "nak-featured-artist",
            label: "Featured Artist",
            icon: Music,
          },
          {
            key: "metatheatre",
            kind: "page",
            label: "MetaTheatre",
            icon: Theater,
            page: "metatheatre",
          },
          {
            key: "telegram",
            kind: "section",
            id: "telegram",
            label: "Telegram",
            icon: MessageCircle,
          },
        ],
      },
    ],
    [],
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
    setOpenDropdown(null);
  };

  const handleExternalClick = (url: string) => {
    window.open(url, "_blank");
    setIsMenuOpen(false);
    setOpenDropdown(null);
  };

  const handlePageClick = (page: "shop" | "orderlookup" | "metatheatre") => {
    if (page === "shop" && onNavigateToShop) onNavigateToShop();
    if (page === "orderlookup" && onNavigateToOrderLookup)
      onNavigateToOrderLookup();
    if (page === "metatheatre" && onNavigateToMetaTheatre)
      onNavigateToMetaTheatre();
    setIsMenuOpen(false);
    setOpenDropdown(null);
  };

  const handleCartClick = () => {
    if (onNavigateToCart) onNavigateToCart();
    setIsMenuOpen(false);
    setOpenDropdown(null);
  };

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupKey)
        ? prev.filter((g) => g !== groupKey)
        : [...prev, groupKey],
    );
  };

  // Close dropdowns on outside click and Escape
  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenDropdown(null);
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (currentPage !== "main") return;

    const handleScroll = () => {
      const sections = dropdownGroups.flatMap((group) =>
        group.items
          .filter((item) => item.kind === "section")
          .map((item) => (item as { id: string }).id),
      );
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
  }, [currentPage, dropdownGroups]);

  const isSubPage =
    currentPage === "artist" ||
    currentPage === "metatheatre" ||
    currentPage === "shop" ||
    currentPage === "cart" ||
    currentPage === "checkout" ||
    currentPage === "success" ||
    currentPage === "orderlookup" ||
    currentPage === "admin";

  const renderItemAction = (item: NavItem) => {
    if (item.kind === "section") return () => scrollToSection(item.id);
    if (item.kind === "external") return () => handleExternalClick(item.url);
    return () => handlePageClick(item.page);
  };

  return (
    <nav className="nav-sticky" ref={navRef}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-20 min-w-0">
          {/* Brand mark — pixel-art shell mascot beside the wordmark */}
          <div className="flex items-center gap-3 flex-shrink-0 min-w-0">
            <img
              src="/assets/images/nak-shell.png"
              alt="NAK STRATS shell mascot"
              className="pixel-art h-10 w-10 object-contain"
              style={{ height: "2.5rem", width: "2.5rem" }}
            />
            <button
              type="button"
              className="text-xl font-semibold text-white cursor-pointer hover:text-purple-300 transition-colors duration-300 bg-transparent border-0 p-0 whitespace-nowrap"
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

          {/* Wide Screen Navigation — dropdown groups + cart + admin */}
          {isWideScreen && (
            <div className="flex items-center justify-end gap-0.5 min-w-0">
              {currentPage === "main" &&
                dropdownGroups.map((group) => {
                  const isOpen = openDropdown === group.key;
                  return (
                    <div key={group.key} className="relative z-50">
                      <button
                        type="button"
                        className="nav-item"
                        aria-expanded={isOpen}
                        aria-haspopup="true"
                        onClick={() =>
                          setOpenDropdown(isOpen ? null : group.key)
                        }
                      >
                        <span>{group.label}</span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform duration-200 ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {isOpen && (
                        <div className="nav-dropdown">
                          {group.items.map((item) => {
                            const IconComponent = item.icon;
                            const isActive =
                              item.kind === "section" &&
                              activeSection === item.id;
                            return (
                              <button
                                type="button"
                                key={item.key}
                                onClick={renderItemAction(item)}
                                className={`nav-dropdown-item flex items-center gap-2.5 ${
                                  isActive ? "text-white" : ""
                                }`}
                              >
                                <IconComponent className="w-4 h-4 opacity-70" />
                                <span className="flex-1">{item.label}</span>
                                {item.kind === "external" && (
                                  <ExternalLink className="w-3 h-3 opacity-60" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

              {/* Cart button with live pink badge */}
              <button
                type="button"
                onClick={handleCartClick}
                className="nav-item relative"
                aria-label={`Cart, ${itemCount} item${itemCount === 1 ? "" : "s"}`}
              >
                <ShoppingCart className="w-4 h-4" />
                <span className="hidden xl:inline">Cart</span>
                {itemCount > 0 && (
                  <span className="cart-badge">{itemCount}</span>
                )}
              </button>
            </div>
          )}

          {/* Mobile Menu Button */}
          {!isWideScreen && (
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:flex p-2.5 rounded-xl bg-white/5 text-white hover:bg-white/10 transition-all duration-300 border border-white/10"
              aria-expanded={isMenuOpen}
              aria-label="Toggle navigation menu"
            >
              {isMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          )}
        </div>

        {/* Collapsible Mobile/Tablet Navigation Menu */}
        {isMenuOpen && (
          <div className="nav-mobile-menu">
            <div className="px-4 py-6 space-y-2">
              {isSubPage && (
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
                  {dropdownGroups.map((group) => (
                    <div key={group.key} className="space-y-1">
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.key)}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium transition-all duration-300 text-gray-400 hover:text-white hover:bg-white/5 text-sm"
                        style={{ fontFamily: "var(--font-body)" }}
                        aria-expanded={expandedGroups.includes(group.key)}
                      >
                        <span>{group.label}</span>
                        {expandedGroups.includes(group.key) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>

                      {expandedGroups.includes(group.key) && (
                        <div className="ml-4 space-y-1">
                          {group.items.map((item) => {
                            const IconComponent = item.icon;
                            const isActive =
                              item.kind === "section" &&
                              activeSection === item.id;
                            return (
                              <button
                                type="button"
                                key={item.key}
                                onClick={renderItemAction(item)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-300 text-sm ${
                                  isActive
                                    ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white border border-purple-500/30"
                                    : "text-gray-300 hover:text-white hover:bg-white/5"
                                }`}
                                style={{ fontFamily: "var(--font-body)" }}
                              >
                                <IconComponent className="w-4 h-4" />
                                <span className="flex-1">{item.label}</span>
                                {item.kind === "external" && (
                                  <ExternalLink className="w-3 h-3 opacity-60" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="pt-4 border-t border-white/10 space-y-1">
                    <button
                      type="button"
                      onClick={handleCartClick}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-300 text-gray-300 hover:text-white hover:bg-white/5 text-sm"
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span className="flex-1">Cart</span>
                      {itemCount > 0 && (
                        <span className="cart-badge relative static">
                          {itemCount}
                        </span>
                      )}
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
