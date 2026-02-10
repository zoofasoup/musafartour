import { supabase } from '@/integrations/supabase/client';
import {
  getNextCS,
  buildWhatsAppUrl,
  logRedirect,
  extractUTMParams,
  type CSNumber,
} from '@/lib/whatsappRotation';

// Hash IP for privacy
const hashIP = async (ip: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + 'musafar-salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
};

// Save click to database
export const saveClickToDatabase = async (
  cs: CSNumber,
  message: string | null,
  utmParams: ReturnType<typeof extractUTMParams>
) => {
  try {
    const ipHash = await hashIP(Date.now().toString() + Math.random().toString());

    await supabase.from('whatsapp_clicks').insert({
      cs_id: cs.id,
      cs_name: cs.name,
      message: message,
      utm_source: utmParams.utm_source || null,
      utm_medium: utmParams.utm_medium || null,
      utm_campaign: utmParams.utm_campaign || null,
      utm_term: utmParams.utm_term || null,
      utm_content: utmParams.utm_content || null,
      referrer: document.referrer || null,
      user_agent: navigator.userAgent || null,
      ip_hash: ipHash,
    });
  } catch (error) {
    console.error('Failed to save click:', error);
  }
};

/**
 * Redirect to WhatsApp using weighted CS rotation.
 * Falls back to /chat route if no CS numbers are configured.
 */
export const redirectToWhatsApp = async (message: string) => {
  const cs = await getNextCS();

  if (!cs) {
    // Fallback: open /chat route
    window.open('/chat?msg=' + encodeURIComponent(message), '_blank');
    return;
  }

  // Save click to database (fire-and-forget)
  const utmParams = extractUTMParams(new URLSearchParams(window.location.search));
  saveClickToDatabase(cs, message, utmParams);
  logRedirect(cs.id, cs.name, message, utmParams);

  // Open WhatsApp
  const url = buildWhatsAppUrl(cs.phone_number, message);
  window.open(url, '_blank');
};
