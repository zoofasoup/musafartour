import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { flushPendingPixelEvents, trackMetaPageView, trackTikTokPageView } from "@/lib/tracking";

// Module-level: the load's PageView must be sent once even if the hook re-runs.
let metaPageViewSent = false;

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

/**
 * @param enabled - When false, the hook still runs (rules of hooks require every
 * hook call to be unconditional) but skips all pixel-injection side effects.
 * Used to suppress tracker injection on /flyer-print, which is screenshotted by
 * a headless browser on every flyer export and must not fire real pageviews.
 */
export const useMarketingPixels = (enabled: boolean = true) => {
  const { data: settings } = useQuery({
    queryKey: ["marketing-settings-public"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-marketing-pixels");
      if (error) throw error;
      return data as {
        meta_pixel_id?: string | null;
        meta_pixel_enabled?: boolean | null;
        tiktok_pixel_id?: string | null;
        tiktok_pixel_enabled?: boolean | null;
        ga4_id?: string | null;
        ga4_enabled?: boolean | null;
      } | null;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000,
    enabled,
  });

  // Inject Meta Pixel
  useEffect(() => {
    const safeMetaPixelId = validatePixelId(settings?.meta_pixel_id, 'meta');

    if (enabled && settings?.meta_pixel_enabled && safeMetaPixelId) {
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
      `;
      document.head.appendChild(script);
      // The inline script runs synchronously on append, so fbq exists now.
      // One PageView per page load; after that the pixel's own History listener
      // sends a PageView on each SPA route change (Meta's recommended setup).
      // The effect re-runs when leaving and re-entering internal pages, so guard
      // against a second PageView in the same load (the listener already sent it).
      if (window.fbq) window.fbq.disablePushState = false;
      if (!metaPageViewSent) {
        metaPageViewSent = true;
        trackMetaPageView();
      }
      flushPendingPixelEvents();
      // (The old <noscript> fallback was removed: an <img> created from JavaScript
      // loads immediately, so it sent a second PageView on every page load.)

      return () => {
        document.head.removeChild(script);
        // Entering an internal page (admin/agent): stop route-change PageViews.
        if (window.fbq) window.fbq.disablePushState = true;
      };
    }
  }, [enabled, settings?.meta_pixel_enabled, settings?.meta_pixel_id]);

  // Inject TikTok Pixel
  useEffect(() => {
    const safeTiktokPixelId = validatePixelId(settings?.tiktok_pixel_id, 'tiktok');

    if (enabled && settings?.tiktok_pixel_enabled && safeTiktokPixelId) {
      // Only inject if not already loaded via hardcoded script
      if (!window.ttq) {
        const script = document.createElement("script");
        script.innerHTML = `
          !function (w, d, t) {
            w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
            ttq.load('${safeTiktokPixelId}');
          }(window, document, 'ttq');
        `;
        document.head.appendChild(script);
        // Once per person, like the Meta PageView.
        trackTikTokPageView();

        return () => {
          document.head.removeChild(script);
        };
      }
    }
  }, [enabled, settings?.tiktok_pixel_enabled, settings?.tiktok_pixel_id]);

  // Inject Google Analytics - deferred after page load
  useEffect(() => {
    const safeGa4Id = validatePixelId(settings?.ga4_id, 'ga4');

    if (enabled && settings?.ga4_enabled && safeGa4Id) {
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
  }, [enabled, settings?.ga4_enabled, settings?.ga4_id]);

  return settings;
};
