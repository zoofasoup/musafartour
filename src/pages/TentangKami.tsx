import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Heart, Award, Users, Shield } from "lucide-react";

const TentangKami = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Header */}
      <section className="py-16 bg-gradient-to-r from-primary/10 to-accent/10">
        <div className="container mx-auto px-4 text-center">
          <Heart className="h-16 w-16 mx-auto mb-4 text-primary" />
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Tentang Musafar Tour</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Mitra terpercaya Anda dalam perjalanan spiritual ke Tanah Suci
          </p>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-16 container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-6 text-center">Cerita Kami</h2>
          <div className="space-y-4 text-muted-foreground">
            <p>
              Musafar Tour didirikan dengan visi untuk menjadikan perjalanan Umroh dan Haji sebagai pengalaman spiritual yang berkesan dan penuh keberkahan. Sejak berdiri, kami telah melayani ribuan jamaah dengan penuh dedikasi dan profesionalisme.
            </p>
            <p>
              Nama "Musafar" diambil dari bahasa Arab yang berarti "perjalanan" atau "musafir". Kami percaya bahwa setiap perjalanan ke Tanah Suci adalah amanah yang harus dijalankan dengan penuh tanggung jawab, kehati-hatian, dan keikhlasan.
            </p>
            <p>
              Tim kami terdiri dari profesional berpengalaman yang memahami kebutuhan jamaah Indonesia. Dengan jaringan mitra terpercaya di Arab Saudi dan destinasi wisata halal lainnya, kami berkomitmen memberikan pelayanan terbaik untuk setiap jamaah.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Nilai-Nilai Kami</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="h-10 w-10 text-primary" />
              </div>
              <h3 className="font-semibold mb-2 text-lg">Melayani dengan Hati</h3>
              <p className="text-sm text-muted-foreground">
                Setiap jamaah adalah keluarga kami yang kami layani dengan sepenuh hati
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="h-10 w-10 text-primary" />
              </div>
              <h3 className="font-semibold mb-2 text-lg">Profesional</h3>
              <p className="text-sm text-muted-foreground">
                Berizin resmi dan berstandar internasional dalam setiap layanan
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-10 w-10 text-primary" />
              </div>
              <h3 className="font-semibold mb-2 text-lg">Kebersamaan</h3>
              <p className="text-sm text-muted-foreground">
                Membangun ukhuwah Islamiyah melalui setiap perjalanan bersama
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-10 w-10 text-primary" />
              </div>
              <h3 className="font-semibold mb-2 text-lg">Amanah</h3>
              <p className="text-sm text-muted-foreground">
                Menjaga kepercayaan jamaah dengan transparansi dan integritas
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Legalitas */}
      <section className="py-16 container mx-auto px-4">
        <div className="max-w-3xl mx-auto bg-card p-8 rounded-lg shadow-md border">
          <h2 className="text-3xl font-bold mb-6 text-center">Legalitas & Sertifikasi</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <Shield className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <p className="font-semibold">Izin PPIU (Penyelenggara Perjalanan Ibadah Umroh)</p>
                <p className="text-sm text-muted-foreground">No. 17102200953750002 - Kementerian Agama RI</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Shield className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <p className="font-semibold">Terdaftar di ASITA (Association of The Indonesian Tours and Travel Agencies)</p>
                <p className="text-sm text-muted-foreground">Anggota resmi asosiasi travel Indonesia</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Shield className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <p className="font-semibold">Sertifikat ISO 9001:2015</p>
                <p className="text-sm text-muted-foreground">Standar manajemen mutu internasional</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Info */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-8">Kantor Kami</h2>
          <div className="max-w-2xl mx-auto bg-card p-8 rounded-lg shadow-md text-center">
            <h3 className="font-semibold text-xl mb-4">PT. Musafar Tour Indonesia</h3>
            <p className="text-muted-foreground mb-2">
              Commercial Park Harapan Indah Ruko Emerald Blok EB1 No. 28<br />
              Medan Satria, Kota Bekasi, Jawa Barat 17131
            </p>
            <p className="text-muted-foreground mb-4">
              Telepon: 021-38312137<br />
              WhatsApp: 0819-1740-3797<br />
              Email: musafartour@gmail.com
            </p>
            <p className="text-sm text-muted-foreground">
              Senin - Jumat: 09.00 - 17.00 WIB<br />
              Sabtu: 09.00 - 14.00 WIB
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default TentangKami;
