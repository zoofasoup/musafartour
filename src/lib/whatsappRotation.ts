// WhatsApp CS Numbers Configuration
export const CS_NUMBERS = [
  { id: 1, name: 'CS #1', number: '6281234567890' },
  { id: 2, name: 'CS #2', number: '6281234567891' },
  { id: 3, name: 'CS #3', number: '6281234567892' },
];

const ROTATION_KEY = 'musafar_cs_rotation';
const REDIRECT_LOG_KEY = 'musafar_redirect_log';

interface RedirectLog {
  csId: number;
  csName: string;
  timestamp: string;
  message?: string;
}

// Get current rotation index
export const getCurrentRotationIndex = (): number => {
  const stored = localStorage.getItem(ROTATION_KEY);
  return stored ? parseInt(stored, 10) : 0;
};

// Get next CS in rotation and update state
export const getNextCS = () => {
  const currentIndex = getCurrentRotationIndex();
  const cs = CS_NUMBERS[currentIndex];
  
  // Update to next index (round-robin)
  const nextIndex = (currentIndex + 1) % CS_NUMBERS.length;
  localStorage.setItem(ROTATION_KEY, nextIndex.toString());
  
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
export const logRedirect = (csId: number, csName: string, message?: string): void => {
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
export const getCSStats = (): Record<number, number> => {
  const logs = getRedirectLogs();
  const stats: Record<number, number> = {};
  
  CS_NUMBERS.forEach(cs => {
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
