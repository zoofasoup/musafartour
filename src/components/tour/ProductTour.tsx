import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import { useScrollLock } from "@/hooks/useScrollLock";
import "@/styles/pkg-v2.css";

export interface TourStep {
  /** CSS selectors, in priority order - first one that's actually visible on screen wins (lets one step cover both desktop and mobile layouts). */
  targets: string[];
  title: string;
  body: string;
}

interface ProductTourProps {
  steps: TourStep[];
  active: boolean;
  onFinish: () => void;
}

function getVisibleTarget(selectors: string[]): HTMLElement | null {
  for (const sel of selectors) {
    const el = document.querySelector<HTMLElement>(sel);
    if (el && el.offsetParent !== null) return el;
  }
  return null;
}

const PADDING = 8;
const TOOLTIP_WIDTH = Math.min(300, typeof window === "undefined" ? 300 : window.innerWidth - 32);

/**
 * First-launch style walkthrough: dims the page, spotlights one element at a
 * time, and points a bouncing arrow at it. Position is driven by plain
 * inline styles + a CSS transition (not framer-motion's `animate` prop) -
 * framer-motion silently failed to apply top/left/width/height as inline
 * styles on this portaled node, leaving the spotlight stuck at a 0x0
 * default-flow position. Plain style + `transition-all` gets the same
 * gliding effect with no such surprises.
 */
export function ProductTour({ steps, active, onFinish }: ProductTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [placement, setPlacement] = useState<"top" | "bottom">("bottom");

  // body overflow alone does not stop touch scrolling on iOS; the tour moves the page itself (scrollIntoView), the user may not.
  useScrollLock(active);

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  useEffect(() => {
    if (!active) {
      setStepIndex(0);
      setRect(null);
      return;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [active]);

  useLayoutEffect(() => {
    if (!active || !step) return;
    let cancelled = false;

    const el = getVisibleTarget(step.targets);
    if (!el) {
      // Target isn't on screen at this viewport size (e.g. a desktop-only
      // element on mobile) - skip straight to the next step instead of
      // getting stuck.
      if (stepIndex < steps.length - 1) setStepIndex((i) => i + 1);
      else onFinish();
      return;
    }

    // Instant, not smooth: a long smooth scroll was still moving when the spotlight measured the target, so it landed in the wrong place.
    el.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior });
    // Measure after the scroll has settled, and keep following the target while the page moves (late image loads, resize).
    const measure = () => {
      if (cancelled) return;
      const r = el.getBoundingClientRect();
      setRect(r);
      setPlacement(window.innerHeight - r.bottom > 200 ? "bottom" : "top");
    };
    const timers = [150, 500, 1100].map((ms) => window.setTimeout(measure, ms));
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);

    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, stepIndex, steps.length]);

  if (!active || !rect) return null;

  const tooltipLeft = Math.min(
    Math.max(rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2, 16),
    window.innerWidth - TOOLTIP_WIDTH - 16
  );
  const tooltipTop = placement === "bottom" ? rect.bottom + PADDING + 28 : rect.top - PADDING - 28;

  const handleSkip = () => onFinish();
  const handleNext = () => {
    if (isLast) onFinish();
    else setStepIndex((i) => i + 1);
  };

  return createPortal(
    <div className="pkg-v2 pkg-float">
      <div className="fixed inset-0 z-[9997]" onClick={(e) => e.stopPropagation()} />

      <div
        className="pointer-events-none fixed z-[9998] rounded-[24px] ring-2 ring-pkg-red-bright transition-all duration-500 ease-in-out"
        style={{
          top: rect.top - PADDING,
          left: rect.left - PADDING,
          width: rect.width + PADDING * 2,
          height: rect.height + PADDING * 2,
          boxShadow: "0 0 0 9999px var(--pkg-dim)",
        }}
      />

      <div
        data-pkg-tone="cream"
        className="fixed z-[9999] rounded-[28px] bg-pkg-cream p-5 shadow-[0_24px_48px_-12px_rgb(0_0_0/0.45)] transition-[top,left,transform] duration-500 ease-in-out"
        style={{
          width: TOOLTIP_WIDTH,
          top: tooltipTop,
          left: tooltipLeft,
          transform: placement === "top" ? "translateY(-100%)" : undefined,
        }}
      >
        {placement === "bottom" ? (
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            className="absolute -top-7 left-1/2 -translate-x-1/2 text-pkg-red-bright"
          >
            <ChevronUp className="h-6 w-6" />
          </motion.div>
        ) : (
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-pkg-red-bright"
          >
            <ChevronDown className="h-6 w-6" />
          </motion.div>
        )}

        <button
          type="button"
          onClick={handleSkip}
          className="pkg-press pkg-glass absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink"
          aria-label="Tutup tutorial"
        >
          <X className="h-4 w-4" />
        </button>

        <div>
          <h3 className="mb-1.5 pr-11 text-[22px] font-normal leading-[1.15] tracking-[-0.025em] text-pkg-fg">{step.title}</h3>
          <p className="mb-5 text-[15px] leading-[1.45] text-pkg-fg-2">{step.body}</p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-1.5" aria-hidden>
            {steps.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all ${i === stepIndex ? "w-4 bg-pkg-ink" : "w-1.5 bg-pkg-hair"}`} />
            ))}
          </div>
          <div className="flex items-center gap-1">
            {!isLast && (
              <button type="button" onClick={handleSkip} className="pkg-label min-h-11 px-3 text-pkg-fg-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink">
                Lewati
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              className="pkg-press pkg-glass-red pkg-label inline-flex h-11 items-center rounded-full px-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink focus-visible:ring-offset-2"
            >
              {isLast ? "Selesai" : "Lanjut"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
