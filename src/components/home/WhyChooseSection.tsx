import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import type { SellingPoint } from "@/hooks/useHomepageData";

interface WhyChooseSectionProps {
  sellingPoints: SellingPoint[];
}

// Placeholder images for jamaah photos
const placeholderImages = [
  "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1564769625905-50e93615e769?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1542816417-0983c9c9ad53?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1519817650390-64a93db51149?w=600&h=400&fit=crop",
];

export const WhyChooseSection = ({ sellingPoints }: WhyChooseSectionProps) => {
  const animation = useScrollAnimation();

  // Take first 4 selling points for 2x2 grid
  const features = sellingPoints.slice(0, 4);

  // YouTube video ID
  const videoId = "lr9-md4muys";

  return (
    <section className="py-16 md:py-20 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4">
            Tentang Kami
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Kenapa Memilih Musafar?
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Kami mendampingi perjalanan ibadah Anda dengan sepenuh hati
          </p>
        </div>

        {/* Two Column Layout */}
        <div
          ref={animation.ref}
          className={`grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 transition-all duration-700 ${
            animation.isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-10"
          }`}
        >
          {/* Video Section - 16:9 aspect ratio (1920x1080) */}
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-xl bg-card">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&rel=0&modestbranding=1`}
              title="Musafar Tour Video"
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              loading="lazy"
            />
            {/* Overlay to make video unclickable */}
            <div className="absolute inset-0 z-10" />
            {/* Style ring */}
            <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-white/10 rounded-2xl z-20" />
          </div>

          {/* Selling Points 2x2 Grid with Photos */}
          <div className="grid grid-cols-2 gap-4">
            {features.length > 0 ? (
              features.map((feature, index) => (
                <div
                  key={index}
                  className="relative rounded-xl overflow-hidden group cursor-pointer aspect-[4/3]"
                >
                  {/* Background Image */}
                  <img
                    src={placeholderImages[index % placeholderImages.length]}
                    alt={feature.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  
                  {/* Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-white font-semibold text-sm md:text-base">
                      {feature.title}
                    </h3>
                  </div>
                </div>
              ))
            ) : (
              Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="relative rounded-xl overflow-hidden group cursor-pointer aspect-[4/3]"
                >
                  <img
                    src={placeholderImages[index]}
                    alt={`Feature ${index + 1}`}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-white font-semibold text-sm">
                      Fitur {index + 1}
                    </h3>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
