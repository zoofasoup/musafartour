import { useState } from "react";
import { Button } from "@/components/ui/button";
import { User, Users, ChevronUp, ShoppingCart, Share2 } from "lucide-react";
import { cn, isPackageUnavailable, formatPriceJuta } from "@/lib/utils";
import { useFavorites } from "@/hooks/useFavorites";
import { PackageUrgencyBar } from "./PackageUrgencyBar";
import PackageShareModal from "./PackageShareModal";
import type { PublishedPackage } from "@/hooks/usePackages";
import type { PackagePrice } from "@/lib/packageSchema";

interface PackageCtaButtonsProps {
  packageData: PublishedPackage;
  price: PackagePrice | null;
  onSoloWhatsApp: () => void;
  calculatorExpanded: boolean;
  onToggleCalculator: () => void;
}

/**
 * The action panel below the flyer - modeled on Tokopedia's product page
 * (stock indicator, two big pill CTAs, then a Wishlist/Share row), trimmed
 * to just what applies here: no quantity stepper, no separate "Chat" item
 * since "Berangkat Sendiri" already is the WhatsApp path.
 */
export function PackageCtaButtons({ packageData, price, onSoloWhatsApp, calculatorExpanded, onToggleCalculator }: PackageCtaButtonsProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const [shareOpen, setShareOpen] = useState(false);
  const isFav = isFavorite(packageData.id);

  const handleWishlist = () => {
    toggleFavorite({
      id: packageData.id,
      slug: packageData.slug || undefined,
      title: packageData.package_name,
      image: packageData.banner_image || "",
      price: price?.quad ? formatPriceJuta(price.quad) : "",
      date: packageData.departure_date,
    });
  };

  return (
    <div className="rounded-3xl border border-slate-100/60 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-4 space-y-3">
      {!isPackageUnavailable(packageData) && (
        <PackageUrgencyBar packageData={packageData} className="justify-center" />
      )}

      <div className="space-y-1">
        <Button
          onClick={onSoloWhatsApp}
          className="w-full h-12 rounded-full text-base font-bold gap-2 border-2 border-slate-300 bg-white hover:bg-slate-50 hover:border-slate-400 text-slate-900 shadow-sm"
        >
          <User className="h-4 w-4" /> Berangkat Sendiri
        </Button>
        <p className="text-center text-xs text-muted-foreground">Untuk 1 orang, tanpa rombongan</p>
      </div>

      <div className="space-y-1">
        <Button
          onClick={onToggleCalculator}
          className="w-full h-12 rounded-full text-base font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
        >
          {calculatorExpanded ? <ChevronUp className="h-4 w-4" /> : <Users className="h-4 w-4" />}
          {calculatorExpanded ? "Tutup Kalkulator" : "Hitung Ramai-ramai"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">Untuk 2 orang atau lebih</p>
      </div>

      <div className="flex items-center justify-center pt-1 border-t border-border">
        <button
          type="button"
          onClick={handleWishlist}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ShoppingCart className={cn("h-4 w-4", isFav && "fill-emerald-600 text-emerald-600")} />
          Keranjang
        </button>
        <div className="h-5 w-px bg-border" />
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <Share2 className="h-4 w-4" /> Share
        </button>
      </div>

      <PackageShareModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        package={{
          id: packageData.id,
          package_name: packageData.package_name,
          departure_date: packageData.departure_date,
          duration_days: packageData.duration_days,
          flight: packageData.flight,
          flight_type: packageData.flight_type,
          madinah_hotel_name: packageData.madinah_hotel_name,
          madinah_hotel_star: packageData.madinah_hotel_star,
          makkah_hotel_name: packageData.makkah_hotel_name,
          makkah_hotel_star: packageData.makkah_hotel_star,
          package_price: {
            quad: packageData.package_price?.quad ?? 0,
            triple: packageData.package_price?.triple ?? 0,
            double: packageData.package_price?.double ?? 0,
          },
          hemat_package_price: packageData.hemat_package_price,
          five_star_package_price: packageData.five_star_package_price,
          pelataran_package_price: packageData.pelataran_package_price,
          available_tiers: packageData.available_tiers,
          commission_rate: null,
        }}
        agentCode=""
      />
    </div>
  );
}
