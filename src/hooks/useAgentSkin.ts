/**
 * True while the agent portal is open (it marks <html class="pkg-agent">). Dialogs, sheets, menus and selects use it to
 * take the portal's look; it is read when they open, so it needs no subscription.
 */
export const useAgentSkin = (): boolean => typeof document !== "undefined" && document.documentElement.classList.contains("pkg-agent");
