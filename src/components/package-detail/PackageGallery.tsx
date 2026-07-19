import { useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Plane, Heart } from "lucide-react";
import { cn, isPackageUnavailable, getOptimizedImageUrl, getPriceBadgeStyle, formatPriceJuta } from "@/lib/utils";
import { airlineLogos } from "@/lib/airlineLogos";
import { useFavorites } from "@/hooks/useFavorites";
import { ImageLightbox } from "@/components/ImageLightbox";
import { LazyImage } from "@/components/ui/lazy-image";
import type { PublishedPackage } from "@/hooks/usePackages";
import type { PackagePrice } from "@/lib/packageSchema";

interface PackageGalleryProps {
  packageData: PublishedPackage;
  price: PackagePrice | null;
  children?: React.ReactNode;
}

export function PackageGallery({ packageData, price, children }: PackageGalleryProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const allImages = useMemo(() => {
    const raw = [packageData.banner_image, ...(packageData.gallery_images || [])].filter(
      (u): u is string => !!u
    );
    return Array.from(new Set(raw));
  }, [packageData.banner_image, packageData.gallery_images]);

  const isFav = isFavorite(packageData.id);
  const unavailable = isPackageUnavailable(packageData);

  const handleFavoriteClick = () => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 400);
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Gallery */}
      {allImages.length > 0 && (
        <div className="lg:col-span-5 space-y-3 self-start">
          <div
            className="relative rounded-2xl overflow-hidden shadow-lg bg-card border cursor-zoom-in"
            onClick={() => setLightboxOpen(true)}
          >
            <LazyImage
              src={getOptimizedImageUrl(allImages[activeIndex], 900)}
              alt={packageData.package_name}
              className="w-full h-auto object-cover max-h-[700px]"
              loading="eager"
              fetchPriority="high"
            />
            {unavailable && (
              <div className="absolute top-4 left-4 z-10">
                <Badge className="bg-destructive text-destructive-foreground border-0 shadow text-sm px-3 py-1">
                  SOLD OUT
                </Badge>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "absolute top-4 right-4 z-10 rounded-xl backdrop-blur-md bg-white/10 hover:bg-white/20 border border-white/20 shadow-lg",
                isAnimating && "scale-110"
              )}
              onClick={(e) => {
                e.stopPropagation();
                handleFavoriteClick();
              }}
              aria-label={isFav ? "Keluarkan dari favorit" : "Simpan paket"}
            >
              <Heart className={cn("h-5 w-5 transition-all", isFav ? "fill-white text-white" : "text-white")} />
            </Button>
          </div>

          {allImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {allImages.map((img, idx) => (
                <button
                  key={img}
                  onClick={() => setActiveIndex(idx)}
                  className={cn(
                    "shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all",
                    activeIndex === idx ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
                  )}
                >
                  <LazyImage
                    src={getOptimizedImageUrl(img, 160)}
                    alt={`${packageData.package_name} ${idx + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Title / Price / Info */}
      <div className={cn("flex flex-col space-y-6", allImages.length > 0 ? "lg:col-span-7" : "lg:col-span-12")}>
        <div className="space-y-4">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
            {packageData.package_name}
          </h1>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-muted-foreground">Harga mulai dari</span>
            <div className="flex items-center gap-3">
              <span className="text-4xl font-black text-primary tracking-tight">
                {price?.quad ? `Rp ${new Intl.NumberFormat("id-ID").format(price.quad)}` : "Harga belum tersedia"}
              </span>
              <span
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-semibold shrink-0",
                  getPriceBadgeStyle(packageData.package_name)
                )}
              >
                {price?.quad ? formatPriceJuta(price.quad) : ""}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-sm py-1">
              <Clock className="h-4 w-4 mr-1.5" /> {packageData.duration_days} Hari
            </Badge>
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-sm py-1 gap-1.5">
              {airlineLogos[packageData.flight] ? (
                <img src={airlineLogos[packageData.flight]} alt={packageData.flight} className="h-4 object-contain" />
              ) : (
                <Plane className="h-4 w-4" />
              )}
              {packageData.flight}
            </Badge>
            {packageData.makkah_hotel_star && (
              <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-sm py-1">
                Hotel ⭐️ {packageData.makkah_hotel_star}
              </Badge>
            )}
          </div>
        </div>

        {children}
      </div>

      {allImages.length > 0 && (
        <ImageLightbox
          images={allImages.map((img) => getOptimizedImageUrl(img, 1600))}
          currentIndex={activeIndex}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          onPrevious={() => setActiveIndex((i) => Math.max(0, i - 1))}
          onNext={() => setActiveIndex((i) => Math.min(allImages.length - 1, i + 1))}
        />
      )}
    </div>
  );
}
