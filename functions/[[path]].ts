import { findRedirect, packageSlugExists } from "./_lib/data";
import type { Env } from "./_lib/env";
import { classifyPath, normalizePath } from "./_lib/routes";

/**
 * Catch-all: gives unknown URLs a real HTTP 404.
 *
 * The site is a single-page app and public/_redirects sends every unknown path to index.html with status 200
 * (a "soft 404" that search engines ignore). This function runs for paths that no other function handles
 * and asks for the page the same way as before (next()), then decides the status:
 *
 *  - a known SPA route (functions/_lib/routes.ts)                   -> untouched
 *  - /paket-umroh/<slug> and /daftar/<slug> with a published slug    -> untouched; unknown slug -> 404
 *  - anything that is not HTML (js, css, images, robots.txt, ...)    -> untouched
 *  - an old path with an active row in `redirects`                   -> 301 (what the browser did client-side)
 *  - any other HTML answer (the SPA shell for an unknown path)       -> same page, status 404; the SPA renders
 *    NotFound with a noindex tag, so visitors still see a proper page
 *
 * It fails open: if the database cannot be reached the page is served as before (status 200).
 * public/_routes.json keeps static files (assets, images) from invoking this function at all.
 */
export const onRequest: PagesFunction<Env> = async ({ request, env, next }) => {
  if (request.method !== "GET" && request.method !== "HEAD") return next();

  const url = new URL(request.url);
  const verdict = classifyPath(url.pathname);
  if (verdict.kind === "known") return next();

  if (verdict.kind === "package-slug") {
    const exists = await packageSlugExists(env, verdict.slug);
    if (exists !== false) return next(); // exists, or unknown (fail open)
  }

  const response = await next();
  const type = response.headers.get("content-type") ?? "";
  if (!type.includes("text/html") || response.status >= 300) return response;

  const to = await findRedirect(env, normalizePath(url.pathname));
  if (to && !/^\/\//.test(to)) {
    const target = /^https?:\/\//i.test(to) ? to : new URL(to, url.origin).toString();
    return Response.redirect(target, 301);
  }

  const headers = new Headers(response.headers);
  headers.set("cache-control", "public, max-age=0, must-revalidate");
  headers.set("x-robots-tag", "noindex");
  return new Response(request.method === "HEAD" ? null : response.body, { status: 404, statusText: "Not Found", headers });
};
