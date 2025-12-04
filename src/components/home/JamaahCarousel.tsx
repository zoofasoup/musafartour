import { useState } from "react";

// Placeholder images - replace with actual jamaah photos from database
const jamaahPhotos = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=220&h=220&fit=crop",
    caption: "Batch November 2024",
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1564769625905-50e93615e769?w=220&h=220&fit=crop",
    caption: "Umroh Ramadhan 2024",
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1542816417-0983c9c9ad53?w=220&h=220&fit=crop",
    caption: "Batch Oktober 2024",
  },
  {
    id: 4,
    image: "https://images.unsplash.com/photo-1565552645632-d725f8bfc19a?w=220&h=220&fit=crop",
    caption: "Batch September 2024",
  },
  {
    id: 5,
    image: "https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=220&h=220&fit=crop",
    caption: "Batch Agustus 2024",
  },
  {
    id: 6,
    image: "https://images.unsplash.com/photo-1604867196098-e4d0f4f1e0e1?w=220&h=220&fit=crop",
    caption: "Batch Juli 2024",
  },
  {
    id: 7,
    image: "https://images.unsplash.com/photo-1519817650390-64a93db51149?w=220&h=220&fit=crop",
    caption: "Umroh Plus Dubai 2024",
  },
  {
    id: 8,
    image: "https://images.unsplash.com/photo-1466442929976-97f336a657be?w=220&h=220&fit=crop",
    caption: "Batch Juni 2024",
  },
];

export const JamaahCarousel = () => {
  const [isPaused, setIsPaused] = useState(false);

  // Duplicate photos for seamless infinite loop
  const duplicatedPhotos = [...jamaahPhotos, ...jamaahPhotos];

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
              className="relative flex-shrink-0 w-[160px] h-[160px] md:w-[220px] md:h-[220px] overflow-hidden group cursor-pointer"
            >
              <img
                src={photo.image}
                alt={`Jamaah umroh`}
                className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:brightness-110"
                loading="lazy"
                width={220}
                height={220}
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
