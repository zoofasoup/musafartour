import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import heroImage from "@/assets/hero-umroh-jamaah-group.webp";
import musafarLogo from "@/assets/musafar-logo.svg";
import type { HeroData, WebsiteSettings } from "@/hooks/useHomepageData";

interface HeroSectionProps {
  heroData: HeroData | null | undefined;
  websiteSettings: WebsiteSettings | null | undefined;
}

export const HeroSection = ({ heroData, websiteSettings }: HeroSectionProps) => {
  const handleWhatsAppClick = () => {
    const whatsappNumber = websiteSettings?.whatsapp_number || "6281917403797";
    window.open(
      `https://wa.me/${whatsappNumber}?text=Halo%20Musamin,%20saya%20tertarik%20untuk%20mengetahui%20lebih%20lanjut%20tentang%20paket%20Umroh`,
      "_blank"
    );
  };

  return (
    <section className="relative h-[90vh] flex items-center justify-center overflow-hidden">
      <img
        src={heroData?.background_image || heroImage}
        alt="Musafar Tour Umroh Group at Kaaba"
        className="absolute inset-0 w-full h-full object-cover"
        // @ts-expect-error fetchpriority is valid HTML but React types don't support it yet
        fetchpriority="high"
        loading="eager"
        decoding="async"
        width="1920"
        height="1080"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />

      <div className="relative z-10 container mx-auto px-4 text-center text-white">
        <img
          src={musafarLogo}
          alt="Musafar Tour"
          className="h-16 mx-auto mb-8 opacity-90 animate-fade-in"
        />
        <h1 className="text-4xl md:text-6xl font-bold mb-4 animate-[fade-in_0.6s_ease-out,float-up_0.6s_ease-out]">
          {heroData?.title || "Edit your hero in the dashboard"}
        </h1>
        <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto text-gray-200 animate-[fade-in_0.8s_ease-out_0.2s_both,float-up_0.8s_ease-out_0.2s_both]">
          {heroData?.subtitle ||
            "Configure your hero section from the admin dashboard to customize this content."}
        </p>
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
              {heroData?.cta_text || "Chat dengan Musamin 🤍"}
            </span>
          </Button>
        </div>
      </div>
    </section>
  );
};