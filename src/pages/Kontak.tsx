import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { GoogleMap } from "@/components/GoogleMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Phone, Mail, MapPin, Clock, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatWhatsAppUrl } from "@/lib/utils";

const Kontak = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const { toast } = useToast();

  const handleWhatsAppClick = () => {
    const message = "Halo Musafar Tour, saya ingin bertanya tentang paket umroh.";
    const whatsappUrl = formatWhatsAppUrl("6281917403797", message);
    window.open(whatsappUrl, "_blank");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.message) {
      toast({
        title: "Form tidak lengkap",
        description: "Mohon lengkapi semua field yang wajib diisi.",
        variant: "destructive",
      });
      return;
    }

    const message = `Halo Musafar Tour,

Nama: ${formData.name}
Email: ${formData.email}
Telepon: ${formData.phone}
Subjek: ${formData.subject}

Pesan:
${formData.message}`;

    const whatsappUrl = formatWhatsAppUrl("6281917403797", message);
    window.open(whatsappUrl, "_blank");
    
    toast({
      title: "Pesan terkirim!",
      description: "Anda akan diarahkan ke WhatsApp untuk mengirim pesan.",
    });

    setFormData({
      name: "",
      email: "",
      phone: "",
      subject: "",
      message: "",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="Kontak Kami - Musafar Tour | Hubungi Tim Musamin"
        description="Hubungi Musafar Tour untuk konsultasi gratis tentang paket umroh, haji khusus, dan wisata halal. WhatsApp: 0819-1740-3797. Kantor di Bekasi, buka Senin-Sabtu."
        keywords="kontak musafar tour, telepon musafar tour, alamat kantor umroh bekasi"
        canonicalUrl="https://musafartour.com/kontak"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "ContactPage",
          "mainEntity": {
            "@type": "TravelAgency",
            "name": "Musafar Tour",
            "telephone": "+6281917403797",
            "email": "musafartour@gmail.com",
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "Commercial Park Harapan Indah Ruko Emerald Blok EB1 No. 28",
              "addressLocality": "Bekasi",
              "addressRegion": "Jawa Barat",
              "postalCode": "17131",
              "addressCountry": "ID"
            }
          }
        }}
      />
      <Navbar />
      
      {/* Header */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4 text-center">
          <MessageCircle className="h-16 w-16 mx-auto mb-4 text-primary" />
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">Hubungi Kami</h1>
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
                    Commercial Park Harapan Indah Ruko Emerald Blok EB1 No. 28<br />
                    Medan Satria, Kota Bekasi, Jawa Barat 17131
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Phone className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Telepon & WhatsApp</h3>
                  <p className="text-sm text-muted-foreground">021-38312137</p>
                  <p className="text-sm text-muted-foreground">0819-1740-3797 (WhatsApp)</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Email</h3>
                  <p className="text-sm text-muted-foreground">musafartour@gmail.com</p>
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
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Nama Lengkap *</label>
                <Input 
                  placeholder="Masukkan nama lengkap Anda"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Email *</label>
                <Input 
                  type="email" 
                  placeholder="nama@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Nomor Telepon</label>
                <Input 
                  type="tel" 
                  placeholder="0819-1740-3797"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Subjek</label>
                <Input 
                  placeholder="Perihal pesan Anda"
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Pesan *</label>
                <Textarea 
                  placeholder="Tulis pesan Anda di sini..."
                  rows={6}
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  required
                />
              </div>
              
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
                Kirim Pesan
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-8">Lokasi Kantor Kami</h2>
          <div className="max-w-5xl mx-auto">
            <GoogleMap />
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Kontak;
