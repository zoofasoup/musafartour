import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

const COOKIE_NAME = "musafar_ref";
const COOKIE_DAYS = 30;

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

/** First-touch referral attribution: only sets the cookie if one doesn't
 * already exist, so a later agent's link never overwrites an earlier one. */
export function captureReferral(code: string | null | undefined) {
  const ref = code?.trim();
  if (ref && !getCookie(COOKIE_NAME)) {
    setCookie(COOKIE_NAME, ref, COOKIE_DAYS);
  }
}

export function useReferralCapture() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    captureReferral(searchParams.get("ref"));
  }, [searchParams]);
}

export function getReferralCookie(): string | null {
  return getCookie(COOKIE_NAME);
}
