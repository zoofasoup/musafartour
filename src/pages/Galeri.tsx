import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Camera } from "lucide-react";

const Galeri = () => {
  const galleries = [
    {
      title: "Umroh Ramadhan 2024",
      images: [
        "https://images.unsplash.com/photo-1564769625905-50e93615e769?w=600&h=400&fit=crop",
        "https://images.unsplash.com/photo-1591604021695-0c69b7c05981?w=600&h=400&fit=crop",
        "https://images.unsplash.com/photo-1542816417-0983c9c9ad53?w=600&h=400&fit=crop",
        "https://images.unsplash.com/photo-1591287915932-7d4b7d6b29c2?w=600&h=400&fit=crop",
      ],
    },
    {
      title: "Umroh Plus Thaif Maret 2024",
      images: [
        "https://images.unsplash.com/photo-1564769610726-04fa67d68dbb?w=600&h=400&fit=crop",
        "https://images.unsplash.com/photo-1580418827493-f2b22c0a76cb?w=600&h=400&fit=crop",
        "https://images.unsplash.com/photo-1549891216-8a8f79c37a59?w=600&h=400&fit=crop",
        "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=600&h=400&fit=crop",
      ],
    },
    {
      title: "Wisata Halal Turki Februari 2024",
      images: [
        "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=600&h=400&fit=crop",
        "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=600&h=400&fit=crop",
        "https://images.unsplash.com/photo-1527838832700-5059252407fa?w=600&h=400&fit=crop",
        "https://images.unsplash.com/photo-1512907998043-98e23dc16c4e?w=600&h=400&fit=crop",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Header */}
      <section className="py-16 bg-gradient-to-r from-primary/10 to-accent/10">
        <div className="container mx-auto px-4 text-center">
          <Camera className="h-16 w-16 mx-auto mb-4 text-primary" />
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Galeri Jamaah</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Dokumentasi perjalanan spiritual dan momen berharga bersama Musafriends
          </p>
        </div>
      </section>

      {/* Gallery Sections */}
      <section className="py-16 container mx-auto px-4">
        <div className="space-y-16">
          {galleries.map((gallery, index) => (
            <div key={index}>
              <h2 className="text-2xl font-bold mb-6 text-center">{gallery.title}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {gallery.images.map((image, imgIndex) => (
                  <div
                    key={imgIndex}
                    className="relative overflow-hidden rounded-lg aspect-[4/3] group cursor-pointer"
                  >
                    <img
                      src={image}
                      alt={`${gallery.title} - ${imgIndex + 1}`}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <Camera className="h-8 w-8 text-white" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ingin Menjadi Bagian dari Musafriends?</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Bergabunglah dengan ribuan jamaah yang telah merasakan pengalaman spiritual tak terlupakan bersama Musafar Tour
          </p>
          <a href="/">
            <button className="bg-accent hover:bg-accent/90 text-accent-foreground px-8 py-3 rounded-md font-semibold">
              Lihat Paket Umroh
            </button>
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Galeri;
