import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Plane, Clock, Package, Bell } from "lucide-react";
import { redirectToWhatsApp } from "@/lib/chatRedirect";
import { usePublishedPackages } from "@/hooks/usePackages";
import { TIER_LABELS } from "@/components/package-detail/TierSelector";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { isPackageUnavailable } from "@/lib/utils";

const monthKey = (date: string) => format(new Date(date), "yyyy-MM");
const monthLabel = (date: string) => format(new Date(date), "MMMM yyyy", { locale: localeId });

const JadwalUmroh = () => {
  const [month, setMonth] = useState<string>("all");
  const [tier, setTier] = useState<string>("all");
  const [airline, setAirline] = useState<string>("all");
  const [flightType, setFlightType] = useState<string>("all");

  // Only upcoming departures come back from this hook.
  const { data: packages = [], isLoading: loading } = usePublishedPackages();

  // Filter options come from the actual schedule, not a hard-coded list.
  const options = useMemo(() => {
    const months = new Map<string, string>();
    const tiers = new Set<string>();
    const airlines = new Set<string>();
    packages.forEach((p) => {
      months.set(monthKey(p.departure_date), monthLabel(p.departure_date));
      (p.available_tiers || []).forEach((t) => tiers.add(t));
      if (p.flight) airlines.add(p.flight);
    });
    return {
      months: [...months.entries()].sort(([a], [b]) => a.localeCompare(b)),
      tiers: [...tiers],
      airlines: [...airlines].sort(),
    };
  }, [packages]);

  const filteredPackages = packages.filter((pkg) => {
    const monthMatch = month === "all" || monthKey(pkg.departure_date) === month;
    const tierMatch = tier === "all" || (pkg.available_tiers || []).includes(tier);
    const airlineMatch = airline === "all" || pkg.flight === airline;
    const flightTypeMatch = flightType === "all" || (pkg.flight_type || "").toLowerCase() === flightType;
    return monthMatch && tierMatch && airlineMatch && flightTypeMatch;
  });

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Jadwal Keberangkatan Umroh 2026 - Musafar Tour"
        description="Jadwal keberangkatan umroh Musafar Tour terbaru: tanggal, maskapai, dan sisa seat setiap rombongan. Berangkat setiap bulan dengan kuota terbatas."
        canonicalUrl="https://musafartour.com/jadwal-umroh"
      />
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
                {options.months.map(([key, label]) => (
                  <SelectItem key={key} value={key} className="capitalize">{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={tier} onValueChange={setTier}>
              <SelectTrigger>
                <SelectValue placeholder="Jenis Paket" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Paket</SelectItem>
                {options.tiers.map((t) => (
                  <SelectItem key={t} value={t}>{TIER_LABELS[t] || t}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={airline} onValueChange={setAirline}>
              <SelectTrigger>
                <SelectValue placeholder="Maskapai" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Maskapai</SelectItem>
                {options.airlines.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={flightType} onValueChange={setFlightType}>
              <SelectTrigger>
                <SelectValue placeholder="Jenis Penerbangan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Penerbangan</SelectItem>
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
              setTier("all");
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
            {filteredPackages.map((pkg) => {
              const soldOut = isPackageUnavailable(pkg);
              const depDate = format(new Date(pkg.departure_date), "d MMMM yyyy", { locale: localeId });
              return (
              <div key={pkg.id} className="bg-card p-6 rounded-lg shadow-md border hover:shadow-lg transition-shadow">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      <span className="font-bold text-lg">{depDate}</span>
                      {soldOut && <Badge variant="destructive">Penuh</Badge>}
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
                      <span className="font-medium text-foreground">
                        {(pkg.flight_type || "").toLowerCase() === "direct" ? "Direct" : "Transit"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" asChild>
                      <Link to={`/paket-umroh/${pkg.slug || pkg.id}`}>Lihat Detail</Link>
                    </Button>
                    {soldOut ? (
                      <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() =>
                          redirectToWhatsApp(
                            `Halo Musafar Tour, saya ingin masuk waitlist untuk ${pkg.package_name} dengan keberangkatan ${depDate}. Mohon kabari jika ada seat kosong.`
                          )
                        }
                      >
                        <Bell className="h-4 w-4" /> Gabung Waitlist
                      </Button>
                    ) : (
                      <Button
                        onClick={() =>
                          redirectToWhatsApp(
                            `Halo Musafar Tour, saya ingin mendaftar untuk ${pkg.package_name} dengan keberangkatan ${depDate}.`
                          )
                        }
                      >
                        Daftar Sekarang
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
};

export default JadwalUmroh;
