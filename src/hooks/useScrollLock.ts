import { useEffect } from "react";

/**
 * Keeps the page from scrolling vertically while `active`: wheel, vertical touch drags and the scroll keys are blocked.
 * Horizontal swipes still work (the flyer carousel). The caller must offer a way out (a button), which flips `active`.
 */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const html = document.documentElement;
    const prev = { overflow: html.style.overflow, overscroll: html.style.overscrollBehavior };
    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";

    let sx = 0;
    let sy = 0;
    const onStart = (e: TouchEvent) => {
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
    };
    const onMove = (e: TouchEvent) => {
      if (e.touches.length > 1 || !e.cancelable) return;
      const t = e.touches[0];
      if (Math.abs(t.clientY - sy) >= Math.abs(t.clientX - sx)) e.preventDefault();
    };
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) >= Math.abs(e.deltaX)) e.preventDefault();
    };
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (e.key === " " && el?.tagName === "BUTTON") return; // Space on a focused button still activates it
      if ([" ", "PageDown", "PageUp", "End", "Home", "ArrowDown", "ArrowUp"].includes(e.key)) e.preventDefault();
    };
    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => {
      html.style.overflow = prev.overflow;
      html.style.overscrollBehavior = prev.overscroll;
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    };
  }, [active]);
}
