/**
 * The agent sign-up form remembers ?ref= across the Google OAuth round trip (the redirect leaves the page, and a
 * Google user has no referral code in their metadata). After the agents row exists, useAgentAuth reads it back
 * once and calls the database function set_agent_referrer. sessionStorage only: it goes away with the tab.
 */
const KEY = "musafar_agent_ref";

export const rememberAgentReferral = (code: string): void => {
  try {
    const clean = code.trim().toUpperCase();
    if (clean) sessionStorage.setItem(KEY, clean);
    else sessionStorage.removeItem(KEY);
  } catch {
    // storage blocked (private mode): the referral is simply not carried over
  }
};

export const peekAgentReferral = (): string => {
  try {
    return sessionStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
};

/** Reads the remembered code and forgets it, so it is tried exactly once. */
export const takeAgentReferral = (): string => {
  const code = peekAgentReferral();
  if (code) {
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      // ignore
    }
  }
  return code;
};
