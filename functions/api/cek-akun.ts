import type { Env } from "../_lib/env";
import { getSupabaseConfig } from "../_lib/env";
import { ALLOWED_HOST, hostOf, json } from "../_lib/turnstile";

/**
 * POST /api/cek-akun. Body: { email }. Answers { ok: true, exists: boolean }.
 *
 * Used only after a sign-in already failed with "invalid credentials", so the portal can tell "no such account" apart
 * from "wrong password". That does reveal which emails have an account, so it is fenced: same-site Origin only, a small
 * per-IP budget, and nothing but a yes or no comes back. Any problem answers { ok: false } and the page falls back to
 * its generic "email atau password salah".
 */

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}$/;
const BUDGET = 6;
const WINDOW_SECONDS = 600;
const PAGE = 1000;
const MAX_PAGES = 10;

async function overBudget(request: Request): Promise<boolean> {
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const key = new Request(`https://rate.musafartour.internal/cek-akun/${encodeURIComponent(ip)}`);
  const cache = (caches as unknown as { default: Cache }).default;
  const hit = await cache.match(key);
  const used = hit ? Number(await hit.text()) || 0 : 0;
  if (used >= BUDGET) return true;
  await cache.put(key, new Response(String(used + 1), { headers: { "cache-control": `max-age=${WINDOW_SECONDS}` } }));
  return false;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return json({ ok: false }, 503);
  if (!ALLOWED_HOST.test(hostOf(request.headers.get("origin")) ?? "")) return json({ ok: false }, 403);
  if (Number(request.headers.get("content-length") || 0) > 1_000) return json({ ok: false }, 413);

  let email = "";
  try {
    const body = (await request.json()) as { email?: unknown };
    email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  } catch {
    return json({ ok: false }, 400);
  }
  if (!EMAIL.test(email)) return json({ ok: false }, 400);

  if (await overBudget(request)) return json({ ok: false }, 429);

  const { url } = getSupabaseConfig(env);
  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const res = await fetch(`${url}/auth/v1/admin/users?page=${page}&per_page=${PAGE}`, {
        headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` },
      });
      if (!res.ok) return json({ ok: false }, 502);
      const data = (await res.json()) as { users?: { email?: string | null }[] };
      const users = data.users ?? [];
      if (users.some((u) => (u.email ?? "").toLowerCase() === email)) return json({ ok: true, exists: true });
      if (users.length < PAGE) return json({ ok: true, exists: false });
    }
    return json({ ok: false }, 502);
  } catch {
    return json({ ok: false }, 502);
  }
};
