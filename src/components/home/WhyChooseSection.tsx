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

  return (
    <PkgPanel tone="cream-2">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <h2 className="pkg-h2 text-balance">Kenapa memilih Musafar?</h2>
          <p className="mt-4 text-[17px] leading-[1.55] text-pkg-fg-2">
            Kami mendampingi ibadahmu dengan sepenuh hati: tenang, nyaman, dan tak terlupakan.
          </p>
          <div className="relative mt-8 aspect-video w-full overflow-hidden rounded-[24px] bg-pkg-ink">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1`}
              title="Musafar Tour Video"
              className="pointer-events-none absolute inset-[-20%] h-[140%] w-[140%]"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              loading="lazy"
            />
            <div className="absolute inset-0 z-10" />
          </div>
        </div>

        <ul className="space-y-6 lg:col-span-7 lg:self-center">
          {(features.length > 0
            ? features
            : (Array.from({ length: 5 }).map((_, i) => ({ id: `placeholder-${i}`, title: `Keunggulan Musafar ${i + 1}`, icon: "check-circle" })) as SellingPoint[])
          ).map((feature, index) => {
            const Icon = getIcon(feature.icon);
            return (
              <li key={feature.id ?? index} className="flex items-center gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-pkg-cream text-pkg-red-deep">
                  <Icon className="h-6 w-6" strokeWidth={1.5} aria-hidden />
                </span>
                <h3 className="pkg-h3 text-[20px]">{feature.title}</h3>
              </li>
            );
          })}
        </ul>
      </div>
    </PkgPanel>
  );
};
