/**
 * One place for conversion events, sent to every ad/analytics tag that is loaded:
 * Meta Pixel (fbq), TikTok (ttq) and GA4 (gtag).
 *
 * Counting rules (Meta's own guidance: send real activity, read unique people in
 * reporting via Ads Manager "First conversion", don't throw data away at the source):
 *
 *   PageView     every page. The pixel's built-in History listener sends it on SPA
 *                route changes once a PageView was tracked on load, so we only send
 *                the load one (see useMarketingPixels).
 *   ViewContent  once per package per visit (session): reloads/back don't repeat it.
 *   AddToCart    once per package per person: add-remove-add doesn't repeat it.
 *   Lead         once per person per 7 days (Meta's default 7-day click window):
 *                double taps or several WhatsApp buttons are one lead.
 *
 * Only genuine duplicates are dropped. Staff browsers are excluded entirely
 * (markInternalBrowser, set on admin login).
 *
 * The pixel script is injected after the marketing settings load, so an event can
 * fire before fbq exists (e.g. a fast click right after landing). Those events are
 * queued and flushed by flushPendingPixelEvents() once the pixel is initialised.
 *
 * Consent (src/lib/consent.ts): nothing goes to a third party without it.
 *   marketing  Meta Pixel + Conversions API (/meta-capi) and TikTok
 *   analytics  GA4, and the persistent visitor id of our own site analytics
 * An event fired before the visitor decided is dropped, never queued and replayed
 * later. Only the current page's PageView is sent right after consent (see
 * useMarketingPixels). First-party site_events are the owner's own data and are
 * recorded either way, but before analytics consent with a random id that is not stored.
 */

import { supabase } from "@/integrations/supabase/client";
import { blocksTrackerEvents, safeTrackingPath } from "@/lib/privateRoutes";
import { clearConsent, hasConsent, onConsentChange } from "@/lib/consent";

type EventParams = Record<string, unknown>;
type PendingEvent = { name: string; params: EventParams; eventID: string };

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { disablePushState?: boolean };
    ttq?: { track?: (...args: unknown[]) => void; page?: () => void };
    gtag?: (...args: unknown[]) => void;
  }
}

/** Keep in sync with functions/_lib/render.ts. */
export const INTERNAL_KEY = "musafar_internal";
const DEDUPE_KEY = "musafar_px_sent";
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

/** Set when someone logs into the admin panel: that browser is staff, not a customer. */
export function markInternalBrowser() {
  try {
    localStorage.setItem(INTERNAL_KEY, "1");
  } catch {
    /* ignore */
  }
}

/** Token and internal routes (/lengkapi/<token>, /cek-status, /admin, ...) send nothing to third parties. */
function onPrivateRoute(): boolean {
  return typeof window !== "undefined" && blocksTrackerEvents(window.location.pathname);
}

// Testing switch: open any page with ?px=on to make THIS browser count as a normal visitor again (removes the staff
// flag that admin login sets), ?px=off to mark it as staff. Needed to test the pixel from a browser that was used for admin.
if (typeof window !== "undefined") {
  try {
    const px = new URLSearchParams(window.location.search).get("px");
    if (px === "on") {
      localStorage.removeItem(INTERNAL_KEY);
      console.info("[tracking] Browser ini sekarang dihitung sebagai pengunjung biasa (px=on). Persetujuan cookie tetap berlaku sendiri: tanpa persetujuan tidak ada pelacakan.");
    } else if (px === "off") {
      localStorage.setItem(INTERNAL_KEY, "1");
      console.info("[tracking] Browser ini ditandai sebagai staf: tidak ada pelacakan (px=off).");
    }
    // Testing switch: ?consent=reset forgets the stored cookie choice, so the banner asks again.
    if (new URLSearchParams(window.location.search).get("consent") === "reset") {
      clearConsent();
      console.info("[tracking] Pilihan persetujuan cookie dihapus (consent=reset): banner akan muncul lagi.");
    }
  } catch {
    /* ignore */
  }
}

/** Staff browsers send no pixel events and no site analytics. */
export function isInternalBrowser(): boolean {
  try {
    return localStorage.getItem(INTERNAL_KEY) === "1";
  } catch {
    return false;
  }
}

type Dedupe = { key: string; scope: "session" | "person"; ttlMs?: number };

// Fallback when storage is blocked (private mode): dedupe within this page load only.
const claimedThisLoad = new Set<string>();

/**
 * True if this occurrence should be sent, false if it duplicates one already sent
 * (within the session, or ever / within ttlMs for the person). The mark is written
 * before sending, so a double tap can't slip through.
 */
function claim({ key, scope, ttlMs }: Dedupe): boolean {
  const storageKey = `${scope}:${key}`;
  let store: Storage | undefined;
  try {
    store = scope === "session" ? window.sessionStorage : window.localStorage;
    const sent = JSON.parse(store.getItem(DEDUPE_KEY) || "{}") as Record<string, number>;
    const last = sent[storageKey];
    if (last && (!ttlMs || Date.now() - last < ttlMs)) return false;
    sent[storageKey] = Date.now();
    store.setItem(DEDUPE_KEY, JSON.stringify(sent));
    return true;
  } catch {
    if (claimedThisLoad.has(storageKey)) return false;
    claimedThisLoad.add(storageKey);
    return true;
  }
}

const newEventId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const skipExplained = new Set<string>();
function explainSkip(reason: string) {
  if (skipExplained.has(reason)) return;
  skipExplained.add(reason);
  console.info(`[tracking] Event tidak dikirim: ${reason}`);
}
const NO_CONSENT = "belum ada persetujuan (no consent yet). Event sebelum keputusan dibuang, bukan ditunda.";

function sendMeta(name: string, params: EventParams, dedupe: Dedupe | null, eventID = newEventId()) {
  if (typeof window === "undefined") return;
  if (isInternalBrowser()) return explainSkip("browser ini ditandai staf (musafar_internal). Buka ?px=on untuk mematikan penanda.");
  if (onPrivateRoute()) return explainSkip("halaman ini bertoken atau internal, sengaja tanpa pelacakan.");
  // Before the visitor agreed to marketing: no pixel call, no /meta-capi call, no queue, no dedupe mark used up.
  if (!hasConsent("marketing")) return explainSkip(NO_CONSENT);
  if (dedupe && !claim({ ...dedupe, key: `meta:${dedupe.key}` })) return;
  if (typeof window.fbq === "function") {
    window.fbq("track", name, params, { eventID });
  } else if (pending.length < 20) {
    pending.push({ name, params, eventID });
  }
  // Server copy with the same eventID: Meta keeps one, and it still arrives when
  // the pixel is blocked.
  if (CAPI_EVENTS.has(name)) sendCapi(name, params, eventID);
}

// ---------------------------------------------------------------------------
// Meta Conversions API (functions/meta-capi.ts relays these to Meta).
// ---------------------------------------------------------------------------

const CAPI_EVENTS = new Set(["Lead", "AddToCart", "ViewContent", "Contact"]);
const FBC_KEY = "musafar_fbc";

// A visitor arriving from a Meta ad carries ?fbclid=. The pixel turns it into the
// _fbc cookie, but if the pixel is blocked we keep our own copy in Meta's fbc format.
// Only stored with marketing consent; before that it waits in memory for this page load.
let landingFbc: string | undefined;
function persistFbc() {
  if (!landingFbc || !hasConsent("marketing")) return;
  try {
    localStorage.setItem(FBC_KEY, landingFbc);
  } catch {
    /* ignore */
  }
  landingFbc = undefined;
}
if (typeof window !== "undefined") {
  try {
    const fbclid = new URLSearchParams(window.location.search).get("fbclid");
    if (fbclid) landingFbc = `fb.1.${Date.now()}.${fbclid.slice(0, 400)}`;
  } catch {
    /* ignore */
  }
  persistFbc();
  onConsentChange(({ consent }) => {
    if (consent?.marketing) persistFbc();
    else clearMarketingState();
  });
}

/** Marketing consent withdrawn: forget queued pixel events and the stored click id. */
function clearMarketingState() {
  pending.length = 0;
  try {
    localStorage.removeItem(FBC_KEY);
  } catch {
    /* ignore */
  }
}

const readCookie = (name: string) =>
  document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))?.[1];

function sendCapi(name: string, params: EventParams, eventID: string) {
  // Server-side copy carries IP, user agent, fbp/fbc and a visitor id to Meta: marketing consent only.
  if (!hasConsent("marketing")) return;
  let storedFbc: string | undefined;
  try {
    storedFbc = localStorage.getItem(FBC_KEY) ?? undefined;
  } catch {
    /* ignore */
  }
  const body = {
    event_name: name,
    event_id: eventID,
    // Origin + safe path only: never the query string or a token path.
    event_source_url: `${window.location.origin}${safeTrackingPath(window.location.pathname)}`,
    custom_data: params,
    fbp: readCookie("_fbp"),
    fbc: readCookie("_fbc") ?? storedFbc,
    external_id: visitorId("marketing"),
  };
  // Local development: the pixel already reports; don't send server events from localhost.
  if (import.meta.env.DEV) {
    console.debug("[meta-capi]", body);
    return;
  }
  // keepalive: the WhatsApp tab opening must not cancel the request.
  fetch("/meta-capi", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {
    /* tracking must never break a click */
  });
}

const pending: PendingEvent[] = [];

/** Called right after the Meta Pixel is initialised; sends anything clicked before it loaded. */
export function flushPendingPixelEvents() {
  if (typeof window === "undefined" || typeof window.fbq !== "function" || !hasConsent("marketing")) return;
  while (pending.length) {
    const e = pending.shift()!;
    window.fbq("track", e.name, e.params, { eventID: e.eventID });
  }
}

function sendTikTok(name: string, params: EventParams, dedupe: Dedupe | null) {
  // Only claim when TikTok is actually loaded, so a missing tag doesn't use up the dedupe mark.
  if (typeof window === "undefined" || isInternalBrowser() || onPrivateRoute()) return;
  if (!hasConsent("marketing")) return explainSkip(NO_CONSENT);
  if (typeof window.ttq?.track !== "function") return;
  if (dedupe && !claim({ ...dedupe, key: `tiktok:${dedupe.key}` })) return;
  try {
    window.ttq.track(name, params);
  } catch {
    /* tracking must never break a click */
  }
}

/** GA4 is analytics, not ad optimisation: every occurrence is sent and GA reports users itself. */
function sendGa(name: string, params: EventParams) {
  if (typeof window === "undefined" || isInternalBrowser() || onPrivateRoute()) return;
  if (!hasConsent("analytics")) return explainSkip(NO_CONSENT);
  if (typeof window.gtag !== "function") return;
  window.gtag("event", name, params);
}

// ---------------------------------------------------------------------------
// First-party analytics (public.site_events), read by the admin Analytics page.
// Unlike the pixels above, every occurrence is recorded (totals and unique people
// are both computed in the dashboard). Anonymous: random ids, no personal data.
// ---------------------------------------------------------------------------

type SiteEvent = "page_view" | "view_content" | "add_to_cart" | "lead";

const VISITOR_KEY = "musafar_vid";
const SESSION_KEY = "musafar_sid";
const SESSION_ATTR_KEY = "musafar_sattr";

// Internal/tooling pages are not traffic. (/lengkapi and /cek-status are recorded, but only
// under their route pattern: see safeTrackingPath.)
const UNTRACKED_PATHS = /^\/(admin|agent|jamaah|flyer-print|auth)(\/|$)/;

const randomId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
      });

function storedId(storage: Storage | undefined, key: string, fallback: { id?: string }) {
  try {
    if (!storage) throw new Error("no storage");
    let id = storage.getItem(key);
    if (!id) {
      // First time we may store it: keep the id this page load already used, so the visit stays one visit.
      id = fallback.id ?? randomId();
      storage.setItem(key, id);
    }
    return id;
  } catch {
    return (fallback.id ??= randomId());
  }
}
// Random for this page load only, never stored. Used until the visitor agrees to analytics.
const memVisitor: { id?: string } = {};
const memSession: { id?: string } = {};

/** Persistent visitor id with analytics (or marketing, for Meta's external_id) consent; a per-page-load random id before. */
function visitorId(requiredCategory: "analytics" | "marketing" = "analytics"): string {
  if (!hasConsent(requiredCategory)) return (memVisitor.id ??= randomId());
  return storedId(window.localStorage, VISITOR_KEY, memVisitor);
}
function sessionId(): string {
  if (!hasConsent("analytics")) return (memSession.id ??= randomId());
  return storedId(window.sessionStorage, SESSION_KEY, memSession);
}

type SessionAttr = { utm_source?: string; utm_medium?: string; utm_campaign?: string; referrer_host?: string };

/** Where this visit came from, fixed on its first page so later pages keep the ad's UTM. */
let memAttr: SessionAttr | undefined;
function sessionAttribution(): SessionAttr {
  if (memAttr) return memAttr;
  try {
    const saved = hasConsent("analytics") ? sessionStorage.getItem(SESSION_ATTR_KEY) : null;
    if (saved) return (memAttr = JSON.parse(saved) as SessionAttr);
  } catch {
    /* fall through */
  }
  const params = new URLSearchParams(window.location.search);
  let referrerHost: string | undefined;
  try {
    const host = document.referrer ? new URL(document.referrer).hostname : "";
    if (host && host !== window.location.hostname) referrerHost = host.replace(/^www\./, "");
  } catch {
    /* ignore bad referrer */
  }
  const cut = (v: string | null) => (v ? v.slice(0, 150) : undefined);
  const attr: SessionAttr = {
    utm_source: cut(params.get("utm_source")),
    utm_medium: cut(params.get("utm_medium")),
    utm_campaign: cut(params.get("utm_campaign")),
    referrer_host: referrerHost?.slice(0, 150),
  };
  memAttr = attr;
  try {
    if (hasConsent("analytics")) sessionStorage.setItem(SESSION_ATTR_KEY, JSON.stringify(attr));
  } catch {
    /* ignore */
  }
  return attr;
}

const deviceType = (): "mobile" | "tablet" | "desktop" => {
  const ua = navigator.userAgent;
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone/i.test(ua)) return "mobile";
  return "desktop";
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function logSiteEvent(event: SiteEvent, extra: { packageId?: string; leadSource?: string } = {}) {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  // Skip internal pages, staff browsers and headless browsers (flyer export, crawlers).
  if (UNTRACKED_PATHS.test(path) || navigator.webdriver || isInternalBrowser()) return;
  const attr = sessionAttribution();
  const row = {
    visitor_id: visitorId(),
    session_id: sessionId(),
    event,
    path: safeTrackingPath(path).slice(0, 300),
    package_id: extra.packageId && UUID_RE.test(extra.packageId) ? extra.packageId : null,
    lead_source: extra.leadSource?.slice(0, 60) ?? null,
    utm_source: attr.utm_source ?? null,
    utm_medium: attr.utm_medium ?? null,
    utm_campaign: attr.utm_campaign ?? null,
    referrer_host: attr.referrer_host ?? null,
    device: deviceType(),
  };
  // Local development shares the production database: log instead of recording.
  if (import.meta.env.DEV) {
    console.debug("[site_events]", row);
    return;
  }
  supabase
    .from("site_events")
    .insert(row)
    .then(({ error }) => {
      if (error) console.warn("site event not recorded:", error.message);
    });
}

/** Every public page view (route change), for the Analytics dashboard. Not sent to ad pixels. */
export function logPageView() {
  logSiteEvent("page_view");
}

/**
 * Parse a price into rupiah (0 if unknown). Handles 32500000, "Rp 32.500.000" and the
 * short forms the cards display, "27,9 Juta" / "32,5 Jt" (reading those as digits gave 279).
 */
export function toRupiah(value: string | number | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const juta = value.match(/(\d+(?:[.,]\d+)?)\s*(?:jt|juta)\b/i);
  if (juta) return Math.round(parseFloat(juta[1].replace(",", ".")) * 1_000_000);
  const digits = value.replace(/\D/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

export interface TrackedPackage {
  /** packages.id: must match the id column of the Meta catalog feed for catalog ads. */
  id: string;
  name: string;
  /** Rupiah, lowest (quad) price. */
  value?: number;
  category?: string;
}

const productParams = (pkg: TrackedPackage) => ({
  content_ids: [pkg.id],
  content_type: "product",
  content_name: pkg.name,
  ...(pkg.category ? { content_category: pkg.category } : {}),
  ...(pkg.value ? { value: pkg.value, currency: "IDR" } : {}),
});

const gaItems = (pkg: TrackedPackage) => ({
  currency: "IDR",
  value: pkg.value || undefined,
  items: [{ item_id: pkg.id, item_name: pkg.name, price: pkg.value || undefined }],
});

/**
 * Meta Pixel just initialised on this page load: its PageView. Later SPA route
 * changes are sent by the pixel's own History listener, which only runs after a
 * PageView was tracked on the page, so this call must not be skipped.
 */
export function trackMetaPageView() {
  sendMeta("PageView", {}, null);
}

/** TikTok pixel just loaded on this page load. */
export function trackTikTokPageView() {
  if (typeof window === "undefined" || isInternalBrowser() || onPrivateRoute() || !hasConsent("marketing") || typeof window.ttq?.page !== "function") return;
  try {
    window.ttq.page();
  } catch {
    /* ignore */
  }
}

/** Package added to the cart (the cart/wishlist button on cards and the detail page). Once per package per person. */
export function trackAddToCart(pkg: TrackedPackage) {
  logSiteEvent("add_to_cart", { packageId: pkg.id });
  const params = productParams(pkg);
  const dedupe: Dedupe = { key: `AddToCart:${pkg.id}`, scope: "person" };
  sendMeta("AddToCart", params, dedupe);
  sendTikTok("AddToCart", params, dedupe);
  sendGa("add_to_cart", gaItems(pkg));
}

/** Package detail page viewed. Feeds Meta catalog / dynamic ads. Once per package per visit. */
export function trackViewContent(pkg: TrackedPackage) {
  logSiteEvent("view_content", { packageId: pkg.id });
  const params = productParams(pkg);
  const dedupe: Dedupe = { key: `ViewContent:${pkg.id}`, scope: "session" };
  sendMeta("ViewContent", params, dedupe);
  sendTikTok("ViewContent", params, dedupe);
  sendGa("view_item", gaItems(pkg));
}

/**
 * A lead from a WhatsApp tap or from a form (registration, savings calculator).
 * Each channel has its own dedupe key, 7 days per person: a WhatsApp tap the day
 * before must not swallow the registration Lead (the strongest signal, and the
 * only one carrying the package value). `source` says which button.
 */
function sendLead(channel: "whatsapp" | "form", source: string, pkg?: TrackedPackage, eventID?: string) {
  logSiteEvent("lead", { packageId: pkg?.id, leadSource: source });
  const params: EventParams = {
    content_name: pkg?.name ?? source,
    content_category: source === "umroh_calculator" ? "calculator" : channel === "form" ? "registration" : "whatsapp",
    lead_source: source,
    page_path: typeof window !== "undefined" ? safeTrackingPath(window.location.pathname) : undefined,
    ...(pkg ? { content_ids: [pkg.id], content_type: "product" } : {}),
    ...(pkg?.value ? { value: pkg.value, currency: "IDR" } : {}),
  };
  const dedupe: Dedupe = { key: `Lead:${channel}`, scope: "person", ttlMs: SEVEN_DAYS };
  sendMeta("Lead", params, dedupe, eventID);
  sendTikTok("Contact", { content_name: pkg?.name ?? source }, dedupe);
  sendGa("generate_lead", { lead_source: source, currency: "IDR", value: pkg?.value || undefined });
}

/** Registration form or calculator submitted. Own 7-day dedupe ("Lead:form"), separate from WhatsApp taps. */
export function trackLead(source: string, pkg?: TrackedPackage, eventID?: string) {
  sendLead("form", source, pkg, eventID);
}

/** A visitor tapped a WhatsApp button: for Musafar this is the lead. One Lead per person per 7 days ("Lead:whatsapp"). */
export function trackWhatsAppLead(source: string, pkg?: TrackedPackage) {
  sendLead("whatsapp", source, pkg);
  trackMetaContact(source, pkg);
}

/**
 * Meta "Contact": the visitor started a conversation with us. Fired on EVERY WhatsApp tap (unlike Lead, which is once
 * per person per 7 days). Taps within 4 s count once, so a button that is both a link and has a click handler cannot
 * double-fire. Sent to the pixel and to the Conversions API with the same eventID.
 */
export function trackMetaContact(source: string, pkg?: TrackedPackage) {
  const params: EventParams = {
    content_name: pkg?.name ?? source,
    content_category: "whatsapp",
    lead_source: source,
    page_path: typeof window !== "undefined" ? safeTrackingPath(window.location.pathname) : undefined,
    ...(pkg ? { content_ids: [pkg.id], content_type: "product" } : {}),
    ...(pkg?.value ? { value: pkg.value, currency: "IDR" } : {}),
  };
  sendMeta("Contact", params, { key: "Contact", scope: "person", ttlMs: 4000 });
}

// Plain <a href="https://wa.me/<number>"> buttons (footer, landing pages, ...) never go through redirectToWhatsApp, so one
// delegated listener covers them all, including ones added later. Share links (wa.me/?text=..., no number) are not a contact.
const WHATSAPP_CONTACT_HREF = /^https?:\/\/(?:wa\.me\/\+?\d{6,}|api\.whatsapp\.com\/send\/?\?(?:[^#]*&)?phone=\d{6,}|(?:www\.)?whatsapp\.com\/send\/?\?(?:[^#]*&)?phone=\d{6,})/i;

export function isWhatsAppContactHref(href: string | null | undefined): boolean {
  return !!href && WHATSAPP_CONTACT_HREF.test(href);
}

if (typeof document !== "undefined") {
  document.addEventListener(
    "click",
    (event) => {
      const target = event.target as Element | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (anchor && isWhatsAppContactHref(anchor.href)) trackMetaContact("whatsapp_link");
    },
    true,
  );
}
