/** Same cookie ui/sidebar.tsx writes when someone collapses or expands the menu. */
const SIDEBAR_COOKIE = "sidebar:state";

/**
 * What the sidebar should do on first render: the remembered choice when there is one,
 * otherwise open on wide screens (agents and admin alike) so the menu is there on arrival.
 */
export const readSidebarDefaultOpen = (): boolean => {
  if (typeof document !== "undefined") {
    const hit = document.cookie.split("; ").find((c) => c.startsWith(`${SIDEBAR_COOKIE}=`));
    if (hit) {
      const value = hit.slice(SIDEBAR_COOKIE.length + 1);
      if (value === "true") return true;
      if (value === "false") return false;
    }
  }
  return typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;
};
