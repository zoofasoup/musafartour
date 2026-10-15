import type { Env } from "../_lib/env";
import { getSupabaseConfig } from "../_lib/env";
import { ALLOWED_HOST, hostOf, json } from "../_lib/turnstile";

/**
 * POST /api/admin-hapus-agen. Header: Authorization: Bearer <admin session token>. Body: { agent_id }.
 *
 * "Hapus Permanen" used to delete only the row in `agents`; the login account (auth.users) stayed behind, so the same
 * email could never register again ("Email sudah terdaftar"). This removes both, in this order: the agent row first
 * (the database still refuses it when there is commission or lead history, and that message is passed on unchanged),
 * then the login account, unless that account also holds an admin role.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return json({ error: "Layanan belum aktif." }, 503);
  if (!ALLOWED_HOST.test(hostOf(request.headers.get("origin")) ?? "")) return json({ error: "Permintaan ditolak." }, 403);

  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Perlu login." }, 401);

  let agentId = "";
  try {
    const body = (await request.json()) as { agent_id?: unknown };
    agentId = typeof body.agent_id === "string" ? body.agent_id : "";
  } catch {
    return json({ error: "Data tidak valid." }, 400);
  }
  if (!UUID.test(agentId)) return json({ error: "Data tidak valid." }, 400);

  const { url, anonKey } = getSupabaseConfig(env);
  const service = { apikey: serviceKey, authorization: `Bearer ${serviceKey}`, "content-type": "application/json" };

  // Who is calling, and are they an admin?
  const who = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anonKey, authorization: `Bearer ${token}` } });
  if (!who.ok) return json({ error: "Sesi tidak valid." }, 401);
  const caller = (await who.json()) as { id?: string };
  const roles = await fetch(`${url}/rest/v1/user_roles?select=role&user_id=eq.${caller.id}&role=in.(admin,superadmin)`, { headers: service });
  if (!roles.ok || ((await roles.json()) as unknown[]).length === 0) return json({ error: "Hanya admin yang boleh menghapus agen." }, 403);

  // The agent to remove.
  const found = await fetch(`${url}/rest/v1/agents?select=user_id&id=eq.${agentId}`, { headers: service });
  const rows = found.ok ? ((await found.json()) as { user_id: string | null }[]) : [];
  if (rows.length === 0) return json({ error: "Agen tidak ditemukan." }, 404);
  const userId = rows[0].user_id;

  // 1. The agent row. The database rejects it when there is history; pass its words on.
  const del = await fetch(`${url}/rest/v1/agents?id=eq.${agentId}`, { method: "DELETE", headers: service });
  if (!del.ok) {
    const err = (await del.json().catch(() => null)) as { message?: string } | null;
    return json({ error: err?.message || "Gagal menghapus agen." }, 409);
  }

  // 2. The login account, unless it is also an admin's.
  if (userId) {
    const adminToo = await fetch(`${url}/rest/v1/user_roles?select=role&user_id=eq.${userId}&role=in.(admin,superadmin)`, { headers: service });
    const isAdmin = adminToo.ok && ((await adminToo.json()) as unknown[]).length > 0;
    if (!isAdmin) {
      const rm = await fetch(`${url}/auth/v1/admin/users/${userId}`, { method: "DELETE", headers: service });
      if (!rm.ok) return json({ ok: true, account_removed: false });
    }
  }
  return json({ ok: true, account_removed: true });
};
