import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Users } from "lucide-react";

const WisataHalal = () => {
  const destinations = [
    {
      country: "Turki",
      image: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&h=500&fit=crop",
      duration: "8 Hari 7 Malam",
      price: "Rp 18.500.000",
      highlights: ["Istanbul", "Cappadocia", "Bursa", "Masjid Biru"],
    },
    {
      country: "Mesir",
      image: "https://images.unsplash.com/photo-1568322445389-f64ac2515020?w=800&h=500&fit=crop",
      duration: "9 Hari 8 Malam",
      price: "Rp 22.000.000",
      highlights: ["Kairo", "Piramida Giza", "Luxor", "Alexandria"],
    },
    {
      country: "Al Ula - Saudi Arabia",
      image: "https://images.unsplash.com/photo-1591084728795-1149f32d9866?w=800&h=500&fit=crop",
      duration: "6 Hari 5 Malam",
      price: "Rp 28.000.000",
      highlights: ["Al Ula", "Madain Saleh", "Elephant Rock", "Hegra"],
    },
    {
      country: "Bosnia Herzegovina",
      image: "https://images.unsplash.com/photo-1601990369697-02bda04fe1ec?w=800&h=500&fit=crop",
      duration: "8 Hari 7 Malam",
      price: "Rp 24.500.000",
      highlights: ["Sarajevo", "Mostar", "Jembatan Tua", "Museum Perang"],
    },
    {
      country: "Malaysia - Singapura",
      image: "https://images.unsplash.com/photo-1508062878650-88b52897f298?w=800&h=500&fit=crop",
      duration: "6 Hari 5 Malam",
      price: "Rp 12.500.000",
      highlights: ["Kuala Lumpur", "Genting", "Singapura", "Legoland"],
    },
    {
      country: "Maroko",
      image: "https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?w=800&h=500&fit=crop",
      duration: "10 Hari 9 Malam",
      price: "Rp 32.000.000",
      highlights: ["Casablanca", "Marrakech", "Fes", "Chefchaouen"],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Header */}
      <section className="py-16 bg-gradient-to-r from-primary/10 to-accent/10">
        <div className="container mx-auto px-4 text-center">
          <MapPin className="h-16 w-16 mx-auto mb-4 text-primary" />
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Wisata Halal</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Jelajahi keindahan dunia dengan cara yang sesuai dengan nilai-nilai Islam. Destinasi wisata halal pilihan dengan fasilitas dan layanan yang Islami.
          </p>
        </div>
      </section>

      {/* Destinations Grid */}
      <section className="py-16 container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {destinations.map((destination, index) => (
            <div key={index} className="bg-card rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow">
              <div className="relative h-48 overflow-hidden">
                <img
                  src={destination.image}
                  alt={destination.country}
                  className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                />
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold mb-3">{destination.country}</h3>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{destination.duration}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>Min. 15 Jamaah</span>
                  </div>
                </div>
                <div className="mb-4">
                  <p className="text-sm font-semibold mb-2">Highlight Destinasi:</p>
                  <div className="flex flex-wrap gap-2">
                    {destination.highlights.map((highlight, idx) => (
                      <span key={idx} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        {highlight}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">Mulai dari</p>
                    <p className="text-xl font-bold text-primary">{destination.price}</p>
                  </div>
                  <Button className="bg-accent hover:bg-accent/90">Lihat Detail</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Why Choose Halal Tourism */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Mengapa Wisata Halal?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Destinasi Islami</h3>
              <p className="text-sm text-muted-foreground">
                Kunjungi tempat-tempat bersejarah Islam dan masjid-masjid megah di seluruh dunia
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Fasilitas Halal</h3>
              <p className="text-sm text-muted-foreground">
                Makanan halal, waktu sholat terjaga, dan akomodasi yang sesuai syariah
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Itinerary Fleksibel</h3>
              <p className="text-sm text-muted-foreground">
                Jadwal yang mempertimbangkan waktu ibadah dan kebutuhan spiritual
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default WisataHalal;
