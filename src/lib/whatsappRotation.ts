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

interface RedirectLog {
  csId: string;
  csName: string;
  timestamp: string;
  message?: string;
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

// Log redirect for stats
export const logRedirect = (csId: string, csName: string, message?: string): void => {
  const log: RedirectLog = {
    csId,
    csName,
    timestamp: new Date().toISOString(),
    message,
  };
  
  // Get existing logs
  const existingLogs = getRedirectLogs();
  
  // Keep only last 100 logs
  const updatedLogs = [log, ...existingLogs].slice(0, 100);
  localStorage.setItem(REDIRECT_LOG_KEY, JSON.stringify(updatedLogs));
  
  // Console log for debugging
  console.log(`[Musafar CS Redirect] ${csName} | ${log.timestamp}${message ? ` | Message: ${message}` : ''}`);
  
  // Send to Google Analytics if available
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'whatsapp_redirect', {
      cs_id: csId,
      cs_name: csName,
      has_message: !!message,
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

// Reset rotation
export const resetRotation = (): void => {
  localStorage.setItem(ROTATION_KEY, '0');
};

// Clear all logs
export const clearLogs = (): void => {
  localStorage.removeItem(REDIRECT_LOG_KEY);
};
