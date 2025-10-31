import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, ChevronDown } from "lucide-react";
import musafarLogoLight from "@/assets/musafar-logo.svg";
import musafarLogoDark from "@/assets/musafar-logo-dark.svg";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DarkModeToggle } from "./DarkModeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  useEffect(() => {
    // Check initial dark mode
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
    };

    checkDarkMode();

    // Watch for theme changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    // Handle scroll for floating navbar on homepage
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };

    if (isHomePage) {
      window.addEventListener('scroll', handleScroll);
    }

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isHomePage]);

  const isActive = (path: string) => location.pathname === path;

  const navClasses = isHomePage && isScrolled
    ? "fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-background/80 backdrop-blur-md border rounded-full shadow-lg max-w-6xl w-[95%] transition-all duration-300"
    : "sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b";

  return (
    <nav className={navClasses}>
      <div className="container mx-auto px-4">
        <div className="flex justify-center items-center h-16 relative">
          <Link to="/" className="absolute left-0 flex items-center">
            <img 
              src={isDarkMode ? musafarLogoLight : musafarLogoDark} 
              alt="Musafar Tour" 
              className="h-10" 
            />
          </Link>

          {/* Theme Controls */}
          <div className="absolute right-12 md:right-0 flex items-center gap-2">
            <LanguageSwitcher />
            <DarkModeToggle />
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              to="/"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                isActive("/") ? "text-primary" : "text-foreground"
              }`}
            >
              Beranda
            </Link>
            <Link
              to="/paket-umroh"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                isActive("/paket-umroh") ? "text-primary" : "text-foreground"
              }`}
            >
              Paket Umroh
            </Link>
            <Link
              to="/haji-khusus"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                isActive("/haji-khusus") ? "text-primary" : "text-foreground"
              }`}
            >
              Haji Khusus
            </Link>
            <Link
              to="/wisata-halal"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                isActive("/wisata-halal") ? "text-primary" : "text-foreground"
              }`}
            >
              Wisata Halal
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-sm font-medium">
                  Info Lainnya <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to="/tentang-kami" className="w-full cursor-pointer">
                    Tentang Kami
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/galeri" className="w-full cursor-pointer">
                    Galeri Jamaah
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/artikel" className="w-full cursor-pointer">
                    Artikel & Tips
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/kontak" className="w-full cursor-pointer">
                    Kontak Kami
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden py-4 space-y-2 border-t">
            <Link
              to="/"
              className="block py-2 text-sm font-medium hover:text-primary"
              onClick={() => setIsOpen(false)}
            >
              Beranda
            </Link>
            <Link
              to="/paket-umroh"
              className="block py-2 text-sm font-medium hover:text-primary"
              onClick={() => setIsOpen(false)}
            >
              Paket Umroh
            </Link>
            <Link
              to="/haji-khusus"
              className="block py-2 text-sm font-medium hover:text-primary"
              onClick={() => setIsOpen(false)}
            >
              Haji Khusus
            </Link>
            <Link
              to="/wisata-halal"
              className="block py-2 text-sm font-medium hover:text-primary"
              onClick={() => setIsOpen(false)}
            >
              Wisata Halal
            </Link>
            <div className="border-t pt-2 mt-2">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Info Lainnya</p>
              <Link
                to="/tentang-kami"
                className="block py-2 pl-4 text-sm hover:text-primary"
                onClick={() => setIsOpen(false)}
              >
                Tentang Kami
              </Link>
              <Link
                to="/galeri"
                className="block py-2 pl-4 text-sm hover:text-primary"
                onClick={() => setIsOpen(false)}
              >
                Galeri Jamaah
              </Link>
              <Link
                to="/artikel"
                className="block py-2 pl-4 text-sm hover:text-primary"
                onClick={() => setIsOpen(false)}
              >
                Artikel & Tips
              </Link>
              <Link
                to="/kontak"
                className="block py-2 pl-4 text-sm hover:text-primary"
                onClick={() => setIsOpen(false)}
              >
                Kontak Kami
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
