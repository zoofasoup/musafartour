import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PackageCard } from "@/components/PackageCard";
import { FeatureCard } from "@/components/FeatureCard";
import { TestimonialCard } from "@/components/TestimonialCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plane, MapPin, Hotel, MessageCircle, Heart, Package } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import heroImage from "@/assets/hero-umroh.webp";
import musafarLogo from "@/assets/musafar-logo.svg";

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
const Index = () => {
  const [category, setCategory] = useState<string>("all");
  const [airline, setAirline] = useState<string>("all");
  const [month, setMonth] = useState<string>("all");
  const [flightType, setFlightType] = useState<string>("all");
  const [duration, setDuration] = useState<string>("all");
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
        .order("departure_date", { ascending: true })
        .limit(6); // Show only 6 packages on homepage

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
    const airlineMatch = airline === "all" || pkg.flight === airline;
    const monthMatch = month === "all" || pkgMonth.includes(month.toLowerCase());
    const flightTypeMatch = flightType === "all" || pkg.flight_type.toLowerCase() === flightType;
    const durationMatch = duration === "all" || 
      (duration === "9" && pkg.duration_days === 9) ||
      (duration === "12" && pkg.duration_days === 12) ||
      (duration === "13" && pkg.duration_days === 13);

    return categoryMatch && airlineMatch && monthMatch && flightTypeMatch && durationMatch;
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
    fiveStarPrice: pkg.five_star_package_price?.quad ? formatPrice(pkg.five_star_package_price.quad) : undefined,
    fiveStarHotelMakkah: pkg.five_star_makkah_hotel_name || undefined,
    fiveStarHotelMakkahRating: pkg.five_star_makkah_hotel_star || undefined,
    fiveStarHotelMadinah: pkg.five_star_madinah_hotel_name || undefined,
    fiveStarHotelMadinahRating: pkg.five_star_madinah_hotel_star || undefined,
    fiveStarTransport: pkg.five_star_transport || undefined,
    bestSellerTransport: pkg.best_seller_transport || undefined,
  }));
  const features = [{
    icon: Plane,
    title: "Penerbangan & Visa Lengkap",
    description: "Pengaturan perjalanan lengkap dengan maskapai terpercaya dan proses visa tanpa ribet."
  }, {
    icon: MapPin,
    title: "Bimbingan Ibadah & Mentoring",
    description: "Pembimbing Musamin berpengalaman mendampingi perjalanan spiritual Anda di setiap langkah."
  }, {
    icon: Hotel,
    title: "Hotel Dekat dengan Haram",
    description: "Akomodasi nyaman dalam jarak berjalan kaki ke Masjidil Haram dan Masjid Nabawi."
  }, {
    icon: Heart,
    title: "Pelayanan Pribadi yang Ramah",
    description: "Tim kami yang peduli selalu siap membantu Anda dengan kehangatan dan dedikasi."
  }];
  const testimonials = [
    {
      name: "Ibu Siti Nurjanah",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Siti",
      text: "Alhamdulillah, pelayanan Musafar Tour sangat memuaskan. Hotel nyaman, guide ramah dan profesional. Pengalaman umroh yang sangat berkesan!",
      location: "Jakarta"
    },
    {
      name: "Bapak Ahmad Fauzi",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ahmad",
      text: "Paket umroh terbaik yang pernah saya ikuti. Tim Musafar sangat membantu dan perhatian terhadap kebutuhan jamaah. Recommended!",
      location: "Bekasi"
    },
    {
      name: "Ibu Nur Azizah",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Nur",
      text: "Pelayanan sangat baik dari awal sampai akhir. Semua sudah diatur dengan detail, jadi jamaah tinggal beribadah dengan khusyuk.",
      location: "Tangerang"
    },
    {
      name: "Bapak Hendra Wijaya",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Hendra",
      text: "Harga terjangkau dengan kualitas service yang excellent. Tour guide sangat membantu dan knowledgeable. Terima kasih Musafar!",
      location: "Bogor"
    },
    {
      name: "Ibu Fatimah Zahra",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Fatimah",
      text: "Umroh bersama Musafar adalah pengalaman spiritual terbaik. Semua fasilitas sangat baik dan tim sangat responsif.",
      location: "Depok"
    },
    {
      name: "Bapak Usman Abdullah",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Usman",
      text: "Sangat puas dengan pelayanan Musafar. Dari handling sampai akomodasi semuanya sempurna. Insya Allah akan umroh lagi dengan Musafar!",
      location: "Cikarang"
    }
  ];
  const handleWhatsAppClick = () => {
    window.open("https://wa.me/6281917403797?text=Halo%20Musamin,%20saya%20tertarik%20untuk%20mengetahui%20lebih%20lanjut%20tentang%20paket%20Umroh", "_blank");
  };
  return <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative h-[90vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{
        backgroundImage: `url(${heroImage})`
      }}>
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
        </div>
        
        <div className="relative z-10 container mx-auto px-4 text-center text-white">
          <img src={musafarLogo} alt="Musafar Tour" className="h-16 mx-auto mb-8 opacity-90" />
          <h1 className="text-4xl md:text-6xl font-bold mb-4 animate-fade-in">Temukan Paket Umroh Sempurna
untuk Perjalanan Anda</h1>
          <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto text-gray-200">
            Musafar Tour menawarkan pengalaman Umroh yang dirancang dengan penuh perhatian, dari budget hingga bintang lima, semuanya dibimbing dengan penuh kasih sayang.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold text-lg px-8" onClick={() => document.getElementById('packages')?.scrollIntoView({
            behavior: 'smooth'
          })}>
              Lihat Semua Paket
            </Button>
            <Button size="lg" variant="outline" className="bg-white/10 border-white text-white hover:bg-white hover:text-foreground font-semibold text-lg px-8 backdrop-blur-sm" onClick={handleWhatsAppClick}>
              <MessageCircle className="mr-2 h-5 w-5" />
              Chat dengan Musamin 🤍
            </Button>
          </div>
        </div>
      </section>

      {/* Filter & Package Catalog */}
      <section id="packages" className="py-16 container mx-auto px-4">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-center mb-2 text-foreground">Paket Umroh Unggulan Kami</h2>
          <p className="text-center text-muted-foreground">Temukan paket yang paling cocok dengan Musafriends!</p>
        </div>

        {/* Filter Bar with Accordion */}
        <div className="bg-card rounded-lg shadow-md mb-12 border">
          <Accordion type="single" collapsible defaultValue="filters" className="w-full">
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
                      <SelectItem value="november">November 2025</SelectItem>
                      <SelectItem value="desember">Desember 2025</SelectItem>
                      <SelectItem value="januari">Januari 2026</SelectItem>
                      <SelectItem value="februari">Februari 2026</SelectItem>
                      <SelectItem value="maret">Maret 2026</SelectItem>
                      <SelectItem value="april">April 2026</SelectItem>
                      <SelectItem value="mei">Mei 2026</SelectItem>
                      <SelectItem value="juni">Juni 2026</SelectItem>
                      <SelectItem value="juli">Juli 2026</SelectItem>
                      <SelectItem value="agustus">Agustus 2026</SelectItem>
                      <SelectItem value="september">September 2026</SelectItem>
                      <SelectItem value="oktober">Oktober 2026</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={airline} onValueChange={setAirline}>
                    <SelectTrigger>
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
                  onClick={() => {
                    setCategory("all");
                    setAirline("all");
                    setMonth("all");
                    setFlightType("all");
                    setDuration("all");
                  }}
                >
                  Reset Filter
                </Button>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
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
            {transformedPackages.map((pkg) => <PackageCard key={pkg.id} {...pkg} />)}
          </div>
        )}
      </section>

      {/* Why Choose Musafar */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-2 text-foreground">Mengapa Memilih Musafar Tour</h2>
            <p className="text-muted-foreground">Kami mendampingi Anda dengan hati dan profesionalisme</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => <FeatureCard key={index} {...feature} />)}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-2 bg-background px-4 py-2 rounded-full shadow-sm mb-4">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span className="font-semibold text-foreground">Verified Google Reviews</span>
            </div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-6 h-6" fill="#FBBC05" viewBox="0 0 24 24">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                  </svg>
                ))}
              </div>
              <span className="text-2xl font-bold text-foreground">4.9/5</span>
            </div>
            <p className="text-muted-foreground">dari 150+ review Google</p>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-foreground">
            Apa Kata Musafriends di Google
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto mb-12">
            {testimonials.map((testimonial, index) => (
              <TestimonialCard key={index} {...testimonial} />
            ))}
          </div>
          <div className="text-center">
            <Button
              size="lg"
              variant="secondary"
              onClick={() => window.open('https://share.google/IEeiBZM6iD11Byerq', '_blank')}
              className="gap-2"
            >
              Lihat Semua Review di Google
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Button>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Belum Yakin Paket Umroh Mana yang Cocok untuk Anda?
          </h2>
          <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
            Tim Musamin kami siap membantu Anda menemukan perjalanan sempurna sesuai kebutuhan dan budget Anda.
          </p>
          <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold text-lg px-8" onClick={handleWhatsAppClick}>
            <MessageCircle className="mr-2 h-5 w-5" />
            Konsultasi Sekarang via WhatsApp
          </Button>
        </div>
      </section>

      <Footer />
    </div>;
};
export default Index;