import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from '@/hooks/use-toast';

interface FavoritePackage {
  id: string;
  slug?: string;
  title: string;
  image: string;
  price: string;
}

interface FavoritesContextType {
  favorites: FavoritePackage[];
  addFavorite: (pkg: FavoritePackage) => void;
  removeFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (pkg: FavoritePackage) => void;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const FavoritesProvider = ({ children }: { children: ReactNode }) => {
  const [favorites, setFavorites] = useState<FavoritePackage[]>(() => {
    const stored = localStorage.getItem('favoritePackages');
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem('favoritePackages', JSON.stringify(favorites));
  }, [favorites]);

  const addFavorite = (pkg: FavoritePackage) => {
    setFavorites(prev => [...prev, pkg]);
    toast({
      title: "Ditambahkan ke favorit",
      description: pkg.title,
    });
  };

  const removeFavorite = (id: string) => {
    const pkg = favorites.find(p => p.id === id);
    setFavorites(prev => prev.filter(p => p.id !== id));
    if (pkg) {
      toast({
        title: "Dihapus dari favorit",
        description: pkg.title,
        variant: "destructive",
      });
    }
  };

  const isFavorite = (id: string) => {
    return favorites.some(p => p.id === id);
  };

  const toggleFavorite = (pkg: FavoritePackage) => {
    if (isFavorite(pkg.id)) {
      removeFavorite(pkg.id);
    } else {
      addFavorite(pkg);
    }
  };

  return (
    <FavoritesContext.Provider value={{ favorites, addFavorite, removeFavorite, isFavorite, toggleFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};
