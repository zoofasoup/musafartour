import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  canonicalUrl?: string;
  structuredData?: object;
  useDefaults?: boolean;
}

export const SEO = ({ 
  title, 
  description, 
  keywords, 
  ogImage,
  canonicalUrl,
  structuredData,
  useDefaults = true
}: SEOProps) => {
  // Fetch global SEO settings
  const { data: globalSettings } = useQuery({
    queryKey: ['seo-settings'],
    queryFn: async () => {
      const { data } = await supabase
        .from('seo_settings')
        .select('*')
        .single();
      return data;
    },
    enabled: useDefaults,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Use provided values or fall back to global defaults
  const finalTitle = title || globalSettings?.site_title || 'Musafar Tour';
  const finalDescription = description || globalSettings?.site_description || '';
  const finalKeywords = keywords || globalSettings?.default_keywords || '';
  const finalOgImage = ogImage || globalSettings?.default_og_image || "https://storage.googleapis.com/gpt-engineer-file-uploads/E3HH8pcvNtWabcauiIpC4SxdTkY2/social-images/social-1761537927169-banner design.jpg";
  useEffect(() => {
    // Update title
    document.title = finalTitle;
    
    // Update meta tags
    updateMetaTag('name', 'description', finalDescription);
    if (finalKeywords) {
      updateMetaTag('name', 'keywords', finalKeywords);
    }
    
    // Update Open Graph tags
    updateMetaTag('property', 'og:title', finalTitle);
    updateMetaTag('property', 'og:description', finalDescription);
    updateMetaTag('property', 'og:image', finalOgImage);
    updateMetaTag('property', 'og:url', canonicalUrl || window.location.href);
    
    // Update Twitter tags
    updateMetaTag('name', 'twitter:title', finalTitle);
    updateMetaTag('name', 'twitter:description', finalDescription);
    updateMetaTag('name', 'twitter:image', finalOgImage);
    updateMetaTag('name', 'twitter:card', globalSettings?.twitter_card_type || 'summary_large_image');
    if (globalSettings?.twitter_site) {
      updateMetaTag('name', 'twitter:site', globalSettings.twitter_site);
    }
    
    // Update canonical URL
    if (canonicalUrl) {
      updateCanonicalLink(canonicalUrl);
    }
    
    // Add structured data
    if (structuredData) {
      addStructuredData(structuredData);
    }
  }, [finalTitle, finalDescription, finalKeywords, finalOgImage, canonicalUrl, structuredData, globalSettings]);
  
  return null;
};

const updateMetaTag = (attribute: string, key: string, content: string) => {
  let element = document.querySelector(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
};

const updateCanonicalLink = (url: string) => {
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
};

const addStructuredData = (data: object) => {
  // Remove existing structured data
  const existingScript = document.querySelector('script[type="application/ld+json"]');
  if (existingScript) {
    existingScript.remove();
  }
  
  // Add new structured data
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.text = JSON.stringify(data);
  document.head.appendChild(script);
};
