import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { PackageCard } from "@/components/PackageCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Calendar, Plane, Clock, Grid3X3, List, SlidersHorizontal, X, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { formatPriceJuta } from "@/lib/utils";
import { redirectToWhatsApp } from "@/lib/chatRedirect";
import { usePublishedPackages } from "@/hooks/usePackages";

const PaketUmroh = () => {
  const [viewMode, setViewMode] = useState<"card" | "schedule">("card");
  const [category, setCategory] = useState<string>("all");
  const [airline, setAirline] = useState<string>("all");
  const [month, setMonth] = useState<string>("all");
  const [flightType, setFlightType] = useState<string>("all");
  const [duration, setDuration] = useState<string>("all");

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
    // Deduplicate months by value
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

  const isFiltered = category !== "all" || airline !== "all" || month !== "all" || flightType !== "all" || duration !== "all";
  const activeFilterCount = [category, airline, month, flightType, duration].filter(v => v !== "all").length;

  const resetFilters = () => {
    setCategory("all");
    setAirline("all");
    setMonth("all");
    setFlightType("all");
    setDuration("all");
  };

  const transformedPackages = filteredPackages.map((pkg) => ({
    id: pkg.id,
    slug: pkg.slug,
    image: pkg.banner_image || "/placeholder.svg",
    title: pkg.package_name,
    price: formatPrice(pkg.package_price.quad),
    date: format(new Date(pkg.departure_date), "d MMMM yyyy", { locale: localeId }),
    duration: `${pkg.duration_days} Hari`,
    airline: pkg.flight,
    transit: pkg.flight_type.toLowerCase() === "direct" ? "Direct" : "Transit",
    hotelMakkah: pkg.makkah_hotel_name || undefined,
    hotelMakkahRating: pkg.makkah_hotel_star || undefined,
    hotelMadinah: pkg.madinah_hotel_name || undefined,
    hotelMadinahRating: pkg.madinah_hotel_star || undefined,
    category: (pkg as any).available_tiers?.[0] || "nyaman",
    seatAvailable: !pkg.is_sold_out,
    isSoldOut: pkg.is_sold_out || false,
    waitlistCount: pkg.waitlist_count || 0,
    fiveStarPrice: pkg.five_star_package_price?.quad ? formatPrice(pkg.five_star_package_price.quad) : undefined,
    fiveStarHotelMakkah: pkg.five_star_makkah_hotel_name || undefined,
    fiveStarHotelMakkahRating: pkg.five_star_makkah_hotel_star || undefined,
    fiveStarHotelMadinah: pkg.five_star_madinah_hotel_name || undefined,
    fiveStarHotelMadinahRating: pkg.five_star_madinah_hotel_star || undefined,
    fiveStarTransport: pkg.five_star_transport || undefined,
    bestSellerTransport: pkg.best_seller_transport || undefined,
  }));

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
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4 text-center">
          <Package className="h-16 w-16 mx-auto mb-4 text-primary" />
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Paket Umroh Musafar Tour</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Pilihan paket Umroh terlengkap mulai dari Budget hingga Premium Bintang 5.
          </p>
          <div className="flex justify-center gap-2 mt-6">
            <Button variant={viewMode === "card" ? "default" : "outline"} onClick={() => setViewMode("card")} className="gap-2">
              <Grid3X3 className="h-4 w-4" /> Tampilan Kartu
            </Button>
            <Button variant={viewMode === "schedule" ? "default" : "outline"} onClick={() => setViewMode("schedule")} className="gap-2">
              <List className="h-4 w-4" /> Tampilan Jadwal
            </Button>
          </div>
        </div>
      </section>

      {/* Filter & Packages */}
      <section className="py-16 container mx-auto px-4">
        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[160px] h-9 text-sm">
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kategori</SelectItem>
              {filterOptions.categories.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-[170px] h-9 text-sm">
              <SelectValue placeholder="Bulan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Bulan</SelectItem>
              {filterOptions.months.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={airline} onValueChange={setAirline}>
            <SelectTrigger className="w-[170px] h-9 text-sm">
              <SelectValue placeholder="Maskapai" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Maskapai</SelectItem>
              {filterOptions.airlines.map((a) => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={flightType} onValueChange={setFlightType}>
            <SelectTrigger className="w-[150px] h-9 text-sm">
              <SelectValue placeholder="Penerbangan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tipe</SelectItem>
              <SelectItem value="direct">Direct</SelectItem>
              <SelectItem value="transit">Transit</SelectItem>
            </SelectContent>
          </Select>

          <Select value={duration} onValueChange={setDuration}>
            <SelectTrigger className="w-[140px] h-9 text-sm">
              <SelectValue placeholder="Durasi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Durasi</SelectItem>
              {filterOptions.durations.map((d) => (
                <SelectItem key={d} value={String(d)}>{d} Hari</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isFiltered && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="text-muted-foreground hover:text-foreground gap-1">
              <X className="h-3 w-3" /> Reset
            </Button>
          )}
        </div>

        {/* Results */}
        {loading ? (
          <div className={viewMode === "card" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "space-y-4"}>
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
            <h3 className="text-xl font-semibold mb-2">Paket tidak ditemukan</h3>
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
        ) : viewMode === "card" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {transformedPackages.map((pkg) => (
              <PackageCard key={pkg.id} {...pkg} />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPackages.map((pkg) => (
              <div key={pkg.id} className="bg-card p-6 rounded-lg shadow-md border hover:shadow-lg transition-shadow">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      <span className="font-bold text-lg">
                        {format(new Date(pkg.departure_date), "d MMMM yyyy", { locale: localeId })}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{pkg.package_name}</h3>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1"><Clock className="h-4 w-4" />{pkg.duration_days} Hari</div>
                      <div className="flex items-center gap-1"><Plane className="h-4 w-4" />{pkg.flight}</div>
                      <span className="text-accent font-medium">{pkg.flight_type === "direct" ? "Direct" : "Transit"}</span>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Link to={`/paket-umroh/${pkg.slug || pkg.id}`}>
                      <Button variant="outline" className="w-full sm:w-auto">Lihat Detail</Button>
                    </Link>
                    <Button
                      className="bg-[#25D366] hover:bg-[#22c55e] text-white w-full sm:w-auto"
                      onClick={() => {
                        const message = `Halo Musafar Tour, saya ingin mendaftar untuk ${pkg.package_name} dengan keberangkatan ${format(new Date(pkg.departure_date), "d MMMM yyyy", { locale: localeId })}.`;
                        redirectToWhatsApp(message);
                      }}
                    >
                      Daftar Sekarang
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
};

export default PaketUmroh;
