import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, MessageCircle, ShoppingCart } from "lucide-react";
import musafarLogoLight from "@/assets/musafar-logo.svg";
import musafarLogoDark from "@/assets/musafar-logo-dark.svg";
import { FavoritesDrawer } from "./FavoritesDrawer";
import { useFavorites } from "@/hooks/useFavorites";

const navLinks = [
  { href: "/paket-umroh", label: "Paket Umroh" },
  { href: "/galeri", label: "Galeri" },
  { href: "/artikel", label: "Artikel" },
  { href: "/tentang-kami", label: "Tentang Kami" },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const location = useLocation();
  const { favorites } = useFavorites();

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

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const navbarContent = (
    <nav className="fixed top-0 left-0 right-0 z-[100] w-full bg-background/95 backdrop-blur-sm border-b transition-all duration-300">
      <div className="container mx-auto px-6 md:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            {/* Dynamic color logo using CSS mask */}
            <div 
              className={`h-8 w-32 md:h-10 md:w-40 bg-current transition-colors duration-300 [mask-image:url('/logo.webp')] [mask-size:contain] [mask-repeat:no-repeat] [mask-position:left] [-webkit-mask-image:url('/logo.webp')] [-webkit-mask-size:contain] [-webkit-mask-repeat:no-repeat] [-webkit-mask-position:left] ${
                isDarkMode ? "text-white" : "text-foreground"
              }`}
              aria-label="Musafar Tour"
            />
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive(link.href) ? "text-primary" : "text-foreground"
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
                  <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {favorites.length}
                  </span>
                )}
              </button>
            </FavoritesDrawer>

            <Link to="/kontak">
              <Button 
                className="relative overflow-hidden group bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5 animate-pulse-subtle"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Konsultasi
                </span>
                <span className="absolute inset-0 bg-gradient-to-r from-primary via-primary-foreground/20 to-primary bg-[length:200%_100%] animate-shimmer opacity-0 group-hover:opacity-100 transition-opacity" />
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <FavoritesDrawer>
              <button id="tour-navbar-cart-mobile" className="relative p-2 rounded-full hover:bg-accent transition-colors">
                <ShoppingCart className={`h-5 w-5 ${favorites.length > 0 ? 'fill-primary text-primary' : ''}`} />
                {favorites.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {favorites.length}
                  </span>
                )}
              </button>
            </FavoritesDrawer>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 text-foreground"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Content */}
        {isOpen && (
          <div className="md:hidden py-4 border-t animate-fade-in space-y-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setIsOpen(false)}
                className={`block py-2 text-sm font-medium transition-colors hover:text-primary ${
                  isActive(link.href) ? "text-primary" : "text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-4 border-t mt-4">
              <Link to="/kontak" onClick={() => setIsOpen(false)}>
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Konsultasi Gratis
                </Button>
              </Link>
            </div>
          </div>
        )}
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

  return (
    <>
      {/* Spacer to prevent layout shifting since navbar is now fixed */}
      <div className="h-16 w-full bg-transparent" />
      {mounted && createPortal(navbarContent, document.body)}
    </>
  );
};

export default Navbar;
