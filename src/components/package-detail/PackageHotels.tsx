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

const StarRating = ({ rating, bright = false }: { rating: number; bright?: boolean }) => (
  <div className="flex shrink-0 gap-0.5" role="img" aria-label={`Bintang ${rating}`}>
    {[...Array(rating)].map((_, i) => (
      <Star key={i} className={bright ? "h-4 w-4 fill-pkg-red-bright text-pkg-red-bright" : "h-3 w-3 fill-amber-text text-amber-text"} />
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
            <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
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


/** Phone: edge-to-edge swipeable photo with the controls on the photo itself, no boxes around it. */
function HotelSwipe({ photos, mapsUrl, onOpen }: { photos: { label: string; url: string }[]; mapsUrl: string | null; onOpen: (index: number) => void }) {
  const [active, setActive] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);
  return (
    <div className="relative overflow-hidden rounded-2xl bg-muted">
      <div
        ref={scrollerRef}
        onScroll={() => {
          const el = scrollerRef.current;
          if (el) setActive(Math.round(el.scrollLeft / el.clientWidth));
        }}
        className="flex snap-x snap-mandatory overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {photos.map((photo, i) => (
          <button key={photo.label} type="button" onClick={() => onOpen(i)} aria-label={`Perbesar foto ${photo.label}`} className="aspect-[4/3] w-full shrink-0 snap-center">
            <LazyImage src={getOptimizedImageUrl(photo.url, 800)} alt={photo.label} loading="lazy" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
      <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-pkg-ink/60 px-2.5 py-1 text-xs font-semibold text-pkg-cream backdrop-blur-sm">{photos[active]?.label}</span>
      {mapsUrl && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Lihat di Google Maps"
          className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-pkg-cream/90 text-pkg-ink shadow-sm backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
        >
          <MapPin className="h-5 w-5" aria-hidden />
        </a>
      )}
      {photos.length > 1 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5" aria-hidden>
          {photos.map((_, i) => (
            <span key={i} className={cn("h-1.5 rounded-full transition-all", i === active ? "w-5 bg-pkg-cream" : "w-1.5 bg-pkg-cream/60")} />
          ))}
        </div>
      )}
    </div>
  );
}

interface PackageHotelsProps {
  packageData: PublishedPackage;
  hotels: PackageHotelsType | null;
  /** Phone layout: flat, photo-first, big city names. */
  mobile?: boolean;
}

export function PackageHotels({ packageData, hotels, mobile = false }: PackageHotelsProps) {
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

  if (mobile) {
    const entries = [
      { city: "Makkah", hotel: hotels.makkah, nights: packageData.nights_makkah, photos: makkahPhotos, mapsUrl: makkahMapsUrl },
      { city: "Madinah", hotel: hotels.madinah, nights: packageData.nights_madinah, photos: madinahPhotos, mapsUrl: madinahMapsUrl },
    ].filter((e) => !!e.hotel.name);
    const hasExtra = packageData.hotel_extra && packageData.hotel_extra !== "-" && packageData.nights_extra;
    return (
      <section aria-labelledby="hotel-heading">
        <h2 id="hotel-heading" className="pkg-h2">Hotel</h2>
        <div className="mt-8 space-y-12">
          {entries.map(({ city, hotel, nights, photos, mapsUrl }) => (
            <article key={city}>
              <div className="mb-3 flex items-end justify-between gap-3">
                <h3 className="pkg-h2">{city}</h3>
                {nights ? <span className="pkg-glass pkg-label rounded-full px-3 py-1.5">{nights} malam</span> : null}
              </div>
              {photos.length > 0 ? (
                <HotelSwipe photos={photos} mapsUrl={mapsUrl} onOpen={(index) => setLightbox({ images: photos.map((p) => p.url), index })} />
              ) : null}
              <div className={cn("flex items-start justify-between gap-3", photos.length > 0 && "mt-3")}>
                <p className="text-xl font-normal leading-snug tracking-[-0.01em] text-pkg-fg">{hotel.name}</p>
                {hotel.star ? <StarRating rating={hotel.star} bright /> : null}
              </div>
              {(hotel.distance || hotel.walk) && (
                <p className="pkg-label mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-pkg-fg-2">
                  {hotel.distance && <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" aria-hidden /> {hotel.distance}</span>}
                  {hotel.walk && <span className="inline-flex items-center gap-1.5"><Footprints className="h-4 w-4" aria-hidden /> {hotel.walk}</span>}
                </p>
              )}
            </article>
          ))}
          {hasExtra ? (
            <p className="pkg-label text-pkg-fg-2">
              <span className="text-pkg-fg">Transit / ekstra:</span> {packageData.hotel_extra} · {packageData.nights_extra} malam
            </p>
          ) : null}
        </div>
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
      </section>
    );
  }

  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="text-sm font-bold text-muted-foreground uppercase mb-4">
          Hotel
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
                    <Badge variant="outline" className="text-xs px-1.5 py-0">
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
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
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
                    <Badge variant="outline" className="text-xs px-1.5 py-0">
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
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
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
                <Badge variant="outline" className="text-xs px-1.5 py-0">
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
