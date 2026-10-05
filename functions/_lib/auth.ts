import type { Env } from "./env";
import { getSupabaseConfig } from "./env";

/**
 * Who is calling a Function that is not for the public. The caller sends their normal Supabase session
 * token; Supabase itself checks it (signature, expiry), then we read the caller's own roles with that same
 * token, so nothing here needs the service role.
 *
 * Returns null when the caller is signed-in staff (any role other than the plain `user` role), otherwise the
 * Response to send back.
 */
export async function requireStaff(request: Request, env: Env): Promise<Response | null> {
  const deny = (status: number, message: string) =>
    new Response(message, { status, headers: { "cache-control": "no-store" } });

  const bearer = /^Bearer\s+([\w-]+\.[\w-]+\.[\w-]+)$/.exec(request.headers.get("authorization") ?? "");
  if (!bearer) return deny(401, "Masuk dulu sebagai admin.");

  const { url, anonKey } = getSupabaseConfig(env);
  const headers = { apikey: anonKey, authorization: `Bearer ${bearer[1]}` };

  const who = await fetch(`${url}/auth/v1/user`, { headers });
  if (!who.ok) return deny(401, "Sesi tidak valid. Masuk lagi.");
  const { id } = (await who.json().catch(() => ({}))) as { id?: string };
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return deny(401, "Sesi tidak valid. Masuk lagi.");

  const rolesRes = await fetch(`${url}/rest/v1/user_roles?select=role&user_id=eq.${id}`, { headers });
  if (!rolesRes.ok) return deny(403, "Akses ditolak.");
  const roles = (await rolesRes.json().catch(() => [])) as { role: string }[];
  if (!roles.some((r) => r.role !== "user")) return deny(403, "Akses ditolak.");
  return null;
}
