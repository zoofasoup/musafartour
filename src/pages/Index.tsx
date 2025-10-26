import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PackageCard } from "@/components/PackageCard";
import { FeatureCard } from "@/components/FeatureCard";
import { TestimonialCard } from "@/components/TestimonialCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plane, MapPin, Hotel, MessageCircle, Heart } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import heroImage from "@/assets/foto umroh rame.webp";
import makkahImage from "@/assets/makkah.jpg";
import madinahImage from "@/assets/madinah.jpg";
import musafarLogo from "@/assets/musafar-logo.svg";
const Index = () => {
  const [category, setCategory] = useState<string>("all");
  const [airline, setAirline] = useState<string>("all");
  const [month, setMonth] = useState<string>("all");
  const [flightType, setFlightType] = useState<string>("all");
  const packages = [{
    image: makkahImage,
    title: "Paket Umroh Comfort + Thaif, Juli 2025",
    price: "Rp 28.500.000",
    duration: "12 Hari",
    airline: "Garuda Indonesia",
    hotelClass: "Bintang 4 (Dekat Haram)",
    departureCity: "Jakarta",
    category: "Comfort"
  }, {
    image: madinahImage,
    title: "Paket Umroh Budget, Agustus 2025",
    price: "Rp 22.000.000",
    duration: "9 Hari",
    airline: "Saudia Airlines",
    hotelClass: "Bintang 3",
    departureCity: "Surabaya",
    category: "Budget"
  }, {
    image: makkahImage,
    title: "Paket Umroh Premium Bintang 5, September 2025",
    price: "Rp 45.000.000",
    duration: "14 Hari",
    airline: "Emirates",
    hotelClass: "Bintang 5 (View Haram)",
    departureCity: "Jakarta",
    category: "Five-Star"
  }];
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
  const testimonials = [{
    name: "Siti Nurhaliza",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop",
    text: "Alhamdulillah, Umroh kami bersama Musafar Tour benar-benar diberkahi. Timnya sangat peduli dan profesional. Sangat direkomendasikan!",
    location: "Jakarta"
  }, {
    name: "Ahmad Fauzi",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    text: "Semuanya diatur dengan sempurna. Hotelnya dekat dengan Haram dan pembimbing Musamin sangat membantu. Keputusan terbaik!",
    location: "Bandung"
  }, {
    name: "Fatimah Rahman",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
    text: "Keluarga saya merasa seperti di rumah sepanjang perjalanan. Musafar Tour membuat perjalanan spiritual kami tak terlupakan. Terima kasih!",
    location: "Surabaya"
  }];
  const handleWhatsAppClick = () => {
    window.open("https://wa.me/6281234567890?text=Halo%20Musamin,%20saya%20tertarik%20untuk%20mengetahui%20lebih%20lanjut%20tentang%20paket%20Umroh", "_blank");
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

        {/* Filter Bar */}
        <div className="bg-card p-6 rounded-lg shadow-md mb-12 sticky top-20 z-40 border">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
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
                <SelectItem value="saudia">Saudia Airlines</SelectItem>
                <SelectItem value="qatar">Qatar Airways</SelectItem>
                <SelectItem value="emirates">Emirates</SelectItem>
              </SelectContent>
            </Select>

            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger>
                <SelectValue placeholder="Bulan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Bulan</SelectItem>
                <SelectItem value="june">Juni 2025</SelectItem>
                <SelectItem value="july">Juli 2025</SelectItem>
                <SelectItem value="august">Agustus 2025</SelectItem>
                <SelectItem value="september">September 2025</SelectItem>
                <SelectItem value="october">Oktober 2025</SelectItem>
              </SelectContent>
            </Select>

            <Select value={flightType} onValueChange={setFlightType}>
              <SelectTrigger>
                <SelectValue placeholder="Jenis Penerbangan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Jenis</SelectItem>
                <SelectItem value="direct">Langsung</SelectItem>
                <SelectItem value="transit">Transit</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="ghost" className="w-full text-primary hover:text-primary hover:bg-primary/5" onClick={() => {
          setCategory("all");
          setAirline("all");
          setMonth("all");
          setFlightType("all");
        }}>
            Reset Filter
          </Button>
        </div>

        {/* Package Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg, index) => <PackageCard key={index} {...pkg} />)}
        </div>
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
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-2 text-foreground">Kisah Nyata dari Musafriends Kami</h2>
            <p className="text-muted-foreground">Dengarkan dari mereka yang telah menempuh jalan yang diberkahi ini bersama kami.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => <TestimonialCard key={index} {...testimonial} />)}
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