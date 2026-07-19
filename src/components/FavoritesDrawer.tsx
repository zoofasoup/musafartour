import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Trash2, MessageCircle, ShoppingCart } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import { useNavigate } from "react-router-dom";
import React, { useState } from "react";
import { LazyImage } from "@/components/ui/lazy-image";
import { getPriceBadgeStyle } from "@/lib/utils";
import { redirectToWhatsApp } from "@/lib/chatRedirect";

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

  const handleWhatsAppSubmit = () => {
    let message = "Assalamu'alaikum Musafar Tour, Saya tertarik dengan paket Umroh berikut yang saya simpan dari website:\n";
    favorites.forEach((pkg, index) => {
      const dateText = pkg.date ? ` (${pkg.date}) ` : ' ';
      message += `${index + 1}. *${pkg.title}*${dateText}Harga: ${pkg.price}\n`;
    });
    message += "Mohon informasi lebih lanjut mengenai ketersediaan dan detail paket tersebut. Terima kasih.";
    redirectToWhatsApp(message);
  };

  return (
    <Sheet modal={false}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent 
        className="w-full sm:max-w-md flex flex-col bg-slate-50/80 backdrop-blur-xl"
        style={{ top: '64px', height: 'calc(100vh - 64px)' }}
      >
        <SheetHeader className="mb-2">
          <SheetTitle className="flex items-center gap-2.5 text-2xl md:text-3xl font-extrabold tracking-tight">
            <ShoppingCart className="h-7 w-7 fill-primary text-primary shrink-0" />
            <span className="flex items-baseline gap-2">
              Paket Umrohku
              <span className="text-muted-foreground text-lg md:text-xl font-semibold">({favorites.length})</span>
            </span>
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4 flex flex-col gap-3 overflow-y-auto flex-1 pr-1 pb-4">
          {favorites.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
              <p className="font-medium text-foreground">Belum ada paket tersimpan</p>
              <p className="text-sm text-muted-foreground mt-1">
                Klik ikon keranjang pada paket untuk menyimpannya di sini.
              </p>
            </div>
          ) : (
            favorites.map((pkg) => (
              <div 
                key={pkg.id} 
                className="flex gap-4 p-4 rounded-3xl bg-card border border-border/60 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:border-rose-400 hover:shadow-md transition-all cursor-pointer group"
                onClick={() => handleNavigate(pkg.slug, pkg.id)}
              >
                <LazyImage 
                  src={pkg.image} 
                  alt={pkg.title}
                  className="w-[84px] h-[84px] object-cover object-top rounded-2xl flex-shrink-0"
                />
                <div className="flex-1 min-w-0 py-1 flex flex-col justify-center items-start">
                  <h4 className="font-semibold text-[15px] leading-tight text-foreground group-hover:text-rose-600 transition-colors pr-2">{pkg.title}</h4>
                  {pkg.date && <p className="text-[13px] text-muted-foreground font-medium mt-1.5">{pkg.date}</p>}
                  <p className={`font-bold text-sm mt-2 px-2.5 py-0.5 rounded-full shadow-sm w-fit ${getPriceBadgeStyle(pkg.title)}`}>{pkg.price}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFavorite(pkg.id);
                  }}
                  className="p-2.5 rounded-full hover:bg-rose-50 transition-colors self-center flex-shrink-0 group/btn"
                  aria-label="Hapus dari favorit"
                >
                  <Trash2 className="h-6 w-6 text-rose-500 group-hover/btn:text-rose-600" />
                </button>
              </div>
            ))
          )}
        </div>

        {favorites.length > 0 && (
          <div className="pt-4 border-t mt-auto">
            <Button 
              className="w-full gap-2 rounded-full font-bold h-11 shadow-md bg-green-600 hover:bg-green-700 text-white"
              onClick={handleWhatsAppSubmit}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
              Konsultasi {favorites.length} Paket
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
