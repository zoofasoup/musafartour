import type { Env } from "../_lib/env";
import { getSupabaseConfig } from "../_lib/env";
import { validateIntake } from "../_lib/intake";

/**
 * POST /api/daftar: the public registration form.
 *
 * The browser has no access to the registration tables. This function checks the Turnstile answer, validates
 * everything, and hands it to create_jamaah_intake() with the service role (the only caller allowed to).
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

  if (!(await turnstileOk(body.turnstile_token, secret, request.headers.get("cf-connecting-ip")))) {
    return json({ ok: false, error: "Verifikasi keamanan gagal. Muat ulang halaman lalu coba lagi." }, 400);
  }

  const { url } = getSupabaseConfig(env);
  const headers = { apikey: serviceKey, authorization: `Bearer ${serviceKey}`, "content-type": "application/json" };

  // The package is looked up by its permanent link, so a shared link keeps working when the package is edited.
  const pkgRes = await fetch(`${url}/rest/v1/packages?select=id&slug=eq.${encodeURIComponent(intake.slug)}&status=eq.published&limit=1`, { headers });
  const pkg = pkgRes.ok ? ((await pkgRes.json()) as { id: string }[])[0] : undefined;
  if (!pkg) return json({ ok: false, error: "Paket ini sudah tidak tersedia. Silakan pilih paket lain." }, 410);

  const { slug: _slug, ...rest } = intake;
  const rpc = await fetch(`${url}/rest/v1/rpc/create_jamaah_intake`, {
    method: "POST",
    headers,
    body: JSON.stringify({ _payload: { ...rest, package_id: pkg.id } }),
  });

  if (!rpc.ok) {
    const detail = ((await rpc.json().catch(() => ({}))) as { message?: string }).message ?? "";
    if (detail.includes("rate_limited")) return json({ ok: false, error: "Terlalu banyak pendaftaran dari nomor ini hari ini. Silakan hubungi CS lewat WhatsApp." }, 429);
    if (detail.includes("package_unavailable")) return json({ ok: false, error: "Paket ini sudah tidak tersedia. Silakan pilih paket lain." }, 410);
    console.error("create_jamaah_intake failed", rpc.status, detail.slice(0, 200));
    return json({ ok: false, error: "Pendaftaran belum bisa dikirim. Coba lagi sebentar lagi atau hubungi CS lewat WhatsApp." }, 502);
  }

  const { code } = (await rpc.json()) as { code: string };
  return json({ ok: true, code });
};
