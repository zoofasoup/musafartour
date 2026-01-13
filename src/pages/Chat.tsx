import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getNextCS, buildWhatsAppUrl, logRedirect } from '@/lib/whatsappRotation';

const Chat = () => {
  const [searchParams] = useSearchParams();
  const [redirecting, setRedirecting] = useState(true);

  useEffect(() => {
    document.title = 'Hubungi Kami - Musafar Tour';
    
    // Get custom message from URL params
    const customMessage = searchParams.get('msg') || searchParams.get('message');
    const defaultMessage = 'Halo, saya tertarik dengan paket umroh Musafar Tour';
    const message = customMessage || defaultMessage;

    // Get next CS in rotation
    const cs = getNextCS();
    
    // Log the redirect
    logRedirect(cs.id, cs.name, message);
    
    // Build WhatsApp URL
    const whatsappUrl = buildWhatsAppUrl(cs.number, message);
    
    // Redirect immediately
    const redirectTimer = setTimeout(() => {
      window.location.href = whatsappUrl;
    }, 50); // Ultra-fast 50ms delay

    // Fallback: If redirect doesn't work after 2s, show manual link
    const fallbackTimer = setTimeout(() => {
      setRedirecting(false);
    }, 2000);

    return () => {
      clearTimeout(redirectTimer);
      clearTimeout(fallbackTimer);
    };
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary/90 to-primary/80 flex items-center justify-center">
      <div className="text-center text-white px-4">
        {redirecting ? (
          <>
            {/* Spinner */}
            <div className="mb-6">
              <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
            </div>
            
            {/* Text */}
            <p className="text-xl font-medium animate-pulse">
              Menghubungkan...
            </p>
            <p className="text-sm text-white/70 mt-2">
              Anda akan dialihkan ke WhatsApp
            </p>
          </>
        ) : (
          <>
            {/* Fallback manual link */}
            <p className="text-xl font-medium mb-4">
              Tidak dapat mengalihkan otomatis
            </p>
            <button
              onClick={() => {
                const cs = getNextCS();
                const message = searchParams.get('msg') || 'Halo, saya tertarik dengan paket umroh Musafar Tour';
                window.location.href = buildWhatsAppUrl(cs.number, message);
              }}
              className="bg-white text-primary px-6 py-3 rounded-full font-semibold hover:bg-white/90 transition-colors"
            >
              Klik untuk Chat WhatsApp
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Chat;
