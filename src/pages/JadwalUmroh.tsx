import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Plane, Clock } from "lucide-react";
import { formatWhatsAppUrl } from "@/lib/utils";

const JadwalUmroh = () => {
  const [month, setMonth] = useState<string>("all");
  const [packageType, setPackageType] = useState<string>("all");

  const schedules = [
    { date: "15 Juni 2025", packageName: "Paket Umroh Budget Transit", duration: "9 Hari", airline: "Garuda Indonesia", seats: "12 seat tersisa", type: "Budget" },
    { date: "22 Juni 2025", packageName: "Paket Umroh Comfort", duration: "10 Hari", airline: "Qatar Airways", seats: "8 seat tersisa", type: "Comfort" },
    { date: "5 Juli 2025", packageName: "Paket Umroh Comfort + Thaif", duration: "12 Hari", airline: "Garuda Indonesia", seats: "15 seat tersisa", type: "Comfort" },
    { date: "18 Juli 2025", packageName: "Paket Umroh Direct Flight", duration: "10 Hari", airline: "Qatar Airways", seats: "6 seat tersisa", type: "Comfort" },
    { date: "2 Agustus 2025", packageName: "Paket Umroh Budget", duration: "9 Hari", airline: "Saudia Airlines", seats: "20 seat tersisa", type: "Budget" },
    { date: "16 Agustus 2025", packageName: "Paket Umroh Premium Bintang 5", duration: "14 Hari", airline: "Emirates", seats: "5 seat tersisa", type: "Five-Star" },
    { date: "7 September 2025", packageName: "Paket Umroh Premium", duration: "14 Hari", airline: "Emirates", seats: "10 seat tersisa", type: "Five-Star" },
    { date: "25 September 2025", packageName: "Paket Umroh Comfort", duration: "12 Hari", airline: "Garuda Indonesia", seats: "18 seat tersisa", type: "Comfort" },
    { date: "10 Oktober 2025", packageName: "Paket Umroh Luxury", duration: "15 Hari", airline: "Emirates", seats: "4 seat tersisa", type: "Five-Star" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Header */}
      <section className="py-16 bg-gradient-to-r from-primary/10 to-accent/10">
        <div className="container mx-auto px-4 text-center">
          <Calendar className="h-16 w-16 mx-auto mb-4 text-primary" />
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Jadwal Keberangkatan Umroh</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Lihat jadwal keberangkatan terbaru dan pilih waktu yang paling sesuai untuk perjalanan spiritual Anda
          </p>
        </div>
      </section>

      {/* Filter Section */}
      <section className="py-8 container mx-auto px-4">
        <div className="bg-card p-6 rounded-lg shadow-md border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih Bulan" />
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
          </div>
        </div>
      </section>

      {/* Schedule List */}
      <section className="py-8 pb-16 container mx-auto px-4">
        <div className="space-y-4">
          {schedules.map((schedule, index) => (
            <div key={index} className="bg-card p-6 rounded-lg shadow-md border hover:shadow-lg transition-shadow">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    <span className="font-bold text-lg">{schedule.date}</span>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{schedule.packageName}</h3>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {schedule.duration}
                    </div>
                    <div className="flex items-center gap-1">
                      <Plane className="h-4 w-4" />
                      {schedule.airline}
                    </div>
                    <span className="text-accent font-medium">{schedule.seats}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link to="/paket-umroh">
                    <Button variant="outline">Lihat Paket</Button>
                  </Link>
                  <Button 
                    className="bg-accent hover:bg-accent/90"
                    onClick={() => {
                      const message = `Halo Musafar Tour, saya ingin mendaftar untuk ${schedule.packageName} dengan keberangkatan ${schedule.date}.`;
                      const whatsappUrl = formatWhatsAppUrl("6281234567890", message);
                      window.open(whatsappUrl, "_blank");
                    }}
                  >
                    Daftar Sekarang
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default JadwalUmroh;
