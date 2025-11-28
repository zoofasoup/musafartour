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
  const location = useLocation();

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

    return () => {
      observer.disconnect();
    };
  }, []);

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex justify-center items-center h-16 relative">
          <Link to="/" className="absolute left-0 flex items-center">
            <img 
              src={isDarkMode ? musafarLogoLight : musafarLogoDark} 
              alt="Musafar Tour" 
              className="h-7" 
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
