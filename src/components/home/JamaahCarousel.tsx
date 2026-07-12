import { useState, useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, animate, useInView } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const fallbackPhotos = [
  { id: "1", image_url: "/gallery/jamaah-1.jpg" },
  { id: "2", image_url: "/gallery/jamaah-2.jpg" },
  { id: "3", image_url: "/gallery/jamaah-3.jpg" },
  { id: "4", image_url: "/gallery/jamaah-4.jpg" },
];

export const JamaahCarousel = () => {
  const [isPaused, setIsPaused] = useState(false);
  const countRef = useRef(null);
  const isInView = useInView(countRef, { once: true, margin: "-50px" });
  
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest).toLocaleString('id-ID'));

  useEffect(() => {
    if (isInView) {
      const controls = animate(count, 2000, { duration: 2.5, ease: "easeOut" });
      return controls.stop;
    }
  }, [isInView]);

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
          <h2 ref={countRef} className="text-5xl md:text-7xl font-display font-bold text-primary mb-3 flex items-center justify-center gap-2">
            <motion.span>{rounded}</motion.span>+ Jamaah
          </h2>
          <p className="text-xl md:text-2xl text-foreground/80 font-medium">
            Telah berangkat bersama Musafar Tour
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
              className="relative flex-shrink-0 w-[200px] h-[200px] md:w-[280px] md:h-[280px] lg:w-[320px] lg:h-[320px] overflow-hidden cursor-pointer group transition-all duration-500 ease-out md:hover:scale-105 md:hover:rounded-2xl md:hover:z-10 md:hover:shadow-2xl"
            >
              <img
                src={photo.image_url}
                alt="Jamaah umroh Musafar Tour"
                className="w-full h-full object-cover transition-transform duration-500 ease-out md:group-hover:scale-110"
                loading="lazy"
                width={320}
                height={320}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
