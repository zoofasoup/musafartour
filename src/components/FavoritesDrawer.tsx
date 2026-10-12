import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import "@/styles/pkg-v2.css";
import { ShoppingBag, Trash2, X } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import { Link } from "react-router-dom";
import React, { useState } from "react";
import { LazyImage } from "@/components/ui/lazy-image";
import { redirectToWhatsApp } from "@/lib/chatRedirect";

interface FavoritesDrawerProps {
  children: React.ReactNode;
}

export const FavoritesDrawer = ({ children }: FavoritesDrawerProps) => {
  const { favorites, removeFavorite } = useFavorites();
  const handleWhatsAppSubmit = () => {
    let message = "Assalamu'alaikum Musafar Tour, Saya tertarik dengan paket Umroh berikut yang saya simpan dari website:\n";
    favorites.forEach((pkg, index) => {
      const dateText = pkg.date ? ` (${pkg.date}) ` : ' ';
      message += `${index + 1}. *${pkg.title}*${dateText}Harga: ${pkg.price}\n`;
    });
    message += "Mohon informasi lebih lanjut mengenai ketersediaan dan detail paket tersebut. Terima kasih.";
    redirectToWhatsApp(message, "cart_drawer");
  };

  return (
    <Sheet modal={false}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent
        side="right"
        className="pkg-v2 pkg-float w-full max-w-none border-0 bg-transparent p-0 shadow-none sm:max-w-md [&>button]:hidden"
        style={{ top: "4rem", height: "calc(100dvh - 4rem)" }}
      >
        <div data-pkg-tone="cream" className="pkg-panel pkg-panel-drawer">
          <SheetHeader className="flex-row items-center justify-between space-y-0 px-6 pb-5">
            <SheetTitle className="flex min-w-0 items-center gap-3 text-left">
              <span className="pkg-sub">Paket Umrohku</span>
              <span className="pkg-glass pkg-label inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2.5">{favorites.length}</span>
            </SheetTitle>
            <SheetClose asChild>
              <button type="button" aria-label="Tutup" className="pkg-press pkg-glass flex h-11 w-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </SheetClose>
          </SheetHeader>

          <div className="flex-1 space-y-3 overflow-y-auto px-6 pb-5">
            {favorites.length === 0 ? (
              <div className="flex flex-col items-center px-4 py-16 text-center">
                <span className="pkg-glass flex h-16 w-16 items-center justify-center rounded-full">
                  <ShoppingBag className="h-7 w-7" aria-hidden />
                </span>
                <p className="pkg-sub mt-6 !text-[24px]">Belum ada paket</p>
                <p className="pkg-label mt-2 text-pkg-fg-2">Ketuk ikon keranjang di paket untuk menyimpannya di sini.</p>
              </div>
            ) : (
              favorites.map((pkg) => {
                const urlParam = pkg.slug || pkg.id;
                return (
                  <article key={pkg.id} className="pkg-card relative flex items-center gap-3 rounded-[28px] p-3">
                    <LazyImage
                      src={pkg.image}
                      alt=""
                      className="h-20 w-20 shrink-0 rounded-[18px] object-cover object-top"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[15px] font-medium leading-tight">
                        {urlParam ? (
                          <Link to={`/paket-umroh/${urlParam}`} className="after:absolute after:inset-0 after:rounded-[28px] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-pkg-ink">
                            {pkg.title}
                          </Link>
                        ) : (
                          pkg.title
                        )}
                      </h3>
                      {pkg.date && <p className="mt-1 text-[13px] font-normal text-pkg-fg-3">{pkg.date}</p>}
                      <p className="mt-1.5 text-[20px] font-normal leading-none tracking-[-0.02em]">{pkg.price}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFavorite(pkg.id)}
                      className="pkg-press pkg-glass relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink"
                      aria-label={`Hapus ${pkg.title} dari keranjang`}
                    >
                      <Trash2 className="h-5 w-5 text-pkg-red-deep" aria-hidden />
                    </button>
                  </article>
                );
              })
            )}
          </div>

          {favorites.length > 0 && (
            <div className="border-t border-pkg-hair px-6 pb-[max(20px,env(safe-area-inset-bottom))] pt-4">
              <button
                type="button"
                className="pkg-press pkg-glass-red inline-flex h-14 w-full items-center justify-center gap-2 rounded-full text-[17px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink focus-visible:ring-offset-2"
                onClick={handleWhatsAppSubmit}
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                Konsultasi {favorites.length} paket
              </button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
