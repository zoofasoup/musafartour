import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { redirectToWhatsApp } from "@/lib/chatRedirect";
import { hasConsent } from "@/lib/consent";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

const FloatingWhatsApp = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClick = () => {
    // Track the click event
    if (typeof window !== 'undefined' && (window as any).gtag && hasConsent('analytics')) {
      (window as any).gtag('event', 'whatsapp_click', {
        event_category: 'engagement',
        event_label: 'floating_button',
      });
    }

    redirectToWhatsApp("Halo Musafar Tour, saya tertarik dengan paket umroh Anda. Saya tahu dari website.", "floating_button");
  };

  if (!mounted) return null;

  return createPortal(
    <button
      onClick={handleClick}
      className="fixed bottom-[calc(1.5rem+var(--consent-h,0px))] right-6 z-40 flex items-center justify-center w-14 h-14 bg-[#25D366] hover:bg-[#22c55e] text-foreground rounded-full shadow-[0_4px_14px_0_rgba(37,211,102,0.39)] hover:shadow-[0_6px_20px_rgba(37,211,102,0.23)] transition-colors cursor-pointer"
      aria-label="Hubungi via WhatsApp"
    >
      <WhatsAppIcon className="w-7 h-7" />
    </button>,
    document.body
  );
};

export default FloatingWhatsApp;
