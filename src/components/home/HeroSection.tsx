import { Star } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import type { HeroData, WebsiteSettings } from "@/hooks/useHomepageData";
import { redirectToWhatsApp } from "@/lib/chatRedirect";
import { useNavigate } from "react-router-dom";
import { PkgPanel } from "@/components/package-detail/PkgPanel";
import "@/styles/pkg-v2.css";

interface HeroSectionProps {
  heroData: HeroData | null | undefined;
  websiteSettings: WebsiteSettings | null | undefined;
  isLoading?: boolean;
}

const HERO_SRC = "/hero-1920.webp";
const HERO_SRCSET = "/hero-800.webp 800w, /hero-1280.webp 1280w, /hero-1920.webp 1920w, /hero-2560.webp 2560w";

// Props are still passed by Index but the hero content is static; it no longer
// waits on the hero_section query, so it paints immediately as the LCP element.
export const HeroSection = (_props: HeroSectionProps) => {
  const navigate = useNavigate();

  const handleWhatsAppClick = () => {
    redirectToWhatsApp("Halo Musamin, saya tertarik untuk berkonsultasi mengenai paket Umroh.", "home_hero");
  };

  return (
    <section className="w-full">
      {/* The team photo, like a flyer: full width, blurred toward the panel below */}
      <div data-pkg-flyer className="relative h-[clamp(300px,calc(100svh-400px),520px)] w-full overflow-hidden bg-pkg-ink pt-16 md:h-[min(78svh,720px)]">
        <img
          src={HERO_SRC}
          srcSet={HERO_SRCSET}
          sizes="100vw"
          alt="Tim Musafar Tour menyambut jamaah di kantor"
          width={1920}
          height={1440}
          className="absolute inset-0 h-full w-full object-cover [object-position:50%_14%]"
          loading="eager"
          decoding="async"
          {...{ fetchpriority: "high" }}
        />
        <span className="pkg-hero-blur" aria-hidden>
          <span><img src="/hero-800.webp" alt="" decoding="async" /></span>
          <span><img src="/hero-800.webp" alt="" decoding="async" /></span>
        </span>
      </div>

      <PkgPanel tone="cream" first className="!pb-20">
        <div className="mx-auto max-w-[1100px]">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 w-10 overflow-hidden rounded-full bg-pkg-cream-2 ring-2 ring-pkg-cream">
                  <img src={`/gallery/jamaah-${i}-avatar.webp`} alt="" width={40} height={40} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
            <div>
              <div className="flex gap-0.5" role="img" aria-label="Bintang 5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-pkg-red-bright text-pkg-red-bright" aria-hidden />
                ))}
              </div>
              <p className="pkg-label mt-0.5 text-pkg-fg-2">3000+ jamaah puas</p>
            </div>
          </div>

          <h1 className="pkg-title mt-5 whitespace-nowrap !leading-[1.12] !text-[clamp(28px,9.4vw,72px)]">Umroh Nyaman,<br />Bukan Safar Biasa</h1>
          <p className="pkg-label mt-4 max-w-md text-pkg-fg-2">Teman perjalanan keluarga membangun memori di Tanah Suci.</p>

          <div className="mt-6 flex gap-3 sm:max-w-md">
            <button
              type="button"
              onClick={handleWhatsAppClick}
              className="pkg-press pkg-glass inline-flex h-14 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-[14px] font-medium whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink focus-visible:ring-offset-2"
            >
              <WhatsAppIcon className="h-5 w-5 shrink-0 text-pkg-ok" />
              Konsultasi
            </button>
            <button
              type="button"
              onClick={() => navigate("/paket-umroh")}
              className="pkg-press pkg-glass-red inline-flex h-14 min-w-0 flex-1 items-center justify-center rounded-full px-3 text-[14px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink focus-visible:ring-offset-2"
            >
              Lihat Paket
            </button>
          </div>
        </div>
      </PkgPanel>
    </section>
  );
};
