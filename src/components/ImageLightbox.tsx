import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import "@/styles/pkg-v2.css";

interface ImageLightboxProps {
  images: string[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  /** Kept for the existing callers; the viewer tracks its own position while it is open. */
  onPrevious?: () => void;
  onNext?: () => void;
}

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Full-screen photo viewer. The page behind is blurred (CSS backdrop blur on the overlay), each photo keeps its own
 * shape with rounded corners and breathing room on both sides (no black letterbox, no frame), the close button and the
 * counter sit right next to the photo, and swiping is the
 * browser's own scroll-snap row, so it follows the finger and settles by itself. Arrow buttons and the arrow keys
 * move one photo for desktop. Tapping the empty area closes it.
 */
export const ImageLightbox = ({ images, currentIndex, isOpen, onClose }: ImageLightboxProps) => {
  const [idx, setIdx] = useState(currentIndex);
  const rowRef = useRef<HTMLDivElement | null>(null);
  const imgRefs = useRef<(HTMLImageElement | null)[]>([]);
  const idxRef = useRef(currentIndex);
  const zoom = useRef({ s: 1, x: 0, y: 0 });
  const [zoomed, setZoomed] = useState(false);
  const [rowEl, setRowEl] = useState<HTMLDivElement | null>(null);
  // The close button and counter stay put while photos slide; they hug the current photo's top and bottom edge.
  const [box, setBox] = useState<{ top: number; bottom: number; left: number; width: number } | null>(null);
  const measure = useCallback(() => {
    const img = imgRefs.current[idx];
    if (!img || !img.clientWidth) return;
    const r = (img.parentElement ?? img).getBoundingClientRect();
    setBox({ top: r.top, bottom: r.bottom, width: r.width, left: (window.innerWidth - r.width) / 2 });
  }, [idx]);
  useEffect(() => {
    if (!isOpen) return;
    measure();
    const t = window.setTimeout(measure, 400);
    window.addEventListener("resize", measure);
    return () => { window.clearTimeout(t); window.removeEventListener("resize", measure); };
  }, [isOpen, measure]);

  // Opens on the photo that was tapped: the row starts there before it is painted.
  const setRow = useCallback(
    (el: HTMLDivElement | null) => {
      rowRef.current = el;
      setRowEl(el);
      if (el) {
        setIdx(currentIndex);
        el.scrollLeft = currentIndex * el.clientWidth;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentIndex, isOpen]
  );

  // Cheap enough to run on every scroll event, and it does not depend on animation frames.
  const onScroll = () => {
    const el = rowRef.current;
    if (el && el.clientWidth) setIdx(Math.round(el.scrollLeft / el.clientWidth));
  };

  const applyZoom = useCallback((animate = false) => {
    const img = imgRefs.current[idxRef.current];
    if (!img) return;
    const { s, x, y } = zoom.current;
    img.style.transition = animate && !reduced() ? "transform 260ms cubic-bezier(0.22, 1, 0.36, 1)" : "none";
    img.style.transform = s === 1 ? "" : `translate(${x}px, ${y}px) scale(${s})`;
    setZoomed(s > 1);
  }, []);

  const resetZoom = useCallback(() => {
    zoom.current = { s: 1, x: 0, y: 0 };
    applyZoom();
  }, [applyZoom]);

  useEffect(() => {
    // A new photo always starts un-zoomed (the old one is reset too, so it is not left zoomed when swiped back).
    imgRefs.current.forEach((el) => { if (el) { el.style.transform = ""; el.style.transition = "none"; } });
    idxRef.current = idx;
    zoom.current = { s: 1, x: 0, y: 0 };
    setZoomed(false);
  }, [idx]);

  // Pinch, double-tap, and one-finger pan while zoomed. At scale 1 a one-finger drag is left to the native swipe row.
  useEffect(() => {
    const row = rowEl;
    if (!isOpen || !row) return;
    const MAX = 5;
    // Pushing past the photo's edge while zoomed counts up here; enough of it flips to the neighbouring photo.
    let over = 0;
    const clampPan = () => {
      const img = imgRefs.current[idxRef.current];
      if (!img) return;
      const z = zoom.current;
      const mx = (img.offsetWidth * (z.s - 1)) / 2;
      const my = (img.offsetHeight * (z.s - 1)) / 2;
      const cx = Math.max(-mx, Math.min(mx, z.x));
      over = z.x - cx;
      z.x = cx;
      z.y = Math.max(-my, Math.min(my, z.y));
    };
    const isPhoto = (t: EventTarget | null) => t === imgRefs.current[idxRef.current];
    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const mid = (t: TouchList) => ({ x: (t[0].clientX + t[1].clientX) / 2, y: (t[0].clientY + t[1].clientY) / 2 });

    let pinch: { d: number; s: number } | null = null;
    let pan: { x: number; y: number } | null = null;
    let lastMid: { x: number; y: number } | null = null;
    let lastTap = 0;
    let moved = false;
    let onPhoto = false;

    const toggle = () => {
      zoom.current = zoom.current.s > 1 ? { s: 1, x: 0, y: 0 } : { s: 2.5, x: 0, y: 0 };
      applyZoom(true);
    };

    const onStart = (e: TouchEvent) => {
      // Only touches on the photo pan or pinch it; touches on the empty area stay a normal swipe between photos.
      if (!isPhoto(e.target)) return;
      moved = false;
      onPhoto = isPhoto(e.target);
      if (e.touches.length === 2) {
        e.preventDefault();
        pinch = { d: dist(e.touches), s: zoom.current.s };
        lastMid = mid(e.touches);
        pan = null;
      } else if (e.touches.length === 1) {
        pan = zoom.current.s > 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
      }
    };
    const onMove = (e: TouchEvent) => {
      if (!pinch && !pan) return;
      moved = true;
      if (pinch && e.touches.length === 2) {
        e.preventDefault();
        const m = mid(e.touches);
        zoom.current.s = Math.max(1, Math.min(MAX, (pinch.s * dist(e.touches)) / pinch.d));
        if (lastMid) {
          zoom.current.x += m.x - lastMid.x;
          zoom.current.y += m.y - lastMid.y;
        }
        lastMid = m;
        clampPan();
        applyZoom();
      } else if (pan && e.touches.length === 1 && zoom.current.s > 1) {
        e.preventDefault();
        const t = e.touches[0];
        zoom.current.x += t.clientX - pan.x;
        zoom.current.y += t.clientY - pan.y;
        pan = { x: t.clientX, y: t.clientY };
        clampPan();
        applyZoom();
      }
    };
    const onEnd = (e: TouchEvent) => {
      if (pinch && e.touches.length < 2) {
        pinch = null;
        lastMid = null;
        if (zoom.current.s < 1.05) resetZoom();
        else pan = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
        return;
      }
      if (e.touches.length === 0) {
        pan = null;
        if (zoom.current.s > 1 && onPhoto && Math.abs(over) > 70) {
          const dir = over < 0 ? 1 : -1; // dragged left past the edge: next photo
          over = 0;
          goRef.current(idxRef.current + dir);
          return;
        }
        over = 0;
        if (!moved && isPhoto(e.target)) {
          const now = Date.now();
          if (now - lastTap < 300) { toggle(); lastTap = 0; } else lastTap = now;
        }
      }
    };

    // Desktop: wheel zooms, double-click toggles, drag pans while zoomed.
    const onWheel = (e: WheelEvent) => {
      if (!isPhoto(e.target)) return;
      e.preventDefault();
      zoom.current.s = Math.max(1, Math.min(MAX, zoom.current.s * Math.exp(-e.deltaY * 0.0025)));
      if (zoom.current.s === 1) zoom.current.x = zoom.current.y = 0;
      clampPan();
      applyZoom();
    };
    const onDbl = (e: MouseEvent) => { if (isPhoto(e.target)) toggle(); };
    let drag: { x: number; y: number } | null = null;
    const onDown = (e: MouseEvent) => { if (isPhoto(e.target) && zoom.current.s > 1) { e.preventDefault(); drag = { x: e.clientX, y: e.clientY }; } };
    const onMouseMove = (e: MouseEvent) => {
      if (!drag) return;
      zoom.current.x += e.clientX - drag.x;
      zoom.current.y += e.clientY - drag.y;
      drag = { x: e.clientX, y: e.clientY };
      clampPan();
      applyZoom();
    };
    const onUp = () => { drag = null; };

    row.addEventListener("touchstart", onStart, { passive: false });
    row.addEventListener("touchmove", onMove, { passive: false });
    row.addEventListener("touchend", onEnd);
    row.addEventListener("touchcancel", onEnd);
    row.addEventListener("wheel", onWheel, { passive: false });
    row.addEventListener("dblclick", onDbl);
    row.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      row.removeEventListener("touchstart", onStart);
      row.removeEventListener("touchmove", onMove);
      row.removeEventListener("touchend", onEnd);
      row.removeEventListener("touchcancel", onEnd);
      row.removeEventListener("wheel", onWheel);
      row.removeEventListener("dblclick", onDbl);
      row.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isOpen, rowEl, applyZoom, resetZoom]);

  const goRef = useRef<(to: number) => void>(() => {});
  const go = useCallback(
    (to: number) => {
      const el = rowRef.current;
      if (!el) return;
      const next = Math.max(0, Math.min(images.length - 1, to));
      el.scrollTo({ left: next * el.clientWidth, behavior: reduced() ? "auto" : "smooth" });
    },
    [images.length]
  );

  goRef.current = (to) => {
    // Leaving a zoomed photo: put it back first so the row can scroll again, then slide over.
    zoom.current = { s: 1, x: 0, y: 0 };
    applyZoom(true);
    setTimeout(() => go(to), 0);
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(idx - 1);
      if (e.key === "ArrowRight") go(idx + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, idx, go]);

  const arrow =
    "pkg-lb-ui pkg-press pkg-glass-deep absolute top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-cream md:grid";

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        overlayClassName="pkg-lightbox-overlay"
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="pkg-v2 pkg-float pkg-lightbox !left-0 !top-0 h-[100dvh] w-screen max-w-none !translate-x-0 !translate-y-0 gap-0 rounded-none border-0 bg-transparent p-0 shadow-none outline-none data-[state=closed]:!animate-none data-[state=open]:!animate-none sm:rounded-none [&>button:last-child]:hidden focus:outline-none focus-visible:outline-none"
      >
        <DialogTitle className="sr-only">Foto {idx + 1} dari {images.length}</DialogTitle>
        <DialogDescription className="sr-only">Geser ke samping untuk foto lain.</DialogDescription>

        <div
          ref={setRow}
          onScroll={onScroll}
          onClick={(e) => {
            // The empty area around a photo closes the viewer; the photo itself does not.
            if ((e.target as HTMLElement).tagName !== "IMG" && !(e.target as HTMLElement).closest("button")) onClose();
          }}
          className={`flex h-full w-full snap-x snap-mandatory overscroll-x-contain overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {images.map((src, i) => (
            <div key={i} className="flex h-full w-full shrink-0 snap-center snap-always items-center justify-center px-5">
              {/* The close button and the counter ride with the photo, a short step above and below it. */}
              <div className={`pkg-lb-photo relative max-w-full overflow-hidden rounded-[20px] shadow-[0_24px_48px_-16px_rgb(0_0_0/0.55)] ${zoomed && i === idx ? "touch-none" : ""}`}>
                <img
                  ref={(el) => { imgRefs.current[i] = el; }}
                  onLoad={measure}
                  src={src}
                  alt={`Foto ${i + 1} dari ${images.length}`}
                  draggable={false}
                  loading={Math.abs(i - currentIndex) <= 1 ? "eager" : "lazy"}
                  decoding="async"
                  className="block max-h-[72dvh] w-auto max-w-full select-none object-contain will-change-transform"
                />
              </div>
            </div>
          ))}
        </div>

        {box && (
          <>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              style={{ top: box.top - 56, left: box.left + box.width - 44 }}
              className="pkg-lb-ui pkg-press pkg-glass-deep fixed z-10 grid h-11 w-11 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-cream"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
            {images.length > 1 && (
              <p
                style={{ top: box.bottom + 14, left: "50%" }}
                className="pkg-lb-ui pkg-glass-deep pkg-label pointer-events-none fixed z-10 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1.5 tabular-nums"
              >
                {idx + 1} / {images.length}
              </p>
            )}
          </>
        )}

        {idx > 0 && (
          <button type="button" onClick={() => go(idx - 1)} aria-label="Foto sebelumnya" className={`${arrow} left-4`}>
            <ChevronLeft className="h-6 w-6" aria-hidden />
          </button>
        )}
        {idx < images.length - 1 && (
          <button type="button" onClick={() => go(idx + 1)} aria-label="Foto berikutnya" className={`${arrow} right-4`}>
            <ChevronRight className="h-6 w-6" aria-hidden />
          </button>
        )}

      </DialogContent>
    </Dialog>
  );
};
