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
    <section className="relative w-full h-[90vh] min-h-[650px] flex items-center justify-start overflow-hidden">
      {
        <>
          {/* Background Image */}
          <div className="absolute inset-0 z-0">
            <img
              src="/hero-1920.webp"
              srcSet="/hero-1024.webp 1024w, /hero-1920.webp 1920w"
              sizes="100vw"
              alt="Musafar Tour Hero"
              className="w-full h-full object-cover object-top"
              loading="eager"
              decoding="async"
              {...{ fetchpriority: "high" }}
            />
            {/* Gradient Overlay for Text Readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/40 to-black/80" />
            {/* Subtle bottom gradient to blend into the next section */}
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />
          </div>

          <div className="relative z-10 w-full max-w-[1600px] mx-auto px-6 md:px-12 flex flex-col justify-center h-full pt-16">
            <div className="max-w-4xl text-white mx-auto text-center flex flex-col items-center">
              {/* Trust Badge */}
              <div 
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm font-medium mb-6 animate-fade-in opacity-0"
                style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}
              >
                <ShieldCheck className="h-4 w-4 text-green-400" />
                Berizin Resmi Kemenag PPIU
              </div>
              
              {/* Main Title */}
              <h1 
                className="text-[2rem] sm:text-5xl md:text-[3.25rem] lg:text-6xl xl:text-7xl text-balance font-display font-bold leading-[1.1] tracking-tight mb-6 animate-fade-in opacity-0"
                style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}
              >
                Umroh & Haji Nyaman, <br className="hidden md:block" /> Bukan Sekadar Safar Biasa.
              </h1>
              
              {/* Subtitle */}
              <p 
                className="text-lg md:text-2xl text-white/90 font-medium mb-10 max-w-2xl animate-fade-in opacity-0"
                style={{ animationDelay: '0.6s', animationFillMode: 'forwards' }}
              >
                Teman Perjalanan Keluarga Membangun Memori di Tanah Suci
              </p>
              
              {/* CTAs */}
              <div 
                className="flex flex-col sm:flex-row gap-4 mb-12 animate-fade-in opacity-0 justify-center"
                style={{ animationDelay: '0.8s', animationFillMode: 'forwards' }}
              >
                <Button
                  size="lg"
                  className="bg-white text-black hover:bg-white/90 font-bold text-base md:text-lg px-8 w-full sm:w-auto h-14 rounded-full transition-all hover:scale-105"
                  onClick={() => navigate("/paket-umroh")}
                >
                  Lihat Semua Paket
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-black/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/20 hover:text-white font-semibold text-base md:text-lg px-8 w-full sm:w-auto h-14 rounded-full transition-all hover:scale-105 group"
                  onClick={handleWhatsAppClick}
                >
                  <MessageCircle className="mr-2 h-5 w-5 text-white group-hover:scale-110 transition-transform" />
                  <span>Tanya CS (Gratis)</span>
                  <Heart className="ml-2 h-4 w-4 text-white/70" />
                </Button>
              </div>

              {/* Reviews/Trust Signals */}
              <div 
                className="flex items-center gap-4 animate-fade-in opacity-0"
                style={{ animationDelay: '1s', animationFillMode: 'forwards' }}
              >
                <div className="flex -space-x-3">
                  <div className="w-10 h-10 rounded-full border-2 border-slate-900 bg-muted overflow-hidden"><img src="/gallery/jamaah-1-avatar.webp" alt="" width={40} height={40} className="w-full h-full object-cover" /></div>
                  <div className="w-10 h-10 rounded-full border-2 border-slate-900 bg-muted overflow-hidden"><img src="/gallery/jamaah-2-avatar.webp" alt="" width={40} height={40} className="w-full h-full object-cover" /></div>
                  <div className="w-10 h-10 rounded-full border-2 border-slate-900 bg-muted overflow-hidden"><img src="/gallery/jamaah-3-avatar.webp" alt="" width={40} height={40} className="w-full h-full object-cover" /></div>
                </div>
                <div className="flex flex-col">
                  <div className="flex gap-1 text-yellow-400">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="w-3 h-3 fill-current" />
                    ))}
                  </div>
                  <span className="text-white/80 text-xs font-medium">3000+ Jamaah Puas</span>
                </div>
              </div>

            </div>
          </div>
        </>
      }
    </section>
  );
};
