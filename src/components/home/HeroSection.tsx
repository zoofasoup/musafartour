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
    <section className="w-full px-4 pb-8 pt-24 md:px-6 md:pt-28">
      <div className="mx-auto grid max-w-[1200px] gap-4 lg:grid-cols-[1fr_1.05fr]">
        {/* Dark block with the message */}
        <div className="flex flex-col justify-center rounded-2xl bg-primary p-6 text-white sm:p-10 lg:p-12">
          <div
            className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium animate-fade-in opacity-0"
            style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}
          >
            <ShieldCheck className="h-4 w-4 text-green-400" />
            Berizin Resmi Kemenag PPIU
          </div>

          <h1
            className="mb-4 text-[2.25rem] font-extrabold leading-[1.05] tracking-[-0.035em] text-balance animate-fade-in opacity-0 sm:text-5xl lg:text-[3.5rem]"
            style={{ animationDelay: "0.4s", animationFillMode: "forwards" }}
          >
            Umroh &amp; Haji Nyaman, Bukan Sekadar Safar Biasa.
          </h1>

          <p
            className="mb-8 max-w-md text-base text-white/80 animate-fade-in opacity-0 md:text-lg"
            style={{ animationDelay: "0.6s", animationFillMode: "forwards" }}
          >
            Teman perjalanan keluarga membangun memori di Tanah Suci.
          </p>

          <div
            className="mb-8 flex flex-col gap-3 animate-fade-in opacity-0 sm:flex-row"
            style={{ animationDelay: "0.8s", animationFillMode: "forwards" }}
          >
            <Button variant="brand" className="h-12 w-full px-8 text-base sm:w-auto" onClick={() => navigate("/paket-umroh")}>
              Lihat Semua Paket
            </Button>
            <Button
              variant="outline"
              className="h-12 w-full border-white/30 bg-transparent px-6 text-base text-white hover:bg-white/10 hover:text-white sm:w-auto"
              onClick={handleWhatsAppClick}
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              Tanya CS (Gratis)
            </Button>
          </div>

          <div
            className="flex items-center gap-4 animate-fade-in opacity-0"
            style={{ animationDelay: "1s", animationFillMode: "forwards" }}
          >
            <div className="flex -space-x-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 w-10 overflow-hidden rounded-full border-2 border-primary bg-muted">
                  <img src={`/gallery/jamaah-${i}-avatar.webp`} alt="" width={40} height={40} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
            <div className="flex flex-col">
              <div className="flex gap-1 text-amber">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="h-3 w-3 fill-current" />
                ))}
              </div>
              <span className="text-xs font-medium text-white/80">3000+ Jamaah Puas</span>
            </div>
          </div>
        </div>

        {/* Team photo, logo and both people stay visible */}
        <div className="overflow-hidden rounded-2xl bg-muted">
          <img
            src="/hero-1920.webp"
            srcSet="/hero-1024.webp 1024w, /hero-1920.webp 1920w"
            sizes="(min-width: 1280px) 620px, (min-width: 1024px) 50vw, 100vw"
            alt="Tim Musafar Tour menyambut jamaah di kantor"
            width={1920}
            height={1440}
            className="h-full w-full object-cover"
            loading="eager"
            decoding="async"
            {...{ fetchpriority: "high" }}
          />
        </div>
      </div>
    </section>
  );
};
