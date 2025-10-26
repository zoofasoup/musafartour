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
      title: "Paket Umroh Comfort + Thaif, Juli 2025",
      price: "Rp 28.500.000",
      duration: "12 Hari",
      airline: "Garuda Indonesia",
      hotelClass: "Bintang 4 (Dekat Haram)",
      departureCity: "Jakarta",
      category: "Comfort",
    },
    {
      image: madinahImage,
      title: "Paket Umroh Budget, Agustus 2025",
      price: "Rp 22.000.000",
      duration: "9 Hari",
      airline: "Saudia Airlines",
      hotelClass: "Bintang 3",
      departureCity: "Surabaya",
      category: "Budget",
    },
    {
      image: makkahImage,
      title: "Paket Umroh Premium Bintang 5, September 2025",
      price: "Rp 45.000.000",
      duration: "14 Hari",
      airline: "Emirates",
      hotelClass: "Bintang 5 (View Haram)",
      departureCity: "Jakarta",
      category: "Five-Star",
    },
    {
      image: madinahImage,
      title: "Paket Umroh Comfort Direct Flight, Juli 2025",
      price: "Rp 32.000.000",
      duration: "10 Hari",
      airline: "Qatar Airways",
      hotelClass: "Bintang 4",
      departureCity: "Jakarta",
      category: "Comfort",
    },
    {
      image: makkahImage,
      title: "Paket Umroh Budget Transit, Juni 2025",
      price: "Rp 19.500.000",
      duration: "9 Hari",
      airline: "Garuda Indonesia",
      hotelClass: "Bintang 3",
      departureCity: "Bandung",
      category: "Budget",
    },
    {
      image: madinahImage,
      title: "Paket Umroh Luxury, Oktober 2025",
      price: "Rp 52.000.000",
      duration: "15 Hari",
      airline: "Emirates",
      hotelClass: "Bintang 5 (Premium)",
      departureCity: "Jakarta",
      category: "Five-Star",
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
