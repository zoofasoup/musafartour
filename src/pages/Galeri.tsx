import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Camera } from "lucide-react";
import { PkgPanel } from "@/components/package-detail/PkgPanel";
import { Skel } from "@/components/package-list/PkgSkeletons";
import { usePkgNav } from "@/hooks/usePkgNav";
import "@/styles/pkg-v2.css";
import { ImageLightbox } from "@/components/ImageLightbox";
import { supabase } from "@/integrations/supabase/client";
import { LazyImage } from "@/components/ui/lazy-image";

interface GalleryImage {
  id: string;
  title: string;
  image_url: string;
  category: string;
  description?: string;
}

const Galeri = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  usePkgNav(rootRef);
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
    <div ref={rootRef} className="pkg-v2 min-h-screen">
      <SEO 
        title="Galeri Jamaah - Dokumentasi Perjalanan Spiritual | Musafar Tour"
        description="Lihat dokumentasi perjalanan spiritual dan momen berharga jamaah Musafar Tour di Tanah Suci dan destinasi wisata halal lainnya."
        keywords="galeri umroh, foto jamaah, dokumentasi umroh, galeri wisata halal"
        canonicalUrl="https://musafartour.com/galeri"
      />
      <Navbar />
      <main id="main">
        <PkgPanel tone="ink" top>
          <div className="mx-auto max-w-6xl">
            <h1 className="pkg-title">Galeri jamaah</h1>
            <p className="pkg-label mt-4 text-pkg-fg-2">Momen bersama Musafriends.</p>
          </div>
        </PkgPanel>

        <PkgPanel tone="cream" last>
          <div className="mx-auto max-w-6xl">
            {loading ? (
              <div className="space-y-12">
                {[...Array(2)].map((_, g) => (
                  <div key={g}>
                    <Skel className="h-9 w-40" />
                    <div className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
                      {[...Array(4)].map((_, i) => (
                        <Skel key={i} className="aspect-square rounded-[24px]" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : Object.keys(groupedGalleries).length === 0 ? (
              <div className="py-12">
                <Camera className="h-8 w-8 text-pkg-fg-3" aria-hidden />
                <p className="pkg-sub mt-4">Belum ada foto.</p>
              </div>
            ) : (
              <div className="space-y-14">
                {Object.entries(groupedGalleries).map(([category, images]) => (
                  <section key={category}>
                    <h2 className="pkg-h2 capitalize">{category}</h2>
                    <div className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
                      {images.map((image, imgIndex) => (
                        <button
                          type="button"
                          key={image.id}
                          aria-label={`Buka foto: ${image.title}`}
                          className="pkg-press relative aspect-square overflow-hidden rounded-[24px] bg-pkg-cream-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink focus-visible:ring-offset-2"
                          onClick={() => openLightbox(images.map((i) => i.image_url), imgIndex)}
                        >
                          <LazyImage src={image.image_url} alt={image.title} className="h-full w-full object-cover" loading="lazy" />
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </PkgPanel>
      </main>

      <PkgPanel tone="red" className="!pb-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="pkg-h2 text-pkg-on-red text-balance">Jadi bagian dari Musafriends.</h2>
          <Link
            to="/paket-umroh"
            className="pkg-press pkg-glass-deep pkg-label mt-6 inline-flex h-14 items-center rounded-full px-7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-on-red focus-visible:ring-offset-2"
          >
            Lihat paket umroh
          </Link>
        </div>
      </PkgPanel>

      <ImageLightbox
        images={currentImages}
        currentIndex={currentImageIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onPrevious={handlePrevious}
        onNext={handleNext}
      />

      <Footer variant="pkg" />
    </div>
  );
};

export default Galeri;
