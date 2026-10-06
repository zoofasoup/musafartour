import type { Env } from "../_lib/env";
import { getSupabaseConfig } from "../_lib/env";
import { normalizePhone } from "../_lib/intake";
import { ALLOWED_HOST, hostOf, json, turnstileOk } from "../_lib/turnstile";

/**
 * POST /api/cek-status: "Cek status pendaftaran". Body: { code: "MSF-XXXXX", phone, turnstile_token }.
 *
 * Same gate as /api/daftar (allowed Origin, Turnstile), then the service role asks get_intake_status() for the stage.
 * Anything that does not match (wrong code, wrong number, malformed input) gets the same 404 and the same words, so the
 * endpoint cannot be used to find out which codes exist. Per-code attempt limits live in the database function.
 *
 * What goes back is a fixed whitelist (stage, package, date, head count, two booleans). The private manifest link and
 * document paths are never read here, and even if the function returned more, only these keys are passed on.
 */

const NO_MATCH = "Kode atau nomor tidak cocok.";
const CODE = /^MSF-?[A-Z2-9]{5}$/;

type Status = {
  found?: boolean;
  code?: string;
  stage?: string;
  label?: string;
  package_name?: string;
  departure_date?: string;
  people_count?: number;
  data_pending?: boolean;
  payment_checking?: boolean;
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const secret = env.TURNSTILE_SECRET_KEY;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !serviceKey) return json({ ok: false, error: "Cek status belum aktif. Silakan hubungi CS lewat WhatsApp." }, 503);

  if (!ALLOWED_HOST.test(hostOf(request.headers.get("origin")) ?? "")) return json({ ok: false, error: "Permintaan ditolak." }, 403);
  if (Number(request.headers.get("content-length") || 0) > 2_000) return json({ ok: false, error: "Data terlalu besar." }, 413);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: "Data tidak terbaca. Muat ulang halaman lalu coba lagi." }, 400);
  }

  if (!(await turnstileOk(body.turnstile_token, secret, request.headers.get("cf-connecting-ip")))) {
    return json({ ok: false, error: "Verifikasi keamanan gagal. Muat ulang halaman lalu coba lagi." }, 400);
  }

  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  const phone = normalizePhone(body.phone);
  if (!CODE.test(code) || !phone) return json({ ok: false, error: NO_MATCH }, 404);

  const { url } = getSupabaseConfig(env);
  const rpc = await fetch(`${url}/rest/v1/rpc/get_intake_status`, {
    method: "POST",
    headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}`, "content-type": "application/json" },
    body: JSON.stringify({ _code: code, _phone: phone }),
  });

  if (!rpc.ok) {
    const detail = ((await rpc.json().catch(() => ({}))) as { message?: string }).message ?? "";
    if (detail.includes("rate_limited")) {
      return json({ ok: false, error: "Terlalu banyak percobaan untuk kode ini. Coba lagi satu jam lagi, atau hubungi CS lewat WhatsApp." }, 429);
    }
    console.error("get_intake_status failed", rpc.status, detail.slice(0, 200));
    return json({ ok: false, error: "Status belum bisa dicek. Coba lagi sebentar lagi atau hubungi CS lewat WhatsApp." }, 502);
  }

  const s = (await rpc.json().catch(() => null)) as Status | null;
  if (!s || s.found !== true || typeof s.stage !== "string") return json({ ok: false, error: NO_MATCH }, 404);

  return json({
    ok: true,
    status: {
      code: s.code,
      stage: s.stage,
      label: s.label,
      package_name: s.package_name,
      departure_date: s.departure_date,
      people_count: s.people_count,
      data_pending: s.data_pending === true,
      payment_checking: s.payment_checking === true,
    },
  });
};
