import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn, isPackageUnavailable, getOptimizedImageUrl } from "@/lib/utils";
import { ImageLightbox } from "@/components/ImageLightbox";
import { LazyImage } from "@/components/ui/lazy-image";
import type { PublishedPackage } from "@/hooks/usePackages";

interface PackageGalleryProps {
  packageData: PublishedPackage;
}

export function PackageGallery({ packageData }: PackageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const allImages = useMemo(() => {
    const raw = [packageData.banner_image, ...(packageData.gallery_images || [])].filter(
      (u): u is string => !!u
    );
    return Array.from(new Set(raw));
  }, [packageData.banner_image, packageData.gallery_images]);

  const unavailable = isPackageUnavailable(packageData);

  if (allImages.length === 0) return null;

  return (
    <div className="space-y-3">
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

      <ImageLightbox
        images={allImages.map((img) => getOptimizedImageUrl(img, 1600))}
        currentIndex={activeIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onPrevious={() => setActiveIndex((i) => Math.max(0, i - 1))}
        onNext={() => setActiveIndex((i) => Math.min(allImages.length - 1, i + 1))}
      />
    </div>
  );
}
