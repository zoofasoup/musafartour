import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { ArrowRight, Bus, Check, CalendarCheck, CalendarDays, Calculator, ChevronDown, ChevronRight, Clock, Plane, PlaneLanding, PlaneTakeoff, Share2, Users, X } from "lucide-react";
import { PkgCartButton } from "@/components/package-list/PkgCartButton";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { PkgPanel } from "./PkgPanel";
import { usePkgNav } from "@/hooks/usePkgNav";
import { useSwipeDownClose } from "@/hooks/useSwipeDownClose";
import "@/styles/pkg-v2.css";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
import { addDays, format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import type { PublishedPackage } from "@/hooks/usePackages";
import type { PackagePrice } from "@/lib/packageSchema";
import { AIRLINE_TRANSIT_HUB, AIRPORT_CITY } from "./PackageHeader";
import { ImageLightbox } from "@/components/ImageLightbox";
import { ItineraryDialog } from "./ItineraryDialog";
import type { PackagePricingBodyProps } from "./PackagePricing";
import { PkgPricingBody } from "./PkgCalculator";
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
const jt = (n: number) => (n / 1_000_000).toFixed(1).replace(/\.0$/, "");
const rupiah = (n: number) => `Rp ${new Intl.NumberFormat("id-ID").format(n)}`;

const BTN =
  "pkg-press inline-flex items-center justify-center gap-2 rounded-full font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-45";

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

interface PackageMobileViewProps {
  packageData: PublishedPackage;
  price: PackagePrice | null;
  transport?: string;
  onBookWhatsApp: (room?: { label: string; price: number }) => void;
  handleNotifyMe: () => void;
  pricing: PackagePricingBodyProps;
  availableTiers: string[];
  effectiveTier: string;
  onSelectTier: (tier: string) => void;
  /** The panels below the schedule (hotel, inclusions, payment); they continue the same stack. */
  children?: React.ReactNode;
}

/**
 * Phone layout of the package page: the flyer fills the top and stays put, the buying sheet
 * scrolls up over it. Scroll is the gesture (native momentum, interruptible, nothing to lock),
 * the flyer eases back as the sheet covers it. A bottom bar takes over once the in-sheet CTA is out of view.
 */
export function PackageMobileView({ packageData, price, transport, onBookWhatsApp, handleNotifyMe, pricing, availableTiers, effectiveTier, onSelectTier, children }: PackageMobileViewProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const [shareOpen, setShareOpen] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const [calcPanel, setCalcPanel] = useState<HTMLDivElement | null>(null);
  const closeCalc = useCallback(() => setCalcOpen(false), []);
  useSwipeDownClose(calcPanel, closeCalc);
  const [lightbox, setLightbox] = useState<{ index: number; rect: DOMRect | null; ratio: number | null; src: string | null } | null>(null);
  const [slide, setSlide] = useState(0);
  const [ctaInView, setCtaInView] = useState(true);
  const [mounted, setMounted] = useState(false);
  // The scroll-down hint over the flyer shows while the page is at the top. The walkthrough (ProductTour) has its own lock.
  const [onboarding, setOnboarding] = useState(true);
  useEffect(() => {
    const onScroll = () => setOnboarding(window.scrollY < 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
    return { text: warn ? `Tersisa ${remaining} seat!` : `${remaining} seat tersisa`, remaining, warn };
  }, [packageData, unavailable]);

  useEffect(() => setMounted(true), []);

  const rootRef = useRef<HTMLDivElement>(null);
  const firstImage = images[0];
  const sellingPoints = useMemo(
    () => (packageData.selling_points || "").split(/[\n;]+|,(?!\d)/).map((t) => t.replace(/^[\s\-•*]+/, "").trim()).filter(Boolean),
    [packageData.selling_points]
  );
  const lightboxImages = useMemo(() => images.map((u) => getOptimizedImageUrl(u, 1600)), [images]);
  usePkgNav(rootRef, firstImage);

  // Bottom bar appears once the in-sheet CTA has scrolled out of view.
  useEffect(() => {
    const el = ctaRef.current;
    if (!el) return;
    // Fully visible only: a half-cut button must not count as reachable (short phones, browser toolbars).
    const io = new IntersectionObserver(([entry]) => setCtaInView(entry.intersectionRatio >= 0.98), { threshold: [0, 0.98, 1] });
    io.observe(el);
    return () => io.disconnect();
  }, [unavailable, departed]);

  const expandSheet = () => {
    const top = (sheetRef.current?.getBoundingClientRect().top ?? 0) + window.scrollY - 72;
    window.scrollTo({ top, behavior: reducedMotion() ? "auto" : "smooth" });
  };

  const scrollToInfo = () => {
    // Two frames: let the lock release (effect cleanup) before the scroll starts.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const el = document.getElementById("info-paket");
        if (!el) return;
        window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 72, behavior: reducedMotion() ? "auto" : "smooth" });
      })
    );
  };

  const onSlides = () => {
    const el = slidesRef.current;
    if (el) setSlide(Math.round(el.scrollLeft / el.clientWidth));
  };

  const bookWhatsApp = () => onBookWhatsApp(activeRoom && activePrice ? { label: activeRoom.label, price: activePrice } : undefined);

  const handleWishlist = () =>
    toggleFavorite({
      id: packageData.id,
      slug: packageData.slug || undefined,
      title: packageData.package_name,
      image: packageData.banner_image || "",
      price: activePrice ? formatPriceJuta(activePrice) : "",
      date: fmtDate(packageData.departure_date),
      value: activePrice || undefined,
    });

  // Return day = departure + (duration - 1): the stated duration counts both the departure and the arrival day.
  const returnDate = (() => {
    try {
      const d = addDays(new Date(packageData.departure_date), Math.max(0, (packageData.duration_days || 1) - 1));
      return Number.isNaN(d.getTime()) ? null : format(d, "d MMM yyyy", { locale: localeId });
    } catch {
      return null;
    }
  })();
  const depDate = (() => {
    const d = new Date(packageData.departure_date);
    return Number.isNaN(d.getTime()) ? null : d;
  })();
  const retDate = depDate ? addDays(depDate, Math.max(0, (packageData.duration_days || 1) - 1)) : null;
  const dateTiles = [
    ...(depDate ? [{ label: "Berangkat", value: format(depDate, "d"), sub: format(depDate, "MMM yyyy", { locale: localeId }) }] : []),
    ...(retDate ? [{ label: "Pulang", value: format(retDate, "d"), sub: format(retDate, "MMM yyyy", { locale: localeId }) }] : []),
  ];
  const durTile = { label: "Durasi", value: String(packageData.duration_days), sub: "hari" };
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
      <span>{from}</span>
      <ArrowRight className="mx-1 inline h-4 w-4 align-[-2px] text-pkg-fg-3" aria-hidden />
      <span className="sr-only"> ke </span>
      {via && (
        <>
          <span>{via}</span>
          <ArrowRight className="mx-1 inline h-4 w-4 align-[-2px] text-pkg-fg-3" aria-hidden />
          <span className="sr-only"> ke </span>
        </>
      )}
      <span>{to}</span>
    </>
  );
  const cities = (a: string, b: string) => [AIRPORT_CITY[a], AIRPORT_CITY[b]].filter(Boolean).join(" ke ");

  return (
    <div ref={rootRef} className="pkg-v2">
      {/* Flyer: full width, scrolls away normally (a pinned flyer under overlapping panels flickered on iOS). */}
      <div data-pkg-flyer className="relative bg-pkg-ink" style={{ height: "var(--pkg-flyer-h)" }}>
        <div className="absolute inset-0">
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
                  onClick={(e) => {
                    const im = e.currentTarget.querySelector("img");
                    setLightbox({
                      index: i,
                      rect: e.currentTarget.getBoundingClientRect(),
                      ratio: im && im.naturalWidth ? im.naturalWidth / im.naturalHeight : null,
                      src: im?.currentSrc || null,
                    });
                  }}
                  aria-label={`Perbesar gambar ${i + 1} dari ${images.length}`}
                  className="relative h-full w-full shrink-0 snap-center overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pkg-cream"
                >
                  <LazyImage
                    src={getOptimizedImageUrl(src, 900)}
                    alt={i === 0 ? packageData.package_name : `${packageData.package_name} ${i + 1}`}
                    className="h-full w-full object-cover object-top"
                    loading={i === 0 ? "eager" : "lazy"}
                    fetchPriority={i === 0 ? "high" : "auto"}
                  />
                  {/* Same photo, blurred, masked to fade in toward the panel: a plain filter, no backdrop-filter. */}
                  <span className="pkg-slide-blur" aria-hidden>
                    <span>
                      <img src={getOptimizedImageUrl(src, 900)} alt="" decoding="async" />
                    </span>
                    <span>
                      <img src={getOptimizedImageUrl(src, 900)} alt="" decoding="async" />
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex h-full items-end bg-pkg-ink p-6 text-pkg-cream">
              <p className="pkg-title">{packageData.package_name}</p>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={scrollToInfo}
          aria-label="Lihat info paket"
          tabIndex={onboarding ? 0 : -1}
          aria-hidden={!onboarding}
          className={cn(
            "absolute bottom-14 left-1/2 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full pkg-glass-deep transition-opacity duration-[var(--pkg-dur-base)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-cream focus-visible:ring-offset-2 focus-visible:ring-offset-pkg-ink",
            onboarding ? "opacity-100" : "pointer-events-none opacity-0"
          )}
        >
          <ChevronDown className="pkg-hint-arrow h-6 w-6" aria-hidden />
        </button>
        {unavailable && (
          <span className="pkg-label absolute left-4 top-4 rounded-full bg-pkg-cream px-3 py-1.5 text-pkg-red-deep">
            {departed ? "Sudah berangkat" : "Penuh"}
          </span>
        )}
        {images.length > 1 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-12 flex justify-center gap-1.5" aria-hidden>
            {images.map((_, i) => (
              <span key={i} className={cn("h-1.5 rounded-full motion-safe:transition-[width,background-color]", i === slide ? "w-5 bg-pkg-cream" : "w-1.5 bg-pkg-cream/50")} />
            ))}
          </div>
        )}
      </div>

      {/* 1. Title */}
      <PkgPanel tone="cream" first id="info-paket">
        <h1 className="pkg-title text-balance">
          {hasTimeframe && <span className="pkg-label mb-3 block text-pkg-fg-3">{packageData.timeframe}</span>}{" "}
          {packageData.package_name}
        </h1>
        {seatLine && (
          <p
            className={cn(
              "pkg-seat relative mt-6 inline-flex h-11 items-center gap-2 rounded-full pl-4 pr-5 text-[17px] font-medium",
              seatLine.warn ? "pkg-seat-urgent pkg-glass-red" : "pkg-glass-deep"
            )}
          >
            {seatLine.warn && <span className="pkg-seat-ring" aria-hidden />}
            <Users className="relative h-5 w-5" aria-hidden />
            <span className="relative">{seatLine.text}</span>
          </p>
        )}
        {availableTiers.length > 1 && (
          <div role="group" aria-label="Pilih jenis paket" className="-mx-6 -mb-4 mt-2 flex gap-2 overflow-x-auto px-6 py-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {availableTiers.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={effectiveTier === t}
                onClick={() => onSelectTier(t)}
                className={cn(
                  "pkg-press pkg-label h-11 shrink-0 rounded-full px-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink focus-visible:ring-offset-2",
                  effectiveTier === t ? "pkg-glass-deep" : "pkg-glass"
                )}
              >
                {TIER_LABELS[t] || t}
              </button>
            ))}
          </div>
        )}
      </PkgPanel>

      {/* 2. Price and the one action */}
      <PkgPanel tone="red">
        {availableRooms.length > 1 && (
          <div id="tour-rooms" role="group" aria-label="Pilih tipe kamar" className="flex gap-2">
            {availableRooms.map((r) => (
              <button
                key={r.key}
                type="button"
                aria-pressed={activeRoom?.key === r.key}
                onClick={() => setRoom(r.key)}
                className={cn(
                  "pkg-press pkg-label h-11 flex-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-on-red focus-visible:ring-offset-2 focus-visible:ring-offset-pkg-red",
                  activeRoom?.key === r.key ? "pkg-glass-deep" : "pkg-glass"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
        {activePrice ? (
          <>
            <p className="pkg-sub mt-8">Harga per orang</p>
            <p className="mt-2 flex items-end justify-between gap-3 whitespace-nowrap">
              <span className="pkg-price">{jt(activePrice)}</span>
              <span className="pkg-h3 pb-2">jt</span>
            </p>
          </>
        ) : (
          <p className="pkg-h3 mt-7">Harga belum tersedia</p>
        )}

        <div ref={ctaRef} className="mt-8 space-y-2">
          {departed ? (
            <>
              <p className="pkg-label">Sudah berangkat.</p>
              <Link to="/paket-umroh" className={cn(BTN, "pkg-glass-deep h-14 w-full text-[17px] focus-visible:ring-pkg-on-red focus-visible:ring-offset-pkg-red")}>
                Lihat paket lainnya
              </Link>
            </>
          ) : unavailable ? (
            <>
              <button type="button" onClick={handleNotifyMe} className={cn(BTN, "pkg-glass h-14 w-full text-[17px] focus-visible:ring-pkg-on-red focus-visible:ring-offset-pkg-red")}>
                <WhatsAppIcon className="h-5 w-5" /> Gabung waitlist
              </button>
              <p className="pkg-label">Kami kabari via WhatsApp bila ada seat.</p>
            </>
          ) : (
            <div className="flex gap-2">
              <button type="button" onClick={bookWhatsApp} className={cn(BTN, "pkg-glass-deep h-14 min-w-0 flex-1 text-[15px] focus-visible:ring-pkg-on-red focus-visible:ring-offset-pkg-red")}>
                <WhatsAppIcon className="h-5 w-5 shrink-0" /> Tanya / Daftar
              </button>
              <PkgCartButton id="tour-cart" isFav={isFav} onClick={handleWishlist} onRed className="focus-visible:ring-pkg-on-red focus-visible:ring-offset-pkg-red" />
            </div>
          )}
          <div className="flex gap-2">
          {!departed && !unavailable && (
            <button
              id="tour-cta-calculator"
              type="button"
              onClick={() => setCalcOpen(true)}
              className={cn(BTN, "pkg-glass h-16 min-w-0 flex-1 justify-start gap-3 pl-2 pr-5 text-left focus-visible:ring-pkg-on-red focus-visible:ring-offset-pkg-red")}
            >
              <span className="pkg-glass-lit flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
                <Calculator className="h-6 w-6" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="pkg-label block">Kalkulator Jamaah</span>
                <span className="block text-[13px] font-medium leading-tight text-pkg-fg-2">Hitung ramai-ramai</span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0" aria-hidden />
            </button>
          )}
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              aria-label="Bagikan"
              className={cn(BTN, "pkg-glass h-16 shrink-0 focus-visible:ring-pkg-on-red focus-visible:ring-offset-pkg-red", departed || unavailable ? "pkg-label w-full" : "w-16")}
            >
              <Share2 className="h-5 w-5" aria-hidden />
              {(departed || unavailable) && "Bagikan"}
            </button>
          </div>
        </div>
      </PkgPanel>

      {/* Selling points and bonuses, one per line (the admin often saves them as one comma-separated line). */}
      {sellingPoints.length > 0 && (
        <PkgPanel tone="cream-2">
          <section aria-labelledby="keunggulan-heading">
            <h2 id="keunggulan-heading" className="pkg-h2">Keunggulan paket</h2>
            <ul className="mt-6 space-y-4">
              {sellingPoints.map((point) => (
                <li key={point} className="flex items-start gap-3.5">
                  <span className="pkg-glass mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                    <Check className="h-[18px] w-[18px] text-pkg-ok" aria-hidden />
                  </span>
                  <span className="pt-1 text-[17px] leading-[1.4] text-pkg-fg">{point}</span>
                </li>
              ))}
            </ul>
          </section>
        </PkgPanel>
      )}

      {/* 3. Dates, flight, route */}
      <PkgPanel tone="cream">
        <h2 className="pkg-h2">Jadwal</h2>
        <dl className="mt-6 grid grid-cols-3 gap-3">
          <div className="col-span-2 flex gap-4 pkg-tile pkg-glass rounded-[var(--pkg-r-media)] p-4">
            {dateTiles.map((t) => (
              <div key={t.label} className="min-w-0 flex-1">
                <dt className="pkg-caption text-pkg-fg-3">{t.label}</dt>
                <dd className="mt-3">
                  <span className="pkg-stat block">{t.value}</span>
                  <span className="mt-1 block text-[13px] font-medium text-pkg-fg-2">{t.sub}</span>
                </dd>
              </div>
            ))}
          </div>
          <div className="pkg-tile pkg-glass rounded-[var(--pkg-r-media)] p-4">
            <dt className="pkg-caption text-pkg-fg-3">{durTile.label}</dt>
            <dd className="mt-3">
              <span className="pkg-stat block">{durTile.value}</span>
              <span className="mt-1 block text-[13px] font-medium text-pkg-fg-2">{durTile.sub}</span>
            </dd>
          </div>
        </dl>

        <ul className="mt-8 divide-y divide-pkg-hair border-y border-pkg-hair">
          {packageData.flight && (
            <li className="flex min-h-14 items-center justify-between gap-4 py-3">
              <span className="pkg-label text-pkg-fg-3">Maskapai</span>
              {logo ? <img src={logo} alt={packageData.flight} className="h-7 max-w-[55%] object-contain object-right" /> : <span className="pkg-label">{packageData.flight}</span>}
            </li>
          )}
          {packageData.flight && (
            <li className="flex min-h-14 items-center justify-between gap-4 py-3">
              <span className="pkg-label text-pkg-fg-3">Penerbangan</span>
              <span className="pkg-label text-right">{isDirect ? "Direct" : via ? `Transit di ${via}` : "Transit"}</span>
            </li>
          )}
          {transport && (
            <li className="flex min-h-14 items-center justify-between gap-4 py-3">
              <span className="pkg-label text-pkg-fg-3">Transportasi</span>
              <span className="pkg-label text-right">{transport}</span>
            </li>
          )}
        </ul>

        {arriveAt && departFrom && (
          <section aria-labelledby="rute-heading" className="mt-12">
            <h2 id="rute-heading" className="pkg-h2">Rute</h2>
            <dl className="mt-6 grid grid-cols-2 gap-4">
              <div className="min-w-0">
                <dt className="pkg-label flex items-center gap-2 text-pkg-fg-3"><PlaneTakeoff className="h-4 w-4" aria-hidden />Berangkat</dt>
                <dd className="pkg-route mt-2">{leg(packageData.start_airport!, arriveAt)}</dd>
                <dd className="pkg-label mt-1 text-pkg-fg-2">{cities(packageData.start_airport!, arriveAt)}</dd>
              </div>
              <div className="min-w-0">
                <dt className="pkg-label flex items-center gap-2 text-pkg-fg-3"><PlaneLanding className="h-4 w-4" aria-hidden />Pulang</dt>
                <dd className="pkg-route mt-2">{leg(departFrom, packageData.start_airport!)}</dd>
                <dd className="pkg-label mt-1 text-pkg-fg-2">{cities(departFrom, packageData.start_airport!)}</dd>
              </div>
            </dl>
          </section>
        )}

        {hasItinerary && (
          <div className="mt-10">
            <ItineraryDialog packageName={packageData.package_name} itinerary={packageData.itinerary} accent={accent} />
          </div>
        )}
      </PkgPanel>

      {/* Hotel, inclusions, payment: the same stack, built in PackageDetail */}
      {children}

      {/* Bottom bar: price + the one action, once the in-panel button has scrolled away */}
      {mounted &&
        createPortal(
          <div
            className={cn(
              "pkg-v2 pkg-bar fixed bottom-[var(--consent-h,0px)] left-0 right-0 z-30 bg-pkg-cream px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] shadow-[var(--pkg-shadow-bar)] transition-transform duration-[var(--pkg-dur-base)] ease-[var(--pkg-ease-out)] motion-reduce:transition-none",
              ctaInView ? "pointer-events-none translate-y-full" : "translate-y-0"
            )}
            aria-hidden={ctaInView}
          >
            {departed ? (
              <Link to="/paket-umroh" className={cn(BTN, "h-14 w-full pkg-glass-red text-[17px] focus-visible:ring-pkg-ink")} tabIndex={ctaInView ? -1 : 0}>
                Lihat paket lainnya
              </Link>
            ) : unavailable ? (
              <button type="button" onClick={handleNotifyMe} className={cn(BTN, "pkg-glass-deep h-14 w-full text-[17px] focus-visible:ring-pkg-ink")} tabIndex={ctaInView ? -1 : 0}>
                <WhatsAppIcon className="h-5 w-5" /> Gabung waitlist
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <span className="pkg-caption block text-pkg-fg-3">Per orang{activeRoom ? `, ${activeRoom.label}` : ""}</span>
                  <span className="block whitespace-nowrap text-[24px] font-normal leading-tight tracking-[-0.03em] text-pkg-fg">
                    {activePrice ? `Rp ${jt(activePrice)} jt` : "Harga belum tersedia"}
                  </span>
                </div>
                <PkgCartButton isFav={isFav} onClick={handleWishlist} tabIndex={ctaInView ? -1 : 0} />
                <button type="button" onClick={bookWhatsApp} className={cn(BTN, "pkg-nudge pkg-glass-red h-14 shrink-0 px-5 text-[15px] focus-visible:ring-pkg-ink [@media(hover:hover)_and_(pointer:fine)]:hover:bg-pkg-red-press")} tabIndex={ctaInView ? -1 : 0}>
                  <WhatsAppIcon className="h-5 w-5 shrink-0" /> Tanya / Daftar
                </button>
              </div>
            )}
          </div>,
          document.body
        )}

      <Sheet open={calcOpen} onOpenChange={setCalcOpen}>
        <SheetContent side="bottom" overlayClassName="pkg-overlay" className="pkg-v2 pkg-float border-0 bg-transparent p-0 shadow-none [&>button]:hidden">
          <SheetHeader className="sr-only">
            <SheetTitle>Kalkulator harga rombongan</SheetTitle>
          </SheetHeader>
          <div ref={setCalcPanel} data-pkg-tone="cream" className="pkg-panel pkg-panel-sheet">
            <span className="mx-auto mb-4 block h-1 w-10 rounded-full bg-pkg-hair" aria-hidden />
            <SheetClose asChild>
              <button type="button" aria-label="Tutup" className="pkg-press pkg-glass absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </SheetClose>
            <PkgPricingBody {...pricing} />
          </div>
        </SheetContent>
      </Sheet>

      <PackageShareModal
        variant="pkg"
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

      <ImageLightbox
        images={lightboxImages}
        currentIndex={lightbox?.index ?? 0}
        isOpen={lightbox !== null}
        onClose={() => setLightbox(null)}
      />
    </div>
  );
}
