import { useState } from "react";

// Placeholder images - replace with actual jamaah photos from database
const jamaahPhotos = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=480&h=640&fit=crop",
    caption: "Batch November 2024",
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1564769625905-50e93615e769?w=480&h=640&fit=crop",
    caption: "Umroh Ramadhan 2024",
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1542816417-0983c9c9ad53?w=480&h=640&fit=crop",
    caption: "Batch Oktober 2024",
  },
  {
    id: 4,
    image: "https://images.unsplash.com/photo-1565552645632-d725f8bfc19a?w=480&h=640&fit=crop",
    caption: "Batch September 2024",
  },
  {
    id: 5,
    image: "https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=480&h=640&fit=crop",
    caption: "Batch Agustus 2024",
  },
  {
    id: 6,
    image: "https://images.unsplash.com/photo-1604867196098-e4d0f4f1e0e1?w=480&h=640&fit=crop",
    caption: "Batch Juli 2024",
  },
  {
    id: 7,
    image: "https://images.unsplash.com/photo-1519817650390-64a93db51149?w=480&h=640&fit=crop",
    caption: "Umroh Plus Dubai 2024",
  },
  {
    id: 8,
    image: "https://images.unsplash.com/photo-1466442929976-97f336a657be?w=480&h=640&fit=crop",
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
              className="relative flex-shrink-0 w-[180px] h-[240px] md:w-[240px] md:h-[320px] overflow-hidden group cursor-pointer transition-transform duration-300 hover:scale-110 hover:z-10"
            >
              <img
                src={photo.image}
                alt={`Jamaah umroh`}
                className="w-full h-full object-cover"
                loading="lazy"
                width={240}
                height={320}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
