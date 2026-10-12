import { useEffect, type RefObject } from "react";
import { getOptimizedImageUrl } from "@/lib/utils";

/**
 * Colours the navbar after whatever is under it while a pkg-v2 page is open (see MASTER.md, body[data-pkg-nav] in pkg-v2.css):
 * the photo's top-edge colour over the flyer, then each panel's own colour, with a light or dark logo and icons to match.
 * Vars come from the page tokens and are only rewritten when the section under the navbar changes.
 */
export function usePkgNav(rootRef: RefObject<HTMLElement>, firstImage?: string) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const body = document.body;
    const tok = (n: string) => getComputedStyle(root).getPropertyValue(n).trim();
    let flyerBg = tok("--pkg-ink");
    let tone = "";
    let raf = 0;
    const paint = (t: string) => {
      const soft = tok("--pkg-cream");
      const map: Record<string, [string, string]> = {
        flyer: [flyerBg, soft],
        cream: [tok("--pkg-cream"), tok("--pkg-ink")],
        "cream-2": [tok("--pkg-cream-2"), tok("--pkg-ink")],
        ink: [tok("--pkg-ink"), soft],
        red: [tok("--pkg-red"), tok("--pkg-on-red")],
      };
      const [bg, fg] = map[t] ?? map.flyer;
      body.style.setProperty("--pkg-nav-bg", bg);
      body.style.setProperty("--pkg-nav-fg", fg);
    };
    const detect = () => {
      raf = 0;
      const el = document.elementFromPoint(window.innerWidth / 2, 72);
      const hit = el?.closest<HTMLElement>("[data-pkg-tone],[data-pkg-flyer]");
      // Over a section that is not part of the pkg look (older sections on a page), the navbar keeps the site default.
      if (!hit) {
        if (tone !== "off") {
          tone = "off";
          delete body.dataset.pkgNav;
        }
        return;
      }
      const t = hit.dataset.pkgTone ?? "flyer";
      if (t !== tone) {
        if (tone === "off") body.dataset.pkgNav = "1";
        tone = t;
        paint(t);
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(detect);
    };
    body.dataset.pkgNav = "1";
    window.addEventListener("scroll", onScroll, { passive: true });
    detect();

    // Flyer colour: average of the photo's top edge, darkened until light text on it is readable. Ink when unreadable.
    let cancelled = false;
    if (firstImage) {
      const im = new Image();
      im.crossOrigin = "anonymous";
      im.onload = () => {
        if (cancelled || !im.naturalWidth) return;
        try {
          const c = document.createElement("canvas");
          c.width = 48;
          c.height = 3;
          const ctx = c.getContext("2d", { willReadFrequently: true });
          if (!ctx) return;
          ctx.drawImage(im, 0, 0, im.naturalWidth, Math.max(1, im.naturalHeight * 0.015), 0, 0, 48, 3);
          const d = ctx.getImageData(0, 0, 48, 3).data;
          let r = 0, g = 0, b = 0;
          const n = d.length / 4;
          for (let i = 0; i < d.length; i += 4) {
            r += d[i];
            g += d[i + 1];
            b += d[i + 2];
          }
          const lin = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
          const lum = (c3: number[]) => 0.2126 * lin(c3[0]) + 0.7152 * lin(c3[1]) + 0.0722 * lin(c3[2]);
          let c3 = [r / n, g / n, b / n];
          for (let i = 0; i < 30 && 1.05 / (lum(c3) + 0.05) < 4.5; i++) c3 = c3.map((v) => v * 0.92);
          flyerBg = `rgb(${Math.round(c3[0])} ${Math.round(c3[1])} ${Math.round(c3[2])})`;
          if (tone === "flyer") paint("flyer");
        } catch {
          /* cross-origin photo: keep the ink fallback */
        }
      };
      im.src = getOptimizedImageUrl(firstImage, 200);
    }
    return () => {
      cancelled = true;
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
      delete body.dataset.pkgNav;
      body.style.removeProperty("--pkg-nav-bg");
      body.style.removeProperty("--pkg-nav-fg");
    };
  }, [rootRef, firstImage]);
}
