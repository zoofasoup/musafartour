import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Camera } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageLightbox } from "@/components/ImageLightbox";
import { supabase } from "@/integrations/supabase/client";

interface GalleryImage {
  id: string;
  title: string;
  image_url: string;
  category: string;
  description?: string;
}

const Galeri = () => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentImages, setCurrentImages] = useState<string[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGalleryImages();
  }, []);

  const fetchGalleryImages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("gallery_images")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) {
      console.error("Error fetching gallery images:", error);
    } else {
      setGalleryImages(data || []);
    }
    setLoading(false);
  };

  const openLightbox = (images: string[], index: number) => {
    setCurrentImages(images);
    setCurrentImageIndex(index);
    setLightboxOpen(true);
  };

  const handlePrevious = () => {
    setCurrentImageIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentImageIndex((prev) => Math.min(currentImages.length - 1, prev + 1));
  };

  // Group images by category
  const groupedGalleries = galleryImages.reduce((acc, image) => {
    const category = image.category || "Umum";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(image);
    return acc;
  }, {} as Record<string, GalleryImage[]>);

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="Galeri Jamaah - Dokumentasi Perjalanan Spiritual | Musafar Tour"
        description="Lihat dokumentasi perjalanan spiritual dan momen berharga jamaah Musafar Tour di Tanah Suci dan destinasi wisata halal lainnya."
        keywords="galeri umroh, foto jamaah, dokumentasi haji, galeri wisata halal"
        canonicalUrl="https://musafartour.com/galeri"
      />
      <Navbar />
      
      {/* Header */}
      <section className="py-16 bg-card border-b">
        <div className="container mx-auto px-6 md:px-8 text-center">
          <Camera className="h-16 w-16 mx-auto mb-4 text-primary" />
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">Galeri Jamaah</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Dokumentasi perjalanan spiritual dan momen berharga bersama Musafriends
          </p>
        </div>
      </section>

      {/* Gallery Sections */}
      <section className="py-16 container mx-auto px-6 md:px-8">
        {loading ? (
          <div className="space-y-16">
            {[...Array(3)].map((_, groupIndex) => (
              <div key={groupIndex}>
                <Skeleton className="h-8 w-48 mx-auto mb-6" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, imgIndex) => (
                    <Skeleton key={imgIndex} className="aspect-[4/3] rounded-lg" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : Object.keys(groupedGalleries).length === 0 ? (
          <div className="text-center py-12">
            <Camera className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-xl text-muted-foreground">Belum ada galeri tersedia</p>
          </div>
        ) : (
          <div className="space-y-16">
            {Object.entries(groupedGalleries).map(([category, images]) => (
              <div key={category}>
                <h2 className="text-2xl font-bold mb-6 text-center">{category}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {images.map((image, imgIndex) => (
                    <div
                      key={image.id}
                      className="relative overflow-hidden rounded-lg aspect-[4/3] group cursor-pointer"
                      onClick={() => openLightbox(images.map(i => i.image_url), imgIndex)}
                    >
                      <img
                        src={image.image_url}
                        alt={image.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        loading="lazy"
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
        )}
      </section>

      {/* CTA */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-6 md:px-8 text-center">
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

      <ImageLightbox
        images={currentImages}
        currentIndex={currentImageIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onPrevious={handlePrevious}
        onNext={handleNext}
      />

      <Footer />
    </div>
  );
};

export default Galeri;