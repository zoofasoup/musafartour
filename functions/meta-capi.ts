import type { Env } from "./_lib/env";
import { fetchMarketingPixels } from "./_lib/data";

/**
 * POST /meta-capi: Meta Conversions API relay.
 *
 * The browser sends the same Lead / AddToCart / ViewContent it just gave the pixel,
 * with the same event_id, and this forwards it to Meta from the server. Meta keeps
 * one of the two (dedup on event_name + event_id), and when the pixel is blocked
 * (adblock, iOS tracking protection) the server copy still arrives.
 *
 * PageView is deliberately not relayed: route-change PageViews come from the
 * pixel's own History listener and carry no event_id, so they could not be deduped.
 */

const GRAPH_VERSION = "v25.0";
const ALLOWED_EVENTS = new Set(["Lead", "AddToCart", "ViewContent", "Contact"]);
// Our own site and its Cloudflare preview/production hosts only.
const ALLOWED_HOST = /(^|\.)musafartour\.com$|(^|\.)musafartour\.pages\.dev$/;
const PIXEL_ID = /^\d{15,16}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Largest value we will relay (IDR). Real package totals are tens of millions; anything above is junk. */
const MAX_VALUE = 500_000_000;
const EVENT_ID = /^[A-Za-z0-9_-]{8,100}$/;
const CONTENT_ID = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * Best-effort per-IP rate limit: RATE_LIMIT events per RATE_WINDOW_MS.
 * Cloudflare Pages Functions have no shared memory between isolates (and no
 * rate-limit binding), so this Map lives per isolate: it stops a loop hammering
 * one edge location, not a distributed flood. Pair it with a Cloudflare WAF
 * rate-limiting rule on /meta-capi for a hard limit (dashboard setting).
 */
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;
const hits = new Map<string, { start: number; count: number }>();

/** @internal exported for tests */
export function rateLimited(ip: string, now = Date.now()): boolean {
  if (hits.size > 5_000) {
    for (const [k, v] of hits) if (now - v.start >= RATE_WINDOW_MS) hits.delete(k);
    if (hits.size > 5_000) hits.clear();
  }
  const h = hits.get(ip);
  if (!h || now - h.start >= RATE_WINDOW_MS) {
    hits.set(ip, { start: now, count: 1 });
    return false;
  }
  h.count += 1;
  return h.count > RATE_LIMIT;
}

interface CapiRequest {
  event_name?: string;
  event_id?: string;
  event_source_url?: string;
  custom_data?: Record<string, unknown>;
  fbp?: string;
  fbc?: string;
  /** Anonymous site visitor id (uuid); hashed here before it leaves our server. */
  external_id?: string;
  /** Routes the event to Events Manager > Test Events only (never counted in reporting). */
  test_event_code?: string;
}

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...extra } });

function hostOf(url: string | null | undefined): string | null {
  try {
    return url ? new URL(url).hostname : null;
  } catch {
    return null;
  }
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value.trim().toLowerCase()));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function cookie(header: string | null, name: string): string | undefined {
  const match = header?.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

// Strips control characters and angle brackets, then bounds the length.
const clean = (v: string) => Array.from(v).filter((ch) => ch.charCodeAt(0) >= 32 && ch !== "<" && ch !== ">").join("");
const str = (v: unknown, max: number) => (typeof v === "string" && v ? clean(v).slice(0, max) || undefined : undefined);

/** Keep only the custom_data fields we send, with bounded sizes. */
function cleanCustomData(input: Record<string, unknown> | undefined) {
  if (!input || typeof input !== "object") return {};
  const out: Record<string, unknown> = {};
  if (Array.isArray(input.content_ids)) {
    out.content_ids = input.content_ids.filter((id): id is string => typeof id === "string" && CONTENT_ID.test(id))
      .slice(0, 10);
  }
  const type = str(input.content_type, 20);
  if (type) out.content_type = type;
  const name = str(input.content_name, 200);
  if (name) out.content_name = name;
  const category = str(input.content_category, 100);
  if (category) out.content_category = category;
  const source = str(input.lead_source, 60);
  if (source) out.lead_source = source;
  if (typeof input.value === "number" && Number.isFinite(input.value) && input.value > 0 && input.value <= MAX_VALUE) {
    out.value = Math.round(input.value);
    out.currency = "IDR";
  }
  return out;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const token = env.META_CAPI_ACCESS_TOKEN;
  if (!token) return json({ ok: false, error: "capi_not_configured" }, 503);

  // Browsers always send Origin on a cross-context POST; only our own pages may relay.
  if (!ALLOWED_HOST.test(hostOf(request.headers.get("origin")) ?? "")) {
    return json({ ok: false, error: "forbidden_origin" }, 403);
  }
  // Real browsers label the request; a cross-site one is not our page.
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "same-site") {
    return json({ ok: false, error: "forbidden_origin" }, 403);
  }
  if (rateLimited(request.headers.get("cf-connecting-ip") ?? "unknown")) {
    return json({ ok: false, error: "rate_limited" }, 429, { "retry-after": "60" });
  }
  if (Number(request.headers.get("content-length") || 0) > 8_000) {
    return json({ ok: false, error: "too_large" }, 413);
  }

  let body: CapiRequest;
  try {
    body = (await request.json()) as CapiRequest;
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  const eventName = body.event_name ?? "";
  const eventId = typeof body.event_id === "string" && EVENT_ID.test(body.event_id) ? body.event_id : undefined;
  if (!ALLOWED_EVENTS.has(eventName) || !eventId) return json({ ok: false, error: "bad_event" }, 400);
  // Every real event carries the anonymous visitor id (uuid) the site generates.
  if (typeof body.external_id !== "string" || !UUID.test(body.external_id)) return json({ ok: false, error: "bad_visitor" }, 400);
  const rawValue = body.custom_data && typeof body.custom_data === "object" ? (body.custom_data as Record<string, unknown>).value : undefined;
  if (rawValue !== undefined && (typeof rawValue !== "number" || !Number.isFinite(rawValue) || rawValue < 0 || rawValue > MAX_VALUE)) {
    return json({ ok: false, error: "bad_value" }, 400);
  }
  if (!ALLOWED_HOST.test(hostOf(body.event_source_url) ?? "")) return json({ ok: false, error: "bad_source_url" }, 400);

  // Same pixel id the site uses, from the admin Marketing Settings (cached 5 min).
  const pixels = await fetchMarketingPixels(env);
  const pixelId = pixels.meta_pixel_enabled ? pixels.meta_pixel_id?.trim() : undefined;
  if (!pixelId || !PIXEL_ID.test(pixelId)) return json({ ok: false, error: "pixel_disabled" }, 200);

  const cookies = request.headers.get("cookie");
  const fbp = str(body.fbp, 200) ?? cookie(cookies, "_fbp");
  const fbc = str(body.fbc, 500) ?? cookie(cookies, "_fbc");
  const userData: Record<string, unknown> = {
    client_ip_address: request.headers.get("cf-connecting-ip") ?? undefined,
    client_user_agent: request.headers.get("user-agent") ?? undefined,
    ...(fbp ? { fbp } : {}),
    ...(fbc ? { fbc } : {}),
    external_id: [await sha256(body.external_id)],
  };

  const testCode = body.test_event_code && /^TEST\d{3,10}$/.test(body.test_event_code) ? body.test_event_code : undefined;
  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: "website",
        event_source_url: body.event_source_url!.slice(0, 1000),
        user_data: userData,
        custom_data: cleanCustomData(body.custom_data),
      },
    ],
    ...(testCode ? { test_event_code: testCode } : {}),
  };

  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(token)}`,
    { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }
  );
  const result = (await res.json().catch(() => ({}))) as { events_received?: number; error?: { message?: string } };
  if (!res.ok) {
    console.error("Meta CAPI rejected event", eventName, result.error?.message);
    return json({ ok: false, error: "meta_rejected", detail: result.error?.message }, 502);
  }
  return json({ ok: true, events_received: result.events_received ?? 0, test: !!testCode });
};
