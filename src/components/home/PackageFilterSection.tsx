import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { PackageCard } from "@/components/PackageCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, SlidersHorizontal, X, MessageCircle } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useIsMobile } from "@/hooks/use-mobile";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import type { PackageData } from "@/hooks/useHomepageData";
import { formatPriceJuta } from "@/lib/utils";
import { redirectToWhatsApp } from "@/lib/chatRedirect";

interface PackageFilterSectionProps {
  packages: PackageData[];
  loading: boolean;
}

export const PackageFilterSection = ({
  packages,
  loading,
}: PackageFilterSectionProps) => {
  const [category, setCategory] = useState<string>("all");
  const [airline, setAirline] = useState<string>("all");
  const [month, setMonth] = useState<string>("all");
  const [flightType, setFlightType] = useState<string>("all");
  const [duration, setDuration] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  const isMobile = useIsMobile();
  const packagesAnimation = useScrollAnimation();

  // Dynamic filter options from actual data
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
    const categories = [...new Set(tiers.map(t => JSON.stringify({ value: t, label: tierMap[t] || t })))].map(s => JSON.parse(s));

    return { airlines, durations, months: uniqueMonths, categories };
  }, [packages]);

  const formatPrice = (price: number) => formatPriceJuta(price);

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
  const displayPackages = !isFiltered && !isMobile ? filteredPackages.slice(0, 4) : filteredPackages;
  const activeFilterCount = [category, airline, month, flightType, duration].filter(v => v !== "all").length;

  const transformedPackages = displayPackages.map((pkg) => {
    const displayCategory = category !== "all" ? category : (pkg as any).available_tiers?.[0] || "nyaman";

    return {
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
      category: displayCategory,
      seatAvailable: !pkg.is_sold_out,
      fiveStarPrice: pkg.five_star_package_price?.quad ? formatPrice(pkg.five_star_package_price.quad) : undefined,
      fiveStarHotelMakkah: pkg.five_star_makkah_hotel_name || undefined,
      fiveStarHotelMakkahRating: pkg.five_star_makkah_hotel_star || undefined,
      fiveStarHotelMadinah: pkg.five_star_madinah_hotel_name || undefined,
      fiveStarHotelMadinahRating: pkg.five_star_madinah_hotel_star || undefined,
      fiveStarTransport: pkg.five_star_transport || undefined,
      bestSellerTransport: pkg.best_seller_transport || undefined,
      isSoldOut: pkg.is_sold_out || false,
      waitlistCount: pkg.waitlist_count || 0,
    };
  });

  const resetFilters = () => {
    setCategory("all");
    setAirline("all");
    setMonth("all");
    setFlightType("all");
    setDuration("all");
  };

  return (
    <section id="packages" className="py-24 md:py-32 container mx-auto px-4">
      <div className="mb-16 text-center">
        <span className="text-accent uppercase tracking-[0.2em] text-xs font-bold mb-4 block">
          Paket Umroh
        </span>
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-center mb-4 text-foreground tracking-tight">
          Paket Umroh Unggulan Kami
        </h2>
        <p className="text-center text-muted-foreground text-lg max-w-xl mx-auto">
          Temukan paket yang paling cocok dengan Musafriends!
        </p>
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <Button
          variant={showFilters ? "default" : "outline"}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filter
          {activeFilterCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-primary-foreground text-primary">
              {activeFilterCount}
            </span>
          )}
        </Button>
        {isFiltered && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="text-muted-foreground hover:text-foreground gap-1">
            <X className="h-3 w-3" /> Reset
          </Button>
        )}
      </div>

      {/* Filter Panel */}
      <div className={`overflow-hidden transition-all duration-300 ${showFilters ? "max-h-96 opacity-100 mb-10" : "max-h-0 opacity-0"}`}>
        <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue placeholder="Kategori" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kategori</SelectItem>
              {filterOptions.categories.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-[160px] h-9 text-sm"><SelectValue placeholder="Bulan" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Bulan</SelectItem>
              {filterOptions.months.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={airline} onValueChange={setAirline}>
            <SelectTrigger className="w-[160px] h-9 text-sm"><SelectValue placeholder="Maskapai" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Maskapai</SelectItem>
              {filterOptions.airlines.map((a) => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={flightType} onValueChange={setFlightType}>
            <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue placeholder="Penerbangan" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tipe</SelectItem>
              <SelectItem value="direct">Direct</SelectItem>
              <SelectItem value="transit">Transit</SelectItem>
            </SelectContent>
          </Select>

          <Select value={duration} onValueChange={setDuration}>
            <SelectTrigger className="w-[130px] h-9 text-sm"><SelectValue placeholder="Durasi" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Durasi</SelectItem>
              {filterOptions.durations.map((d) => (
                <SelectItem key={d} value={String(d)}>{d} Hari</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Package Grid */}
      <div
        ref={packagesAnimation.ref}
        className={`transition-all duration-700 ${packagesAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
      >
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-square w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : transformedPackages.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">Paket tidak ditemukan</h3>
            <p className="text-muted-foreground mb-4">
              Maaf, paket dengan kriteria tersebut belum tersedia. Silakan hubungi kami melalui WhatsApp.
            </p>
            <Button
              size="sm"
              className="gap-2"
              onClick={() => redirectToWhatsApp("Halo Musafar Tour, saya mencari paket umroh yang belum tersedia di website. Bisa dibantu?")}
            >
              <MessageCircle className="h-4 w-4" />
              Hubungi via WhatsApp
            </Button>
          </div>
        ) : isMobile ? (
          <Carousel opts={{ align: "start", loop: true }} className="w-full">
            <CarouselContent className="-ml-2 md:-ml-4">
              {transformedPackages.map((pkg) => (
                <CarouselItem key={pkg.id} className="pl-2 md:pl-4 basis-[75%]">
                  <PackageCard {...pkg} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="flex justify-center mt-4 gap-2">
              <CarouselPrevious className="relative left-0 translate-y-0" />
              <CarouselNext className="relative right-0 translate-y-0" />
            </div>
          </Carousel>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-fr">
            {transformedPackages.map((pkg, index) => (
              <div 
                key={pkg.id} 
                className={index === 0 ? "md:col-span-2 md:row-span-2" : ""}
              >
                <PackageCard 
                  {...pkg} 
                  index={index} 
                  className={index === 0 ? "h-full flex flex-col" : "h-full flex flex-col"}
                  imageClassName={index === 0 ? "aspect-[4/3] md:aspect-auto md:flex-1" : "aspect-square"}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
