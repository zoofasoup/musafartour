import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import type { SellingPoint } from "@/hooks/useHomepageData";
import { Plane, MapPin, Hotel, MessageCircle, Heart, Package, ShieldCheck, Award, Sparkles, Users, Star, CheckCircle, type LucideIcon } from "lucide-react";

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
  "shield-check": ShieldCheck,
  award: Award,
  sparkles: Sparkles,
  users: Users,
  star: Star,
  "check-circle": CheckCircle,
};

const getIcon = (name: string): LucideIcon => iconMap[name] || CheckCircle;

export const WhyChooseSection = ({ sellingPoints }: WhyChooseSectionProps) => {
  const animation = useScrollAnimation();

  const features = sellingPoints.slice(0, 6);

  const videoId = "lr9-md4muys";

  return (
    <section className="py-24 md:py-32 bg-transparent">
      <div className="container mx-auto px-6 md:px-8 max-w-6xl">
        
        {/* Editorial Two Column Layout */}
        <div
          ref={animation.ref}
          className={`flex flex-col lg:flex-row gap-16 lg:gap-24 transition-all duration-1000 ${
            animation.isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-12"
          }`}
        >
          {/* Left: Oversized Typography Header */}
          <div className="lg:w-5/12 flex flex-col justify-center">
            <span className="text-accent uppercase tracking-[0.2em] text-xs font-bold mb-6 block">
              Tentang Kami
            </span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-8 tracking-tight leading-[1.1]">
              Kenapa Memilih Musafar?
            </h2>
            <p className="text-muted-foreground text-lg md:text-xl leading-relaxed mb-10">
              Kami mendampingi perjalanan ibadah Anda dengan sepenuh hati, menghadirkan pengalaman spiritual yang tenang, nyaman, dan tak terlupakan.
            </p>
            
            {/* Video Thumbnail - Embedded aesthetically */}
            <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-2xl group">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&rel=0&modestbranding=1`}
                title="Musafar Tour Video"
                className="absolute inset-0 w-full h-full transform transition-transform duration-700 group-hover:scale-105"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                loading="lazy"
              />
              <div className="absolute inset-0 z-10 mix-blend-overlay bg-primary/10" />
              {/* Invisible overlay to block all interactions with the iframe */}
              <div className="absolute inset-0 z-20" />
            </div>
          </div>

          {/* Right: Sleek Minimalist List */}
          <div className="lg:w-7/12 flex flex-col justify-center">
            <div className="space-y-0">
              {(features.length > 0
                ? features
                : Array.from({ length: 5 }).map((_, i) => ({
                    id: `placeholder-${i}`,
                    title: `Keunggulan Musafar ${i + 1}`,
                    icon: "check-circle",
                  })) as any
              ).map((feature: any, index: number) => {
                const Icon = getIcon(feature.icon);
                return (
                  <div
                    key={feature.id ?? index}
                    style={{ transitionDelay: `${index * 100}ms` }}
                    className="group border-b border-border/50 last:border-0 py-4 md:py-5 flex items-center gap-6 md:gap-8 transition-all hover:bg-muted/50 -mx-4 px-4 rounded-2xl"
                  >
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground transition-all duration-500 group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110 group-hover:rotate-6">
                      <Icon className="h-6 w-6" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="text-xl md:text-2xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                        {feature.title}
                      </h3>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
