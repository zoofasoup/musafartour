import { MessageCircle } from "lucide-react";
import { useState } from "react";
import { redirectToWhatsApp } from "@/lib/chatRedirect";

const FloatingWhatsApp = () => {
  const [isHovered, setIsHovered] = useState(false);
  
  const handleClick = () => {
    // Track the click event
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'whatsapp_click', {
        event_category: 'engagement',
        event_label: 'floating_button',
      });
    }
    
    redirectToWhatsApp("Halo Musafar Tour, saya tertarik dengan paket umroh Anda. Saya tahu dari website.");
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-[#25D366] hover:bg-[#22c55e] text-white rounded-full shadow-lg transition-all duration-300 group"
      aria-label="Hubungi via WhatsApp"
    >
      <div className={`flex items-center transition-all duration-300 ${isHovered ? 'px-5 py-3' : 'p-4'}`}>
        <MessageCircle className="w-6 h-6" />
        <span className={`overflow-hidden transition-all duration-300 whitespace-nowrap font-medium ${isHovered ? 'max-w-xs ml-2 opacity-100' : 'max-w-0 ml-0 opacity-0'}`}>
          Hubungi Kami
        </span>
      </div>
    </button>
  );
};

export default FloatingWhatsApp;
