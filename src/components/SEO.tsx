import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  ogImage?: string;
  canonicalUrl?: string;
  structuredData?: object;
}

export const SEO = ({ 
  title, 
  description, 
  keywords, 
  ogImage = "https://storage.googleapis.com/gpt-engineer-file-uploads/E3HH8pcvNtWabcauiIpC4SxdTkY2/social-images/social-1761537927169-banner design.jpg",
  canonicalUrl,
  structuredData 
}: SEOProps) => {
  useEffect(() => {
    // Update title
    document.title = title;
    
    // Update meta tags
    updateMetaTag('name', 'description', description);
    if (keywords) {
      updateMetaTag('name', 'keywords', keywords);
    }
    
    // Update Open Graph tags
    updateMetaTag('property', 'og:title', title);
    updateMetaTag('property', 'og:description', description);
    updateMetaTag('property', 'og:image', ogImage);
    updateMetaTag('property', 'og:url', canonicalUrl || window.location.href);
    
    // Update Twitter tags
    updateMetaTag('name', 'twitter:title', title);
    updateMetaTag('name', 'twitter:description', description);
    updateMetaTag('name', 'twitter:image', ogImage);
    
    // Update canonical URL
    if (canonicalUrl) {
      updateCanonicalLink(canonicalUrl);
    }
    
    // Add structured data
    if (structuredData) {
      addStructuredData(structuredData);
    }
  }, [title, description, keywords, ogImage, canonicalUrl, structuredData]);
  
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
