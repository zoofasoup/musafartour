import { PkgPanel } from "@/components/package-detail/PkgPanel";
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
  const features = sellingPoints.slice(0, 6);
  const videoId = "lr9-md4muys";
  const list = features.length > 0
    ? features
    : (Array.from({ length: 3 }).map((_, i) => ({ id: `placeholder-${i}`, title: `Keunggulan Musafar ${i + 1}`, icon: "check-circle" })) as SellingPoint[]);

  return (
    <PkgPanel tone="cream-2">
      <div className="mx-auto max-w-6xl">
        <h2 className="pkg-h2 mx-auto max-w-[16ch] text-balance text-center">Kenapa memilih Musafar?</h2>
        <p className="mx-auto mt-4 max-w-md text-center text-[17px] leading-[1.55] text-pkg-fg-2">
          Kami mendampingi ibadahmu dengan sepenuh hati: tenang, nyaman, dan tak terlupakan.
        </p>
      </div>

      {/* Full-width video, autoplay and muted from the first paint; the iframe fills a 16:9 box with no zoom or crop. */}
      <div className="relative -mx-6 mt-8 aspect-video overflow-hidden bg-pkg-ink lg:mx-auto lg:max-w-6xl lg:rounded-[24px]">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&rel=0&modestbranding=1&playsinline=1`}
          title="Musafar Tour Video"
          className="pointer-events-none absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          loading="eager"
        />
        <div className="absolute inset-0 z-10" />
      </div>

      {/* USP cards: illustration on top, title below. Icons stand in until the illustration set is chosen. */}
      <ul className="-mx-6 mt-10 flex snap-x snap-mandatory scroll-px-6 gap-4 overflow-x-auto px-6 pb-2 [scrollbar-width:none] md:mx-auto md:grid md:max-w-6xl md:grid-cols-3 md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden">
        {list.map((feature, index) => {
          const Icon = getIcon(feature.icon);
          return (
            <li key={feature.id ?? index} className="pkg-card w-[280px] shrink-0 snap-start rounded-[32px] p-6 md:w-auto">
              <div className="grid aspect-[4/3] place-items-center rounded-[24px] bg-pkg-cream">
                <Icon className="h-16 w-16 text-pkg-red-deep" strokeWidth={1} aria-hidden />
              </div>
              <h3 className="pkg-h3 mt-6 text-[22px] leading-[1.2]">{feature.title}</h3>
            </li>
          );
        })}
      </ul>
    </PkgPanel>
  );
};
