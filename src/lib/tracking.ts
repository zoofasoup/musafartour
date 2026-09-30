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
 */

import { supabase } from "@/integrations/supabase/client";

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

function sendMeta(name: string, params: EventParams, dedupe: Dedupe | null, eventID = newEventId()) {
  if (typeof window === "undefined" || isInternalBrowser()) return;
  if (dedupe && !claim({ ...dedupe, key: `meta:${dedupe.key}` })) return;
  if (typeof window.fbq === "function") {
    // eventID lets a future Conversions API send deduplicate against this browser event.
    window.fbq("track", name, params, { eventID });
  } else if (pending.length < 20) {
    pending.push({ name, params, eventID });
  }
}

const pending: PendingEvent[] = [];

/** Called right after the Meta Pixel is initialised; sends anything clicked before it loaded. */
export function flushPendingPixelEvents() {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  while (pending.length) {
    const e = pending.shift()!;
    window.fbq("track", e.name, e.params, { eventID: e.eventID });
  }
}

function sendTikTok(name: string, params: EventParams, dedupe: Dedupe | null) {
  // Only claim when TikTok is actually loaded, so a missing tag doesn't use up the dedupe mark.
  if (typeof window === "undefined" || isInternalBrowser() || typeof window.ttq?.track !== "function") return;
  if (dedupe && !claim({ ...dedupe, key: `tiktok:${dedupe.key}` })) return;
  try {
    window.ttq.track(name, params);
  } catch {
    /* tracking must never break a click */
  }
}

/** GA4 is analytics, not ad optimisation: every occurrence is sent and GA reports users itself. */
function sendGa(name: string, params: EventParams) {
  if (typeof window === "undefined" || isInternalBrowser() || typeof window.gtag !== "function") return;
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

// Internal/tooling pages are not traffic.
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
      id = randomId();
      storage.setItem(key, id);
    }
    return id;
  } catch {
    return (fallback.id ??= randomId());
  }
}
const memVisitor: { id?: string } = {};
const memSession: { id?: string } = {};

type SessionAttr = { utm_source?: string; utm_medium?: string; utm_campaign?: string; referrer_host?: string };

/** Where this visit came from, fixed on its first page so later pages keep the ad's UTM. */
function sessionAttribution(): SessionAttr {
  try {
    const saved = sessionStorage.getItem(SESSION_ATTR_KEY);
    if (saved) return JSON.parse(saved) as SessionAttr;
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
  try {
    sessionStorage.setItem(SESSION_ATTR_KEY, JSON.stringify(attr));
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
    visitor_id: storedId(window.localStorage, VISITOR_KEY, memVisitor),
    session_id: storedId(window.sessionStorage, SESSION_KEY, memSession),
    event,
    path: path.slice(0, 300),
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
  if (typeof window === "undefined" || isInternalBrowser() || typeof window.ttq?.page !== "function") return;
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
 * A lead: a WhatsApp tap or the savings-calculator form. One Lead per person per
 * 7 days, whichever button they use. `source` says which one.
 */
export function trackLead(source: string, pkg?: TrackedPackage, eventID?: string) {
  logSiteEvent("lead", { packageId: pkg?.id, leadSource: source });
  const params: EventParams = {
    content_name: pkg?.name ?? source,
    content_category: source === "umroh_calculator" ? "calculator" : "whatsapp",
    lead_source: source,
    page_path: typeof window !== "undefined" ? window.location.pathname : undefined,
    ...(pkg ? { content_ids: [pkg.id], content_type: "product" } : {}),
    ...(pkg?.value ? { value: pkg.value, currency: "IDR" } : {}),
  };
  const dedupe: Dedupe = { key: "Lead", scope: "person", ttlMs: SEVEN_DAYS };
  sendMeta("Lead", params, dedupe, eventID);
  sendTikTok("Contact", { content_name: pkg?.name ?? source }, dedupe);
  sendGa("generate_lead", { lead_source: source, currency: "IDR", value: pkg?.value || undefined });
}

/** A visitor tapped a WhatsApp button: for Musafar this is the lead. */
export function trackWhatsAppLead(source: string, pkg?: TrackedPackage) {
  trackLead(source, pkg);
}
