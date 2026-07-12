import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import type { WebsiteSettings } from "@/hooks/useHomepageData";

interface CTASectionProps {
  websiteSettings: WebsiteSettings | null | undefined;
}

export const CTASection = ({ websiteSettings }: CTASectionProps) => {
  const handleWhatsAppClick = () => {
    const whatsappNumber = websiteSettings?.whatsapp_number || "6281917403797";
    window.open(
      `https://wa.me/${whatsappNumber}?text=Halo%20Musamin,%20saya%20tertarik%20untuk%20mengetahui%20lebih%20lanjut%20tentang%20paket%20Umroh`,
      "_blank"
    );
  };

  return (
    <section className="relative py-32 md:py-48 bg-foreground text-white overflow-hidden">
      {/* Subtle radial gradient for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(140,80,40,0.15)_0%,_transparent_70%)]" aria-hidden="true" />
      
      <div className="relative container mx-auto px-6 md:px-8 text-center">
        <span className="text-accent uppercase tracking-[0.3em] text-xs font-bold mb-6 block">
          Mulai Perjalanan Anda
        </span>
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6 tracking-tight max-w-3xl mx-auto leading-[1.1]">
          Belum Yakin Paket Umroh Mana yang Cocok?
        </h2>
        <p className="text-lg md:text-xl mb-12 text-background max-w-2xl mx-auto leading-relaxed">
          Tim Musamin kami siap membantu Anda menemukan perjalanan sempurna
          sesuai kebutuhan dan budget Anda.
        </p>
        <Button
          size="lg"
          className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-lg px-10 h-16 rounded-xl transition-all hover:scale-105"
          onClick={handleWhatsAppClick}
        >
          <MessageCircle className="mr-2 h-5 w-5" />
          Konsultasi Sekarang via WhatsApp
        </Button>
      </div>
    </section>
  );
};