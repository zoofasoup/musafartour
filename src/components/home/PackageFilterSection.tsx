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
import { Package } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-center mb-2 text-foreground">
          Paket Umroh Unggulan Kami
        </h2>
        <p className="text-center text-muted-foreground">
          Temukan paket yang paling cocok dengan Musafriends!
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-card rounded-lg shadow-md mb-12 border">
        <Accordion
          type="single"
          collapsible
          defaultValue="filters"
          className="w-full"
        >
          <AccordionItem value="filters" className="border-none">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                <span className="font-semibold">Filter Paket</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
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
                  <SelectTrigger>
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
                  <SelectTrigger>
                    <SelectValue placeholder="Maskapai" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Maskapai</SelectItem>
                    <SelectItem value="Garuda Indonesia">
                      Garuda Indonesia
                    </SelectItem>
                    <SelectItem value="Saudia">Saudia</SelectItem>
                    <SelectItem value="Scoot Airlines">Scoot Airlines</SelectItem>
                    <SelectItem value="Oman Air">Oman Air</SelectItem>
                    <SelectItem value="Qatar Airways">Qatar Airways</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={flightType} onValueChange={setFlightType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tipe Penerbangan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Tipe Penerbangan</SelectItem>
                    <SelectItem value="direct">Direct</SelectItem>
                    <SelectItem value="transit">Transit</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger>
                    <SelectValue placeholder="Durasi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Durasi</SelectItem>
                    <SelectItem value="9">9 Hari</SelectItem>
                    <SelectItem value="12">12 Hari</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="ghost"
                className="w-full text-primary hover:text-primary hover:bg-primary/5"
                onClick={resetFilters}
              >
                Reset Filter
              </Button>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
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