import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { ArrowRight, Bell, ClipboardList, Heart, Share2, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ImageLightbox } from "@/components/ImageLightbox";
import { LazyImage } from "@/components/ui/lazy-image";
import { useFavorites } from "@/hooks/useFavorites";
import { airlineLogos } from "@/lib/airlineLogos";
import {
  cn,
  formatPriceJuta,
  getOptimizedImageUrl,
  getSlotsTaken,
  getTierAccentClasses,
  isPackageDeparted,
  isPackageUnavailable,
  parseListItems,
} from "@/lib/utils";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import type { PublishedPackage } from "@/hooks/usePackages";
import type { PackagePrice } from "@/lib/packageSchema";
import { AIRLINE_TRANSIT_HUB, AIRPORT_CITY } from "./PackageHeader";
import { ItineraryDialog } from "./ItineraryDialog";
import { PackagePricingBody, type PackagePricingBodyProps } from "./PackagePricing";
import { TIER_LABELS } from "./TierSelector";
import PackageShareModal from "./PackageShareModal";

type RoomKey = "quad" | "triple" | "double";
const ROOMS: { key: RoomKey; label: string }[] = [
  { key: "quad", label: "Quad" },
  { key: "triple", label: "Triple" },
  { key: "double", label: "Double" },
];

const fmtDate = (d: string) => {
  try {
    return format(new Date(d), "d MMM yyyy", { locale: localeId });
  } catch {
    return d;
  }
};
const rupiah = (n: number) => `Rp ${new Intl.NumberFormat("id-ID").format(n)}`;

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

interface PackageMobileViewProps {
  packageData: PublishedPackage;
  price: PackagePrice | null;
  transport?: string;
  onSoloWhatsApp: () => void;
  handleNotifyMe: () => void;
  pricing: PackagePricingBodyProps;
  availableTiers: string[];
  effectiveTier: string;
  onSelectTier: (tier: string) => void;
}

/**
 * Phone layout of the package page: the flyer fills the top and stays put, the buying sheet
 * scrolls up over it. Scroll is the gesture (native momentum, interruptible, nothing to lock),
 * the flyer eases back as the sheet covers it. A bottom bar takes over once the in-sheet CTA is out of view.
 */
export function PackageMobileView({ packageData, price, transport, onSoloWhatsApp, handleNotifyMe, pricing, availableTiers, effectiveTier, onSelectTier }: PackageMobileViewProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const [shareOpen, setShareOpen] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [slide, setSlide] = useState(0);
  const [ctaInView, setCtaInView] = useState(true);
  const [mounted, setMounted] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const flyerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const slidesRef = useRef<HTMLDivElement>(null);

  const unavailable = isPackageUnavailable(packageData);
  const departed = isPackageDeparted(packageData);
  const isFav = isFavorite(packageData.id);

  const images = useMemo(
    () =>
      Array.from(new Set([packageData.banner_image, ...(packageData.gallery_images || [])].filter((u): u is string => !!u))),
    [packageData.banner_image, packageData.gallery_images]
  );

  const availableRooms = ROOMS.filter((r) => !!price?.[r.key]);
  const [room, setRoom] = useState<RoomKey>("quad");
  const activeRoom = availableRooms.find((r) => r.key === room) ?? availableRooms[0];
  const activePrice = activeRoom && price ? price[activeRoom.key] : 0;

  const seatLine = useMemo(() => {
    const total = packageData.slots_total;
    if (unavailable || !total) return null;
    const remaining = Math.max(0, total - getSlotsTaken(packageData));
    const warn = remaining / total <= 0.2;
    return { text: warn ? `Tersisa ${remaining} seat!` : `${remaining} seat tersisa`, warn };
  }, [packageData, unavailable]);

  useEffect(() => setMounted(true), []);

  // The flyer eases back (smaller, dimmer) as the sheet climbs over it. Only transform and opacity, one rAF per frame.
  useEffect(() => {
    if (reducedMotion()) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const stage = stageRef.current;
      const flyer = flyerRef.current;
      if (!stage || !flyer) return;
      const p = Math.min(1, Math.max(0, window.scrollY / Math.max(1, stage.offsetHeight)));
      flyer.style.transform = `translate3d(0, ${-p * 20}px, 0) scale(${1 - p * 0.06})`;
      flyer.style.opacity = String(1 - p * 0.55);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Bottom bar appears once the in-sheet CTA has scrolled out of view.
  useEffect(() => {
    const el = ctaRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setCtaInView(entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, [unavailable, departed]);

  const expandSheet = () => {
    const top = (sheetRef.current?.getBoundingClientRect().top ?? 0) + window.scrollY - 72;
    window.scrollTo({ top, behavior: reducedMotion() ? "auto" : "smooth" });
  };

  const onSlides = () => {
    const el = slidesRef.current;
    if (el) setSlide(Math.round(el.scrollLeft / el.clientWidth));
  };

  const handleWishlist = () =>
    toggleFavorite({
      id: packageData.id,
      slug: packageData.slug || undefined,
      title: packageData.package_name,
      image: packageData.banner_image || "",
      price: activePrice ? formatPriceJuta(activePrice) : "",
      date: packageData.departure_date,
      value: activePrice || undefined,
    });

  const hasTimeframe = packageData.timeframe && packageData.timeframe !== "-";
  const hasRoute = !!(packageData.route && packageData.route !== "-" && packageData.start_airport);
  const routeParts = hasRoute ? packageData.route!.split("-") : null;
  const [arriveAt, departFrom] = routeParts && routeParts.length === 2 ? routeParts : [null, null];
  const isDirect = packageData.flight_type?.toLowerCase() === "direct";
  const via = isDirect ? undefined : AIRLINE_TRANSIT_HUB[packageData.flight];
  const hasItinerary = parseListItems(packageData.itinerary).length > 0;
  const accent = getTierAccentClasses(packageData.package_name);
  const logo = airlineLogos[packageData.flight];

  const leg = (from: string, to: string) => (
    <>
      <span className="font-bold">{from}</span>
      <ArrowRight className="mx-2 inline h-4 w-4 align-[-2px] text-muted-foreground" aria-hidden />
      <span className="sr-only"> ke </span>
      {via && (
        <>
          <span className="font-bold">{via}</span>
          <ArrowRight className="mx-2 inline h-4 w-4 align-[-2px] text-muted-foreground" aria-hidden />
          <span className="sr-only"> ke </span>
        </>
      )}
      <span className="font-bold">{to}</span>
    </>
  );
  const cities = (a: string, b: string) => [AIRPORT_CITY[a], AIRPORT_CITY[b]].filter(Boolean).join(" ke ");

  return (
    <div className="bg-background">
      {/* Flyer: full width, pinned under the navbar while the sheet scrolls over it. */}
      <div
        ref={stageRef}
        className="sticky top-16 z-0 bg-background"
        style={{ height: "max(280px, min(125vw, calc(100svh - 408px)))" }}
      >
        <div ref={flyerRef} className="absolute inset-x-0 top-0 bottom-6 will-change-transform">
          {images.length > 0 ? (
            <div
              ref={slidesRef}
              onScroll={onSlides}
              className="flex h-full snap-x snap-mandatory overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
              {images.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setLightbox(i)}
                  aria-label={`Perbesar gambar ${i + 1} dari ${images.length}`}
                  className="h-full w-full shrink-0 snap-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground"
                >
                  <LazyImage
                    src={getOptimizedImageUrl(src, 900)}
                    alt={i === 0 ? packageData.package_name : `${packageData.package_name} ${i + 1}`}
                    className="h-full w-full object-contain"
                    loading={i === 0 ? "eager" : "lazy"}
                    fetchPriority={i === 0 ? "high" : "auto"}
                  />
                </button>
              ))}
            </div>
          ) : (
            <div className="flex h-full items-end bg-primary p-6 text-primary-foreground">
              <p className="text-4xl font-extrabold leading-none tracking-tight">{packageData.package_name}</p>
            </div>
          )}
        </div>
        {unavailable && (
          <span className="absolute left-4 top-4 rounded-md bg-status-bad-bg px-3 py-1.5 text-sm font-bold text-status-bad-fg">
            {departed ? "Sudah berangkat" : "Penuh"}
          </span>
        )}
        {images.length > 1 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-8 flex justify-center gap-1.5" aria-hidden>
            {images.map((_, i) => (
              <span key={i} className={cn("h-1.5 rounded-full motion-safe:transition-[width,background-color]", i === slide ? "w-5 bg-foreground" : "w-1.5 bg-foreground/30")} />
            ))}
          </div>
        )}
      </div>

      {/* Sheet */}
      <div ref={sheetRef} className="relative z-10 -mt-4 rounded-t-[24px] bg-card px-6 pb-6 shadow-[0_-12px_32px_rgb(var(--shadow-rgb)/0.16)]">
        <button
          type="button"
          onClick={expandSheet}
          aria-label="Lihat rincian paket"
          className="mx-auto flex h-11 w-24 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground rounded-md"
        >
          <span className="h-1 w-9 rounded-full bg-muted-foreground/40" />
        </button>

        <h1 className="text-[28px] font-extrabold leading-[1.1] tracking-[-0.03em] text-foreground">
          {packageData.package_name}
          {hasTimeframe && <span className="block text-muted-foreground">{packageData.timeframe}</span>}
        </h1>

        {seatLine && (
          <p className={cn("mt-3 inline-flex min-h-6 items-center gap-1.5 text-sm font-bold", seatLine.warn ? "text-status-warn-fg" : "text-foreground")}>
            <Users className="h-4 w-4 shrink-0" aria-hidden />
            {seatLine.text}
          </p>
        )}

        {availableTiers.length > 1 && (
          <div role="group" aria-label="Pilih jenis paket" className="mt-4 flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {availableTiers.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={effectiveTier === t}
                onClick={() => onSelectTier(t)}
                className={cn(
                  "h-11 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-1",
                  effectiveTier === t ? "bg-primary text-primary-foreground" : "bg-field text-foreground"
                )}
              >
                {TIER_LABELS[t] || t}
              </button>
            ))}
          </div>
        )}

        <div className="mt-5">
          <p className="text-sm font-medium text-muted-foreground">
            {activeRoom ? `Harga per orang, kamar ${activeRoom.label}` : "Harga"}
          </p>
          <p className="mt-0.5 text-[36px] font-extrabold leading-[1.05] tracking-[-0.035em] text-foreground">
            {activePrice ? rupiah(activePrice) : "Harga belum tersedia"}
          </p>
        </div>

        {availableRooms.length > 1 && (
          <div role="group" aria-label="Pilih tipe kamar" className="mt-4 grid grid-cols-3 gap-1 rounded-xl bg-field p-1">
            {availableRooms.map((r) => (
              <button
                key={r.key}
                type="button"
                aria-pressed={activeRoom?.key === r.key}
                onClick={() => setRoom(r.key)}
                className={cn(
                  "h-11 rounded-lg text-[15px] transition-[background-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-1",
                  activeRoom?.key === r.key ? "bg-card font-bold text-foreground shadow-sm" : "font-medium text-muted-foreground"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}


        {/* Primary action, in the first screen of the sheet */}
        <div ref={ctaRef} className="mt-6 space-y-3">
          {departed ? (
            <>
              <p className="text-center text-sm text-muted-foreground">Rombongan paket ini sudah berangkat.</p>
              <Button variant="brand" asChild className="h-14 w-full text-base font-bold">
                <Link to="/paket-umroh">Lihat paket lainnya</Link>
              </Button>
            </>
          ) : unavailable ? (
            <>
              <Button onClick={handleNotifyMe} variant="outline" className="h-14 w-full gap-2 text-base font-bold">
                <Bell className="h-4 w-4" aria-hidden /> Gabung waitlist
              </Button>
              <p className="text-center text-sm text-muted-foreground">Kami kabari lewat WhatsApp jika ada seat kosong.</p>
            </>
          ) : (
            packageData.slug && (
              <div className="space-y-1.5">
                <Button variant="brand" asChild className="h-14 w-full gap-2 text-base font-bold">
                  <Link to={`/daftar/${packageData.slug}`}>
                    <ClipboardList className="h-5 w-5" aria-hidden /> Daftar Sekarang
                  </Link>
                </Button>
                <p className="text-center text-sm text-muted-foreground">Isi form sekitar 2 menit, tim kami yang menghubungi.</p>
              </div>
            )
          )}
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-x-0 gap-y-5">
          <div className="pr-4">
            <dt className="text-sm text-muted-foreground">Berangkat</dt>
            <dd className="mt-0.5 text-base font-bold text-foreground">{fmtDate(packageData.departure_date)}</dd>
          </div>
          <div className="border-l border-border pl-4">
            <dt className="text-sm text-muted-foreground">Durasi</dt>
            <dd className="mt-0.5 text-base font-bold text-foreground">{packageData.duration_days} hari</dd>
          </div>
          <div className="pr-4">
            <dt className="text-sm text-muted-foreground">Maskapai</dt>
            <dd className="mt-0.5 flex h-6 items-center text-base font-bold text-foreground">
              {logo ? <img src={logo} alt={packageData.flight} className="h-5 object-contain" /> : packageData.flight}
            </dd>
          </div>
          {transport && (
            <div className="border-l border-border pl-4">
              <dt className="text-sm text-muted-foreground">Transportasi</dt>
              <dd className="mt-0.5 text-base font-bold text-foreground">{transport}</dd>
            </div>
          )}
        </dl>

        {!departed && !unavailable && (
          <div className="mt-6 grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
            <Button id="tour-cta-solo" variant="outline" onClick={onSoloWhatsApp} className="h-12 gap-2 whitespace-nowrap px-2 text-sm font-bold">
              <User className="h-4 w-4 shrink-0" aria-hidden /> Berangkat Sendiri
            </Button>
            <Button id="tour-cta-calculator" variant="outline" onClick={() => setCalcOpen(true)} className="h-12 gap-2 whitespace-nowrap px-2 text-sm font-bold">
              <Users className="h-4 w-4 shrink-0" aria-hidden /> Hitung Ramai-ramai
            </Button>
          </div>
        )}

        <div className="mt-4 flex items-center divide-x divide-border border-t border-border pt-1">
          <button
            type="button"
            onClick={handleWishlist}
            aria-pressed={isFav}
            className="flex h-12 flex-1 items-center justify-center gap-2 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
          >
            <Heart className={cn("h-4 w-4", isFav && "fill-brand text-brand")} aria-hidden /> {isFav ? "Tersimpan" : "Simpan"}
          </button>
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="flex h-12 flex-1 items-center justify-center gap-2 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
          >
            <Share2 className="h-4 w-4" aria-hidden /> Bagikan
          </button>
        </div>

        {/* Route */}
        {arriveAt && departFrom && (
          <section aria-labelledby="rute-heading" className="mt-8">
            <h2 id="rute-heading" className="text-lg font-bold text-foreground">Rute penerbangan</h2>
            <dl className="mt-3 divide-y divide-border">
              <div className="py-3">
                <dt className="text-sm text-muted-foreground">Berangkat</dt>
                <dd className="mt-0.5 text-lg">{leg(packageData.start_airport!, arriveAt)}</dd>
                <dd className="text-sm text-muted-foreground">{cities(packageData.start_airport!, arriveAt)}</dd>
              </div>
              <div className="py-3">
                <dt className="text-sm text-muted-foreground">Pulang</dt>
                <dd className="mt-0.5 text-lg">{leg(departFrom, packageData.start_airport!)}</dd>
                <dd className="text-sm text-muted-foreground">{cities(departFrom, packageData.start_airport!)}</dd>
              </div>
            </dl>
          </section>
        )}
        {hasItinerary && (
          <div className="mt-4">
            <ItineraryDialog packageName={packageData.package_name} itinerary={packageData.itinerary} accent={accent} />
          </div>
        )}
      </div>

      {/* Bottom bar: price + the one action, once the sheet CTA has scrolled away */}
      {mounted &&
        createPortal(
          <div
            className={cn(
              "fixed bottom-[var(--consent-h,0px)] left-0 right-0 z-30 border-t border-border bg-card px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgb(var(--shadow-rgb)/0.14)] transition-transform duration-200 ease-out motion-reduce:transition-none",
              ctaInView ? "pointer-events-none translate-y-full" : "translate-y-0"
            )}
            aria-hidden={ctaInView}
          >
            {departed ? (
              <Button variant="brand" asChild className="h-14 w-full text-base font-bold" tabIndex={ctaInView ? -1 : 0}>
                <Link to="/paket-umroh">Sudah berangkat · Lihat paket lainnya</Link>
              </Button>
            ) : unavailable ? (
              <Button onClick={handleNotifyMe} variant="outline" className="h-14 w-full gap-2 text-base font-bold" tabIndex={ctaInView ? -1 : 0}>
                <Bell className="h-4 w-4" aria-hidden /> Gabung waitlist
              </Button>
            ) : (
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <span className="block text-sm text-muted-foreground">Per orang{activeRoom ? `, ${activeRoom.label}` : ""}</span>
                  <span className="block whitespace-nowrap text-[22px] font-extrabold leading-tight tracking-[-0.03em] text-foreground">
                    {activePrice ? rupiah(activePrice) : "Harga belum tersedia"}
                  </span>
                </div>
                {packageData.slug && (
                  <Button variant="brand" asChild className="h-14 shrink-0 px-6 text-base font-bold" tabIndex={ctaInView ? -1 : 0}>
                    <Link to={`/daftar/${packageData.slug}`}>Daftar Sekarang</Link>
                  </Button>
                )}
              </div>
            )}
          </div>,
          document.body
        )}

      <Sheet open={calcOpen} onOpenChange={setCalcOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Kalkulator harga rombongan</SheetTitle>
          </SheetHeader>
          <PackagePricingBody {...pricing} />
        </SheetContent>
      </Sheet>

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
        }}
        agentCode=""
      />

      {lightbox !== null && (
        <ImageLightbox
          images={images.map((img) => getOptimizedImageUrl(img, 1600))}
          currentIndex={lightbox}
          isOpen
          onClose={() => setLightbox(null)}
          onPrevious={() => setLightbox((i) => Math.max(0, (i ?? 0) - 1))}
          onNext={() => setLightbox((i) => Math.min(images.length - 1, (i ?? 0) + 1))}
        />
      )}
    </div>
  );
}
