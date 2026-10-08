/**
 * Third-party tag loaders. Nothing in here runs before the visitor has agreed:
 * the callers (src/hooks/useMarketingPixels.tsx) only call a loader when
 * hasConsent(<category>) is true, and every loader checks it again.
 *
 *   analytics  -> loadGtm, loadClarity, loadGa4
 *   marketing  -> loadMeta, loadTikTok
 *
 * Google Consent Mode v2: initConsentMode() runs once at app start and pushes the
 * "denied" defaults to dataLayer (first-party, no network request). It deliberately
 * does NOT define window.gtag: that only exists once GTM/GA4 is loaded, so code that
 * does `if (window.gtag) gtag(...)` sends nothing before consent.
 */

import { clearTrackerCookies, getConsent, hasConsent, onConsentChange, withdrawnCategories, type StoredConsent } from "@/lib/consent";

export const GTM_ID = "GTM-TGNZSHNW";
export const CLARITY_ID = "xku8bbmx8x";

type AnyFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    clarity?: AnyFn;
    __musafarConsentModeReady?: boolean;
  }
}

const loaded = { gtm: false, clarity: false, ga4: false, meta: false, tiktok: false };

function pushToDataLayer(..._args: unknown[]) {
  // gtag.js / GTM only understand `arguments` objects for commands, not arrays.
  window.dataLayer = window.dataLayer || [];
  // eslint-disable-next-line prefer-rest-params
  window.dataLayer.push(arguments);
}

function consentModeState(c: StoredConsent | null) {
  const analytics = c?.analytics ? "granted" : "denied";
  const marketing = c?.marketing ? "granted" : "denied";
  return {
    analytics_storage: analytics,
    ad_storage: marketing,
    ad_user_data: marketing,
    ad_personalization: marketing,
  };
}

function ensureGtag() {
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== "function") {
    window.gtag = function () {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    };
  }
}

/**
 * Call once at app start, before any loader. Sets the denied defaults, applies a stored decision,
 * and keeps Consent Mode, the trackers and the cookies in step with later decisions.
 */
export function initConsentMode() {
  if (typeof window === "undefined" || window.__musafarConsentModeReady) return;
  window.__musafarConsentModeReady = true;
  pushToDataLayer("consent", "default", { ...consentModeState(null), wait_for_update: 500 });
  const stored = getConsent();
  if (stored) pushToDataLayer("consent", "update", consentModeState(stored));

  onConsentChange(({ consent, previous }) => {
    pushToDataLayer("consent", "update", consentModeState(consent));
    for (const category of withdrawnCategories(previous, consent)) withdraw(category);
  });
}

/** Stop what can be stopped in the running page and remove first-party tracker cookies. Full effect: next page load. */
function withdraw(category: "analytics" | "marketing") {
  try {
    if (category === "analytics") {
      if (typeof window.clarity === "function") window.clarity("stop");
    } else {
      if (typeof window.fbq === "function") window.fbq("consent", "revoke");
      const ttq = window.ttq as { revokeConsent?: () => void } | undefined;
      if (ttq && typeof ttq.revokeConsent === "function") ttq.revokeConsent();
    }
  } catch {
    /* a tracker that cannot be stopped is simply not loaded again on the next page */
  }
  clearTrackerCookies(category);
  console.info(`[tracking] Persetujuan ${category} dicabut: peristiwa berhenti sekarang, cookie pelacak dihapus. Perubahan penuh berlaku setelah halaman dimuat ulang.`);
}

function insertScript(src: string, onload?: () => void) {
  const s = document.createElement("script");
  s.async = true;
  s.src = src;
  if (onload) s.onload = onload;
  document.head.appendChild(s);
}

/** Google Tag Manager. Consent Mode defaults are already in dataLayer, so tags inside GTM respect them. */
export function loadGtm() {
  if (typeof window === "undefined" || loaded.gtm || !hasConsent("analytics")) return;
  loaded.gtm = true;
  ensureGtag();
  window.dataLayer!.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
  insertScript(`https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`);
}

/** Microsoft Clarity (anonymous session recordings and heatmaps). */
export function loadClarity() {
  if (typeof window === "undefined" || loaded.clarity || !hasConsent("analytics")) return;
  loaded.clarity = true;
  const w = window as Window & { clarity?: AnyFn & { q?: unknown[] } };
  w.clarity =
    w.clarity ||
    (function () {
      // eslint-disable-next-line prefer-rest-params
      (w.clarity!.q = w.clarity!.q || []).push(arguments);
    } as AnyFn);
  insertScript(`https://www.clarity.ms/tag/${CLARITY_ID}`);
}

/** GA4 (gtag.js). `id` is already validated by the caller. */
export function loadGa4(id: string) {
  if (typeof window === "undefined" || loaded.ga4 || !hasConsent("analytics")) return;
  loaded.ga4 = true;
  ensureGtag();
  window.gtag!("js", new Date());
  window.gtag!("config", id);
  insertScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`);
}

/** Meta Pixel. Returns true when fbq exists afterwards. `id` is already validated (15-16 digits). */
export function loadMeta(id: string): boolean {
  if (typeof window === "undefined" || !hasConsent("marketing")) return false;
  if (loaded.meta) return typeof window.fbq === "function";
  loaded.meta = true;
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
    fbq('init', '${id}');
  `;
  document.head.appendChild(script);
  return typeof window.fbq === "function";
}

/** TikTok Pixel. Returns true when this call loaded it. `id` is already validated. Does not send page(): the caller does. */
export function loadTikTok(id: string): boolean {
  if (typeof window === "undefined" || loaded.tiktok || !hasConsent("marketing")) return false;
  loaded.tiktok = true;
  const script = document.createElement("script");
  script.innerHTML = `
    !function (w, d, t) {
      w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
      ttq.load('${id}');
    }(window, document, 'ttq');
  `;
  document.head.appendChild(script);
  return true;
}
