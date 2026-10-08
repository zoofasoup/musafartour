import type { Env } from "../_lib/env";
import { getSupabaseConfig } from "../_lib/env";
import { validateIntake } from "../_lib/intake";

/**
 * POST /api/daftar: the public registration form.
 *
 * The browser has no access to the registration tables. This function checks the Turnstile answer, validates
 * everything, and hands it to create_jamaah_intake() with the service role (the only caller allowed to).
 *
 * Agents registering their own jamaah from the agent portal send their login (Authorization: Bearer). That replaces
 * Turnstile, and the agent is taken from the login, never from the request, so an agent can only register as themself.
 */

const ALLOWED_HOST = /(^|\.)musafartour\.com$|(^|\.)musafartour\.pages\.dev$|^localhost$|^127\.0\.0\.1$/;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

const hostOf = (url: string | null): string | null => {
  try {
    return url ? new URL(url).hostname : null;
  } catch {
    return null;
  }
};

async function turnstileOk(token: unknown, secret: string, ip: string | null): Promise<boolean> {
  if (typeof token !== "string" || !token || token.length > 2048) return false;
  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
    return ((await res.json()) as { success?: boolean }).success === true;
  } catch {
    return false;
  }
}

type LoginAgent = { referral_code: string; registration_fee_status?: string };

/**
 * The active agent behind a login token, or null. Anything else (bad token, not an agent, suspended) is refused by the
 * caller. registration_fee_status is returned so the caller can refuse an approved agent whose fee is not received yet.
 */
async function agentFromLogin(authorization: string, url: string, anonKey: string, serviceHeaders: Record<string, string>): Promise<LoginAgent | null> {
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!token || token.length > 4096) return null;
  try {
    const who = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anonKey, authorization: `Bearer ${token}` } });
    if (!who.ok) return null;
    const userId = ((await who.json()) as { id?: string }).id;
    if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) return null;
    const res = await fetch(`${url}/rest/v1/agents?select=referral_code,registration_fee_status&user_id=eq.${userId}&status=eq.active&limit=1`, { headers: serviceHeaders });
    return res.ok ? (((await res.json()) as LoginAgent[])[0] ?? null) : null;
  } catch {
    return null;
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const secret = env.TURNSTILE_SECRET_KEY;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !serviceKey) return json({ ok: false, error: "Pendaftaran online belum aktif. Silakan hubungi CS lewat WhatsApp." }, 503);

  if (!ALLOWED_HOST.test(hostOf(request.headers.get("origin")) ?? "")) return json({ ok: false, error: "Permintaan ditolak." }, 403);
  if (Number(request.headers.get("content-length") || 0) > 20_000) return json({ ok: false, error: "Data terlalu besar." }, 413);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: "Data tidak terbaca. Muat ulang halaman lalu coba lagi." }, 400);
  }

  const checked = validateIntake(body);
  if (!checked.ok) return json({ ok: false, error: checked.error }, 400);
  const intake = checked.value;

  const { url, anonKey } = getSupabaseConfig(env);
  const headers = { apikey: serviceKey, authorization: `Bearer ${serviceKey}`, "content-type": "application/json" };

  const authorization = request.headers.get("authorization");
  let agent: LoginAgent | null = null;
  if (authorization) {
    agent = await agentFromLogin(authorization, url, anonKey, headers);
    if (!agent) return json({ ok: false, error: "Sesi agen tidak berlaku. Silakan masuk lagi ke portal agen." }, 401);
    if (agent.registration_fee_status !== "paid" && agent.registration_fee_status !== "waived") {
      return json({ ok: false, error: "Biaya registrasi belum diterima. Selesaikan pembayaran dulu." }, 403);
    }
  } else if (!(await turnstileOk(body.turnstile_token, secret, request.headers.get("cf-connecting-ip")))) {
    return json({ ok: false, error: "Verifikasi keamanan gagal. Muat ulang halaman lalu coba lagi." }, 400);
  }

  // The package is looked up by its permanent link, so a shared link keeps working when the package is edited.
  const pkgRes = await fetch(`${url}/rest/v1/packages?select=id&slug=eq.${encodeURIComponent(intake.slug)}&status=eq.published&limit=1`, { headers });
  const pkg = pkgRes.ok ? ((await pkgRes.json()) as { id: string }[])[0] : undefined;
  if (!pkg) return json({ ok: false, error: "Paket ini sudah tidak tersedia. Silakan pilih paket lain." }, 410);

  const { slug: _slug, ...rest } = intake;
  const rpc = await fetch(`${url}/rest/v1/rpc/create_jamaah_intake`, {
    method: "POST",
    headers,
    body: JSON.stringify({ _payload: { ...rest, package_id: pkg.id, ...(agent ? { ref_code: agent.referral_code, source: "agent" } : {}) } }),
  });

  if (!rpc.ok) {
    const detail = ((await rpc.json().catch(() => ({}))) as { message?: string }).message ?? "";
    if (detail.includes("rate_limited")) return json({ ok: false, error: "Terlalu banyak pendaftaran dari nomor ini hari ini. Silakan hubungi CS lewat WhatsApp." }, 429);
    if (detail.includes("Biaya registrasi belum diterima")) return json({ ok: false, error: "Biaya registrasi belum diterima. Selesaikan pembayaran dulu." }, 403);
    if (detail.includes("package_unavailable")) return json({ ok: false, error: "Paket ini sudah tidak tersedia. Silakan pilih paket lain." }, 410);
    console.error("create_jamaah_intake failed", rpc.status, detail.slice(0, 200));
    return json({ ok: false, error: "Pendaftaran belum bisa dikirim. Coba lagi sebentar lagi atau hubungi CS lewat WhatsApp." }, 502);
  }

  const { code } = (await rpc.json()) as { code: string };
  return json({ ok: true, code });
};
