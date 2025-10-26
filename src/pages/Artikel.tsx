import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { BookOpen, Clock, User } from "lucide-react";

const Artikel = () => {
  const articles = [
    {
      title: "Panduan Lengkap Persiapan Umroh untuk Pemula",
      excerpt: "Tips dan panduan praktis untuk Anda yang akan berangkat Umroh pertama kali. Mulai dari dokumen hingga perlengkapan yang harus dibawa.",
      image: "https://images.unsplash.com/photo-1591604021695-0c69b7c05981?w=800&h=400&fit=crop",
      author: "Tim Musafar",
      date: "15 Januari 2025",
      readTime: "5 menit",
      category: "Panduan",
    },
    {
      title: "Doa-Doa Penting Saat Umroh dan Haji",
      excerpt: "Kumpulan doa-doa yang dianjurkan untuk dibaca saat melaksanakan ibadah Umroh dan Haji di Tanah Suci.",
      image: "https://images.unsplash.com/photo-1564769625905-50e93615e769?w=800&h=400&fit=crop",
      author: "Ustadz Ahmad",
      date: "10 Januari 2025",
      readTime: "8 menit",
      category: "Ibadah",
    },
    {
      title: "Tips Menjaga Kesehatan Selama Umroh",
      excerpt: "Cara menjaga kondisi tubuh tetap fit dan sehat selama melaksanakan ibadah Umroh di Arab Saudi.",
      image: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&h=400&fit=crop",
      author: "dr. Fatimah",
      date: "5 Januari 2025",
      readTime: "6 menit",
      category: "Kesehatan",
    },
    {
      title: "Mengenal Sejarah Masjidil Haram",
      excerpt: "Sejarah dan perkembangan Masjidil Haram dari masa ke masa hingga menjadi masjid terbesar di dunia.",
      image: "https://images.unsplash.com/photo-1542816417-0983c9c9ad53?w=800&h=400&fit=crop",
      author: "Ustadz Ridwan",
      date: "28 Desember 2024",
      readTime: "10 menit",
      category: "Sejarah",
    },
    {
      title: "Perlengkapan Wajib yang Harus Dibawa Saat Umroh",
      excerpt: "Checklist lengkap barang-barang penting yang wajib dibawa saat berangkat Umroh agar perjalanan lebih nyaman.",
      image: "https://images.unsplash.com/photo-1591287915932-7d4b7d6b29c2?w=800&h=400&fit=crop",
      author: "Tim Musafar",
      date: "20 Desember 2024",
      readTime: "7 menit",
      category: "Panduan",
    },
    {
      title: "Adab dan Etika di Tanah Suci",
      excerpt: "Panduan tentang adab dan etika yang harus dijaga saat berada di Makkah dan Madinah.",
      image: "https://images.unsplash.com/photo-1580418827493-f2b22c0a76cb?w=800&h=400&fit=crop",
      author: "Ustadzah Aisyah",
      date: "15 Desember 2024",
      readTime: "6 menit",
      category: "Ibadah",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Header */}
      <section className="py-16 bg-gradient-to-r from-primary/10 to-accent/10">
        <div className="container mx-auto px-4 text-center">
          <BookOpen className="h-16 w-16 mx-auto mb-4 text-primary" />
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Artikel & Tips Umroh</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Panduan, tips, dan informasi bermanfaat seputar perjalanan Umroh dan Haji
          </p>
        </div>
      </section>

      {/* Articles Grid */}
      <section className="py-16 container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {articles.map((article, index) => (
            <article key={index} className="bg-card rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow">
              <div className="relative h-48 overflow-hidden">
                <img
                  src={article.image}
                  alt={article.title}
                  className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute top-4 left-4">
                  <span className="bg-accent text-accent-foreground text-xs font-semibold px-3 py-1 rounded">
                    {article.category}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <h2 className="text-xl font-bold mb-3 line-clamp-2">{article.title}</h2>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                  {article.excerpt}
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{article.author}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{article.readTime}</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{article.date}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center bg-card p-8 rounded-lg shadow-md">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h2 className="text-2xl font-bold mb-4">Dapatkan Tips Terbaru</h2>
            <p className="text-muted-foreground mb-6">
              Berlangganan newsletter kami untuk mendapatkan artikel, tips, dan informasi terbaru seputar Umroh dan Haji
            </p>
            <div className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Email Anda"
                className="flex-1 px-4 py-2 rounded-md border bg-background"
              />
              <button className="bg-accent hover:bg-accent/90 text-accent-foreground px-6 py-2 rounded-md font-semibold">
                Berlangganan
              </button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Artikel;
