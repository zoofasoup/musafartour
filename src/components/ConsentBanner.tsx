import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import "@/styles/pkg-v2.css";
import { CONSENT_OPEN_EVENT, getConsent, hasDecided, setConsent, withdrawnCategories } from "@/lib/consent";
import { isPrivateRoute } from "@/lib/privateRoutes";
import { isInternalBrowser } from "@/lib/tracking";

/**
 * Cookie and tracking consent (UU PDP 27/2022). Public routes only: never on private routes
 * (token pages, /daftar, /admin, /agent, /flyer-print) or in staff browsers.
 *
 * Non-modal card at the bottom. While it is visible it publishes its height as --consent-h on <html>
 * (below the lg breakpoint, where the mobile sticky price bar and the WhatsApp button live) so those
 * sit above it instead of under it. The value is set before first paint, so nothing jumps.
 */

const TITLE_ID = "consent-title";
const DESC_ID = "consent-desc";

export default function ConsentBanner() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(() => !hasDecided());
  const [expanded, setExpanded] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const focusOnOpen = useRef(false);

  const blocked = isPrivateRoute(pathname) || isInternalBrowser();
  const visible = open && !blocked;

  // Mount point right after #nav-root (skip link + navbar), before #root: a keyboard user reaches the banner
  // right after the navigation instead of after the whole page.
  useLayoutEffect(() => {
    const el = document.createElement("div");
    el.setAttribute("data-consent-host", "");
    const root = document.getElementById("root");
    if (root?.parentNode) root.parentNode.insertBefore(el, root);
    else document.body.appendChild(el);
    setHost(el);
    return () => {
      el.remove();
    };
  }, []);

  // "Pengaturan cookie" (Footer) opens the settings with the current choice preselected.
  useEffect(() => {
    const onOpen = () => {
      const c = getConsent();
      setAnalytics(c?.analytics ?? false);
      setMarketing(c?.marketing ?? false);
      setExpanded(true);
      focusOnOpen.current = true;
      setOpen(true);
    };
    window.addEventListener(CONSENT_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (visible && focusOnOpen.current) {
      focusOnOpen.current = false;
      titleRef.current?.focus();
    }
  }, [visible, expanded]);

  // Publish the height for the WhatsApp button and the sticky bar (see FloatingWhatsApp, PackageStickyMobileBar).
  useLayoutEffect(() => {
    const root = document.documentElement;
    const card = cardRef.current;
    if (!visible || !card) {
      root.style.removeProperty("--consent-h");
      root.removeAttribute("data-consent-open");
      return;
    }
    const apply = () => {
      const below = window.matchMedia("(max-width: 1023.98px)").matches;
      root.style.setProperty("--consent-h", below ? `${Math.ceil(card.getBoundingClientRect().height) + 24}px` : "0px");
      if (below) root.setAttribute("data-consent-open", "");
      else root.removeAttribute("data-consent-open");
    };
    apply();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(apply) : null;
    ro?.observe(card);
    window.addEventListener("resize", apply);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", apply);
      root.style.removeProperty("--consent-h");
      root.removeAttribute("data-consent-open");
    };
  }, [visible, expanded, host]);

  const decide = useCallback((choice: { analytics: boolean; marketing: boolean }) => {
    const previous = getConsent();
    const next = setConsent(choice);
    setOpen(false);
    setExpanded(false);
    const withdrawn = withdrawnCategories(previous, next);
    if (withdrawn.length) {
      toast("Pilihan disimpan", {
        description: "Pelacakan yang kamu cabut berhenti sekarang. Perubahan berlaku penuh setelah halaman dimuat ulang.",
      });
    } else if (previous) {
      toast("Pilihan disimpan");
    }
  }, []);

  if (!visible || !host) return null;

  const decided = hasDecided();

  return createPortal(
    <div
      ref={cardRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby={TITLE_ID}
      aria-describedby={DESC_ID}
      onKeyDown={(e) => {
        // Escape only folds the settings back; it never records a choice.
        if (e.key === "Escape" && expanded) {
          e.stopPropagation();
          if (decided) setOpen(false);
          else setExpanded(false);
        }
      }}
      className="pkg-v2 pkg-toast fixed inset-x-3 bottom-3 z-50 max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-[28px] p-4 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-200 sm:inset-x-auto sm:bottom-4 sm:left-4 sm:w-[440px] sm:p-5"
    >
      <h2 id={TITLE_ID} ref={titleRef} tabIndex={-1} className={expanded ? "text-base font-medium leading-snug outline-none sm:text-lg" : "sr-only"}>
        Cookie
      </h2>
      <p id={DESC_ID} className="text-[15px] font-medium leading-snug sm:text-base">
        Cookie untuk paket yang lebih sesuai.
      </p>
      {!expanded && (
        <p className="mt-1 text-[13px] opacity-75">
          <button
            type="button"
            className="underline underline-offset-4"
            onClick={() => {
              const c = getConsent();
              setAnalytics(c?.analytics ?? false);
              setMarketing(c?.marketing ?? false);
              setExpanded(true);
            }}
          >
            Atur pilihan
          </button>
          {" · "}
          <Link to="/kebijakan-privasi" className="underline underline-offset-4">
            Kebijakan Privasi
          </Link>
        </p>
      )}
      {expanded && (
        <p className="mt-1 text-[13px] opacity-75">
          <Link to="/kebijakan-privasi" className="underline underline-offset-4">
            Kebijakan Privasi
          </Link>
        </p>
      )}

      {expanded && (
        <div className="pkg-glass mt-3 divide-y divide-pkg-hair rounded-2xl">
          <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 p-3">
            <span className="min-w-0">
              <span id="consent-analytics-label" className="block text-sm font-semibold">Analitik</span>
              <span className="block text-[13px] opacity-75">
                Statistik kunjungan dan rekaman sesi anonim (GA4, Clarity).
              </span>
            </span>
            <Switch
              checked={analytics}
              onCheckedChange={setAnalytics}
              aria-labelledby="consent-analytics-label"
              className="data-[state=checked]:bg-brand"
            />
          </label>
          <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 p-3">
            <span className="min-w-0">
              <span id="consent-marketing-label" className="block text-sm font-semibold">Pemasaran</span>
              <span className="block text-[13px] opacity-75">
                Iklan dan pengukurannya (Meta, TikTok).
              </span>
            </span>
            <Switch
              checked={marketing}
              onCheckedChange={setMarketing}
              aria-labelledby="consent-marketing-label"
              className="data-[state=checked]:bg-brand"
            />
          </label>
        </div>
      )}

      {expanded ? (
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="pkg-press pkg-glass h-12 rounded-full px-6 text-[15px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-cream" onClick={() => (decided ? setOpen(false) : setExpanded(false))}>
            {decided ? "Tutup" : "Kembali"}
          </button>
          <button type="button" className="pkg-press pkg-glass-red h-12 rounded-full px-6 text-[15px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-cream" onClick={() => decide({ analytics, marketing })}>
            Simpan pilihan
          </button>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4">
          <button type="button" className="pkg-press pkg-glass h-12 rounded-full text-[15px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-cream" onClick={() => decide({ analytics: false, marketing: false })}>
            Tolak
          </button>
          <button type="button" className="pkg-press pkg-glass-red h-12 rounded-full text-[15px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-cream" onClick={() => decide({ analytics: true, marketing: true })}>
            Terima
          </button>
        </div>
      )}
    </div>,
    host,
  );
}
