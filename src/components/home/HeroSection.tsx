import { Button } from "@/components/ui/button";
import { MessageCircle, Star, Heart, ShieldCheck } from "lucide-react";
import type { HeroData, WebsiteSettings } from "@/hooks/useHomepageData";
import { redirectToWhatsApp } from "@/lib/chatRedirect";
import { useNavigate } from "react-router-dom";

interface HeroSectionProps {
  heroData: HeroData | null | undefined;
  websiteSettings: WebsiteSettings | null | undefined;
  isLoading?: boolean;
}

// Props are still passed by Index but the hero content is static; it no longer
// waits on the hero_section query, so it paints immediately as the LCP element.
export const HeroSection = (_props: HeroSectionProps) => {
  const navigate = useNavigate();

  const handleWhatsAppClick = () => {
    redirectToWhatsApp("Halo Musamin, saya tertarik untuk berkonsultasi mengenai paket Umroh.", "home_hero");
  };

  return (
    <section className="w-full">
      <div className="relative flex w-full flex-col overflow-hidden bg-primary md:h-svh md:min-h-[640px] md:justify-end">
        {/* Team photo. Phone: whole photo on top, fading into the dark block. Desktop: fills the frame, message sits on the desk */}
        <div className="relative aspect-[4/3] w-full md:absolute md:inset-0 md:aspect-auto">
          <img
            src="/hero-1920.webp"
            srcSet="/hero-800.webp 800w, /hero-1280.webp 1280w, /hero-1920.webp 1920w, /hero-2560.webp 2560w"
            sizes="100vw"
            alt="Tim Musafar Tour menyambut jamaah di kantor"
            width={1920}
            height={1440}
            className="absolute inset-0 h-full w-full object-cover md:object-[50%_60%]"
            loading="eager"
            decoding="async"
            {...{ fetchpriority: "high" }}
          />
          {/* Top shade keeps the white navigation readable */}
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/45 to-transparent md:h-40" />
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-primary to-transparent md:h-[62%] md:from-black/90 md:via-black/60" />
        </div>

        <div className="relative z-10 mx-auto -mt-10 flex w-full max-w-4xl flex-col items-center px-5 pb-8 text-center text-white md:mt-0 md:pb-12">
          <div
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-medium backdrop-blur-md animate-fade-in opacity-0"
            style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}
          >
            <ShieldCheck className="h-4 w-4 text-green-400" />
            Berizin Resmi Kemenag PPIU
          </div>

          <h1
            className="mb-3 text-[2rem] font-extrabold leading-[1.05] tracking-[-0.035em] text-balance animate-fade-in opacity-0 sm:text-5xl lg:text-6xl"
            style={{ animationDelay: "0.4s", animationFillMode: "forwards" }}
          >
            Umroh &amp; Haji Nyaman, Bukan Sekadar Safar Biasa.
          </h1>

          <p
            className="mb-6 max-w-xl text-base text-white/85 animate-fade-in opacity-0 md:text-lg"
            style={{ animationDelay: "0.6s", animationFillMode: "forwards" }}
          >
            Teman perjalanan keluarga membangun memori di Tanah Suci.
          </p>

          <div
            className="flex w-full flex-col items-center justify-center gap-3 animate-fade-in opacity-0 sm:w-auto sm:flex-row"
            style={{ animationDelay: "0.8s", animationFillMode: "forwards" }}
          >
            <Button variant="brand" className="h-12 w-full px-8 text-base sm:w-auto" onClick={() => navigate("/paket-umroh")}>
              Lihat Semua Paket
            </Button>
            <Button
              variant="outline"
              className="h-12 w-full border-white/25 bg-white/15 px-6 text-base text-white backdrop-blur-md hover:bg-white/25 hover:text-white sm:w-auto"
              onClick={handleWhatsAppClick}
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              Tanya CS (Gratis)
            </Button>
          </div>

          <div
            className="mt-6 hidden items-center gap-4 animate-fade-in opacity-0 sm:flex"
            style={{ animationDelay: "1s", animationFillMode: "forwards" }}
          >
            <div className="flex -space-x-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-9 w-9 overflow-hidden rounded-full border-2 border-black/60 bg-muted">
                  <img src={`/gallery/jamaah-${i}-avatar.webp`} alt="" width={36} height={36} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5 text-amber">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="h-3 w-3 fill-current" />
                ))}
              </div>
              <span className="text-sm font-medium text-white/85">3000+ Jamaah Puas</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
