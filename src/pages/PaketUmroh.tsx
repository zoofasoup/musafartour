import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { PackageCard } from "@/components/PackageCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";
import makkahImage from "@/assets/makkah.jpg";
import madinahImage from "@/assets/madinah.jpg";

const PaketUmroh = () => {
  const [category, setCategory] = useState<string>("all");
  const [airline, setAirline] = useState<string>("all");
  const [month, setMonth] = useState<string>("all");

  const packages = [
    {
      image: makkahImage,
      title: "Umroh Plus Aqsha",
      price: "52,9 Juta",
      date: "8 November 2025",
      duration: "12 Hari",
      airline: "Qatar Airways",
      transit: "Transit",
      hotelMakkah: "Concorde Al Khair *4",
      hotelMakkahRating: 4,
      hotelMadinah: "Emaar Grand *5",
      hotelMadinahRating: 5,
      category: "Comfort",
      seatAvailable: true
    },
    {
      image: madinahImage,
      title: "Paket Umroh Budget",
      price: "22 Juta",
      date: "15 Agustus 2025",
      duration: "9 Hari",
      airline: "Saudia Airlines",
      hotelMakkah: "Makkah Hotel *3",
      hotelMakkahRating: 3,
      hotelMadinah: "Madinah Inn *3",
      hotelMadinahRating: 3,
      category: "Budget",
      seatAvailable: true
    },
    {
      image: makkahImage,
      title: "Paket Umroh Premium",
      price: "45 Juta",
      date: "20 September 2025",
      duration: "14 Hari",
      airline: "Emirates",
      transit: "Direct",
      hotelMakkah: "Hilton Makkah *5",
      hotelMakkahRating: 5,
      hotelMadinah: "Marriott Madinah *5",
      hotelMadinahRating: 5,
      category: "Five-Star",
      seatAvailable: false
    },
    {
      image: madinahImage,
      title: "Paket Umroh Comfort",
      price: "32 Juta",
      date: "10 Juli 2025",
      duration: "10 Hari",
      airline: "Qatar Airways",
      transit: "Direct",
      hotelMakkah: "Al Masa *4",
      hotelMakkahRating: 4,
      hotelMadinah: "Dar Al Eiman *4",
      hotelMadinahRating: 4,
      category: "Comfort",
      seatAvailable: true
    },
    {
      image: makkahImage,
      title: "Paket Umroh Budget Transit",
      price: "19,5 Juta",
      date: "5 Juni 2025",
      duration: "9 Hari",
      airline: "Garuda Indonesia",
      transit: "Transit",
      hotelMakkah: "Safwa *3",
      hotelMakkahRating: 3,
      hotelMadinah: "Al Haram *3",
      hotelMadinahRating: 3,
      category: "Budget",
      seatAvailable: true
    },
    {
      image: madinahImage,
      title: "Paket Umroh Luxury",
      price: "65 Juta",
      date: "25 Oktober 2025",
      duration: "15 Hari",
      airline: "Emirates",
      transit: "Direct",
      hotelMakkah: "Raffles Makkah *5",
      hotelMakkahRating: 5,
      hotelMadinah: "Oberoi Madinah *5",
      hotelMadinahRating: 5,
      category: "Five-Star",
      seatAvailable: true
    },
  ];

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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
          </div>
          <Button
            variant="ghost"
            className="w-full text-primary hover:text-primary hover:bg-primary/5"
            onClick={() => {
              setCategory("all");
              setAirline("all");
              setMonth("all");
            }}
          >
            Reset Filter
          </Button>
        </div>

        {/* Package Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg, index) => (
            <PackageCard key={index} {...pkg} />
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PaketUmroh;
