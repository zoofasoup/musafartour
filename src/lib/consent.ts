/**
 * Cookie / tracking consent (UU PDP 27/2022). One place that says what a visitor allowed.
 *
 *   analytics  GTM, GA4, Microsoft Clarity, and the persistent visitor id of our own site analytics
 *   marketing  Meta Pixel + Conversions API (/meta-capi), TikTok Pixel
 *
 * Stored in localStorage under `musafar_consent` as {v, analytics, marketing, at}.
 * No decision (or a decision made under an older CONSENT_VERSION, or unreadable storage)
 * means "no consent": nothing third-party loads or sends.
 *
 * Keep the key and shape in sync with nothing else: index.html no longer loads trackers.
 */

export type ConsentCategory = "analytics" | "marketing";

export interface ConsentChoice {
  analytics: boolean;
  marketing: boolean;
}

export interface StoredConsent extends ConsentChoice {
  v: number;
  /** ISO time of the decision: the proof that it was given. */
  at: string;
}

/** Bump when the categories or the policy text change in a way that needs a fresh decision. */
export const CONSENT_VERSION = 1;
export const CONSENT_KEY = "musafar_consent";
/** CustomEvent name on window. detail = { consent: StoredConsent | null, previous: StoredConsent | null }. */
export const CONSENT_EVENT = "musafar-consent";
/** Fired to ask the banner to open (Footer link "Pengaturan cookie"). */
export const CONSENT_OPEN_EVENT = "musafar-consent-open";

export interface ConsentEventDetail {
  consent: StoredConsent | null;
  previous: StoredConsent | null;
}

// Used only when storage cannot be written (private mode, blocked): the choice the visitor just made still
// applies for this page load, but is not remembered.
let memory: StoredConsent | null = null;

function parse(raw: string | null): StoredConsent | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Partial<StoredConsent> | null;
    if (!data || typeof data !== "object") return null;
    if (data.v !== CONSENT_VERSION) return null;
    if (typeof data.analytics !== "boolean" || typeof data.marketing !== "boolean") return null;
    return { v: data.v, analytics: data.analytics, marketing: data.marketing, at: typeof data.at === "string" ? data.at : "" };
  } catch {
    return null;
  }
}

/** The valid stored decision, or null when there is none (never asked, version changed, storage blocked). */
export function getConsent(): StoredConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = parse(window.localStorage.getItem(CONSENT_KEY));
    if (stored) return stored;
  } catch {
    /* storage blocked: fall through to the in-memory choice */
  }
  return memory;
}

export function hasDecided(): boolean {
  return getConsent() !== null;
}

export function hasConsent(category: ConsentCategory): boolean {
  return getConsent()?.[category] === true;
}

function emit(detail: ConsentEventDetail) {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent<ConsentEventDetail>(CONSENT_EVENT, { detail }));
  } catch {
    /* ignore */
  }
}

export function setConsent(choice: ConsentChoice): StoredConsent {
  const previous = getConsent();
  const next: StoredConsent = {
    v: CONSENT_VERSION,
    analytics: choice.analytics === true,
    marketing: choice.marketing === true,
    at: new Date().toISOString(),
  };
  memory = next;
  try {
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify(next));
  } catch {
    /* storage blocked: kept in memory for this page load only */
  }
  emit({ consent: next, previous });
  return next;
}

/** Forget the decision (testing switch ?consent=reset). The banner asks again. */
export function clearConsent() {
  const previous = getConsent();
  memory = null;
  try {
    window.localStorage.removeItem(CONSENT_KEY);
  } catch {
    /* ignore */
  }
  emit({ consent: null, previous });
}

/** Subscribe to decisions made in this tab. Returns the unsubscribe function. */
export function onConsentChange(cb: (detail: ConsentEventDetail) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => cb((e as CustomEvent<ConsentEventDetail>).detail);
  window.addEventListener(CONSENT_EVENT, handler);
  return () => window.removeEventListener(CONSENT_EVENT, handler);
}

/** Ask the banner to open its settings (Footer "Pengaturan cookie"). */
export function openConsentSettings() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CONSENT_OPEN_EVENT));
}

// ---------------------------------------------------------------------------
// Withdrawal: remove the first-party cookies the trackers set on our own domain.
// Cookies on third-party domains cannot be removed from here; the trackers stop
// being loaded on the next page load.
// ---------------------------------------------------------------------------

const ANALYTICS_COOKIES = [/^_ga/, /^_gid$/, /^_gat/, /^_clck$/, /^_clsk$/];
const MARKETING_COOKIES = [/^_fbp$/, /^_fbc$/, /^_ttp$/, /^ttcsid/, /^_tt_/];

/** Delete tracker cookies of the given category on this host and its parent domains. Returns the names removed. */
export function clearTrackerCookies(category: ConsentCategory): string[] {
  if (typeof document === "undefined") return [];
  const patterns = category === "analytics" ? ANALYTICS_COOKIES : MARKETING_COOKIES;
  const removed: string[] = [];
  let names: string[] = [];
  try {
    names = document.cookie
      .split(";")
      .map((c) => c.split("=")[0].trim())
      .filter(Boolean);
  } catch {
    return removed;
  }
  const host = typeof location !== "undefined" ? location.hostname : "";
  const parts = host.split(".");
  const domains = ["", host];
  // .musafartour.com, .com is skipped (needs >= 2 labels).
  for (let i = 1; i < parts.length - 1; i++) domains.push("." + parts.slice(i).join("."));
  for (const name of names) {
    if (!patterns.some((re) => re.test(name))) continue;
    for (const d of domains) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d ? `; domain=${d}` : ""}`;
    }
    removed.push(name);
  }
  return removed;
}

/** What is lost between two decisions, for the withdrawal path. */
export function withdrawnCategories(previous: StoredConsent | null, next: StoredConsent | null): ConsentCategory[] {
  const out: ConsentCategory[] = [];
  if (previous?.analytics && !next?.analytics) out.push("analytics");
  if (previous?.marketing && !next?.marketing) out.push("marketing");
  return out;
}

/** @internal for tests */
export function __resetConsentMemory() {
  memory = null;
}
