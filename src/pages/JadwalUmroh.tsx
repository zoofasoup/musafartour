import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Plane, Clock, Package } from "lucide-react";
import { redirectToWhatsApp } from "@/lib/chatRedirect";
import { usePublishedPackages } from "@/hooks/usePackages";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

const JadwalUmroh = () => {
  const [month, setMonth] = useState<string>("all");
  const [packageType, setPackageType] = useState<string>("all");
  const [airline, setAirline] = useState<string>("all");
  const [flightType, setFlightType] = useState<string>("all");

  const { data: packages = [], isLoading: loading } = usePublishedPackages();

  const getCategoryFromPrice = (price: number) => {
    if (price < 25000000) return "budget";
    if (price <= 40000000) return "comfort";
    return "five-star";
  };

  const getMonthFromDate = (date: string) => {
    return format(new Date(date), "MMMM yyyy", { locale: localeId }).toLowerCase();
  };

  const filteredPackages = packages.filter((pkg) => {
    const pkgCategory = getCategoryFromPrice(pkg.package_price.quad);
    const pkgMonth = getMonthFromDate(pkg.departure_date);
    
    const categoryMatch = packageType === "all" || pkgCategory === packageType;
    const monthMatch = month === "all" || pkgMonth.includes(month.toLowerCase());
    const airlineMatch = airline === "all" || pkg.flight.toLowerCase().includes(airline);
    const flightTypeMatch = flightType === "all" || 
      (flightType === "direct" && pkg.flight_type.toLowerCase() === "direct") ||
      (flightType === "transit" && pkg.flight_type.toLowerCase() === "transit");

    return categoryMatch && monthMatch && airlineMatch && flightTypeMatch;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Header */}
      <section className="py-16 bg-card border-b">
        <div className="container mx-auto px-6 md:px-8 text-center">
          <Calendar className="h-16 w-16 mx-auto mb-4 text-primary" />
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">Jadwal Keberangkatan Umroh</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Lihat jadwal keberangkatan terbaru dan pilih waktu yang paling sesuai untuk perjalanan spiritual Anda
          </p>
        </div>
      </section>

      {/* Filter Section */}
      <section className="py-8 container mx-auto px-6 md:px-8">
        <div className="bg-card p-6 rounded-lg shadow-md border">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih Bulan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Bulan</SelectItem>
                <SelectItem value="juni">Juni 2025</SelectItem>
                <SelectItem value="juli">Juli 2025</SelectItem>
                <SelectItem value="agustus">Agustus 2025</SelectItem>
                <SelectItem value="september">September 2025</SelectItem>
                <SelectItem value="oktober">Oktober 2025</SelectItem>
                <SelectItem value="november">November 2025</SelectItem>
                <SelectItem value="desember">Desember 2025</SelectItem>
              </SelectContent>
            </Select>

            <Select value={packageType} onValueChange={setPackageType}>
              <SelectTrigger>
                <SelectValue placeholder="Jenis Paket" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Jenis</SelectItem>
                <SelectItem value="budget">Budget</SelectItem>
                <SelectItem value="comfort">Comfort</SelectItem>
                <SelectItem value="five-star">Bintang 5</SelectItem>
              </SelectContent>
            </Select>

            <Select value={airline} onValueChange={setAirline}>
              <SelectTrigger>
                <SelectValue placeholder="Maskapai" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Maskapai</SelectItem>
                <SelectItem value="garuda">Garuda Indonesia</SelectItem>
                <SelectItem value="saudia">Saudia</SelectItem>
                <SelectItem value="lion">Lion Air</SelectItem>
                <SelectItem value="qatar">Qatar Airways</SelectItem>
                <SelectItem value="emirates">Emirates</SelectItem>
              </SelectContent>
            </Select>

            <Select value={flightType} onValueChange={setFlightType}>
              <SelectTrigger>
                <SelectValue placeholder="Jenis Penerbangan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Jenis</SelectItem>
                <SelectItem value="direct">Direct</SelectItem>
                <SelectItem value="transit">Transit</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="ghost"
            className="w-full text-primary hover:text-primary hover:bg-primary/5"
            onClick={() => {
              setMonth("all");
              setPackageType("all");
              setAirline("all");
              setFlightType("all");
            }}
          >
            Reset Filter
          </Button>
        </div>
      </section>

      {/* Schedule List */}
      <section className="py-8 pb-16 container mx-auto px-6 md:px-8">
        {loading ? (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-card p-6 rounded-lg border">
                <Skeleton className="h-8 w-1/3 mb-4" />
                <Skeleton className="h-6 w-2/3 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredPackages.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">Tidak ada jadwal tersedia</h3>
            <p className="text-muted-foreground">
              Coba ubah filter atau kembali lagi nanti
            </p>
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
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {pkg.duration_days} Hari
                      </div>
                      <div className="flex items-center gap-1">
                        <Plane className="h-4 w-4" />
                        {pkg.flight}
                      </div>
                      <span className="text-accent font-medium">
                        {pkg.flight_type === "direct" ? "Direct" : "Transit"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link to="/paket-umroh">
                      <Button variant="outline">Lihat Detail</Button>
                    </Link>
                    <Button 
                      className="bg-accent hover:bg-accent/90"
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

export default JadwalUmroh;
