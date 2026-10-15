import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import { PkgPanel } from "@/components/package-detail/PkgPanel";
import "@/styles/pkg-v2.css";

/**
 * Frame for a page of the agent portal on the phone's new look: a dark hero panel (large light title, optional key
 * figures and one action) and cream panels below it, stacked edge to edge. The shell pads its content, so the frame
 * cancels that padding on the phone; on a wide screen it becomes one rounded block inside the page.
 * Children should be <PkgPanel> (use AgentPanel).
 */
export function AgentPage({ title, intro, hero, back, children }: { title: string; intro?: string; hero?: ReactNode; back?: { to: string; label: string }; children: ReactNode }) {
  return (
    <div className="pkg-v2 pkg-float -mx-4 -mt-4 -mb-24 md:m-0 md:overflow-hidden md:rounded-[32px]">
      <PkgPanel tone="ink" top className="!pb-14 !pt-9">
        <div className="mx-auto max-w-3xl">
          {back && (
            <Link to={back.to} className="pkg-label -ml-1 mb-5 inline-flex min-h-11 items-center gap-1.5 text-pkg-fg-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-cream">
              <ArrowLeft className="h-4 w-4" aria-hidden /> {back.label}
            </Link>
          )}
          <h1 className="pkg-title text-balance !text-[40px] md:!text-[52px]">{title}</h1>
          {intro && <p className="mt-4 text-[17px] leading-[1.5] text-pkg-fg-2">{intro}</p>}
          {hero}
        </div>
      </PkgPanel>
      {children}
    </div>
  );
}

/** One cream panel of an agent page. `last` leaves room for the floating bar at the bottom. */
export function AgentPanel({ tone = "cream", last, className, children }: { tone?: "cream" | "cream-2"; last?: boolean; className?: string; children: ReactNode }) {
  return (
    <PkgPanel tone={tone} last={last} className={`${last ? "" : "!pb-12"} !pt-14 ${className ?? ""}`}>
      <div className="mx-auto max-w-3xl">{children}</div>
    </PkgPanel>
  );
}

export const agentPrimary =
  "pkg-press pkg-glass-red pkg-label inline-flex h-14 items-center justify-center gap-2.5 rounded-full px-7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-cream focus-visible:ring-offset-2 focus-visible:ring-offset-pkg-ink";
export const agentGlass =
  "pkg-press pkg-glass pkg-label inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink focus-visible:ring-offset-2";

/** A row of big light numbers with a small label and note under each, no boxes. */
export function Figures({ items, cols = 3 }: { items: { value: string; label: string; note?: string }[]; cols?: 2 | 3 }) {
  return (
    <div className={`mt-8 grid gap-x-4 gap-y-7 ${cols === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
      {items.map((s) => (
        <div key={s.label} className="min-w-0">
          <p className="text-[28px] font-light leading-none tracking-[-0.03em] text-pkg-fg">{s.value}</p>
          <p className="mt-2 text-[14px] leading-tight text-pkg-fg">{s.label}</p>
          {s.note && <p className="mt-0.5 text-[13px] leading-tight text-pkg-fg-3">{s.note}</p>}
        </div>
      ))}
    </div>
  );
}

/** Filter chips: pills in a scrolling row, the chosen one filled. */
export function Chips<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string }) {
  return (
    <div role="group" aria-label={label} className="-mx-6 -my-4 flex gap-2 overflow-x-auto px-6 py-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            data-plain
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={`pkg-press pkg-label h-11 shrink-0 rounded-full px-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink focus-visible:ring-offset-2 ${on ? "pkg-glass-red !text-pkg-on-red" : "pkg-glass"}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Empty state: an icon and a few words. No paragraph. */
export function AgentEmpty({ icon: Icon, text, action }: { icon: LucideIcon; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-pkg-cream-2 text-pkg-fg-3"><Icon className="h-6 w-6" aria-hidden /></span>
      <p className="text-[17px] text-pkg-fg-2">{text}</p>
      {action}
    </div>
  );
}
