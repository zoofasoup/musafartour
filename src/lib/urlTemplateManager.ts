// URL Template Manager for WhatsApp Rotation

const TEMPLATES_KEY = 'musafar_url_templates';

export interface UTMParams {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content?: string;
  utm_term?: string;
}

export interface URLTemplate {
  id: string;
  name: string;
  base_url: string;
  custom_message?: string;
  utm_params: UTMParams;
  created_at: string;
  last_used?: string;
  use_count: number;
}

// Generate UUID
export const generateId = (): string => {
  return crypto.randomUUID();
};

// Get all templates
export const getTemplates = (): URLTemplate[] => {
  const stored = localStorage.getItem(TEMPLATES_KEY);
  if (!stored) {
    // Initialize with default templates
    const defaults = getDefaultTemplates();
    saveTemplates(defaults);
    return defaults;
  }
  return JSON.parse(stored);
};

// Save all templates
export const saveTemplates = (templates: URLTemplate[]): void => {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
};

// Add new template
export const addTemplate = (template: Omit<URLTemplate, 'id' | 'created_at' | 'use_count'>): URLTemplate => {
  const templates = getTemplates();
  const newTemplate: URLTemplate = {
    ...template,
    id: generateId(),
    created_at: new Date().toISOString(),
    use_count: 0,
  };
  templates.push(newTemplate);
  saveTemplates(templates);
  return newTemplate;
};

// Update template
export const updateTemplate = (id: string, updates: Partial<URLTemplate>): URLTemplate | null => {
  const templates = getTemplates();
  const index = templates.findIndex(t => t.id === id);
  if (index === -1) return null;
  
  templates[index] = { ...templates[index], ...updates };
  saveTemplates(templates);
  return templates[index];
};

// Delete template
export const deleteTemplate = (id: string): boolean => {
  const templates = getTemplates();
  const filtered = templates.filter(t => t.id !== id);
  if (filtered.length === templates.length) return false;
  saveTemplates(filtered);
  return true;
};

// Delete multiple templates
export const deleteTemplates = (ids: string[]): number => {
  const templates = getTemplates();
  const filtered = templates.filter(t => !ids.includes(t.id));
  const deletedCount = templates.length - filtered.length;
  saveTemplates(filtered);
  return deletedCount;
};

// Increment use count and update last_used
export const recordTemplateUse = (id: string): void => {
  const templates = getTemplates();
  const index = templates.findIndex(t => t.id === id);
  if (index !== -1) {
    templates[index].use_count += 1;
    templates[index].last_used = new Date().toISOString();
    saveTemplates(templates);
  }
};

// Build full URL from template
export const buildTemplateUrl = (template: URLTemplate, includeProtocol: boolean = false): string => {
  const baseUrl = template.base_url || 'musafartour.com/chat';
  const params = new URLSearchParams();
  
  // Add custom message if exists
  if (template.custom_message) {
    params.set('msg', template.custom_message);
  }
  
  // Add UTM parameters
  if (template.utm_params.utm_source) {
    params.set('utm_source', template.utm_params.utm_source);
  }
  if (template.utm_params.utm_medium) {
    params.set('utm_medium', template.utm_params.utm_medium);
  }
  if (template.utm_params.utm_campaign) {
    params.set('utm_campaign', template.utm_params.utm_campaign);
  }
  if (template.utm_params.utm_content) {
    params.set('utm_content', template.utm_params.utm_content);
  }
  if (template.utm_params.utm_term) {
    params.set('utm_term', template.utm_params.utm_term);
  }
  
  const queryString = params.toString();
  const fullUrl = queryString ? `${baseUrl}?${queryString}` : baseUrl;
  
  return includeProtocol ? `https://${fullUrl}` : fullUrl;
};

// Format UTM param (lowercase, replace spaces with underscores)
export const formatUTMParam = (value: string): string => {
  return value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, '');
};

// UTM Presets
export interface UTMPreset {
  name: string;
  icon: string;
  utm_source: string;
  utm_medium: string;
}

export const UTM_PRESETS: UTMPreset[] = [
  { name: 'Instagram Story', icon: '📷', utm_source: 'instagram', utm_medium: 'story' },
  { name: 'Instagram Feed', icon: '📸', utm_source: 'instagram', utm_medium: 'feed' },
  { name: 'Facebook Ads', icon: '📘', utm_source: 'facebook', utm_medium: 'ads' },
  { name: 'Google Ads', icon: '🔍', utm_source: 'google', utm_medium: 'cpc' },
  { name: 'TikTok', icon: '🎵', utm_source: 'tiktok', utm_medium: 'video' },
  { name: 'Email', icon: '📧', utm_source: 'email', utm_medium: 'newsletter' },
  { name: 'WhatsApp Broadcast', icon: '💬', utm_source: 'whatsapp', utm_medium: 'broadcast' },
];

// Default templates
export const getDefaultTemplates = (): URLTemplate[] => [
  {
    id: generateId(),
    name: 'Default - Tanpa Parameter',
    base_url: 'musafartour.com/chat',
    utm_params: {
      utm_source: '',
      utm_medium: '',
      utm_campaign: '',
    },
    created_at: new Date().toISOString(),
    use_count: 0,
  },
  {
    id: generateId(),
    name: 'Instagram Story - Promo Umroh',
    base_url: 'musafartour.com/chat',
    custom_message: 'Saya mau tanya paket umroh',
    utm_params: {
      utm_source: 'instagram',
      utm_medium: 'story',
      utm_campaign: 'promo_umroh',
    },
    created_at: new Date().toISOString(),
    use_count: 0,
  },
  {
    id: generateId(),
    name: 'Facebook Ads - Campaign Ramadhan',
    base_url: 'musafartour.com/chat',
    custom_message: 'Tanya promo Ramadhan',
    utm_params: {
      utm_source: 'facebook',
      utm_medium: 'ads',
      utm_campaign: 'ramadhan_2026',
    },
    created_at: new Date().toISOString(),
    use_count: 0,
  },
];

// Search templates
export const searchTemplates = (templates: URLTemplate[], query: string): URLTemplate[] => {
  const lowerQuery = query.toLowerCase();
  return templates.filter(t => 
    t.name.toLowerCase().includes(lowerQuery) ||
    t.utm_params.utm_source?.toLowerCase().includes(lowerQuery) ||
    t.utm_params.utm_campaign?.toLowerCase().includes(lowerQuery)
  );
};

// Export templates to JSON
export const exportTemplates = (templates: URLTemplate[]): string => {
  return JSON.stringify(templates, null, 2);
};

// Import templates from JSON
export const importTemplates = (json: string): URLTemplate[] | null => {
  try {
    const imported = JSON.parse(json);
    if (!Array.isArray(imported)) return null;
    
    // Validate structure
    const valid = imported.every(t => 
      t.name && 
      typeof t.name === 'string' &&
      t.utm_params &&
      typeof t.utm_params === 'object'
    );
    
    if (!valid) return null;
    
    // Assign new IDs and timestamps
    return imported.map(t => ({
      ...t,
      id: generateId(),
      created_at: new Date().toISOString(),
      use_count: 0,
      last_used: undefined,
    }));
  } catch {
    return null;
  }
};

// Get template stats
export const getTemplateStats = (templates: URLTemplate[]) => {
  const totalUses = templates.reduce((sum, t) => sum + t.use_count, 0);
  const mostUsed = templates.reduce((max, t) => t.use_count > (max?.use_count || 0) ? t : max, templates[0]);
  
  return {
    totalTemplates: templates.length,
    totalUses,
    mostUsed,
  };
};
