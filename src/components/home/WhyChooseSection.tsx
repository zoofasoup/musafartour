import { FeatureCard } from "@/components/FeatureCard";
import { Plane, MapPin, Hotel, MessageCircle, Heart, Package } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import type { SellingPoint } from "@/hooks/useHomepageData";
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

  // Take only first 4 selling points for 2x2 grid
  const features = sellingPoints.slice(0, 4).map((point) => ({
    icon: getIconComponent(point.icon),
    title: point.title,
    description: point.description,
  }));

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
          className={`grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center transition-all duration-700 ${
            animation.isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-10"
          }`}
        >
          {/* Video Section */}
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-xl bg-card">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&rel=0&modestbranding=1`}
              title="Musafar Tour Video"
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
            {/* Overlay gradient for style */}
            <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-white/10 rounded-2xl" />
          </div>

          {/* Selling Points 2x2 Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.length > 0 ? (
              features.map((feature, index) => (
                <FeatureCard key={index} {...feature} compact />
              ))
            ) : (
              <div className="col-span-2 text-center text-muted-foreground py-8">
                Belum ada selling points yang ditambahkan
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
