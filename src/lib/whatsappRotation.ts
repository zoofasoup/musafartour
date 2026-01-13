import { supabase } from '@/integrations/supabase/client';

const ROTATION_KEY = 'musafar_cs_rotation';
const REDIRECT_LOG_KEY = 'musafar_redirect_log';

export interface CSNumber {
  id: string;
  name: string;
  phone_number: string;
  display_order: number;
  is_active: boolean;
}

export interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

export interface RedirectLog {
  csId: string;
  csName: string;
  timestamp: string;
  message?: string;
  utm?: UTMParams;
  referrer?: string;
}

// Fetch CS numbers from database
export const fetchCSNumbers = async (): Promise<CSNumber[]> => {
  const { data, error } = await supabase
    .from('whatsapp_cs')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });
  
  if (error) {
    console.error('Error fetching CS numbers:', error);
    return [];
  }
  
  return data || [];
};

// Get current rotation index
export const getCurrentRotationIndex = (): number => {
  const stored = localStorage.getItem(ROTATION_KEY);
  return stored ? parseInt(stored, 10) : 0;
};

// Set rotation index
export const setRotationIndex = (index: number): void => {
  localStorage.setItem(ROTATION_KEY, index.toString());
};

// Get next CS in rotation and update state
export const getNextCS = async (): Promise<CSNumber | null> => {
  const csNumbers = await fetchCSNumbers();
  if (csNumbers.length === 0) return null;
  
  const currentIndex = getCurrentRotationIndex();
  const safeIndex = currentIndex % csNumbers.length;
  const cs = csNumbers[safeIndex];
  
  // Update to next index (round-robin)
  const nextIndex = (safeIndex + 1) % csNumbers.length;
  setRotationIndex(nextIndex);
  
  return cs;
};

// Build WhatsApp URL
export const buildWhatsAppUrl = (phoneNumber: string, message?: string): string => {
  const baseUrl = `https://wa.me/${phoneNumber}`;
  if (message) {
    return `${baseUrl}?text=${encodeURIComponent(message)}`;
  }
  return baseUrl;
};

// Extract UTM parameters from URLSearchParams
export const extractUTMParams = (searchParams: URLSearchParams): UTMParams => {
  const utm: UTMParams = {};
  
  const utmSource = searchParams.get('utm_source');
  const utmMedium = searchParams.get('utm_medium');
  const utmCampaign = searchParams.get('utm_campaign');
  const utmTerm = searchParams.get('utm_term');
  const utmContent = searchParams.get('utm_content');
  
  if (utmSource) utm.utm_source = utmSource;
  if (utmMedium) utm.utm_medium = utmMedium;
  if (utmCampaign) utm.utm_campaign = utmCampaign;
  if (utmTerm) utm.utm_term = utmTerm;
  if (utmContent) utm.utm_content = utmContent;
  
  return utm;
};

// Log redirect for stats
export const logRedirect = (
  csId: string, 
  csName: string, 
  message?: string,
  utm?: UTMParams
): void => {
  const log: RedirectLog = {
    csId,
    csName,
    timestamp: new Date().toISOString(),
    message,
    utm: utm && Object.keys(utm).length > 0 ? utm : undefined,
    referrer: typeof document !== 'undefined' ? document.referrer || undefined : undefined,
  };
  
  // Get existing logs
  const existingLogs = getRedirectLogs();
  
  // Keep only last 100 logs
  const updatedLogs = [log, ...existingLogs].slice(0, 100);
  localStorage.setItem(REDIRECT_LOG_KEY, JSON.stringify(updatedLogs));
  
  // Console log for debugging
  const utmInfo = utm && Object.keys(utm).length > 0 
    ? ` | Campaign: ${utm.utm_campaign || 'N/A'} | Source: ${utm.utm_source || 'N/A'}` 
    : '';
  console.log(`[Musafar CS Redirect] ${csName} | ${log.timestamp}${message ? ` | Message: ${message}` : ''}${utmInfo}`);
  
  // Send to Google Analytics if available
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'whatsapp_redirect', {
      cs_id: csId,
      cs_name: csName,
      has_message: !!message,
      utm_source: utm?.utm_source,
      utm_medium: utm?.utm_medium,
      utm_campaign: utm?.utm_campaign,
      utm_term: utm?.utm_term,
      utm_content: utm?.utm_content,
    });
  }
};

// Get redirect logs
export const getRedirectLogs = (): RedirectLog[] => {
  const stored = localStorage.getItem(REDIRECT_LOG_KEY);
  return stored ? JSON.parse(stored) : [];
};

// Get stats per CS
export const getCSStats = (csNumbers: CSNumber[]): Record<string, number> => {
  const logs = getRedirectLogs();
  const stats: Record<string, number> = {};
  
  csNumbers.forEach(cs => {
    stats[cs.id] = logs.filter(log => log.csId === cs.id).length;
  });
  
  return stats;
};

// Get campaign stats
export const getCampaignStats = (): Record<string, number> => {
  const logs = getRedirectLogs();
  const stats: Record<string, number> = {};
  
  logs.forEach(log => {
    const campaign = log.utm?.utm_campaign || 'direct';
    stats[campaign] = (stats[campaign] || 0) + 1;
  });
  
  return stats;
};

// Get source stats
export const getSourceStats = (): Record<string, number> => {
  const logs = getRedirectLogs();
  const stats: Record<string, number> = {};
  
  logs.forEach(log => {
    const source = log.utm?.utm_source || 'direct';
    stats[source] = (stats[source] || 0) + 1;
  });
  
  return stats;
};

// Reset rotation
export const resetRotation = (): void => {
  localStorage.setItem(ROTATION_KEY, '0');
};

// Clear all logs
export const clearLogs = (): void => {
  localStorage.removeItem(REDIRECT_LOG_KEY);
};
