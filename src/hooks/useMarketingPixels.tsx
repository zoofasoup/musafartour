import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { flushPendingPixelEvents, trackMetaPageView, trackTikTokPageView } from "@/lib/tracking";
import { getConsent, onConsentChange } from "@/lib/consent";
import { loadClarity, loadGa4, loadGtm, loadMeta, loadTikTok } from "@/lib/trackerLoaders";

// Module-level: the load's PageView must be sent once even if the hook re-runs.
let metaPageViewSent = false;
const TIKTOK_FALLBACK_ID = 'D4JDUSRC77U7MI8IJGGG';
// GA4 gtag.js is added once per page load (see the GA effect).
let ga4Injected = false;

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

  // Consent decides what may load. Re-render on every decision (also a later one on the same page, no reload).
  const [consent, setConsentState] = useState(getConsent);
  useEffect(() => onConsentChange(({ consent: c }) => setConsentState(c)), []);
  const marketingOk = consent?.marketing === true;
  const analyticsOk = consent?.analytics === true;

  useEffect(() => {
    if (enabled && !consent) {
      console.info("[tracking] Pixel dan tag belum dimuat: belum ada persetujuan (no consent yet).");
    }
  }, [enabled, consent]);

  // GTM + Clarity (analytics). No admin switch exists for these two.
  useEffect(() => {
    if (!enabled || !analyticsOk) return;
    loadGtm();
    loadClarity();
  }, [enabled, analyticsOk]);

  // Inject Meta Pixel (marketing)
  useEffect(() => {
    const safeMetaPixelId = validatePixelId(settings?.meta_pixel_id, 'meta');

    if (enabled && marketingOk && settings?.meta_pixel_enabled && safeMetaPixelId) {
      // Idempotent: the script is added once per page load.
      loadMeta(safeMetaPixelId);
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
        // Entering an internal page (admin/agent): stop route-change PageViews.
        if (window.fbq) window.fbq.disablePushState = true;
      };
    }
  }, [enabled, marketingOk, settings?.meta_pixel_enabled, settings?.meta_pixel_id]);

  // Inject TikTok Pixel (marketing)
  useEffect(() => {
    // The admin settings had no TikTok pixel when the loader was removed from index.html (id empty, switch off),
    // and the pixel then ran only from that hard-coded snippet. Keep that ID as the fallback while the
    // settings have none, so TikTok keeps working (now only after marketing consent). An ID saved in the admin wins,
    // and with an ID saved the admin switch applies.
    const settingsTiktokId = validatePixelId(settings?.tiktok_pixel_id, 'tiktok');
    const useFallback = !!settings && !settings.tiktok_pixel_id?.trim();
    const safeTiktokPixelId = settingsTiktokId || (useFallback ? TIKTOK_FALLBACK_ID : null);
    const tiktokOn = useFallback ? true : !!settings?.tiktok_pixel_enabled;

    if (enabled && marketingOk && tiktokOn && safeTiktokPixelId) {
      // Loaded once per page load; its first page() is the current page's PageView.
      if (loadTikTok(safeTiktokPixelId)) trackTikTokPageView();
    }
  }, [enabled, marketingOk, settings]);

  // Inject Google Analytics (analytics) - deferred after page load
  useEffect(() => {
    const safeGa4Id = validatePixelId(settings?.ga4_id, 'ga4');

    // Once per page load: `enabled` flips whenever the visitor leaves a private route, and the
    // script + gtag('config') must not be added again (duplicate page_view).
    if (enabled && analyticsOk && settings?.ga4_enabled && safeGa4Id && !ga4Injected) {
      ga4Injected = true;
      // Use requestIdleCallback to defer GA loading
      const loadGA = () => loadGa4(safeGa4Id);

      // Defer loading to not block main thread
      if ('requestIdleCallback' in window) {
        (window as Window).requestIdleCallback(loadGA, { timeout: 3000 });
      } else {
        setTimeout(loadGA, 2000);
      }
    }
  }, [enabled, analyticsOk, settings?.ga4_enabled, settings?.ga4_id]);

  return settings;
};
