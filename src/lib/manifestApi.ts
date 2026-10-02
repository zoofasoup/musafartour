import type { Manifest } from "@/lib/manifestForm";

export class ManifestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

const NETWORK = "Tidak bisa terhubung ke server. Periksa internet kamu, lalu coba lagi.";

async function read(res: Response) {
  const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; data?: unknown } | null;
  if (!res.ok || !data?.ok) throw new ManifestError(data?.error || "Data belum bisa diproses. Coba lagi sebentar lagi atau hubungi CS lewat WhatsApp.", res.status);
  return data;
}

export async function loadManifest(token: string): Promise<Manifest> {
  let res: Response;
  try {
    res = await fetch(`/api/lengkapi?token=${encodeURIComponent(token)}`);
  } catch {
    throw new ManifestError(NETWORK, 0);
  }
  return (await read(res)).data as Manifest;
}

export async function saveFields(token: string, registrationId: string, fields: Record<string, string>): Promise<void> {
  let res: Response;
  try {
    res = await fetch("/api/lengkapi", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, registration_id: registrationId, fields }) });
  } catch {
    throw new ManifestError(NETWORK, 0);
  }
  await read(res);
}

export async function uploadDoc(token: string, registrationId: string, kind: "ktp" | "passport" | "photo", file: File): Promise<void> {
  const form = new FormData();
  form.set("token", token);
  form.set("registration_id", registrationId);
  form.set("kind", kind);
  form.set("file", file);
  let res: Response;
  try {
    res = await fetch("/api/lengkapi", { method: "POST", body: form });
  } catch {
    throw new ManifestError(NETWORK, 0);
  }
  await read(res);
}
