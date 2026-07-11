import { Button } from "@/components/ui/button";
import { MessageCircle, Star } from "lucide-react";
import musafarLogo from "@/assets/musafar-logo.svg";
import type { HeroData, WebsiteSettings } from "@/hooks/useHomepageData";
import { redirectToWhatsApp } from "@/lib/chatRedirect";

interface HeroSectionProps {
  heroData: HeroData | null | undefined;
  websiteSettings: WebsiteSettings | null | undefined;
  isLoading?: boolean;
}

export const HeroSection = ({ heroData, websiteSettings, isLoading }: HeroSectionProps) => {
  const handleWhatsAppClick = () => {
    redirectToWhatsApp("Halo Musamin, saya tertarik untuk mengetahui lebih lanjut tentang paket Umroh");
  };

  // Stable layout skeleton - matches exact structure of loaded state to prevent CLS
  // Uses dark background to match hero aesthetic
  const renderSkeleton = () => (
    <>
      {/* Dark placeholder background - matches hero aesthetic */}
      <div className="absolute inset-0 w-full h-full bg-foreground" aria-hidden="true" />
      {/* Gradient overlay - identical to loaded state */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" aria-hidden="true" />
      <div className="relative z-10 container mx-auto px-4 text-center text-white">
        {/* Logo placeholder */}
        <div className="h-16 w-[320px] mx-auto mb-8 bg-white/10 rounded animate-pulse" aria-hidden="true" />
        {/* Title placeholder */}
        <div className="h-12 md:h-16 w-3/4 max-w-2xl mx-auto mb-4 bg-white/10 rounded animate-pulse" aria-hidden="true" />
        {/* Subtitle placeholder */}
        <div className="h-6 w-2/3 max-w-xl mx-auto mb-8 bg-white/10 rounded animate-pulse" aria-hidden="true" />
        {/* Buttons placeholder */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full max-w-full px-4">
          <div className="h-12 w-full sm:w-44 bg-white/10 rounded-md animate-pulse" aria-hidden="true" />
          <div className="h-12 w-full sm:w-56 bg-white/10 rounded-md animate-pulse" aria-hidden="true" />
        </div>
      </div>
    </>
  );

  // Always render the same section structure to prevent layout shift
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {isLoading || !heroData ? (
        renderSkeleton()
      ) : (
        <>
          {heroData.background_image ? (
            <img
              src={heroData.background_image}
              alt="Musafar Tour Umroh Group at Kaaba"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-[20s] ease-out hover:scale-105"
              // @ts-expect-error fetchpriority is valid HTML but React types don't support it yet
              fetchpriority="high"
              loading="eager"
              decoding="sync"
              width="1920"
              height="1080"
            />
          ) : (
            <div className="absolute inset-0 w-full h-full bg-foreground" aria-hidden="true" />
          )}
          
          {/* Enhanced rich gradient overlay for premium feel */}
          <div className="absolute inset-0 bg-gradient-to-t from-foreground via-foreground/60 to-foreground/20" aria-hidden="true" />
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/50 to-transparent" aria-hidden="true" />

          <div className="relative z-10 container mx-auto px-4 flex flex-col items-center justify-center min-h-screen pt-24 pb-20">
            
            <div className="flex-1 flex flex-col items-center justify-center w-full">
              {/* Logo with explicit image for LCP optimization */}
              <div className="mb-8 md:mb-10 relative">
                <div className="absolute inset-0 bg-white/20 blur-[100px] rounded-full animate-pulse-slow" />
                <img 
                  src="/logo-white.webp"
                  alt="Musafar Tour"
                  fetchpriority="high"
                  loading="eager"
                  className="h-16 w-auto md:h-24 mx-auto relative z-10 opacity-0"
                  style={{ animation: 'float-up 1s cubic-bezier(0.2, 0.8, 0.2, 1) forwards' }}
                />
              </div>

              {/* Typography with serif display font */}
              <div className="text-center max-w-4xl mx-auto space-y-4 md:space-y-6 mb-12">
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-white tracking-tight leading-[1.1] animate-fade-in opacity-0" style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}>
                  {heroData.title || "Paket Umroh & Haji Terpercaya 2025"}
                </h1>
                
                <p className="text-lg md:text-2xl text-background max-w-2xl mx-auto animate-fade-in opacity-0" style={{ animationDelay: '0.5s', animationFillMode: 'forwards' }}>
                  {heroData.subtitle || "Wujudkan perjalanan suci yang tenang, nyaman, dan penuh keberkahan bersama bimbingan tulus kami."}
                </p>
              </div>

              {/* Glassmorphism Action Card in document flow */}
              <div className="w-full max-w-2xl mx-auto animate-fade-in opacity-0" style={{ animationDelay: '0.8s', animationFillMode: 'forwards' }}>
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 md:p-6 shadow-2xl flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <Button
                    size="lg"
                    className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-base md:text-lg px-8 w-full sm:w-auto h-14 rounded-xl transition-all hover:scale-105"
                    onClick={() =>
                      document
                        .getElementById("packages")
                        ?.scrollIntoView({ behavior: "smooth" })
                    }
                  >
                    Lihat Semua Paket
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="bg-transparent border-white/40 text-white hover:bg-white hover:text-accent-foreground font-semibold text-base md:text-lg px-8 w-full sm:w-auto h-14 rounded-xl transition-all hover:scale-105"
                    onClick={handleWhatsAppClick}
                  >
                    <MessageCircle className="mr-2 h-5 w-5" />
                    <span>{heroData.cta_text || "Konsultasi Gratis"}</span>
                  </Button>
                </div>
                
                {/* Trust Signals Badge */}
                <div className="mt-6 flex flex-col sm:flex-row items-center gap-2 sm:gap-3 justify-center animate-fade-in opacity-0" style={{ animationDelay: '1s', animationFillMode: 'forwards' }}>
                  <div className="flex gap-1 text-yellow-400 bg-black/20 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                  <p className="text-sm sm:text-base text-white/90 font-medium">Berizin Resmi Kemenag PPIU: 17102200953750002</p>
                </div>
              </div>
            </div>

            {/* Scroll Indicator at the very bottom of the flex container */}
            <div className="mt-12 animate-bounce opacity-50 flex flex-col items-center gap-2">
              <span className="text-white text-xs font-medium tracking-widest uppercase">Scroll</span>
              <div className="w-[1px] h-8 bg-gradient-to-b from-white to-transparent" />
            </div>

          </div>
        </>
      )}
    </section>
  );
};