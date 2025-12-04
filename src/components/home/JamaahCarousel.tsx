import { useState, useRef } from "react";
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

interface TiltCardProps {
  photo: { id: string; image_url: string };
  index: number;
}

const TiltCard = ({ photo, index }: TiltCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState("");
  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = (y - centerY) / 10;
    const rotateY = (centerX - x) / 10;
    
    setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`);
    setGlarePosition({ x: (x / rect.width) * 100, y: (y / rect.height) * 100 });
  };

  const handleMouseLeave = () => {
    setTransform("");
  };

  return (
    <div
      ref={cardRef}
      className="relative flex-shrink-0 w-[200px] h-[200px] md:w-[280px] md:h-[280px] lg:w-[320px] lg:h-[320px] overflow-hidden cursor-pointer"
      style={{
        transform: transform,
        transition: transform ? "none" : "transform 0.5s ease-out",
        transformStyle: "preserve-3d",
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <img
        src={photo.image_url}
        alt="Jamaah umroh Musafar Tour"
        className="w-full h-full object-cover"
        loading="lazy"
        width={320}
        height={320}
      />
      {/* Glare effect */}
      <div
        className="absolute inset-0 pointer-events-none opacity-0 hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle at ${glarePosition.x}% ${glarePosition.y}%, rgba(255,255,255,0.3) 0%, transparent 60%)`,
          opacity: transform ? 1 : 0,
        }}
      />
    </div>
  );
};

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
            <TiltCard key={`${photo.id}-${index}`} photo={photo} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};
