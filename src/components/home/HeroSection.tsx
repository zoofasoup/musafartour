import { Button } from "@/components/ui/button";
import { MessageCircle, Star, Heart, ShieldCheck } from "lucide-react";
import musafarLogo from "@/assets/musafar-logo.svg";
import type { HeroData, WebsiteSettings } from "@/hooks/useHomepageData";
import { redirectToWhatsApp } from "@/lib/chatRedirect";
import { useNavigate } from "react-router-dom";

interface HeroSectionProps {
  heroData: HeroData | null | undefined;
  websiteSettings: WebsiteSettings | null | undefined;
  isLoading?: boolean;
}

const mosaicPhotos = [
  "/gallery/jamaah-1.jpg",
  "/gallery/jamaah-2.jpg",
  "/gallery/jamaah-3.jpg",
  "/gallery/jamaah-4.jpg",
  "/hero.webp",
];

export const HeroSection = ({ heroData, websiteSettings, isLoading }: HeroSectionProps) => {
  const navigate = useNavigate();

  const handleWhatsAppClick = () => {
    redirectToWhatsApp("Halo Musamin, saya tertarik untuk berkonsultasi mengenai paket Umroh.");
  };

  const renderSkeleton = () => (
    <div className="w-full min-h-screen bg-background pt-32 pb-16 flex flex-col items-center justify-start relative overflow-hidden">
      <div className="w-full max-w-4xl px-4 text-center z-10">
        <div className="h-16 w-3/4 max-w-2xl mx-auto mb-6 bg-muted animate-pulse rounded" />
        <div className="h-6 w-2/3 max-w-xl mx-auto mb-10 bg-muted animate-pulse rounded" />
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full px-6 md:px-8 mb-10">
          <div className="h-14 w-full sm:w-48 bg-muted animate-pulse rounded-full" />
          <div className="h-14 w-full sm:w-48 bg-muted animate-pulse rounded-full" />
        </div>
      </div>
      <div className="mt-8 w-full max-w-[1600px] mx-auto px-6 md:px-8 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="aspect-[3/4] bg-muted animate-pulse rounded-2xl" />)}
      </div>
    </div>
  );

  return (
    <section className="relative w-full flex flex-col items-center justify-start pt-32 md:pt-40 pb-12 overflow-hidden bg-background">
      {isLoading ? (
        renderSkeleton()
      ) : (
        <>
          <div className="relative z-10 container mx-auto px-6 md:px-8 flex flex-col items-center justify-start text-center">
            {/* Header Text Block - Clean typography on light background */}
            <div className="max-w-4xl mx-auto space-y-4 md:space-y-6 mb-10 animate-fade-in opacity-0" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
              <h1 className="text-4xl md:text-6xl lg:text-[4.5rem] font-display font-bold text-[#1c1c1c] tracking-tight leading-[1.05]">
                Umroh & Haji Nyaman, Bukan Sekadar Safar Biasa.
              </h1>
              
              <p className="text-lg md:text-2xl text-[#1c1c1c]/70 max-w-2xl mx-auto font-medium">
                Teman Perjalanan Keluarga Membangun Memori di Tanah Suci
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full max-w-full px-6 md:px-8 mb-8 animate-fade-in opacity-0" style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}>
              <Button
                size="lg"
                className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-base md:text-lg px-8 w-full sm:w-auto h-14 rounded-full transition-all hover:scale-105 shadow-lg shadow-accent/20"
                onClick={() => navigate("/paket")}
              >
                Lihat Semua Paket
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent border-[#1c1c1c]/20 text-[#1c1c1c] hover:bg-[#1c1c1c]/5 hover:text-[#1c1c1c] font-semibold text-base md:text-lg px-8 w-full sm:w-auto h-14 rounded-full transition-all hover:scale-105 group"
                onClick={handleWhatsAppClick}
              >
                <MessageCircle className="mr-2 h-5 w-5 text-destructive group-hover:scale-110 transition-transform" />
                <span>Tanya CS (Gratis)</span>
                <Heart className="ml-2 h-4 w-4 text-destructive/70" />
              </Button>
            </div>

            {/* Trust Signals Badge */}
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 justify-center mb-10 animate-fade-in opacity-0" style={{ animationDelay: '0.6s', animationFillMode: 'forwards' }}>
              <div className="flex gap-1 text-accent">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <div className="flex items-center gap-1.5 bg-green-500/10 text-green-700 px-3 py-1 rounded-full border border-green-500/20">
                <ShieldCheck className="h-4 w-4" />
                <p className="text-sm sm:text-base font-semibold">Berizin Resmi Kemenag PPIU: 17102200953750002</p>
              </div>
            </div>
            
            {/* Scroll Indicator */}
            <div className="animate-bounce opacity-40 flex flex-col items-center gap-2 mb-10">
              <span className="text-[#1c1c1c]/50 text-xs font-semibold tracking-widest uppercase">Scroll</span>
              <div className="w-[1px] h-8 bg-gradient-to-b from-[#1c1c1c]/50 to-transparent" />
            </div>

            {/* Mosaic Photo Grid */}
            <div className="w-full max-w-[1600px] mx-auto grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 animate-fade-in opacity-0" style={{ animationDelay: '0.8s', animationFillMode: 'forwards' }}>
              {mosaicPhotos.map((photo, i) => (
                <div key={i} className="aspect-[3/4] rounded-2xl overflow-hidden bg-muted group relative shadow-md">
                  <img
                    src={photo}
                    alt={`Jamaah Musafar Tour ${i + 1}`}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading={i < 2 ? "eager" : "lazy"}
                  />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-500" />
                </div>
              ))}
            </div>
          </div>


        </>
      )}
    </section>
  );
};