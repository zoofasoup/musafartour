import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Clock, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatWhatsAppUrl } from "@/lib/utils";

interface WisataHalalData {
  id: string;
  title: string;
  destination: string;
  duration: string;
  price: string;
  departure_city: string;
  airline?: string;
  image_url?: string;
  description?: string;
  facilities?: any;
}

const WisataHalal = () => {
  const [destinations, setDestinations] = useState<WisataHalalData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWisataHalal();
  }, []);

  const fetchWisataHalal = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("wisata_halal")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching wisata halal:", error);
    } else {
      setDestinations(data || []);
    }
    setLoading(false);
  };

  const handleInquiry = (destination: WisataHalalData) => {
    const message = `Halo Musafar Tour, saya tertarik dengan paket ${destination.title} - ${destination.destination}. Mohon info lebih lanjut.`;
    const whatsappUrl = formatWhatsAppUrl("081917403797", message);
    window.open(whatsappUrl, "_blank");
  };

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
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-card rounded-lg overflow-hidden shadow-md">
                <Skeleton className="h-48 w-full" />
                <div className="p-6 space-y-4">
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-20 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : destinations.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-xl text-muted-foreground">Belum ada paket wisata halal tersedia</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {destinations.map((destination) => (
              <div key={destination.id} className="bg-card rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow">
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={destination.image_url || "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&h=500&fit=crop"}
                    alt={destination.title}
                    className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-2xl font-bold mb-3">{destination.title}</h3>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{destination.destination}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{destination.duration}</span>
                    </div>
                    {destination.airline && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{destination.airline}</span>
                      </div>
                    )}
                  </div>
                  {destination.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {destination.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div>
                      <p className="text-sm text-muted-foreground">Mulai dari</p>
                      <p className="text-xl font-bold text-primary">{destination.price}</p>
                    </div>
                    <Button 
                      onClick={() => handleInquiry(destination)}
                      className="bg-accent hover:bg-accent/90"
                    >
                      Hubungi Kami
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
