import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { PackageCard } from "@/components/PackageCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface PackageData {
  id: string;
  package_name: string;
  departure_date: string;
  duration_days: number;
  flight: string;
  flight_type: string;
  banner_image: string | null;
  package_price: {
    quad: number;
    triple: number;
    double: number;
  };
  five_star_package_price?: {
    quad: number;
    triple: number;
    double: number;
  };
  makkah_hotel_name: string | null;
  makkah_hotel_star: number | null;
  madinah_hotel_name: string | null;
  madinah_hotel_star: number | null;
  five_star_makkah_hotel_name?: string | null;
  five_star_makkah_hotel_star?: number | null;
  five_star_madinah_hotel_name?: string | null;
  five_star_madinah_hotel_star?: number | null;
  best_seller_transport?: string | null;
  five_star_transport?: string | null;
}

const PaketUmroh = () => {
  const [category, setCategory] = useState<string>("all");
  const [airline, setAirline] = useState<string>("all");
  const [month, setMonth] = useState<string>("all");
  const [flightType, setFlightType] = useState<string>("all");
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("packages")
        .select("*")
        .eq("status", "published")
        .order("departure_date", { ascending: true });

      if (error) throw error;
      setPackages(data as any || []);
    } catch (error) {
      console.error("Error fetching packages:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    const millions = price / 1000000;
    return millions % 1 === 0 
      ? `${millions} Juta` 
      : `${millions.toFixed(1).replace('.', ',')} Juta`;
  };

  const getCategoryFromPrice = (price: number) => {
    if (price < 25000000) return "hemat";
    if (price <= 40000000) return "nyaman";
    return "five-star";
  };

  const getMonthFromDate = (date: string) => {
    return format(new Date(date), "MMMM yyyy", { locale: localeId }).toLowerCase();
  };

  const filteredPackages = packages.filter((pkg) => {
    const pkgCategory = getCategoryFromPrice(pkg.package_price.quad);
    const pkgMonth = getMonthFromDate(pkg.departure_date);
    
    const categoryMatch = category === "all" || pkgCategory === category;
    const airlineMatch = airline === "all" || pkg.flight.toLowerCase().includes(airline);
    const monthMatch = month === "all" || pkgMonth.includes(month.toLowerCase());
    const flightTypeMatch = flightType === "all" || 
      (flightType === "direct" && pkg.flight_type.toLowerCase() === "direct") ||
      (flightType === "transit" && pkg.flight_type.toLowerCase() === "transit");

    return categoryMatch && airlineMatch && monthMatch && flightTypeMatch;
  });

  const transformedPackages = filteredPackages.map((pkg) => ({
    id: pkg.id,
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
    category: getCategoryFromPrice(pkg.package_price.quad),
    seatAvailable: true,
    // Five-star tier data
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
      <Navbar />
      
      {/* Header */}
      <section className="py-16 bg-gradient-to-r from-primary/10 to-accent/10">
        <div className="container mx-auto px-4 text-center">
          <Package className="h-16 w-16 mx-auto mb-4 text-primary" />
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Paket Umroh Musafar Tour</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Pilihan paket Umroh terlengkap mulai dari Budget hingga Premium Bintang 5. Semua dirancang untuk kenyamanan dan keberkahan perjalanan spiritual Anda.
          </p>
        </div>
      </section>

      {/* Filter & Package Catalog */}
      <section className="py-16 container mx-auto px-4">
        {/* Filter Bar */}
        <div className="bg-card p-6 rounded-lg shadow-md mb-12 border">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
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
                <SelectItem value="november">November 2025</SelectItem>
                <SelectItem value="desember">Desember 2025</SelectItem>
                <SelectItem value="januari">Januari 2026</SelectItem>
                <SelectItem value="februari">Februari 2026</SelectItem>
                <SelectItem value="maret">Maret 2026</SelectItem>
                <SelectItem value="april">April 2026</SelectItem>
                <SelectItem value="mei">Mei 2026</SelectItem>
                <SelectItem value="juni">Juni 2026</SelectItem>
              </SelectContent>
            </Select>

            <Select value={airline} onValueChange={setAirline}>
              <SelectTrigger>
                <SelectValue placeholder="Maskapai" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Maskapai</SelectItem>
                <SelectItem value="garuda">Garuda Indonesia</SelectItem>
                <SelectItem value="saudia">Saudia Airlines</SelectItem>
                <SelectItem value="qatar">Qatar Airways</SelectItem>
                <SelectItem value="emirates">Emirates</SelectItem>
                <SelectItem value="etihad">Etihad Airways</SelectItem>
                <SelectItem value="turkish">Turkish Airlines</SelectItem>
                <SelectItem value="malaysia">Malaysia Airlines</SelectItem>
                <SelectItem value="singapore">Singapore Airlines</SelectItem>
                <SelectItem value="oman">Oman Air</SelectItem>
                <SelectItem value="gulf">Gulf Air</SelectItem>
              </SelectContent>
            </Select>

            <Select value={flightType} onValueChange={setFlightType}>
              <SelectTrigger>
                <SelectValue placeholder="Jenis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="direct">Direct</SelectItem>
                <SelectItem value="transit">Transit</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="ghost"
            className="w-full text-primary hover:text-primary hover:bg-primary/5"
            onClick={() => {
              setCategory("all");
              setAirline("all");
              setMonth("all");
              setFlightType("all");
            }}
          >
            Reset Filter
          </Button>
        </div>

        {/* Package Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-[4/5] w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : transformedPackages.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">Tidak ada paket tersedia</h3>
            <p className="text-muted-foreground">
              Coba ubah filter atau kembali lagi nanti
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {transformedPackages.map((pkg) => (
              <PackageCard key={pkg.id} {...pkg} />
            ))}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
};

export default PaketUmroh;
