import type { ShellExtraTitle, ShellNavGroup, ShellNavItem } from "./types";

/** How strongly a path matches one item: the length of the matched prefix, 0 for no match. */
const matchLength = (item: ShellNavItem, pathname: string): number => {
  const candidates = [item.url, ...(item.alsoActive ?? [])];
  let best = 0;
  for (const c of candidates) {
    const hit = item.end ? pathname === c : pathname === c || pathname.startsWith(`${c}/`);
    if (hit) best = Math.max(best, item.alsoActive?.includes(c) ? item.url.length : c.length);
  }
  return best;
};

/** The item for the current route. The longest prefix wins, so /admin/jamaah/pembayaran beats /admin/jamaah. */
export const findActiveItem = (groups: ShellNavGroup[], pathname: string): ShellNavItem | undefined => {
  let best: ShellNavItem | undefined;
  let bestLen = 0;
  for (const g of groups) {
    for (const item of g.items) {
      const len = matchLength(item, pathname);
      if (len > bestLen) {
        best = item;
        bestLen = len;
      }
    }
  }
  return best;
};

export const resolvePageTitle = (
  groups: ShellNavGroup[],
  pathname: string,
  extra: ShellExtraTitle[] | undefined,
  fallback: string,
): string => {
  const extraHit = extra?.find((e) => pathname === e.path || pathname.startsWith(`${e.path}/`));
  if (extraHit) return extraHit.title;
  return findActiveItem(groups, pathname)?.title ?? fallback;
};
