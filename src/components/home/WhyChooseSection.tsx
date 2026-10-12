import { useEffect, useRef } from "react";
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

/** Muted, looping, no controls. Browsers often ignore the autoplay URL flag, so we also tell the player to play: on load,
 *  when it scrolls into view, and on the first touch or scroll (a user gesture iOS accepts). */
const AutoplayVideo = ({ videoId }: { videoId: string }) => {
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const send = (func: string, args: unknown = "") => el.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), "https://www.youtube.com");
    // Captions stay off even when the viewer has them on in their YouTube settings.
    const play = () => { send("mute"); send("unloadModule", ["captions"]); send("unloadModule", ["cc"]); send("playVideo"); };
    el.addEventListener("load", play);
    const t = [800, 2000, 4000].map((ms) => window.setTimeout(play, ms));
    const io = new IntersectionObserver((e) => e[0]?.isIntersecting && play(), { threshold: 0.25 });
    io.observe(el);
    const gesture = () => { play(); window.removeEventListener("touchstart", gesture); window.removeEventListener("scroll", gesture); };
    window.addEventListener("touchstart", gesture, { passive: true });
    window.addEventListener("scroll", gesture, { passive: true });
    return () => {
      el.removeEventListener("load", play);
      t.forEach(clearTimeout);
      io.disconnect();
      window.removeEventListener("touchstart", gesture);
      window.removeEventListener("scroll", gesture);
    };
  }, []);
  return (
    <iframe
      ref={frame}
      src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&rel=0&modestbranding=1&playsinline=1&enablejsapi=1&cc_load_policy=0&iv_load_policy=3&disablekb=1`}
      title="Musafar Tour Video"
      className="pointer-events-none absolute inset-0 h-full w-full"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      loading="eager"
    />
  );
};

/** Illustration per USP, matched on the title so a reordered or renamed list still lands on the right picture. */
const USP_ART: [RegExp, string][] = [
  [/kemenag|terdaftar|terpercaya/i, "/illustrations/usp-1.jpg"],
  [/pembimbing|muthawif|ustadz/i, "/illustrations/usp-2.jpg"],
  [/manasik/i, "/illustrations/usp-3.jpg"],
  [/tiket|ticket/i, "/illustrations/usp-4.jpg"],
  [/tahun|melayani|pengalaman/i, "/illustrations/usp-5.jpg"],
  [/family|keluarga|ramah/i, "/illustrations/usp-6.jpg"],
];
const artFor = (title: string) => USP_ART.find(([re]) => re.test(title))?.[1];

const getIcon = (name: string): LucideIcon => iconMap[name] || CheckCircle;

export const WhyChooseSection = ({ sellingPoints }: WhyChooseSectionProps) => {
  const features = sellingPoints.slice(0, 6);
  const videoId = "lr9-md4muys";
  const list = features.length > 0
    ? features
    : (Array.from({ length: 3 }).map((_, i) => ({ id: `placeholder-${i}`, title: `Keunggulan Musafar ${i + 1}`, icon: "check-circle" })) as SellingPoint[]);

  return (
    <PkgPanel tone="cream-2" className="pkg-panel-art">
      <div className="mx-auto max-w-6xl">
        <h2 className="pkg-h2 mx-auto max-w-[16ch] text-balance text-center">Kenapa memilih Musafar?</h2>
      </div>

      {/* Full-width video, autoplay and muted from the first paint; the iframe fills a 16:9 box with no zoom or crop. */}
      <div className="relative -mx-6 mt-8 aspect-video overflow-hidden bg-pkg-ink lg:mx-auto lg:max-w-6xl lg:rounded-[24px]">
        <AutoplayVideo videoId={videoId} />
        <div className="absolute inset-0 z-10" />
      </div>

      {/* USPs without boxes: the illustration sits straight on the panel (edges faded so its cream backdrop melts in),
          title beside it, illustration always on the left on the phone; three centered columns on desktop. */}
      <ul className="mx-auto mt-10 max-w-md md:mt-16 md:grid md:max-w-6xl md:grid-cols-3 md:gap-8">
        {list.map((feature, index) => {
          const Icon = getIcon(feature.icon);
          const art = artFor(feature.title);
          return (
            <li
              key={feature.id ?? index}
              className="-mt-4 flex items-center gap-2 first:mt-0 md:mt-0 md:flex-col md:gap-4 md:text-center"
            >
              <div className="grid aspect-square w-[36%] shrink-0 place-items-center md:w-full md:max-w-[200px]">
                {art ? (
                  <img
                    src={art}
                    alt=""
                    width={720}
                    height={720}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover [mask-image:radial-gradient(closest-side,#000_70%,transparent_100%)] [-webkit-mask-image:radial-gradient(closest-side,#000_70%,transparent_100%)]"
                  />
                ) : (
                  <Icon className="h-12 w-12 text-pkg-red-deep" strokeWidth={1} aria-hidden />
                )}
              </div>
              <h3 className="min-w-0 flex-1 line-clamp-2 text-balance text-[20px] font-normal leading-[1.2] tracking-[-0.015em] text-pkg-fg md:flex-none">{feature.title}</h3>
            </li>
          );
        })}
      </ul>
    </PkgPanel>
  );
};
