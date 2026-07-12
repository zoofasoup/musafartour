import { Button } from "@/components/ui/button";
import { MessageCircle, Star, Heart } from "lucide-react";
import musafarLogo from "@/assets/musafar-logo.svg";
import type { HeroData, WebsiteSettings } from "@/hooks/useHomepageData";
import { redirectToWhatsApp } from "@/lib/chatRedirect";

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
  const handleWhatsAppClick = () => {
    redirectToWhatsApp("Halo Musamin, saya tertarik untuk berkonsultasi mengenai paket Umroh.");
  };

  const renderSkeleton = () => (
    <div className="w-full min-h-screen bg-[#F9F8F6] pt-32 pb-16 flex flex-col items-center justify-start relative overflow-hidden">
      <div className="w-full max-w-4xl px-4 text-center z-10">
        <div className="h-16 w-3/4 max-w-2xl mx-auto mb-6 bg-muted animate-pulse rounded" />
        <div className="h-6 w-2/3 max-w-xl mx-auto mb-10 bg-muted animate-pulse rounded" />
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full px-4 mb-10">
          <div className="h-14 w-full sm:w-48 bg-muted animate-pulse rounded-full" />
          <div className="h-14 w-full sm:w-48 bg-muted animate-pulse rounded-full" />
        </div>
      </div>
      <div className="mt-8 w-full max-w-[1600px] mx-auto px-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="aspect-[3/4] bg-muted animate-pulse rounded-2xl" />)}
      </div>
    </div>
  );

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-start overflow-hidden bg-[#F9F8F6] pt-32 md:pt-40 pb-12">
      {isLoading ? (
        renderSkeleton()
      ) : (
        <>
          <div className="relative z-10 container mx-auto px-4 flex flex-col items-center justify-start text-center">
            {/* Header Text Block - Clean typography on light background */}
            <div className="max-w-4xl mx-auto space-y-4 md:space-y-6 mb-10 animate-fade-in opacity-0" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
              <h1 className="text-4xl md:text-6xl lg:text-[4.5rem] font-display font-bold text-[#1c1c1c] tracking-tight leading-[1.05]">
                Musafar, Bukan Safar Biasa.
              </h1>
              
              <p className="text-lg md:text-2xl text-[#1c1c1c]/70 max-w-2xl mx-auto font-medium">
                Teman Perjalanan Keluarga Membangun Memori di Tanah Suci
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full max-w-full px-4 mb-8 animate-fade-in opacity-0" style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}>
              <Button
                size="lg"
                className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-base md:text-lg px-8 w-full sm:w-auto h-14 rounded-full transition-all hover:scale-105 shadow-lg shadow-accent/20"
                onClick={() =>
                  document.getElementById("packages-carousel")?.scrollIntoView({ behavior: "smooth" })
                }
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
                <span>Konsultasi Now</span>
                <Heart className="ml-2 h-4 w-4 text-destructive/70" />
              </Button>
            </div>

            {/* Trust Signals Badge */}
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 justify-center mb-16 animate-fade-in opacity-0" style={{ animationDelay: '0.6s', animationFillMode: 'forwards' }}>
              <div className="flex gap-1 text-accent">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <p className="text-sm sm:text-base text-[#1c1c1c]/60 font-medium">Berizin Resmi Kemenag PPIU: 17102200953750002</p>
            </div>
            
            {/* Scroll Indicator */}
            <div className="animate-bounce opacity-40 flex flex-col items-center gap-2 mb-10">
              <span className="text-[#1c1c1c]/50 text-xs font-semibold tracking-widest uppercase">Scroll</span>
              <div className="w-[1px] h-8 bg-gradient-to-b from-[#1c1c1c]/50 to-transparent" />
            </div>
          </div>

          {/* Vintage Mosaic Photo Grid */}
          <div className="w-full max-w-[1800px] mx-auto px-4 md:px-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 pb-20 opacity-0 animate-fade-in" style={{ animationDelay: '0.8s', animationFillMode: 'forwards' }}>
            {mosaicPhotos.map((photo, index) => {
              // Staggered height effect
              let verticalOffset = "translate-y-0";
              if (index % 2 !== 0) verticalOffset = "translate-y-8 md:translate-y-16 lg:translate-y-24";
              
              // Hide last photo on 4-col tablet layout
              const displayClass = index === 4 ? "hidden lg:block" : "";

              return (
                <div key={index} className={`relative rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl ${displayClass} ${verticalOffset}`}>
                  <div className="aspect-[3/4] w-full">
                    <img 
                      src={photo} 
                      alt={`Jamaah Musafar ${index + 1}`}
                      className="w-full h-full object-cover sepia-[.4] saturate-[.6] contrast-[1.1] brightness-[1.05] hover:sepia-0 hover:saturate-100 hover:contrast-100 hover:brightness-100 transition-all duration-700 cursor-pointer"
                      loading="lazy"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
};