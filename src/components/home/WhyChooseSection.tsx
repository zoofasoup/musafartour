import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import type { SellingPoint } from "@/hooks/useHomepageData";
import { Plane, MapPin, Hotel, MessageCircle, Heart, Package } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface WhyChooseSectionProps {
  sellingPoints: SellingPoint[];
}

const iconMap: Record<string, LucideIcon> = {
  plane: Plane,
  "map-pin": MapPin,
  hotel: Hotel,
  heart: Heart,
  "message-circle": MessageCircle,
  package: Package,
};

const getIconComponent = (iconName: string): LucideIcon => {
  return iconMap[iconName] || Heart;
};

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
          className={`grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-stretch transition-all duration-700 ${
            animation.isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-10"
          }`}
        >
          {/* Video Section - Unclickable */}
          <div className="relative w-full aspect-video lg:aspect-auto lg:h-full min-h-[280px] rounded-2xl overflow-hidden shadow-xl bg-card">
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

          {/* Selling Points 2x2 Grid */}
          <div className="grid grid-cols-2 gap-4">
            {features.length > 0 ? (
              features.map((feature, index) => {
                const Icon = getIconComponent(feature.icon);
                return (
                  <div
                    key={index}
                    className="flex flex-col items-center justify-center p-6 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300 group"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-foreground font-semibold text-center text-sm md:text-base">
                      {feature.title}
                    </h3>
                  </div>
                );
              })
            ) : (
              Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center justify-center p-6 rounded-xl bg-card border border-border"
                >
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Heart className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-muted-foreground font-semibold text-center text-sm">
                    Fitur {index + 1}
                  </h3>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
