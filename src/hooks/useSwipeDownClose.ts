import { useEffect } from "react";

/**
 * Pull a sheet panel down to close it. The panel follows the finger, and closes when released past 120px or flicked;
 * otherwise it springs back. Only starts when the panel's own scroll is at the top, so scrolling its content still works.
 */
export function useSwipeDownClose(panel: HTMLElement | null, onClose: () => void) {
  useEffect(() => {
    const el = panel;
    if (!el) return;
    let startY = 0;
    let startT = 0;
    let dy = 0;
    let dragging = false;

    const onStart = (e: TouchEvent) => {
      dragging = el.scrollTop <= 0 && e.touches.length === 1;
      dy = 0;
      startY = e.touches[0].clientY;
      startT = Date.now();
    };
    const onMove = (e: TouchEvent) => {
      if (!dragging) return;
      dy = e.touches[0].clientY - startY;
      if (dy <= 0 || el.scrollTop > 0) {
        dragging = dy > 0 && el.scrollTop <= 0;
        el.style.transform = "";
        return;
      }
      if (e.cancelable) e.preventDefault();
      el.style.transition = "none";
      el.style.transform = `translateY(${dy}px)`;
    };
    const onEnd = () => {
      if (!dragging || dy <= 0) return;
      dragging = false;
      const speed = dy / Math.max(1, Date.now() - startT);
      if (dy > 120 || speed > 0.6) {
        el.style.transition = "transform 200ms cubic-bezier(0.4, 0, 0.2, 1)";
        el.style.transform = "translateY(100%)";
        window.setTimeout(onClose, 180);
      } else {
        el.style.transition = "transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)";
        el.style.transform = "";
      }
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [panel, onClose]);
}
