import { useEffect, useRef } from "react";

/** Cloudflare's published test key: always passes. Only used on localhost, where the real key is not valid. */
const TEST_SITE_KEY = "1x00000000000000000000AA";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
    };
  }
}

let scriptPromise: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error("turnstile"));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export const turnstileSiteKey = (): string | null => {
  const key = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;
  if (key) return key;
  return ["localhost", "127.0.0.1"].includes(window.location.hostname) ? TEST_SITE_KEY : null;
};

interface Props {
  onToken: (token: string | null) => void;
  /** Change this to get a fresh challenge (after a failed submit the old token is spent). */
  resetKey?: number;
}

/** The anti-spam check. Renders nothing visible for most people; shows a small box if Cloudflare is unsure. */
export function Turnstile({ onToken, resetKey = 0 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const siteKey = turnstileSiteKey();

  useEffect(() => {
    if (!siteKey || !ref.current) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !ref.current || !window.turnstile) return;
        if (widget.current) window.turnstile.remove(widget.current);
        widget.current = window.turnstile.render(ref.current, {
          sitekey: siteKey,
          language: "id",
          callback: (token: string) => onToken(token),
          "expired-callback": () => onToken(null),
          "error-callback": () => onToken(null),
        });
      })
      .catch(() => onToken(null));
    return () => {
      cancelled = true;
      if (widget.current && window.turnstile) window.turnstile.remove(widget.current);
      widget.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey, resetKey]);

  if (!siteKey) {
    return <p className="text-sm text-destructive" role="alert">Pendaftaran online belum aktif. Silakan hubungi CS lewat WhatsApp.</p>;
  }
  return <div ref={ref} aria-label="Verifikasi keamanan" />;
}
