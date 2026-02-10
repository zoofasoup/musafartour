import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  getNextCS, 
  buildWhatsAppUrl, 
  logRedirect, 
  extractUTMParams,
  type CSNumber 
} from '@/lib/whatsappRotation';
import { saveClickToDatabase } from '@/lib/chatRedirect';

const Chat = () => {
  const [searchParams] = useSearchParams();
  const [redirecting, setRedirecting] = useState(true);
  const [fallbackCS, setFallbackCS] = useState<CSNumber | null>(null);

  useEffect(() => {
    document.title = 'Hubungi Kami - Musafar Tour';
    
    const doRedirect = async () => {
      const customMessage = searchParams.get('msg') || searchParams.get('message');
      const defaultMessage = 'Halo, saya tertarik dengan paket umroh Musafar Tour';
      const message = customMessage || defaultMessage;

      const utmParams = extractUTMParams(searchParams);

      const cs = await getNextCS();
      
      if (!cs) {
        setRedirecting(false);
        return;
      }
      
      setFallbackCS(cs);
      
      // Save to database (async, don't wait)
      saveClickToDatabase(cs, message, utmParams);
      
      // Log the redirect with UTM tracking
      logRedirect(cs.id, cs.name, message, utmParams);
      
      // Redirect immediately
      window.location.href = buildWhatsAppUrl(cs.phone_number, message);
    };

    const redirectTimer = setTimeout(doRedirect, 50);
    const fallbackTimer = setTimeout(() => {
      setRedirecting(false);
    }, 2000);

    return () => {
      clearTimeout(redirectTimer);
      clearTimeout(fallbackTimer);
    };
  }, [searchParams]);

  const handleManualRedirect = async () => {
    const cs = fallbackCS || (await getNextCS());
    if (!cs) return;
    
    const message = searchParams.get('msg') || 'Halo, saya tertarik dengan paket umroh Musafar Tour';
    const utmParams = extractUTMParams(searchParams);
    
    saveClickToDatabase(cs, message, utmParams);
    logRedirect(cs.id, cs.name, message, utmParams);
    
    window.location.href = buildWhatsAppUrl(cs.phone_number, message);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary/90 to-primary/80 flex items-center justify-center">
      <div className="text-center text-white px-4">
        {redirecting ? (
          <>
            <div className="mb-6">
              <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
            </div>
            <p className="text-xl font-medium animate-pulse">
              Menghubungkan...
            </p>
            <p className="text-sm text-white/70 mt-2">
              Anda akan dialihkan ke WhatsApp
            </p>
          </>
        ) : (
          <>
            <p className="text-xl font-medium mb-4">
              Tidak dapat mengalihkan otomatis
            </p>
            <button
              onClick={handleManualRedirect}
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
