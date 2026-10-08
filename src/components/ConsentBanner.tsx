import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
      return;
    }
    const apply = () => {
      const below = window.matchMedia("(max-width: 1023.98px)").matches;
      root.style.setProperty("--consent-h", below ? `${Math.ceil(card.getBoundingClientRect().height) + 24}px` : "0px");
    };
    apply();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(apply) : null;
    ro?.observe(card);
    window.addEventListener("resize", apply);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", apply);
      root.style.removeProperty("--consent-h");
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
      className="fixed inset-x-3 bottom-3 z-50 max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-lg border border-border bg-card p-3 text-foreground shadow-[0_16px_40px_rgb(124_126_126/0.22),0_2px_8px_rgb(124_126_126/0.10)] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-200 sm:inset-x-auto sm:bottom-4 sm:left-4 sm:w-[440px] sm:p-5"
    >
      <h2 id={TITLE_ID} ref={titleRef} tabIndex={-1} className="text-base font-bold leading-snug outline-none sm:text-lg">
        Cookie dan pelacakan
      </h2>
      <p id={DESC_ID} className="mt-1.5 text-[13px] leading-snug text-muted-foreground sm:mt-2 sm:text-sm sm:leading-relaxed">
        Kami memakai cookie untuk menghitung statistik kunjungan, menayangkan iklan Meta dan TikTok, dan merekam sesi anonim lewat Clarity
        supaya situs lebih mudah dipakai. Semuanya mati sampai kamu memilih, dan bisa kamu ubah kapan saja lewat &quot;Pengaturan cookie&quot;
        di bagian bawah halaman.{" "}
        <Link to="/kebijakan-privasi" className="font-semibold text-foreground underline underline-offset-4">
          Baca Kebijakan Privasi
        </Link>
      </p>

      {expanded && (
        <div className="mt-3 divide-y divide-border rounded-md border border-border">
          <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 p-3">
            <span className="min-w-0">
              <span id="consent-analytics-label" className="block text-sm font-semibold">Analitik</span>
              <span className="block text-[13px] text-muted-foreground">
                Statistik kunjungan (Google Tag Manager, GA4) dan rekaman sesi anonim (Microsoft Clarity).
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
              <span className="block text-[13px] text-muted-foreground">
                Meta Pixel dan TikTok Pixel untuk iklan dan mengukur hasilnya, termasuk kiriman peristiwa dari server kami ke Meta.
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
          <Button
            type="button"
            variant="ghost"
            onClick={() => (decided ? setOpen(false) : setExpanded(false))}
          >
            {decided ? "Tutup" : "Kembali"}
          </Button>
          <Button type="button" variant="brand" onClick={() => decide({ analytics, marketing })}>
            Simpan pilihan
          </Button>
        </div>
      ) : (
        <div className="mt-3 space-y-1 sm:mt-4 sm:space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" className="border-foreground/40" onClick={() => decide({ analytics: false, marketing: false })}>
              Tolak semua
            </Button>
            <Button type="button" variant="brand" onClick={() => decide({ analytics: true, marketing: true })}>
              Setuju semua
            </Button>
          </div>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              const c = getConsent();
              setAnalytics(c?.analytics ?? false);
              setMarketing(c?.marketing ?? false);
              setExpanded(true);
            }}
          >
            Atur pilihan
          </Button>
        </div>
      )}
    </div>,
    host,
  );
}
