/** Shared by the public form endpoints (same rules as functions/api/daftar.ts): who may call, and the Turnstile check. */

export const ALLOWED_HOST = /(^|\.)musafartour\.com$|(^|\.)musafartour\.pages\.dev$|^localhost$|^127\.0\.0\.1$/;

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export const hostOf = (url: string | null): string | null => {
  try {
    return url ? new URL(url).hostname : null;
  } catch {
    return null;
  }
};

export async function turnstileOk(token: unknown, secret: string, ip: string | null): Promise<boolean> {
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
