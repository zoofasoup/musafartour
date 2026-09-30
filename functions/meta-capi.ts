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
const ALLOWED_EVENTS = new Set(["Lead", "AddToCart", "ViewContent"]);
// Our own site and its Cloudflare preview/production hosts only.
const ALLOWED_HOST = /(^|\.)musafartour\.com$|(^|\.)musafartour\.pages\.dev$/;
const PIXEL_ID = /^\d{15,16}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

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

const str = (v: unknown, max: number) => (typeof v === "string" && v ? v.slice(0, max) : undefined);

/** Keep only the custom_data fields we send, with bounded sizes. */
function cleanCustomData(input: Record<string, unknown> | undefined) {
  if (!input || typeof input !== "object") return {};
  const out: Record<string, unknown> = {};
  if (Array.isArray(input.content_ids)) {
    out.content_ids = input.content_ids.filter((id) => typeof id === "string").slice(0, 10).map((id) => (id as string).slice(0, 64));
  }
  const type = str(input.content_type, 20);
  if (type) out.content_type = type;
  const name = str(input.content_name, 200);
  if (name) out.content_name = name;
  const category = str(input.content_category, 100);
  if (category) out.content_category = category;
  const source = str(input.lead_source, 60);
  if (source) out.lead_source = source;
  if (typeof input.value === "number" && Number.isFinite(input.value) && input.value > 0) {
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
  const eventId = str(body.event_id, 100);
  if (!ALLOWED_EVENTS.has(eventName) || !eventId) return json({ ok: false, error: "bad_event" }, 400);
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
    ...(body.external_id && UUID.test(body.external_id) ? { external_id: [await sha256(body.external_id)] } : {}),
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
