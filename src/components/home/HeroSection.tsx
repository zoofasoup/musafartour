import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import musafarLogo from "@/assets/musafar-logo.svg";
import type { HeroData, WebsiteSettings } from "@/hooks/useHomepageData";

interface HeroSectionProps {
  heroData: HeroData | null | undefined;
  websiteSettings: WebsiteSettings | null | undefined;
  isLoading?: boolean;
}

export const HeroSection = ({ heroData, websiteSettings, isLoading }: HeroSectionProps) => {
  const handleWhatsAppClick = () => {
    const whatsappNumber = websiteSettings?.whatsapp_number || "6281917403797";
    window.open(
      `https://wa.me/${whatsappNumber}?text=Halo%20Musamin,%20saya%20tertarik%20untuk%20mengetahui%20lebih%20lanjut%20tentang%20paket%20Umroh`,
      "_blank"
    );
  };

  // Stable layout skeleton - matches exact structure of loaded state to prevent CLS
  // Uses dark background to match hero aesthetic
  const renderSkeleton = () => (
    <>
      {/* Dark placeholder background - matches hero aesthetic */}
      <div className="absolute inset-0 w-full h-full bg-slate-800" aria-hidden="true" />
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
    <section className="relative h-[90vh] min-h-[600px] flex items-center justify-center overflow-hidden">
      {isLoading || !heroData ? (
        renderSkeleton()
      ) : (
        <>
          {heroData.background_image ? (
            <img
              src={heroData.background_image}
              alt="Musafar Tour Umroh Group at Kaaba"
              className="absolute inset-0 w-full h-full object-cover"
              // @ts-expect-error fetchpriority is valid HTML but React types don't support it yet
              fetchpriority="high"
              loading="eager"
              decoding="sync"
              width="1920"
              height="1080"
            />
          ) : (
            <div className="absolute inset-0 w-full h-full bg-slate-800" aria-hidden="true" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" aria-hidden="true" />

          <div className="relative z-10 container mx-auto px-4 text-center text-white">
            <img
              src={musafarLogo}
              alt="Musafar Tour"
              className="h-16 mx-auto mb-8 opacity-90 animate-fade-in"
              width="320"
              height="64"
            />
            <h1 className="text-4xl md:text-6xl font-bold mb-4 animate-[fade-in_0.6s_ease-out,float-up_0.6s_ease-out]">
              {heroData.title}
            </h1>
            {heroData.subtitle && (
              <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto text-gray-200 animate-[fade-in_0.8s_ease-out_0.2s_both,float-up_0.8s_ease-out_0.2s_both]">
                {heroData.subtitle}
              </p>
            )}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full max-w-full px-4 animate-[fade-in_1s_ease-out_0.4s_both,float-up_1s_ease-out_0.4s_both]">
              <Button
                size="lg"
                className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold text-base sm:text-lg px-6 sm:px-8 w-full sm:w-auto"
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
                className="bg-white/10 border-white text-white hover:bg-white hover:text-foreground font-semibold text-base sm:text-lg px-6 sm:px-8 backdrop-blur-sm w-full sm:w-auto"
                onClick={handleWhatsAppClick}
              >
                <MessageCircle className="mr-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="truncate">
                  {heroData.cta_text || "Chat dengan Musamin 🤍"}
                </span>
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  );
};