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

          {/* Selling Points - Pill Stack */}
          <div className="flex flex-col gap-3 justify-center">
            {(features.length > 0
              ? features
              : Array.from({ length: 5 }).map((_, i) => ({
                  id: `placeholder-${i}`,
                  title: `Fitur ${i + 1}`,
                  icon: "check-circle",
                })) as any)
              .map((feature: any, index: number) => {
                const Icon = getIcon(feature.icon);
                return (
                  <div
                    key={feature.id ?? index}
                    style={{ animationDelay: `${index * 80}ms` }}
                    className="group relative animate-fade-in"
                  >
                    {/* Soft glow halo */}
                    <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-primary/30 via-accent/40 to-primary/30 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100" />

                    <div className="relative flex items-center gap-4 rounded-full bg-card/90 backdrop-blur px-5 py-3.5 shadow-[0_4px_20px_-8px_hsl(var(--primary)/0.25)] ring-1 ring-border/60 transition-all duration-300 ease-out group-hover:-translate-y-0.5 group-hover:scale-[1.02] group-hover:shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.5)] group-hover:ring-primary/40 group-hover:bg-card cursor-default">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-transform duration-500 group-hover:rotate-[360deg] group-hover:bg-primary group-hover:text-primary-foreground">
                        <Icon className="h-5 w-5" strokeWidth={2.25} />
                      </div>
                      <h3 className="font-bold uppercase tracking-wide text-sm md:text-base text-foreground transition-colors group-hover:text-primary">
                        {feature.title}
                      </h3>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </section>
  );
};
