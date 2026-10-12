import { useEffect, type RefObject } from "react";

/**
 * A row that drifts left by itself and can still be swiped or dragged. The content is `copies` identical sets, so
 * scrollLeft wraps by exactly one set and the loop never shows a seam. Drifting pauses while the user touches or
 * scrolls it and resumes ~2s later; it does not run at all with "reduce motion".
 */
export function useAutoScroll(ref: RefObject<HTMLElement>, pxPerSec: number, copies: number) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let last = 0;
    let pos = 0;
    let pausedUntil = 0;
    let ready = false;
    let ours = false; // the next scroll event came from us, not from the user

    const setW = () => el.scrollWidth / copies;
    const pause = () => { pausedUntil = performance.now() + 2200; };
    const onScroll = () => {
      if (ours) { ours = false; return; }
      pos = el.scrollLeft;
      pause();
    };
    const tick = (t: number) => {
      const dt = Math.min(64, t - last) / 1000;
      last = t;
      const w = setW();
      if (w > el.clientWidth) {
        if (!ready) { pos = w; el.scrollLeft = w; ready = true; }
        if (t > pausedUntil) {
          pos += pxPerSec * dt;
          if (pos >= 2 * w) pos -= w;
          ours = true;
          el.scrollLeft = pos;
        } else {
          // keep the user's position inside the middle band so there is always room both ways
          if (el.scrollLeft >= 2 * w) { el.scrollLeft -= w; pos = el.scrollLeft; }
          else if (el.scrollLeft < w * 0.5 && copies >= 3) { el.scrollLeft += w; pos = el.scrollLeft; }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame((t) => { last = t; tick(t); });
    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("pointerdown", pause, { passive: true });
    el.addEventListener("touchstart", pause, { passive: true });
    el.addEventListener("wheel", pause, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("pointerdown", pause);
      el.removeEventListener("touchstart", pause);
      el.removeEventListener("wheel", pause);
    };
  }, [ref, pxPerSec, copies]);
}
