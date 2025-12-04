import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ShoppingBag, X, Heart } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import { useNavigate } from "react-router-dom";

interface FavoritesDrawerProps {
  children: React.ReactNode;
}

export const FavoritesDrawer = ({ children }: FavoritesDrawerProps) => {
  const { favorites, removeFavorite } = useFavorites();
  const navigate = useNavigate();

  const handleNavigate = (slug?: string, id?: string) => {
    const urlParam = slug || id;
    if (urlParam) {
      navigate(`/paket-umroh/${urlParam}`);
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 fill-primary text-primary" />
            Paket Tersimpan ({favorites.length})
          </SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-4 overflow-y-auto max-h-[calc(100vh-120px)]">
          {favorites.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Belum ada paket tersimpan</p>
              <p className="text-sm text-muted-foreground mt-1">
                Klik ikon hati pada paket untuk menyimpan
              </p>
            </div>
          ) : (
            favorites.map((pkg) => (
              <div 
                key={pkg.id} 
                className="flex gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => handleNavigate(pkg.slug, pkg.id)}
              >
                <img 
                  src={pkg.image} 
                  alt={pkg.title}
                  className="w-20 h-20 object-cover rounded-md flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm line-clamp-2">{pkg.title}</h4>
                  <p className="text-primary font-semibold text-sm mt-1">{pkg.price}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFavorite(pkg.id);
                  }}
                  className="p-1 hover:bg-destructive/10 rounded-full transition-colors self-start"
                  aria-label="Hapus dari favorit"
                >
                  <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
