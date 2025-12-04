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
import { Package, SlidersHorizontal, X } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useIsMobile } from "@/hooks/use-mobile";
import { format, addMonths } from "date-fns";
import { id as localeId } from "date-fns/locale";
import type { PackageData } from "@/hooks/useHomepageData";

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

  // Generate dynamic months (next 12 months from current date)
  const monthOptions = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = addMonths(now, i);
      const monthName = format(date, "MMMM", { locale: localeId }).toLowerCase();
      const label = format(date, "MMMM yyyy", { locale: localeId });
      months.push({ value: monthName, label });
    }
    return months;
  }, []);

  const formatPrice = (price: number) => {
    const millions = price / 1000000;
    return millions % 1 === 0
      ? `${millions} Juta`
      : `${millions.toFixed(1).replace(".", ",")} Juta`;
  };

  const getMonthFromDate = (date: string) => {
    return format(new Date(date), "MMMM yyyy", { locale: localeId }).toLowerCase();
  };

  const filteredPackages = packages.filter((pkg) => {
    const pkgMonth = getMonthFromDate(pkg.departure_date);

    const categoryMatch =
      category === "all" ||
      (pkg.available_tiers && pkg.available_tiers.includes(category));
    const airlineMatch = airline === "all" || pkg.flight === airline;
    const monthMatch =
      month === "all" || pkgMonth.includes(month.toLowerCase());
    const flightTypeMatch =
      flightType === "all" || pkg.flight_type.toLowerCase() === flightType;
    const durationMatch =
      duration === "all" ||
      (duration === "9" && pkg.duration_days === 9) ||
      (duration === "12" && pkg.duration_days === 12) ||
      (duration === "13" && pkg.duration_days === 13);

    return (
      categoryMatch &&
      airlineMatch &&
      monthMatch &&
      flightTypeMatch &&
      durationMatch
    );
  });

  const isFiltered =
    category !== "all" ||
    airline !== "all" ||
    month !== "all" ||
    flightType !== "all" ||
    duration !== "all";
  const displayPackages =
    !isFiltered && !isMobile ? filteredPackages.slice(0, 4) : filteredPackages;

  const activeFilterCount = [category, airline, month, flightType, duration].filter(v => v !== "all").length;

  const transformedPackages = displayPackages.map((pkg) => {
    const displayCategory =
      category !== "all" ? category : pkg.available_tiers?.[0] || "nyaman";

    return {
      id: pkg.id,
      slug: pkg.slug,
      image: pkg.banner_image || "/placeholder.svg",
      title: pkg.package_name,
      price: formatPrice(pkg.package_price.quad),
      date: format(new Date(pkg.departure_date), "d MMMM yyyy", {
        locale: localeId,
      }),
      duration: `${pkg.duration_days} Hari`,
      airline: pkg.flight,
      transit: pkg.flight_type.toLowerCase() === "direct" ? "Direct" : "Transit",
      hotelMakkah: pkg.makkah_hotel_name || undefined,
      hotelMakkahRating: pkg.makkah_hotel_star || undefined,
      hotelMadinah: pkg.madinah_hotel_name || undefined,
      hotelMadinahRating: pkg.madinah_hotel_star || undefined,
      category: displayCategory,
      seatAvailable: true,
      fiveStarPrice: pkg.five_star_package_price?.quad
        ? formatPrice(pkg.five_star_package_price.quad)
        : undefined,
      fiveStarHotelMakkah: pkg.five_star_makkah_hotel_name || undefined,
      fiveStarHotelMakkahRating: pkg.five_star_makkah_hotel_star || undefined,
      fiveStarHotelMadinah: pkg.five_star_madinah_hotel_name || undefined,
      fiveStarHotelMadinahRating: pkg.five_star_madinah_hotel_star || undefined,
      fiveStarTransport: pkg.five_star_transport || undefined,
      bestSellerTransport: pkg.best_seller_transport || undefined,
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
    <section id="packages" className="py-16 container mx-auto px-4">
      <div className="mb-10">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-3 text-foreground">
          Paket Umroh Unggulan Kami
        </h2>
        <p className="text-center text-muted-foreground text-lg">
          Temukan paket yang paling cocok dengan Musafriends!
        </p>
      </div>

      {/* Minimal Filter Toggle */}
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
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="text-muted-foreground hover:text-foreground gap-1"
          >
            <X className="h-3 w-3" />
            Reset
          </Button>
        )}
      </div>

      {/* Filter Panel */}
      <div className={`overflow-hidden transition-all duration-300 ${showFilters ? "max-h-96 opacity-100 mb-10" : "max-h-0 opacity-0"}`}>
        <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[140px] h-9 text-sm">
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kategori</SelectItem>
              <SelectItem value="hemat">Hemat</SelectItem>
              <SelectItem value="nyaman">Nyaman</SelectItem>
              <SelectItem value="five-star">Five Star</SelectItem>
            </SelectContent>
          </Select>

          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-[160px] h-9 text-sm">
              <SelectValue placeholder="Bulan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Bulan</SelectItem>
              {monthOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={airline} onValueChange={setAirline}>
            <SelectTrigger className="w-[160px] h-9 text-sm">
              <SelectValue placeholder="Maskapai" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Maskapai</SelectItem>
              <SelectItem value="Garuda Indonesia">Garuda Indonesia</SelectItem>
              <SelectItem value="Saudia">Saudia</SelectItem>
              <SelectItem value="Scoot Airlines">Scoot Airlines</SelectItem>
              <SelectItem value="Oman Air">Oman Air</SelectItem>
              <SelectItem value="Qatar Airways">Qatar Airways</SelectItem>
            </SelectContent>
          </Select>

          <Select value={flightType} onValueChange={setFlightType}>
            <SelectTrigger className="w-[140px] h-9 text-sm">
              <SelectValue placeholder="Penerbangan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tipe</SelectItem>
              <SelectItem value="direct">Direct</SelectItem>
              <SelectItem value="transit">Transit</SelectItem>
            </SelectContent>
          </Select>

          <Select value={duration} onValueChange={setDuration}>
            <SelectTrigger className="w-[130px] h-9 text-sm">
              <SelectValue placeholder="Durasi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Durasi</SelectItem>
              <SelectItem value="9">9 Hari</SelectItem>
              <SelectItem value="12">12 Hari</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Package Grid */}
      <div
        ref={packagesAnimation.ref}
        className={`transition-all duration-700 ${
          packagesAnimation.isVisible
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-10"
        }`}
      >
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-square w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            ))}
          </div>
        ) : transformedPackages.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">
              Tidak ada paket tersedia
            </h3>
            <p className="text-muted-foreground">
              Coba ubah filter atau kembali lagi nanti
            </p>
          </div>
        ) : isMobile ? (
          <Carousel opts={{ align: "start", loop: true }} className="w-full">
            <CarouselContent className="-ml-2 md:-ml-4">
              {transformedPackages.map((pkg) => (
                <CarouselItem
                  key={pkg.id}
                  className="pl-2 md:pl-4 basis-[75%]"
                >
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {transformedPackages.map((pkg) => (
              <PackageCard key={pkg.id} {...pkg} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
