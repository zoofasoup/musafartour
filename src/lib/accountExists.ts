/**
 * After a failed sign-in: does an account with this email exist? true / false, or null when it could not be checked
 * (offline, rate limited, server not set up), in which case callers keep the generic message.
 */
export async function accountExists(email: string): Promise<boolean | null> {
  try {
    const res = await fetch("/api/cek-akun", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
      signal: AbortSignal.timeout(5000),
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; exists?: boolean } | null;
    return res.ok && data?.ok && typeof data.exists === "boolean" ? data.exists : null;
  } catch {
    return null;
  }
}

export const ACCOUNT_NOT_FOUND = "Akun tidak ditemukan. Periksa emailnya, atau daftar dulu.";
