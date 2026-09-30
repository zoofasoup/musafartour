/**
 * One place for conversion events, sent to every ad/analytics tag that is loaded:
 * Meta Pixel (fbq), TikTok (ttq) and GA4 (gtag).
 *
 * Each event fires at most ONCE PER PERSON (per browser), per network: the first
 * PageView, the first Lead, the first AddToCart, the first ViewContent. Repeat page
 * views, extra WhatsApp taps or a second cart item are not sent, so event counts in
 * Meta read as unique people. The "already sent" marks live in localStorage under
 * ONCE_KEY, which the server-rendered article pages (functions/_lib/render.ts) share.
 *
 * The pixel script is injected after the marketing settings load, so an event can
 * fire before fbq exists (e.g. a fast click right after landing). Those events are
 * queued and flushed by flushPendingPixelEvents() once the pixel is initialised.
 */

type EventParams = Record<string, unknown>;
type PendingEvent = { name: string; params: EventParams; eventID: string };

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    ttq?: { track?: (...args: unknown[]) => void; page?: () => void };
    gtag?: (...args: unknown[]) => void;
  }
}

/** Keep in sync with functions/_lib/render.ts. */
export const ONCE_KEY = "musafar_px_once";

const pending: PendingEvent[] = [];
// Fallback when storage is blocked (private mode): at most once per page load.
const sentThisLoad = new Set<string>();

/**
 * Returns true the first time `key` is claimed by this person, false afterwards.
 * The mark is written before the event is sent, so a double tap can't slip through.
 */
function claimOnce(key: string): boolean {
  if (sentThisLoad.has(key)) return false;
  sentThisLoad.add(key);
  try {
    const sent = JSON.parse(localStorage.getItem(ONCE_KEY) || "{}") as Record<string, number>;
    if (sent[key]) return false;
    sent[key] = Date.now();
    localStorage.setItem(ONCE_KEY, JSON.stringify(sent));
  } catch {
    /* storage unavailable: the in-memory set above still limits it to once per load */
  }
  return true;
}

const newEventId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function sendMeta(name: string, params: EventParams, eventID = newEventId()) {
  if (typeof window === "undefined" || !claimOnce(`meta:${name}`)) return;
  if (typeof window.fbq === "function") {
    // eventID lets a future Conversions API send deduplicate against this browser event.
    window.fbq("track", name, params, { eventID });
  } else if (pending.length < 20) {
    pending.push({ name, params, eventID });
  }
}

/** Called right after the Meta Pixel is initialised; sends anything clicked before it loaded. */
export function flushPendingPixelEvents() {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  while (pending.length) {
    const e = pending.shift()!;
    window.fbq("track", e.name, e.params, { eventID: e.eventID });
  }
}

function sendTikTok(name: string, params: EventParams) {
  // Only claim when TikTok is actually loaded, so a missing tag doesn't burn the one chance.
  if (typeof window === "undefined" || typeof window.ttq?.track !== "function") return;
  if (!claimOnce(`tiktok:${name}`)) return;
  try {
    window.ttq.track(name, params);
  } catch {
    /* tracking must never break a click */
  }
}

function sendGa(name: string, params: EventParams) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  if (!claimOnce(`ga:${name}`)) return;
  window.gtag("event", name, params);
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

/** Meta Pixel just initialised: its one PageView for this person. */
export function trackMetaPageView() {
  sendMeta("PageView", {});
}

/** TikTok pixel just loaded: its one page event for this person. */
export function trackTikTokPageView() {
  if (typeof window === "undefined" || typeof window.ttq?.page !== "function") return;
  if (!claimOnce("tiktok:PageView")) return;
  try {
    window.ttq.page();
  } catch {
    /* ignore */
  }
}

/** Package added to the cart (the cart/wishlist button on cards and the detail page). */
export function trackAddToCart(pkg: TrackedPackage) {
  const params = productParams(pkg);
  sendMeta("AddToCart", params);
  sendTikTok("AddToCart", params);
  sendGa("add_to_cart", gaItems(pkg));
}

/** Package detail page viewed. Feeds Meta catalog / dynamic ads. */
export function trackViewContent(pkg: TrackedPackage) {
  const params = productParams(pkg);
  sendMeta("ViewContent", params);
  sendTikTok("ViewContent", params);
  sendGa("view_item", gaItems(pkg));
}

/**
 * A lead: a WhatsApp tap or the savings-calculator form. One Lead per person no
 * matter which of these they use first. `source` says which one.
 */
export function trackLead(source: string, pkg?: TrackedPackage, eventID?: string) {
  const params: EventParams = {
    content_name: pkg?.name ?? source,
    content_category: source === "umroh_calculator" ? "calculator" : "whatsapp",
    lead_source: source,
    page_path: typeof window !== "undefined" ? window.location.pathname : undefined,
    ...(pkg ? { content_ids: [pkg.id], content_type: "product" } : {}),
    ...(pkg?.value ? { value: pkg.value, currency: "IDR" } : {}),
  };
  sendMeta("Lead", params, eventID);
  sendTikTok("Contact", { content_name: pkg?.name ?? source });
  sendGa("generate_lead", { lead_source: source, currency: "IDR", value: pkg?.value || undefined });
}

/** A visitor tapped a WhatsApp button: for Musafar this is the lead. */
export function trackWhatsAppLead(source: string, pkg?: TrackedPackage) {
  trackLead(source, pkg);
}
