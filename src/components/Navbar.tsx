import { useState, useEffect, useRef, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, ShoppingCart } from "lucide-react";
import musafarLogoLight from "@/assets/musafar-logo.svg";
import musafarLogoDark from "@/assets/musafar-logo-dark.svg";
import { FavoritesDrawer } from "./FavoritesDrawer";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { redirectToWhatsApp } from "@/lib/chatRedirect";
import "@/styles/pkg-v2.css";
import { useFavorites } from "@/hooks/useFavorites";

const navLinks = [
  { href: "/paket-umroh", label: "Paket Umroh" },
  { href: "/artikel", label: "Artikel" },
  { href: "/galeri", label: "Galeri" },
  { href: "/tentang-kami", label: "Tentang Kami" },
  { href: "/jadi-agen", label: "Jadi Agen" },
  { href: "/cek-status", label: "Cek Status" },
];

// The mobile menu has room for the pages the desktop bar leaves out.
const mobileExtraLinks = [
  { href: "/kontak", label: "Kontak" },
];

const CONSULT_MESSAGE = "Halo Musafar Tour, saya ingin konsultasi tentang paket umroh.";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const location = useLocation();
  const { favorites } = useFavorites();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
    };

    checkDarkMode();

    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  const isActive = (path: string) => location.pathname === path;
  const closeRef = useRef<HTMLButtonElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  // Full-screen menu is modal: focus moves in, Tab stays inside, Escape closes, focus returns to the menu button.
  useEffect(() => {
    if (!isOpen) return;
    const btn = menuBtnRef.current;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
      if (e.key !== "Tab") return;
      const root = document.getElementById("pkg-menu");
      const f = root ? Array.from(root.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")) : [];
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      btn?.focus();
    };
  }, [isOpen]);
  const isHome = location.pathname === "/";
  const isTransparent = isHome && !isScrolled && !isOpen;

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close the mobile menu on navigation, and stop the page behind it from scrolling while open.
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const navbarContent = (
    <nav
      // z-[45]: above page content and the z-40 floating buttons, below dialogs/sheets (z-50),
      // so open overlays properly cover the navbar.
      className={`fixed top-0 left-0 right-0 z-[45] w-full transition-all duration-300 ${isTransparent ? "bg-transparent border-transparent text-white" : "bg-background/95 backdrop-blur-sm border-b text-foreground"}`}
      style={{ willChange: "transform", transform: "translateZ(0)" }}
    >
      <div className="container mx-auto px-6 md:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center" aria-label="Musafar Tour, ke beranda">
            {/* Dynamic color logo using CSS mask (decorative: the link carries the name) */}
            <div 
              aria-hidden="true"
              className={`h-8 w-32 md:h-10 md:w-40 bg-current transition-colors duration-300 [mask-image:url('/logo.webp')] [mask-size:contain] [mask-repeat:no-repeat] [mask-position:left] [-webkit-mask-image:url('/logo.webp')] [-webkit-mask-size:contain] [-webkit-mask-repeat:no-repeat] [-webkit-mask-position:left] ${
                isTransparent ? "text-white" : (isDarkMode ? "text-white" : "text-foreground")
              }`}
            />
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive(link.href) ? "text-primary" : (isTransparent ? "text-white/90 hover:text-white" : "text-foreground")
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop Right Side */}
          <div className="hidden md:flex items-center gap-3">
            {/* Favorites Button */}
            <FavoritesDrawer>
              <button id="tour-navbar-cart" className="relative p-2 rounded-full hover:bg-accent transition-colors" aria-label="Keranjang belanja">
                <ShoppingCart className={`h-5 w-5 ${favorites.length > 0 ? 'fill-primary text-primary' : ''}`} />
                {favorites.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {favorites.length}
                  </span>
                )}
              </button>
            </FavoritesDrawer>

            <Button variant="brand"
              onClick={() => redirectToWhatsApp(CONSULT_MESSAGE, "navbar_konsultasi")}
              className="relative overflow-hidden group bg-brand hover:bg-brand-press text-brand-foreground font-semibold px-5 animate-pulse-subtle"
            >
              <span className="relative z-10 flex items-center gap-2">
                <WhatsAppIcon className="h-4 w-4" />
                Konsultasi
              </span>
              <span className="absolute inset-0 bg-gradient-to-r from-primary via-primary-foreground/20 to-primary bg-[length:200%_100%] animate-shimmer opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <FavoritesDrawer>
              <button id="tour-navbar-cart-mobile" className="relative p-2.5 rounded-full hover:bg-accent transition-colors" aria-label="Keranjang belanja">
                <ShoppingCart className={`h-5 w-5 ${favorites.length > 0 ? 'fill-primary text-primary' : ''}`} />
                {favorites.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {favorites.length}
                  </span>
                )}
              </button>
            </FavoritesDrawer>
            <button
              ref={menuBtnRef}
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 text-foreground"
              aria-label={isOpen ? "Tutup menu" : "Buka menu"}
              aria-expanded={isOpen}
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className={`h-6 w-6 ${isTransparent ? "text-white" : ""}`} />}
            </button>
          </div>
        </div>

      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .animate-shimmer {
          animation: shimmer 2s linear infinite;
        }
        @keyframes pulse-subtle {
          0%, 100% { box-shadow: 0 0 0 0 hsl(var(--primary) / 0.4); }
          50% { box-shadow: 0 0 0 8px hsl(var(--primary) / 0); }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }
      `}</style>
    </nav>
  );

  // Skip link + nav go into #nav-root (index.html, before #root) so they are first in DOM and focus order,
  // while staying outside #root (its `contain: layout` would break position: fixed).
  const skipToMain = (e: MouseEvent<HTMLAnchorElement>) => {
    const main = document.getElementById("main") ?? document.querySelector("main");
    if (!main) return;
    e.preventDefault();
    if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
    (main as HTMLElement).focus({ preventScroll: true });
    main.scrollIntoView();
  };

  const menuOverlay = isOpen
    ? createPortal(
        <div id="pkg-menu" role="dialog" aria-modal="true" aria-label="Menu" className="pkg-v2 pkg-float fixed inset-0 z-[60] animate-fade-in md:hidden">
          <div data-pkg-tone="ink" className="pkg-menu-full">
            <div className="flex h-16 shrink-0 items-center justify-between px-6">
              <Link to="/" onClick={() => setIsOpen(false)} aria-label="Musafar Tour, ke beranda" className="flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-cream">
                <div
                  aria-hidden="true"
                  className="h-8 w-32 bg-pkg-cream [mask-image:url('/logo.webp')] [mask-size:contain] [mask-repeat:no-repeat] [mask-position:left] [-webkit-mask-image:url('/logo.webp')] [-webkit-mask-size:contain] [-webkit-mask-repeat:no-repeat] [-webkit-mask-position:left]"
                />
              </Link>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Tutup menu"
                className="pkg-press pkg-glass flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-cream"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <nav aria-label="Menu utama" className="flex-1 overflow-y-auto px-6 pt-2">
              <ul>
                {[...navLinks, ...mobileExtraLinks].map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      onClick={() => setIsOpen(false)}
                      aria-current={isActive(link.href) ? "page" : undefined}
                      className="flex min-h-[60px] items-center justify-between gap-3 border-b border-pkg-hair text-[28px] font-light tracking-[-0.025em] text-pkg-fg transition-colors hover:text-pkg-fg-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-cream"
                    >
                      {link.label}
                      {isActive(link.href) && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-pkg-red-bright" aria-hidden />}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="shrink-0 px-6 pb-[max(24px,env(safe-area-inset-bottom))] pt-4">
              <button
                type="button"
                onClick={() => { setIsOpen(false); redirectToWhatsApp(CONSULT_MESSAGE, "navbar_konsultasi"); }}
                className="pkg-press pkg-glass-red flex h-14 w-full items-center justify-center gap-2 rounded-full text-[17px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-cream focus-visible:ring-offset-2 focus-visible:ring-offset-pkg-ink"
              >
                <WhatsAppIcon className="h-5 w-5" />
                Konsultasi Gratis
              </button>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      {menuOverlay}
      {/* Spacer to prevent layout shifting since navbar is now fixed */}
      {!isHome && <div className="h-16 w-full bg-transparent" />}
      {mounted &&
        createPortal(
          <>
            <a href="#main" onClick={skipToMain} className="skip-link">
              Lewati ke konten utama
            </a>
            {navbarContent}
          </>,
          document.getElementById("nav-root") ?? document.body
        )}
    </>
  );
};

export default Navbar;
