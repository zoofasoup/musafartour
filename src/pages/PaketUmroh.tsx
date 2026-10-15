import { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { PkgListCard } from "@/components/package-list/PkgListCard";
import { PkgCardSkeleton } from "@/components/package-list/PkgSkeletons";
import { PkgPanel } from "@/components/package-detail/PkgPanel";
import { usePkgNav } from "@/hooks/usePkgNav";
import "@/styles/pkg-v2.css";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useSwipeDownClose } from "@/hooks/useSwipeDownClose";
import { X, SlidersHorizontal } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { formatPriceJuta, getTierPrice, isPackageUnavailable, getSlotsTaken, cn } from "@/lib/utils";
import { resolveTierHotels } from "@/lib/roomCombos";
import { redirectToWhatsApp } from "@/lib/chatRedirect";
import { usePublishedPackages } from "@/hooks/usePackages";
import { usePackageFilters } from "@/components/package-list/usePackageFilters";
import { PackageFilterSheet } from "@/components/package-list/PackageFilterSheet";
import { useProductTour } from "@/hooks/useProductTour";
import { ProductTour } from "@/components/tour/ProductTour";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

const PaketUmroh = () => {
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [filterPanel, setFilterPanel] = useState<HTMLDivElement | null>(null);
  useSwipeDownClose(filterPanel, () => setMobileFilterOpen(false));
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data: packages = [], isLoading: loading } = usePublishedPackages();

  const formatPrice = (price: number) => formatPriceJuta(price);

  const { category, setCategory, filterOptions, filterConfigs, categoryChips, sortedPackages, isFiltered, activeFilterCount, resetFilters } = usePackageFilters(packages);

  const transformedPackages = sortedPackages.map((pkg) => {
    const primaryTier = (pkg as any).available_tiers?.[0] || "nyaman";
    const tierHotels = resolveTierHotels(pkg, primaryTier);
    return {
      id: pkg.id,
      slug: pkg.slug,
      image: pkg.banner_image || "/placeholder.svg",
      title: pkg.package_name,
      price: formatPrice(getTierPrice(pkg).quad),
      priceValue: getTierPrice(pkg).quad,
      date: format(new Date(pkg.departure_date), "d MMMM yyyy", { locale: localeId }),
      dateShort: format(new Date(pkg.departure_date), "d MMM yyyy", { locale: localeId }),
      duration: `${pkg.duration_days} Hari`,
      airline: pkg.flight,
      transit: pkg.flight_type.toLowerCase() === "direct" ? "Direct" : "Transit",
      hotelMakkah: tierHotels.makkah.name || undefined,
      hotelMakkahRating: tierHotels.makkah.star || undefined,
      hotelMadinah: tierHotels.madinah.name || undefined,
      hotelMadinahRating: tierHotels.madinah.star || undefined,
      category: primaryTier,
      seatAvailable: !isPackageUnavailable(pkg),
      isSoldOut: isPackageUnavailable(pkg),
      waitlistCount: pkg.waitlist_count || 0,
      slotsTotal: pkg.slots_total,
      // Offline (sheet) + online bookings both consume seats.
      slotsFilled: getSlotsTaken(pkg),
    };
  });

  const tour = useProductTour("paket-umroh", !loading && transformedPackages.length > 0);
  const tourSteps = [
    {
      targets: ["#tour-filter-bar", "#tour-filter-mobile"],
      title: "Cari Paket dengan Mudah",
      body: "Gunakan filter ini untuk menyaring paket berdasarkan bulan, maskapai, durasi, dan lainnya sesuai kebutuhanmu.",
    },
    {
      targets: ["#tour-cart-button"],
      title: "Simpan Paket ke Keranjang",
      body: "Ketuk ikon keranjang di foto paket untuk memasukkannya ke Keranjang. Kamu bisa menyimpan beberapa paket sekaligus untuk dibandingkan nanti.",
    },
    {
      targets: ["#tour-navbar-cart", "#tour-navbar-cart-mobile"],
      title: "Lihat Keranjangmu",
      body: "Semua paket yang sudah kamu simpan bisa dilihat dan dibandingkan lagi di sini, kapan saja.",
    },
  ];

  const rootRef = useRef<HTMLDivElement>(null);
  usePkgNav(rootRef);

  return (
    <div ref={rootRef} className="pkg-v2 min-h-screen">
      <SEO
        title="Paket Umroh 2026: Hemat sampai Five Star - Musafar Tour"
        description="Pilih paket umroh 9 dan 12 hari, dari hemat hingga five star, berangkat setiap bulan. Berizin resmi Kemenag, DP Rp 5 juta, cicilan bebas."
        keywords="paket umroh 2026, harga umroh, paket umroh murah, jadwal umroh 2026, umroh hemat"
        canonicalUrl="https://musafartour.com/paket-umroh"
      />
      <Navbar />
      <main id="main">
        {/* Header + filters */}
        <PkgPanel tone="ink" top>
          <div className="mx-auto max-w-[1280px]">
            {!loading && (
              <p className="pkg-glass pkg-label inline-flex h-8 items-center rounded-full px-3 text-[13px]">{transformedPackages.length} paket</p>
            )}
            <h1 className="pkg-title mt-5">Paket Umroh</h1>
            <p className="pkg-label mt-4 text-pkg-fg-2">Pilih tanggal dan harga yang cocok.</p>

            <div className="-mx-6 -mb-4 mt-4 flex gap-2 overflow-x-auto scroll-px-6 px-6 py-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] lg:mx-0 lg:px-0">
              {categoryChips.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  aria-pressed={category === c.value}
                  onClick={() => setCategory(c.value)}
                  className={cn(
                    "pkg-press pkg-label h-11 shrink-0 rounded-full px-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-cream focus-visible:ring-offset-2 focus-visible:ring-offset-pkg-ink",
                    category === c.value ? "pkg-glass-deep" : "pkg-glass"
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Desktop: all filters in one glass bar */}
            <div className="mt-5 hidden items-center gap-3 lg:flex">
              <div id="tour-filter-bar" className="pkg-glass flex items-center divide-x divide-pkg-hair overflow-hidden rounded-full">
                {filterConfigs.map((f) => (
                  <Select key={f.key} value={f.value} onValueChange={f.onChange}>
                    <SelectTrigger className={`${f.width} h-11 rounded-none border-0 bg-transparent text-sm text-pkg-fg shadow-none focus:ring-0 focus:ring-offset-0`}><SelectValue placeholder={f.placeholder} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{f.allLabel}</SelectItem>
                      {f.options.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ))}
              </div>
              {isFiltered && (
                <button type="button" onClick={resetFilters} className="pkg-glass pkg-label inline-flex h-11 items-center gap-1 rounded-full px-4">
                  <X className="h-3.5 w-3.5" aria-hidden /> Reset
                </button>
              )}
            </div>
          </div>
        </PkgPanel>

        {/* Mobile: floating filter trigger, always reachable, opens a bottom sheet */}
        {mounted && createPortal(
          <div className="pkg-v2 pkg-float lg:hidden fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
            <button
              id="tour-filter-mobile"
              type="button"
              className="pkg-press pkg-glass-deep pkg-label inline-flex h-12 items-center gap-2 rounded-full px-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink focus-visible:ring-offset-2"
              onClick={() => setMobileFilterOpen(true)}
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden />
              Filter
              {activeFilterCount > 0 && (
                <span className="pkg-glass-red inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs">{activeFilterCount}</span>
              )}
            </button>
          </div>,
          document.body
        )}
        <PackageFilterSheet
          open={mobileFilterOpen}
          onOpenChange={setMobileFilterOpen}
          filterConfigs={filterConfigs}
          isFiltered={isFiltered}
          onReset={resetFilters}
          count={transformedPackages.length}
        />

        {/* Packages */}
        <PkgPanel tone="cream" last>
          <div className="mx-auto max-w-[1280px]">
            {loading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-8 lg:grid-cols-3 xl:grid-cols-4">
                {[...Array(6)].map((_, i) => (
                  <PkgCardSkeleton key={i} />
                ))}
              </div>
            ) : transformedPackages.length === 0 ? (
              <div className="py-8">
                <h2 className="pkg-h2">Belum ada paket</h2>
                <p className="pkg-label mt-4 text-pkg-fg-2">Paket dengan kriteria itu belum tersedia.</p>
                <button
                  type="button"
                  className="pkg-press pkg-glass-red pkg-label mt-6 inline-flex h-12 items-center gap-2 rounded-full px-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink focus-visible:ring-offset-2"
                  onClick={() => {
                    redirectToWhatsApp("Halo Musafar Tour, saya mencari paket umroh yang belum tersedia di website. Bisa dibantu?", "paket_umroh_request");
                  }}
                >
                  <WhatsAppIcon className="h-4 w-4" />
                  Tanya via WhatsApp
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-8 lg:grid-cols-3 xl:grid-cols-4">
                {transformedPackages.map((pkg, idx) => (
                  <PkgListCard
                    key={pkg.id}
                    id={pkg.id}
                    slug={pkg.slug}
                    image={pkg.image}
                    title={pkg.title}
                    price={pkg.price}
                    priceValue={pkg.priceValue}
                    date={pkg.date}
                    dateShort={pkg.dateShort}
                    duration={pkg.duration}
                    airline={pkg.airline}
                    hotelMakkah={pkg.hotelMakkah}
                    hotelMakkahRating={pkg.hotelMakkahRating}
                    hotelMadinah={pkg.hotelMadinah}
                    hotelMadinahRating={pkg.hotelMadinahRating}
                    isSoldOut={pkg.isSoldOut}
                    waitlistCount={pkg.waitlistCount}
                    slotsTotal={pkg.slotsTotal}
                    slotsFilled={pkg.slotsFilled}
                    index={idx}
                    cartButtonTourId={idx === 0 ? "tour-cart-button" : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        </PkgPanel>
      </main>

      <Footer variant="pkg" />
      <ProductTour steps={tourSteps} active={tour.active} onFinish={tour.finish} />
    </div>
  );
};

export default PaketUmroh;
