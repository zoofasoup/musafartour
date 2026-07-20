import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { PackageCard } from "@/components/PackageCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Package, Calendar, Plane, Clock, X, MessageCircle, SlidersHorizontal } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { formatPriceJuta, getTierPrice, isPackageUnavailable } from "@/lib/utils";
import { resolveTierHotels } from "@/lib/roomCombos";
import { redirectToWhatsApp } from "@/lib/chatRedirect";
import { usePublishedPackages } from "@/hooks/usePackages";
import { useProductTour } from "@/hooks/useProductTour";
import { ProductTour } from "@/components/tour/ProductTour";

const PaketUmroh = () => {
  const [category, setCategory] = useState<string>("all");
  const [airline, setAirline] = useState<string>("all");
  const [month, setMonth] = useState<string>("all");
  const [flightType, setFlightType] = useState<string>("all");
  const [duration, setDuration] = useState<string>("all");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data: packages = [], isLoading: loading } = usePublishedPackages();

  const formatPrice = (price: number) => formatPriceJuta(price);

  // Dynamic filter options derived from actual data
  const filterOptions = useMemo(() => {
    const airlines = [...new Set(packages.map(p => p.flight).filter(Boolean))].sort();
    const durations = [...new Set(packages.map(p => p.duration_days))].sort((a, b) => a - b);
    const months = [...new Set(packages.map(p => {
      const d = new Date(p.departure_date);
      return format(d, "yyyy-MM");
    }))].sort().map(ym => {
      const d = new Date(ym + "-01");
      return { value: format(d, "MMMM", { locale: localeId }).toLowerCase(), label: format(d, "MMMM yyyy", { locale: localeId }) };
    });
    const uniqueMonths = months.filter((m, i, arr) => arr.findIndex(x => x.value === m.value) === i);

    const tiers = [...new Set(packages.flatMap(p => (p as any).available_tiers || []))].filter(Boolean);
    const tierMap: Record<string, string> = { hemat: "Hemat", nyaman: "Nyaman", best_seller: "Nyaman", "five-star": "Five Star", five_star: "Five Star", pelataran: "Pelataran Hemat", "pelataran-hemat": "Pelataran Hemat" };
    const categories = [...new Set(tiers.map(t => ({ value: t, label: tierMap[t] || t })).map(c => JSON.stringify(c)))].map(s => JSON.parse(s));

    return { airlines, durations, months: uniqueMonths, categories };
  }, [packages]);

  const getMonthFromDate = (date: string) => {
    return format(new Date(date), "MMMM yyyy", { locale: localeId }).toLowerCase();
  };

  const filteredPackages = packages.filter((pkg) => {
    const pkgMonth = getMonthFromDate(pkg.departure_date);
    const pkgTiers = (pkg as any).available_tiers || [];

    const categoryMatch = category === "all" || pkgTiers.includes(category);
    const airlineMatch = airline === "all" || pkg.flight === airline;
    const monthMatch = month === "all" || pkgMonth.includes(month.toLowerCase());
    const flightTypeMatch = flightType === "all" || pkg.flight_type.toLowerCase() === flightType;
    const durationMatch = duration === "all" || pkg.duration_days === parseInt(duration);

    return categoryMatch && airlineMatch && monthMatch && flightTypeMatch && durationMatch;
  });

  // Available packages first (soonest departure first, already the base query order),
  // sold-out packages pushed to the end. Stable sort preserves date order within each group.
  const sortedPackages = [...filteredPackages].sort(
    (a, b) => Number(isPackageUnavailable(a)) - Number(isPackageUnavailable(b))
  );

  const isFiltered = category !== "all" || airline !== "all" || month !== "all" || flightType !== "all" || duration !== "all";
  const activeFilterCount = [category, airline, month, flightType, duration].filter((v) => v !== "all").length;

  const filterConfigs = [
    { key: "category", value: category, onChange: setCategory, placeholder: "Kategori", allLabel: "Semua Kategori", options: filterOptions.categories.map((c: any) => ({ value: c.value, label: c.label })), width: "w-[160px]" },
    { key: "month", value: month, onChange: setMonth, placeholder: "Bulan", allLabel: "Semua Bulan", options: filterOptions.months.map((m) => ({ value: m.value, label: m.label })), width: "w-[170px]" },
    { key: "airline", value: airline, onChange: setAirline, placeholder: "Maskapai", allLabel: "Semua Maskapai", options: filterOptions.airlines.map((a) => ({ value: a, label: a })), width: "w-[170px]" },
    { key: "flightType", value: flightType, onChange: setFlightType, placeholder: "Penerbangan", allLabel: "Semua Tipe", options: [{ value: "direct", label: "Direct" }, { value: "transit", label: "Transit" }], width: "w-[150px]" },
    { key: "duration", value: duration, onChange: setDuration, placeholder: "Durasi", allLabel: "Semua Durasi", options: filterOptions.durations.map((d) => ({ value: String(d), label: `${d} Hari` })), width: "w-[140px]" },
  ];

  const resetFilters = () => {
    setCategory("all");
    setAirline("all");
    setMonth("all");
    setFlightType("all");
    setDuration("all");
  };

  const transformedPackages = sortedPackages.map((pkg) => {
    const primaryTier = (pkg as any).available_tiers?.[0] || "nyaman";
    const tierHotels = resolveTierHotels(pkg, primaryTier);
    return {
      id: pkg.id,
      slug: pkg.slug,
      image: pkg.banner_image || "/placeholder.svg",
      title: pkg.package_name,
      price: formatPrice(getTierPrice(pkg).quad),
      date: format(new Date(pkg.departure_date), "d MMMM yyyy", { locale: localeId }),
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
      slotsFilled: pkg.slots_filled,
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
      body: "Klik ikon kotak hijau ini untuk memasukkan paket ke Keranjang. Kamu bisa menyimpan beberapa paket sekaligus untuk dibandingkan nanti.",
    },
    {
      targets: ["#tour-navbar-cart", "#tour-navbar-cart-mobile"],
      title: "Lihat Keranjangmu",
      body: "Semua paket yang sudah kamu simpan bisa dilihat dan dibandingkan lagi di sini, kapan saja.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="Paket Umroh 2025 Terlengkap & Terpercaya - Musafar Tour"
        description="Pilih paket umroh terbaik: 9 hari, 12 hari, plus Turki. Harga mulai 20 juta, hotel bintang 5, keberangkatan fleksibel. Daftar sekarang!"
        keywords="paket umroh 2025, harga umroh, paket umroh murah, jadwal umroh 2025, umroh hemat"
        canonicalUrl="https://musafartour.com/paket-umroh"
      />
      <Navbar />
      
      {/* Header */}
      <section className="py-16 bg-card border-b">
        <div className="container mx-auto px-6 md:px-8 text-center">
          <Package className="h-16 w-16 mx-auto mb-4 text-primary" />
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">Paket Umroh Musafar Tour</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Pilihan paket Umroh terlengkap mulai dari Budget hingga Premium Bintang 5.
          </p>
          {/* Filter Bar - desktop: one grouped pill, dividers between each filter */}
          <div className="hidden lg:flex items-center justify-center gap-3 mt-8">
            <div id="tour-filter-bar" className="flex items-center divide-x divide-border rounded-full border border-border bg-white shadow-sm overflow-hidden">
              {filterConfigs.map((f) => (
                <Select key={f.key} value={f.value} onValueChange={f.onChange}>
                  <SelectTrigger className={`${f.width} h-9 text-sm rounded-none border-0 bg-transparent shadow-none focus:ring-0 focus:ring-offset-0`}><SelectValue placeholder={f.placeholder} /></SelectTrigger>
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
              <Button variant="ghost" size="sm" onClick={resetFilters} className="text-muted-foreground hover:text-foreground gap-1">
                <X className="h-3 w-3" /> Reset
              </Button>
            )}
          </div>

        </div>
      </section>

      {/* Filter Bar - mobile: floating trigger, always reachable while scrolling, opens a bottom sheet */}
      {mounted && createPortal(
        <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <Button
            id="tour-filter-mobile"
            variant="outline"
            className="rounded-full h-11 gap-2 bg-white shadow-lg border-border/50 px-6"
            onClick={() => setMobileFilterOpen(true)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filter
            {activeFilterCount > 0 && (
              <Badge className="h-5 min-w-5 justify-center rounded-full px-1 text-[10px]">{activeFilterCount}</Badge>
            )}
          </Button>
        </div>,
        document.body
      )}
      <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Filter Paket</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 py-4">
            {filterConfigs.map((f) => (
              <Select key={f.key} value={f.value} onValueChange={f.onChange}>
                <SelectTrigger className="w-full h-11 text-sm rounded-xl"><SelectValue placeholder={f.placeholder} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{f.allLabel}</SelectItem>
                  {f.options.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ))}
          </div>
          <div className="flex gap-2 border-t pt-4">
            {isFiltered && (
              <Button variant="outline" className="flex-1" onClick={resetFilters}>
                <X className="h-3.5 w-3.5" /> Reset
              </Button>
            )}
            <Button className="flex-1" onClick={() => setMobileFilterOpen(false)}>
              Terapkan Filter
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Packages */}
      <section className="py-12 container mx-auto px-6 md:px-8">
        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-square w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : transformedPackages.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2 text-foreground">Paket tidak ditemukan</h3>
            <p className="text-muted-foreground mb-4">
              Maaf, paket dengan kriteria tersebut belum tersedia.
            </p>
            <Button
              className="gap-2"
              onClick={() => {
                redirectToWhatsApp("Halo Musafar Tour, saya mencari paket umroh yang belum tersedia di website. Bisa dibantu?");
              }}
            >
              <MessageCircle className="h-4 w-4" />
              Hubungi via WhatsApp
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {transformedPackages.map((pkg, idx) => (
              <PackageCard key={pkg.id} {...pkg} index={idx} cartButtonTourId={idx === 0 ? "tour-cart-button" : undefined} />
            ))}
          </div>
        )}
      </section>

      <Footer />

      <ProductTour steps={tourSteps} active={tour.active} onFinish={tour.finish} />
    </div>
  );
};

export default PaketUmroh;
