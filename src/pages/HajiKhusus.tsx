import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { CheckCircle, Plane, Hotel, Users, Calendar, MessageCircle } from "lucide-react";
import makkahImage from "@/assets/haji-khusus-makkah-hero.webp";

const HajiKhusus = () => {
  const features = [
    "Bimbingan Spiritual Intensif oleh Ustadz Berpengalaman",
    "Hotel Bintang 5 dengan Jarak Dekat ke Masjidil Haram",
    "Fasilitas Transportasi VIP selama di Arab Saudi",
    "Katering Makanan Indonesia yang Halal & Lezat",
    "Perlengkapan Haji Berkualitas Premium",
    "Pendampingan Kesehatan 24 Jam",
  ];

  const schedules = [
    { year: "2025", quota: "Kuota Terbatas", price: "Mulai Rp 185.000.000" },
    { year: "2026", quota: "Tersedia", price: "Mulai Rp 175.000.000" },
  ];

  const handleWhatsAppClick = () => {
    window.open("https://wa.me/6281917403797?text=Halo%20Musamin,%20saya%20tertarik%20untuk%20mengetahui%20lebih%20lanjut%20tentang%20program%20Haji%20Khusus", "_blank");
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="Paket Haji Khusus 2025 - Pelayanan Premium | Musafar Tour"
        description="Haji khusus dengan kuota terbatas. Pelayanan VIP, hotel dekat Masjidil Haram, pendampingan 24/7. Harga mulai 175 juta. Booking sekarang!"
        keywords="haji khusus, paket haji, haji plus, haji 2025, haji VIP"
        canonicalUrl="https://musafartour.com/haji-khusus"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "Service",
          "serviceType": "Haji Khusus",
          "provider": {
            "@type": "TravelAgency",
            "name": "Musafar Tour"
          },
          "offers": {
            "@type": "Offer",
            "price": "175000000",
            "priceCurrency": "IDR",
            "availability": "https://schema.org/LimitedAvailability"
          }
        }}
      />
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative h-[60vh] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${makkahImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/40" />
        </div>
        
        <div className="relative z-10 container mx-auto px-4 text-center text-white">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">Program Haji Khusus</h1>
          <p className="text-lg md:text-xl max-w-2xl mx-auto">
            Wujudkan ibadah haji Anda dengan pelayanan eksklusif dan penuh kenyamanan bersama Musafar Tour
          </p>
        </div>
      </section>

      {/* Introduction */}
      <section className="py-16 container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Haji Khusus dengan Pelayanan Premium</h2>
          <p className="text-muted-foreground text-lg">
            Program Haji Khusus Musafar Tour dirancang khusus untuk Anda yang menginginkan pengalaman ibadah haji yang nyaman, khusyuk, dan penuh keberkahan. Dengan fasilitas premium dan bimbingan spiritual yang komprehensif, kami hadir untuk menemani setiap langkah perjalanan suci Anda.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Fasilitas & Keunggulan</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start gap-3 bg-card p-4 rounded-lg border">
                <CheckCircle className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm">{feature}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Jadwal & Harga */}
      <section className="py-16 container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">Jadwal & Investasi</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {schedules.map((schedule, index) => (
            <div key={index} className="bg-card p-8 rounded-lg shadow-md border text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-2xl font-bold mb-2">Haji {schedule.year}</h3>
              <p className="text-muted-foreground mb-4">{schedule.quota}</p>
              <p className="text-3xl font-bold text-primary mb-6">{schedule.price}</p>
              <Button className="w-full bg-accent hover:bg-accent/90" onClick={handleWhatsAppClick}>
                Konsultasi Sekarang
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* Package Includes */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Paket Termasuk</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <div className="bg-card p-6 rounded-lg shadow-md text-center">
              <Plane className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="font-semibold mb-2">Penerbangan</h3>
              <p className="text-sm text-muted-foreground">Tiket pesawat PP kelas ekonomi</p>
            </div>
            <div className="bg-card p-6 rounded-lg shadow-md text-center">
              <Hotel className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="font-semibold mb-2">Akomodasi</h3>
              <p className="text-sm text-muted-foreground">Hotel Bintang 5 di Makkah & Madinah</p>
            </div>
            <div className="bg-card p-6 rounded-lg shadow-md text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="font-semibold mb-2">Pembimbing</h3>
              <p className="text-sm text-muted-foreground">Ustadz & tour leader berpengalaman</p>
            </div>
            <div className="bg-card p-6 rounded-lg shadow-md text-center">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="font-semibold mb-2">Visa & Dokumen</h3>
              <p className="text-sm text-muted-foreground">Pengurusan visa & perlengkapan haji</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Siap Berangkat Haji Tahun Ini?
          </h2>
          <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
            Kuota terbatas! Hubungi tim Musamin kami sekarang untuk informasi lebih lanjut dan reservasi tempat Anda.
          </p>
          <Button
            size="lg"
            className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold text-lg px-8"
            onClick={handleWhatsAppClick}
          >
            <MessageCircle className="mr-2 h-5 w-5" />
            Hubungi Musamin Sekarang
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default HajiKhusus;
