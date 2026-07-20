import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, ChevronDown, ChevronUp } from "lucide-react";

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
const TOOLTIP_WIDTH = 300;

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

    el.scrollIntoView({ block: "center", behavior: "smooth" });
    const t = window.setTimeout(() => {
      if (cancelled) return;
      const r = el.getBoundingClientRect();
      setRect(r);
      const spaceBelow = window.innerHeight - r.bottom;
      setPlacement(spaceBelow > 200 ? "bottom" : "top");
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
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
    <>
      <div className="fixed inset-0 z-[9997]" onClick={(e) => e.stopPropagation()} />

      <div
        className="fixed z-[9998] pointer-events-none rounded-[20px] ring-2 ring-emerald-400 transition-all duration-500 ease-in-out"
        style={{
          top: rect.top - PADDING,
          left: rect.left - PADDING,
          width: rect.width + PADDING * 2,
          height: rect.height + PADDING * 2,
          boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.7)",
        }}
      />

      <div
        className="fixed z-[9999] rounded-3xl border border-slate-100/60 bg-white shadow-2xl p-4 transition-all duration-500 ease-in-out"
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
            className="absolute -top-7 left-1/2 -translate-x-1/2 text-emerald-500"
          >
            <ChevronUp className="h-6 w-6" />
          </motion.div>
        ) : (
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-emerald-500"
          >
            <ChevronDown className="h-6 w-6" />
          </motion.div>
        )}

        <button
          onClick={handleSkip}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
          aria-label="Tutup tutorial"
        >
          <X className="h-4 w-4" />
        </button>

        <div>
          <h3 className="font-bold text-base pr-6 mb-1.5 text-foreground">{step.title}</h3>
          <p className="text-sm text-muted-foreground mb-4">{step.body}</p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === stepIndex ? "w-4 bg-emerald-600" : "w-1.5 bg-slate-200"}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {!isLast && (
              <Button variant="ghost" size="sm" onClick={handleSkip} className="text-muted-foreground">
                Lewati
              </Button>
            )}
            <Button size="sm" onClick={handleNext} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full">
              {isLast ? "Selesai" : "Lanjut"}
            </Button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
