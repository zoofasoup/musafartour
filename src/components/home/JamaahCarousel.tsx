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
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
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

  const handlePhotoClick = (id: string) => {
    setActivePhotoId(id);
    
    // Slow down track
    const track = document.getElementById("jamaah-scroll-track");
    if (track) track.getAnimations().forEach(a => a.playbackRate = 0.15);

    // Reset after 2 seconds
    setTimeout(() => {
      setActivePhotoId(null);
      const currentTrack = document.getElementById("jamaah-scroll-track");
      if (currentTrack) currentTrack.getAnimations().forEach(a => a.playbackRate = 1);
    }, 2000);
  };

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
        className="relative w-full overflow-visible py-10"
        onMouseEnter={() => {
          const track = document.getElementById("jamaah-scroll-track");
          if (track) track.getAnimations().forEach(a => a.playbackRate = 0.15);
        }}
        onMouseLeave={() => {
          const track = document.getElementById("jamaah-scroll-track");
          if (track && !activePhotoId) track.getAnimations().forEach(a => a.playbackRate = 1);
        }}
      >
        <div
          id="jamaah-scroll-track"
          className="flex animate-scroll-photos items-center"
        >
          {duplicatedPhotos.map((photo, index) => {
            const uniqueId = `${photo.id}-${index}`;
            const isActive = activePhotoId === uniqueId;

            // Pseudo-random rotation for messy look (-8deg to 8deg)
            const rotations = ["-rotate-6", "rotate-3", "-rotate-2", "rotate-6", "-rotate-4", "rotate-8"];
            const rotateClass = isActive ? "rotate-0" : rotations[index % rotations.length];
            
            // Randomize vertical offset slightly
            const margins = ["mt-0", "mt-4", "-mt-6", "mt-8", "-mt-2", "-mt-8"];
            const marginClass = margins[index % margins.length];

            return (
              <div
                key={uniqueId}
                onClick={() => handlePhotoClick(uniqueId)}
                className={`relative flex-shrink-0 w-[180px] h-[220px] md:w-[260px] md:h-[320px] lg:w-[300px] lg:h-[360px] 
                  ${index > 0 ? '-ml-6 md:-ml-10' : ''} 
                  ${rotateClass} ${marginClass}
                  cursor-pointer group transition-all duration-700 ease-out 
                  ${isActive ? 'z-50 scale-110' : 'md:hover:z-50 md:hover:scale-110'}
                `}
              >
                {/* Polaroid Frame */}
                <div className={`w-full h-full bg-white p-2 md:p-3 pb-8 md:pb-12 shadow-xl border border-slate-200 transition-all duration-700 ease-out
                  ${isActive 
                    ? 'grayscale-0 saturate-110 contrast-110 shadow-2xl' 
                    : 'grayscale md:hover:grayscale-0 md:hover:saturate-110 md:hover:contrast-110 md:hover:shadow-2xl'
                  }`}
                >
                  <div className="w-full h-full overflow-hidden bg-slate-100 relative">
                    <img
                      src={photo.image_url}
                      alt="Jamaah umroh Musafar Tour"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {/* Subtle vintage overlay that disappears on hover/active */}
                    <div className={`absolute inset-0 bg-amber-900/10 mix-blend-overlay transition-opacity duration-700 pointer-events-none
                      ${isActive ? 'opacity-0' : 'md:group-hover:opacity-0'}
                    `} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
