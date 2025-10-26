import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Phone, Mail, MapPin, Clock, MessageCircle } from "lucide-react";

const Kontak = () => {
  const handleWhatsAppClick = () => {
    window.open("https://wa.me/6281234567890?text=Halo%20Musamin,%20saya%20ingin%20bertanya", "_blank");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Header */}
      <section className="py-16 bg-gradient-to-r from-primary/10 to-accent/10">
        <div className="container mx-auto px-4 text-center">
          <MessageCircle className="h-16 w-16 mx-auto mb-4 text-primary" />
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Hubungi Kami</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Tim Musamin kami siap membantu dan menjawab setiap pertanyaan Anda
          </p>
        </div>
      </section>

      {/* Contact Info & Form */}
      <section className="py-16 container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Information */}
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold mb-6">Informasi Kontak</h2>
              <p className="text-muted-foreground mb-8">
                Jangan ragu untuk menghubungi kami melalui berbagai saluran komunikasi yang tersedia. Kami berkomitmen memberikan respons terbaik untuk setiap pertanyaan Anda.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Alamat Kantor</h3>
                  <p className="text-sm text-muted-foreground">
                    Jl. Kebon Jeruk Raya No. 123<br />
                    Jakarta Barat 11530, Indonesia
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Phone className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Telepon</h3>
                  <p className="text-sm text-muted-foreground">+62 812 3456 7890</p>
                  <p className="text-sm text-muted-foreground">+62 21 5555 4444</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Email</h3>
                  <p className="text-sm text-muted-foreground">info@musafartour.com</p>
                  <p className="text-sm text-muted-foreground">customer@musafartour.com</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Jam Operasional</h3>
                  <p className="text-sm text-muted-foreground">
                    Senin - Jumat: 09.00 - 17.00 WIB<br />
                    Sabtu: 09.00 - 14.00 WIB<br />
                    Minggu & Libur: Tutup
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <Button
                size="lg"
                className="w-full bg-accent hover:bg-accent/90"
                onClick={handleWhatsAppClick}
              >
                <MessageCircle className="mr-2 h-5 w-5" />
                Chat via WhatsApp
              </Button>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-card p-8 rounded-lg shadow-md border">
            <h2 className="text-2xl font-bold mb-6">Kirim Pesan</h2>
            <form className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Nama Lengkap</label>
                <Input placeholder="Masukkan nama lengkap Anda" />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <Input type="email" placeholder="nama@email.com" />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Nomor Telepon</label>
                <Input type="tel" placeholder="+62 812 3456 7890" />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Subjek</label>
                <Input placeholder="Perihal pesan Anda" />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Pesan</label>
                <Textarea 
                  placeholder="Tulis pesan Anda di sini..."
                  rows={6}
                />
              </div>
              
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
                Kirim Pesan
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* Map Section (Placeholder) */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-8">Lokasi Kantor Kami</h2>
          <div className="max-w-5xl mx-auto bg-card rounded-lg overflow-hidden shadow-md">
            <div className="aspect-video bg-muted flex items-center justify-center">
              <div className="text-center">
                <MapPin className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Peta lokasi akan ditampilkan di sini</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Kontak;
