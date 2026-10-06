/**
 * Routes that carry private data or are internal tooling. On these routes no third-party
 * tag (GTM, Clarity, Meta Pixel, TikTok, GA) is loaded or fed, and first-party analytics
 * never stores the real path, because /lengkapi/<token> holds a bearer token that opens a
 * jamaah's passport and ID data.
 *
 * Keep in sync with the inline guard in index.html (it runs before this bundle loads).
 */
export const PRIVATE_ROUTE_RE =
  /^\/(lengkapi|daftar|cek-status|set-password|admin|agent|flyer-print)(\/|$)/;

export function isPrivateRoute(pathname: string): boolean {
  return PRIVATE_ROUTE_RE.test(pathname);
}

/**
 * Path that is safe to store or send anywhere: the route pattern when the real path
 * holds a secret, otherwise the path itself.
 */
export function safeTrackingPath(pathname: string): string {
  if (/^\/lengkapi(\/|$)/.test(pathname)) return "/lengkapi/[token]";
  if (/^\/(set-password|cek-status)(\/|$)/.test(pathname)) return pathname.split("/").slice(0, 2).join("/");
  return pathname;
}

/**
 * Routes where no tracker may receive an event, not even from a tag that is already loaded
 * (the visitor came in by in-app navigation). /daftar is left out on purpose: its URL holds no
 * secret, and the registration Lead conversion is sent from there.
 */
const NO_EVENTS_RE = /^\/(lengkapi|cek-status|set-password|admin|agent|flyer-print)(\/|$)/;

export function blocksTrackerEvents(pathname: string): boolean {
  return NO_EVENTS_RE.test(pathname);
}
