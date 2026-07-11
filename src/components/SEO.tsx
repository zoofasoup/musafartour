import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet-async';

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
  const url = canonicalUrl || (typeof window !== 'undefined' ? window.location.href : '');

  return (
    <Helmet prioritizeSeoTags>
      <title>{finalTitle}</title>
      <meta name="description" content={finalDescription} />
      {finalKeywords && <meta name="keywords" content={finalKeywords} />}
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:image" content={finalOgImage} />
      
      {/* Twitter */}
      <meta name="twitter:card" content={globalSettings?.twitter_card_type || 'summary_large_image'} />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={finalDescription} />
      <meta name="twitter:image" content={finalOgImage} />
      {globalSettings?.twitter_site && <meta name="twitter:site" content={globalSettings.twitter_site} />}
      
      {/* Canonical URL */}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      
      {/* Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
};
