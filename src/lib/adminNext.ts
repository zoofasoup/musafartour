/**
 * The page an admin tried to open before being sent to the login (?next=/admin/jamaah).
 * Only internal /admin paths are accepted, so the login page can never be used as an open redirect.
 */
export function safeAdminNext(raw: string | null | undefined): string | null {
  if (!raw || raw.length > 300) return null;
  if (!/^\/admin(\/[A-Za-z0-9._~%-]+)*\/?(\?[A-Za-z0-9._~%=&,+-]*)?$/.test(raw)) return null;
  if (raw.split("?")[0].split("/").includes("..")) return null;
  return raw;
}

/** /auth link that returns the admin to where they were headed. */
export function loginUrlFor(pathname: string, search = ""): string {
  const target = safeAdminNext(pathname + search);
  // "/admin" alone is the default landing: no need to carry it.
  return target && target !== "/admin" ? `/auth?next=${encodeURIComponent(target)}` : "/auth";
}
