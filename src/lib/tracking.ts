/**
 * One place for conversion events, sent to every ad/analytics tag that is loaded:
 * Meta Pixel (fbq), TikTok (ttq) and GA4 (gtag).
 *
 * Before this, WhatsApp buttons only sent a GA4 event and nothing ever sent
 * AddToCart, so Meta Events Manager only ever saw PageView.
 *
 * The pixel script is injected after the marketing settings load, so an event can
 * fire before fbq exists (e.g. a fast click right after landing). Those events are
 * queued and flushed by flushPendingPixelEvents() once the pixel is initialised.
 */

type FbqParams = Record<string, unknown>;
type PendingEvent = { name: string; params: FbqParams; eventID: string };

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    ttq?: { track?: (...args: unknown[]) => void; page?: () => void };
    gtag?: (...args: unknown[]) => void;
  }
}

const pending: PendingEvent[] = [];

const newEventId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function sendMeta(name: string, params: FbqParams, eventID: string) {
  if (typeof window === "undefined") return;
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

function sendTikTok(name: string, params: FbqParams) {
  try {
    window.ttq?.track?.(name, params);
  } catch {
    /* tracking must never break a click */
  }
}

function sendGa(name: string, params: FbqParams) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", name, params);
  }
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

/** Package added to the cart (the cart/wishlist button on cards and the detail page). */
export function trackAddToCart(pkg: TrackedPackage) {
  const params = productParams(pkg);
  sendMeta("AddToCart", params, newEventId());
  sendTikTok("AddToCart", params);
  sendGa("add_to_cart", {
    currency: "IDR",
    value: pkg.value || undefined,
    items: [{ item_id: pkg.id, item_name: pkg.name, price: pkg.value || undefined }],
  });
}

/** Package detail page viewed. Feeds Meta catalog / dynamic ads. */
export function trackViewContent(pkg: TrackedPackage) {
  const params = productParams(pkg);
  sendMeta("ViewContent", params, newEventId());
  sendTikTok("ViewContent", params);
  sendGa("view_item", {
    currency: "IDR",
    value: pkg.value || undefined,
    items: [{ item_id: pkg.id, item_name: pkg.name, price: pkg.value || undefined }],
  });
}

/**
 * A visitor tapped a WhatsApp button: for Musafar this is the lead.
 * `source` says which button (e.g. "floating_button", "package_detail").
 */
export function trackWhatsAppLead(source: string, pkg?: TrackedPackage) {
  const params: FbqParams = {
    content_name: pkg?.name ?? source,
    content_category: "whatsapp",
    lead_source: source,
    page_path: typeof window !== "undefined" ? window.location.pathname : undefined,
    ...(pkg ? { content_ids: [pkg.id], content_type: "product" } : {}),
    ...(pkg?.value ? { value: pkg.value, currency: "IDR" } : {}),
  };
  sendMeta("Lead", params, newEventId());
  sendTikTok("Contact", { content_name: pkg?.name ?? source });
  sendGa("generate_lead", { lead_source: source, currency: "IDR", value: pkg?.value || undefined });
}

/** SPA route change: the pixel's own PageView only covers the first page of a visit. */
export function trackPageView() {
  if (typeof window === "undefined") return;
  if (typeof window.fbq === "function") window.fbq("track", "PageView");
  try {
    window.ttq?.page?.();
  } catch {
    /* ignore */
  }
}
