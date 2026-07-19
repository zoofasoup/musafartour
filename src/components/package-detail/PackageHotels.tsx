import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Footprints, Hotel, Star, ImageIcon, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn, getOptimizedImageUrl } from "@/lib/utils";
import { ImageLightbox } from "@/components/ImageLightbox";
import { LazyImage } from "@/components/ui/lazy-image";
import type { PublishedPackage } from "@/hooks/usePackages";
import type { PackageHotels as PackageHotelsType } from "@/lib/packageSchema";

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex gap-0.5">
    {[...Array(rating)].map((_, i) => (
      <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
    ))}
  </div>
);

interface HotelPhotoRow {
  name: string;
  exterior_photo: string | null;
  lobby_photo: string | null;
  room_photo: string | null;
  google_maps_url: string | null;
}

function useHotelPhotoLookup() {
  const { data } = useQuery({
    queryKey: ["hotel-photos-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hotels")
        .select("name, exterior_photo, lobby_photo, room_photo, google_maps_url");
      if (error) throw error;
      return (data || []) as HotelPhotoRow[];
    },
    staleTime: 10 * 60 * 1000,
  });

  return useMemo(() => {
    const map = new Map<string, HotelPhotoRow>();
    (data || []).forEach((row) => map.set(row.name.trim().toLowerCase(), row));
    return map;
  }, [data]);
}

/** One photo on screen at a time, swipeable - not a row of small thumbnails. */
function HotelPhotoCarousel({ photos, onOpen }: { photos: { label: string; url: string }[]; onOpen: (index: number) => void }) {
  const [active, setActive] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);

  if (photos.length === 0) return null;

  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setActive(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <div className="space-y-1.5">
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory rounded-xl [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {photos.map((photo, i) => (
          <button
            key={photo.label}
            type="button"
            onClick={() => onOpen(i)}
            className="relative h-56 sm:h-64 lg:h-72 w-full shrink-0 snap-start overflow-hidden rounded-xl border bg-muted"
          >
            <LazyImage
              src={getOptimizedImageUrl(photo.url, 500)}
              alt={photo.label}
              loading="lazy"
              className="h-full w-full object-cover"
            />
            <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
              {photo.label}
            </span>
          </button>
        ))}
      </div>
      {photos.length > 1 && (
        <div className="flex justify-center gap-1">
          {photos.map((_, i) => (
            <div
              key={i}
              className={cn("h-1.5 rounded-full transition-all", i === active ? "w-4 bg-primary" : "w-1.5 bg-border")}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface PackageHotelsProps {
  packageData: PublishedPackage;
  hotels: PackageHotelsType | null;
}

export function PackageHotels({ packageData, hotels }: PackageHotelsProps) {
  const photoLookup = useHotelPhotoLookup();
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);

  if (!hotels || (!hotels.makkah.name && !hotels.madinah.name)) return null;

  const getPhotos = (name: string | undefined) => {
    if (!name) return [];
    const row = photoLookup.get(name.trim().toLowerCase());
    if (!row) return [];
    return [
      { label: "Eksterior", url: row.exterior_photo },
      { label: "Lobby", url: row.lobby_photo },
      { label: "Kamar", url: row.room_photo },
    ].filter((p): p is { label: string; url: string } => !!p.url);
  };

  const getMapsUrl = (name: string | undefined) => {
    if (!name) return null;
    return photoLookup.get(name.trim().toLowerCase())?.google_maps_url || null;
  };

  const makkahPhotos = getPhotos(hotels.makkah.name);
  const madinahPhotos = getPhotos(hotels.madinah.name);
  const makkahMapsUrl = getMapsUrl(hotels.makkah.name);
  const madinahMapsUrl = getMapsUrl(hotels.madinah.name);

  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="text-sm font-bold text-muted-foreground uppercase mb-4">
          Akomodasi
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hotels.makkah.name && (
            <div className="p-4 rounded-xl bg-muted/30 border space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold uppercase text-muted-foreground">
                    Makkah
                  </span>
                  {packageData.nights_makkah && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {packageData.nights_makkah} Malam
                    </Badge>
                  )}
                </div>
                {hotels.makkah.star ? <StarRating rating={hotels.makkah.star} /> : null}
              </div>
              <p className="font-semibold text-sm">{hotels.makkah.name}</p>
              {(hotels.makkah.distance || hotels.makkah.walk) && (
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {hotels.makkah.distance && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {hotels.makkah.distance}
                    </span>
                  )}
                  {hotels.makkah.walk && (
                    <span className="inline-flex items-center gap-1">
                      <Footprints className="h-3 w-3" /> {hotels.makkah.walk}
                    </span>
                  )}
                </div>
              )}
              {makkahPhotos.length > 0 ? (
                <HotelPhotoCarousel
                  photos={makkahPhotos}
                  onOpen={(index) => setLightbox({ images: makkahPhotos.map((p) => p.url), index })}
                />
              ) : (
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
                  <ImageIcon className="h-3 w-3" /> Foto belum tersedia
                </div>
              )}
              {makkahMapsUrl && (
                <a
                  href={makkahMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" /> Lihat di Google Maps
                </a>
              )}
            </div>
          )}

          {hotels.madinah.name && (
            <div className="p-4 rounded-xl bg-muted/30 border space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold uppercase text-muted-foreground">
                    Madinah
                  </span>
                  {packageData.nights_madinah && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {packageData.nights_madinah} Malam
                    </Badge>
                  )}
                </div>
                {hotels.madinah.star ? <StarRating rating={hotels.madinah.star} /> : null}
              </div>
              <p className="font-semibold text-sm">{hotels.madinah.name}</p>
              {(hotels.madinah.distance || hotels.madinah.walk) && (
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {hotels.madinah.distance && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {hotels.madinah.distance}
                    </span>
                  )}
                  {hotels.madinah.walk && (
                    <span className="inline-flex items-center gap-1">
                      <Footprints className="h-3 w-3" /> {hotels.madinah.walk}
                    </span>
                  )}
                </div>
              )}
              {madinahPhotos.length > 0 ? (
                <HotelPhotoCarousel
                  photos={madinahPhotos}
                  onOpen={(index) => setLightbox({ images: madinahPhotos.map((p) => p.url), index })}
                />
              ) : (
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
                  <ImageIcon className="h-3 w-3" /> Foto belum tersedia
                </div>
              )}
              {madinahMapsUrl && (
                <a
                  href={madinahMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" /> Lihat di Google Maps
                </a>
              )}
            </div>
          )}

          {packageData.hotel_extra && packageData.hotel_extra !== "-" && packageData.nights_extra && (
            <div className="p-4 rounded-xl bg-muted/30 border space-y-2">
              <div className="flex items-center gap-2">
                <Hotel className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold uppercase text-muted-foreground">
                  Transit / Ekstra
                </span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {packageData.nights_extra} Malam
                </Badge>
              </div>
              <p className="font-semibold text-sm">{packageData.hotel_extra}</p>
            </div>
          )}
        </div>
      </CardContent>

      {lightbox && (
        <ImageLightbox
          images={lightbox.images.map((url) => getOptimizedImageUrl(url, 1600))}
          currentIndex={lightbox.index}
          isOpen={true}
          onClose={() => setLightbox(null)}
          onPrevious={() => setLightbox((prev) => prev && { ...prev, index: Math.max(0, prev.index - 1) })}
          onNext={() => setLightbox((prev) => prev && { ...prev, index: Math.min(prev.images.length - 1, prev.index + 1) })}
        />
      )}
    </Card>
  );
}
