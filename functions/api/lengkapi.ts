import type { Env } from "../_lib/env";
import { getSupabaseConfig } from "../_lib/env";

/**
 * /api/lengkapi: stage 2 of the registration, where jamaah complete their own data from the private link
 * that CS sends after accepting the registration (/lengkapi/<token>).
 *
 * The token is the only credential and only the service role can call the database functions behind it, so
 * every request is checked against that one registration. Nothing here is cached or logged with the token.
 *
 *   GET  ?token=...                     what this link may see (people, saved values, which documents exist)
 *   POST application/json               {token, registration_id, fields}: save some fields
 *   POST multipart/form-data            token, registration_id, kind (ktp|passport|photo), file: store a document
 */

const ALLOWED_HOST = /(^|\.)musafartour\.com$|(^|\.)musafartour\.pages\.dev$|^localhost$|^127\.0\.0\.1$/;
const MAX_JSON = 20_000;
const MAX_FILE = 10 * 1024 * 1024;
const KINDS = ["ktp", "passport", "photo"];
const BUCKET = "jamaah-docs";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

const hostOf = (url: string | null): string | null => {
  try {
    return url ? new URL(url).hostname : null;
  } catch {
    return null;
  }
};

/** What kind of file this really is, from its first bytes (the browser's own claim is not trusted). */
export function sniff(bytes: Uint8Array): { ext: "jpg" | "png" | "pdf"; type: string } | null {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { ext: "jpg", type: "image/jpeg" };
  if (bytes.length > 7 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return { ext: "png", type: "image/png" };
  if (bytes.length > 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return { ext: "pdf", type: "application/pdf" };
  return null;
}

const TOKEN = /^[a-f0-9]{64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

interface Ctx {
  url: string;
  headers: Record<string, string>;
}

/** The database raises user-facing Indonesian messages (SQLSTATE P0001); anything else is a fault we do not show. */
async function rpc(ctx: Ctx, name: string, args: Record<string, unknown>): Promise<{ ok: true; data: unknown } | { ok: false; message: string; status: number }> {
  const res = await fetch(`${ctx.url}/rest/v1/rpc/${name}`, { method: "POST", headers: ctx.headers, body: JSON.stringify(args) });
  if (res.ok) return { ok: true, data: await res.json().catch(() => null) };
  const err = (await res.json().catch(() => ({}))) as { code?: string; message?: string };
  if (err.code === "P0001" && err.message) return { ok: false, message: err.message, status: err.message.startsWith("Link tidak valid") ? 404 : 400 };
  console.error(`${name} failed`, res.status, (err.message ?? "").slice(0, 160));
  return { ok: false, message: "Data belum bisa diproses. Coba lagi sebentar lagi atau hubungi CS lewat WhatsApp.", status: 502 };
}

function setup(request: Request, env: Env): { ctx: Ctx } | { error: Response } {
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return { error: json({ ok: false, error: "Pengisian data online belum aktif. Silakan hubungi CS lewat WhatsApp." }, 503) };
  if (!ALLOWED_HOST.test(hostOf(request.headers.get("origin") ?? request.headers.get("referer")) ?? "")) return { error: json({ ok: false, error: "Permintaan ditolak." }, 403) };
  const { url } = getSupabaseConfig(env);
  return { ctx: { url, headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}`, "content-type": "application/json" } } };
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const s = setup(request, env);
  if ("error" in s) return s.error;
  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (!TOKEN.test(token)) return json({ ok: false, error: "Link tidak valid." }, 404);
  const r = await rpc(s.ctx, "get_manifest_by_token", { _token: token });
  return r.ok ? json({ ok: true, data: r.data }) : json({ ok: false, error: r.message }, r.status);
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const s = setup(request, env);
  if ("error" in s) return s.error;
  const { ctx } = s;
  const type = request.headers.get("content-type") ?? "";

  // ---- Save fields -------------------------------------------------------------------------------------------
  if (type.includes("application/json")) {
    if (Number(request.headers.get("content-length") || 0) > MAX_JSON) return json({ ok: false, error: "Data terlalu besar." }, 413);
    let body: { token?: unknown; registration_id?: unknown; fields?: unknown };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return json({ ok: false, error: "Data tidak terbaca. Muat ulang halaman lalu coba lagi." }, 400);
    }
    if (typeof body.token !== "string" || !TOKEN.test(body.token)) return json({ ok: false, error: "Link tidak valid." }, 404);
    if (typeof body.registration_id !== "string" || !UUID.test(body.registration_id)) return json({ ok: false, error: "Data jamaah tidak dikenali." }, 400);
    if (!body.fields || typeof body.fields !== "object" || Array.isArray(body.fields)) return json({ ok: false, error: "Data tidak terbaca." }, 400);
    const r = await rpc(ctx, "save_manifest_by_token", { _token: body.token, _registration_id: body.registration_id, _fields: body.fields });
    return r.ok ? json({ ok: true }) : json({ ok: false, error: r.message }, r.status);
  }

  // ---- Store a document --------------------------------------------------------------------------------------
  if (type.includes("multipart/form-data")) {
    if (Number(request.headers.get("content-length") || 0) > MAX_FILE + 50_000) return json({ ok: false, error: "File maksimal 10 MB." }, 413);
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return json({ ok: false, error: "File tidak terbaca. Coba lagi." }, 400);
    }
    const token = form.get("token");
    const registrationId = form.get("registration_id");
    const kind = form.get("kind");
    const file = form.get("file");
    if (typeof token !== "string" || !TOKEN.test(token)) return json({ ok: false, error: "Link tidak valid." }, 404);
    if (typeof registrationId !== "string" || !UUID.test(registrationId)) return json({ ok: false, error: "Data jamaah tidak dikenali." }, 400);
    if (typeof kind !== "string" || !KINDS.includes(kind)) return json({ ok: false, error: "Jenis dokumen tidak dikenal." }, 400);
    if (!(file instanceof File) || file.size === 0) return json({ ok: false, error: "Pilih file yang mau diunggah." }, 400);
    if (file.size > MAX_FILE) return json({ ok: false, error: "File maksimal 10 MB." }, 413);

    const bytes = new Uint8Array(await file.arrayBuffer());
    const kindOfFile = sniff(bytes);
    if (!kindOfFile) return json({ ok: false, error: "Format file harus JPG, PNG, atau PDF." }, 400);

    // Check the link and the person BEFORE storing anything, so a bad token cannot fill the bucket.
    const known = await rpc(ctx, "get_manifest_by_token", { _token: token });
    if (!known.ok) return json({ ok: false, error: known.message }, known.status);
    const people = (known.data as { people?: { id: string }[] }).people ?? [];
    if (!people.some((p) => p.id === registrationId)) return json({ ok: false, error: "Data jamaah tidak ditemukan di pendaftaran ini." }, 400);

    const path = `manifest/${registrationId}/${kind}-${crypto.randomUUID()}.${kindOfFile.ext}`;
    const put = await fetch(`${ctx.url}/storage/v1/object/${BUCKET}/${path}`, {
      method: "POST",
      headers: { apikey: ctx.headers.apikey, authorization: ctx.headers.authorization, "content-type": kindOfFile.type, "x-upsert": "false" },
      body: bytes,
    });
    if (!put.ok) {
      console.error("storage upload failed", put.status);
      return json({ ok: false, error: "File belum bisa disimpan. Coba lagi sebentar lagi." }, 502);
    }
    const saved = await rpc(ctx, "set_manifest_doc_by_token", { _token: token, _registration_id: registrationId, _kind: kind, _path: path });
    if (!saved.ok) {
      await fetch(`${ctx.url}/storage/v1/object/${BUCKET}/${path}`, { method: "DELETE", headers: ctx.headers }).catch(() => undefined);
      return json({ ok: false, error: saved.message }, saved.status);
    }
    return json({ ok: true });
  }

  return json({ ok: false, error: "Permintaan tidak dikenali." }, 415);
};
