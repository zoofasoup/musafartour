/**
 * The URLs the single-page app answers. Everything else is a real 404 (functions/[[path]].ts).
 *
 * KEEP IN SYNC with the <Route path="..."> list in src/App.tsx. scripts/check-route-allowlist.mjs
 * compares the two and fails when a route is missing here. A route missing here is not an outage
 * (the page still renders), but it would be served with HTTP status 404.
 */

/** Exact paths (trailing slash already removed). */
const EXACT = new Set([
  "/",
  "/paket-umroh",
  "/tentang-kami",
  "/galeri",
  "/artikel",
  "/kontak",
  "/jadwal-umroh",
  "/kebijakan-privasi",
  "/syarat-ketentuan",
  "/syarat-umroh",
  "/cek-status",
  "/cara-bayar",
  "/jadi-agen",
  "/chat",
  "/booth",
  "/kalkulator",
  "/auth",
  "/set-password",
  "/packages",
  "/flyer-print",
  "/styleguide",
]);

/** Whole sections that belong to the app, whatever follows (admin and agent screens, their own not-found handling). */
const SECTIONS = /^\/(admin|agent)(\/|$)/;

/** Pages with one dynamic segment. `check` says the segment is validated against the database. */
const DYNAMIC: { re: RegExp; check?: "package" }[] = [
  { re: /^\/paket-umroh\/([^/]+)$/, check: "package" },
  { re: /^\/daftar\/([^/]+)$/, check: "package" },
  { re: /^\/lengkapi\/[^/]+$/ },
  { re: /^\/artikel\/[^/]+$/ }, // served by functions/artikel/[slug].ts, which answers 404 itself; listed for completeness
  { re: /^\/kalkulator\/hasil\/[^/]+$/ },
  { re: /^\/(s|l|r)\/[^/]+$/ },
];

export type RouteVerdict =
  | { kind: "known" }
  | { kind: "package-slug"; slug: string }
  | { kind: "unknown" };

export function normalizePath(pathname: string): string {
  let p = pathname;
  try {
    p = decodeURIComponent(pathname);
  } catch {
    /* keep the raw path */
  }
  return p.length > 1 ? p.replace(/\/+$/, "") || "/" : p;
}

export function classifyPath(pathname: string): RouteVerdict {
  const p = normalizePath(pathname);
  if (EXACT.has(p) || SECTIONS.test(p)) return { kind: "known" };
  for (const d of DYNAMIC) {
    const m = d.re.exec(p);
    if (!m) continue;
    return d.check === "package" ? { kind: "package-slug", slug: m[1] } : { kind: "known" };
  }
  return { kind: "unknown" };
}
