/**
 * True while a work area that uses the app skin is open: the agent portal (<html class="pkg-agent">) or the admin panel
 * (<html class="pkg-admin">). Dialogs, sheets, menus and selects use it to take that look; it is read when they open, so
 * it needs no subscription.
 */
export const useAppSkin = (): boolean =>
  typeof document !== "undefined" && (document.documentElement.classList.contains("pkg-agent") || document.documentElement.classList.contains("pkg-admin"));

/** Old name, kept so the overlay components do not all change at once. */
export const useAgentSkin = useAppSkin;
