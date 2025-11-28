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
    <section className="py-20 bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Belum Yakin Paket Umroh Mana yang Cocok untuk Anda?
        </h2>
        <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
          Tim Musamin kami siap membantu Anda menemukan perjalanan sempurna
          sesuai kebutuhan dan budget Anda.
        </p>
        <Button
          size="lg"
          className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold text-lg px-8"
          onClick={handleWhatsAppClick}
        >
          <MessageCircle className="mr-2 h-5 w-5" />
          Konsultasi Sekarang via WhatsApp
        </Button>
      </div>
    </section>
  );
};