import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Validate pixel IDs to prevent XSS injection
function validatePixelId(id: string | null | undefined, type: 'meta' | 'tiktok' | 'ga4'): string | null {
  if (!id) return null;
  
  const trimmedId = id.trim();
  
  // Meta Pixel: 15-16 digits only
  if (type === 'meta') {
    const metaRegex = /^\d{15,16}$/;
    if (metaRegex.test(trimmedId)) return trimmedId;
  }
  
  // TikTok Pixel: alphanumeric, typically 16-25 characters
  if (type === 'tiktok') {
    const tiktokRegex = /^[A-Z0-9]{8,25}$/i;
    if (tiktokRegex.test(trimmedId)) return trimmedId;
  }
  
  // GA4: starts with G- followed by alphanumeric/hyphen
  // UA: starts with UA- followed by numbers and hyphens
  if (type === 'ga4') {
    const ga4Regex = /^(G-[A-Z0-9]+|UA-\d+-\d+)$/i;
    if (ga4Regex.test(trimmedId)) return trimmedId;
  }
  
  console.error(`Invalid ${type} pixel ID detected, blocking injection:`, trimmedId.substring(0, 20));
  return null;
}

export const useMarketingPixels = () => {
  const { data: settings } = useQuery({
    queryKey: ["marketing-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_settings")
        .select("*")
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000,
  });

  // Inject Meta Pixel
  useEffect(() => {
    const safeMetaPixelId = validatePixelId(settings?.meta_pixel_id, 'meta');
    
    if (settings?.meta_pixel_enabled && safeMetaPixelId) {
      const script = document.createElement("script");
      script.innerHTML = `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${safeMetaPixelId}');
        fbq('track', 'PageView');
      `;
      document.head.appendChild(script);

      const noscript = document.createElement("noscript");
      const img = document.createElement("img");
      img.height = 1;
      img.width = 1;
      img.style.display = "none";
      img.src = `https://www.facebook.com/tr?id=${encodeURIComponent(safeMetaPixelId)}&ev=PageView&noscript=1`;
      noscript.appendChild(img);
      document.head.appendChild(noscript);

      return () => {
        document.head.removeChild(script);
        document.head.removeChild(noscript);
      };
    }
  }, [settings?.meta_pixel_enabled, settings?.meta_pixel_id]);

  // Inject TikTok Pixel
  useEffect(() => {
    const safeTiktokPixelId = validatePixelId(settings?.tiktok_pixel_id, 'tiktok');
    
    if (settings?.tiktok_pixel_enabled && safeTiktokPixelId) {
      // Only inject if not already loaded via hardcoded script
      if (!window.ttq) {
        const script = document.createElement("script");
        script.innerHTML = `
          !function (w, d, t) {
            w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
            ttq.load('${safeTiktokPixelId}');
            ttq.page();
          }(window, document, 'ttq');
        `;
        document.head.appendChild(script);

        return () => {
          document.head.removeChild(script);
        };
      }
    }
  }, [settings?.tiktok_pixel_enabled, settings?.tiktok_pixel_id]);

  // Inject Google Analytics - deferred after page load
  useEffect(() => {
    const safeGa4Id = validatePixelId(settings?.ga4_id, 'ga4');
    
    if (settings?.ga4_enabled && safeGa4Id) {
      // Use requestIdleCallback to defer GA loading
      const loadGA = () => {
        const script1 = document.createElement("script");
        script1.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(safeGa4Id)}`;
        script1.async = true;
        document.head.appendChild(script1);

        const script2 = document.createElement("script");
        script2.innerHTML = `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${safeGa4Id}');
        `;
        document.head.appendChild(script2);
      };

      // Defer loading to not block main thread
      if ('requestIdleCallback' in window) {
        (window as Window).requestIdleCallback(loadGA, { timeout: 3000 });
      } else {
        setTimeout(loadGA, 2000);
      }
    }
  }, [settings?.ga4_enabled, settings?.ga4_id]);

  return settings;
};
