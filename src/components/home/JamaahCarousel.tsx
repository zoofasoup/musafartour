import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Fallback placeholder images if database is empty
const fallbackPhotos = [
  { id: "1", image_url: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=300&h=300&fit=crop" },
  { id: "2", image_url: "https://images.unsplash.com/photo-1564769625905-50e93615e769?w=300&h=300&fit=crop" },
  { id: "3", image_url: "https://images.unsplash.com/photo-1542816417-0983c9c9ad53?w=300&h=300&fit=crop" },
  { id: "4", image_url: "https://images.unsplash.com/photo-1565552645632-d725f8bfc19a?w=300&h=300&fit=crop" },
  { id: "5", image_url: "https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=300&h=300&fit=crop" },
  { id: "6", image_url: "https://images.unsplash.com/photo-1466442929976-97f336a657be?w=300&h=300&fit=crop" },
];

export const JamaahCarousel = () => {
  const [isPaused, setIsPaused] = useState(false);

  // Fetch jamaah photos from gallery_images with category 'jamaah'
  const { data: galleryPhotos } = useQuery({
    queryKey: ["jamaah-photos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gallery_images")
        .select("id, image_url, title")
        .eq("is_active", true)
        .eq("category", "jamaah")
        .order("display_order", { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Use gallery photos if available, otherwise fallback
  const photos = galleryPhotos && galleryPhotos.length > 0 ? galleryPhotos : fallbackPhotos;

  // Duplicate photos for seamless infinite loop
  const duplicatedPhotos = [...photos, ...photos];

  return (
    <section className="py-16 md:py-20 bg-gradient-to-b from-muted/30 to-background overflow-hidden">
      <div className="container mx-auto px-4 mb-10">
        <div className="text-center max-w-3xl mx-auto">
          <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4">
            1.200+ Jamaah Telah Berangkat
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Mereka Sudah Berangkat Bersama Musafar
          </h2>
          <p className="text-muted-foreground text-lg">
            Ribuan jamaah telah mewujudkan impian umroh mereka bersama kami
          </p>
        </div>
      </div>

      {/* Infinite Carousel */}
      <div
        className="relative w-full overflow-hidden"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div
          className="flex animate-scroll-photos"
          style={{
            animationPlayState: isPaused ? "paused" : "running",
          }}
        >
          {duplicatedPhotos.map((photo, index) => (
            <div
              key={`${photo.id}-${index}`}
              className="relative flex-shrink-0 w-[200px] h-[200px] md:w-[280px] md:h-[280px] lg:w-[320px] lg:h-[320px] overflow-hidden group cursor-pointer"
            >
              <img
                src={photo.image_url}
                alt="Jamaah umroh Musafar Tour"
                className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:brightness-110"
                loading="lazy"
                width={320}
                height={320}
              />
              {/* Hover overlay with glow */}
              <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-all duration-500" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 shadow-[inset_0_0_30px_rgba(255,255,255,0.3)]" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
