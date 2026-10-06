import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Compass } from "lucide-react";

const NotFound = () => (
  <div className="min-h-screen bg-background flex flex-col">
    <SEO title="Halaman Tidak Ditemukan - Musafar Tour" noindex useDefaults={false} />
    <Navbar />
    <main className="flex-1 container mx-auto px-6 md:px-8 py-24 text-center">
      <Compass className="h-16 w-16 mx-auto mb-6 text-muted-foreground" aria-hidden />
      <p className="text-sm font-semibold tracking-widest text-muted-foreground mb-2">404</p>
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">Halaman tidak ditemukan</h1>
      <p className="text-muted-foreground mb-10 max-w-md mx-auto">
        Halaman yang kamu cari mungkin sudah dipindahkan atau tidak tersedia lagi.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button variant="brand" asChild size="lg">
          <Link to="/paket-umroh">Lihat Paket Umroh</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to="/">Kembali ke Beranda</Link>
        </Button>
      </div>
      <p className="mt-8 text-sm text-muted-foreground">
        Sudah mendaftar? <Link to="/cek-status" className="font-semibold text-foreground underline underline-offset-4">Cek status pendaftaran</Link>
      </p>
    </main>
    <Footer />
  </div>
);

export default NotFound;
