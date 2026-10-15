import { useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { findActiveItem } from "./navMatch";
import type { ShellNavItem } from "./types";

/**
 * Phone navigation for the agent portal: a floating dark pill with the main pages, and one raised dark action in the middle
 * (the thing an agent does most: register a jamaah). Everything else is behind the menu button in the header.
 */
export const ShellBottomNav = ({ items, pathname, action }: { items: ShellNavItem[]; pathname: string; action?: ShellNavItem }) => {
  const active = findActiveItem([{ items }], pathname);
  const half = Math.ceil(items.length / 2);
  // The middle action turns red like any other selected item while its own page is open.
  const actionActive = !!action && findActiveItem([{ items: [action] }], pathname)?.url === action.url;
  const cell =
    "relative z-10 flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-1 text-[12px] font-medium outline-none transition-colors duration-300 ease-out focus-visible:ring-2 focus-visible:ring-[#1a1512]";

  // One red pill that glides to the selected item (instead of each item switching colour on its own).
  const barRef = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const activeUrl = actionActive ? action?.url : active?.url;
  useLayoutEffect(() => {
    const measure = () => {
      const bar = barRef.current;
      const el = bar?.querySelector<HTMLElement>('[aria-current="page"]');
      if (!bar || !el) return setPill(null);
      const b = bar.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      setPill({ x: r.left - b.left, y: r.top - b.top, w: r.width, h: r.height });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [activeUrl, items.length]);

  const renderItem = (item: ShellNavItem) => {
    const Icon = item.icon;
    const isActive = active?.url === item.url;
    return (
      <Link
        key={item.url}
        to={item.url}
        aria-current={isActive ? "page" : undefined}
        className={`${cell} ${isActive ? "text-white" : "text-[#1a1512]/65 active:bg-black/5"}`}
      >
        <Icon className="h-5 w-5" aria-hidden />
        <span className="max-w-full truncate">{item.title}</span>
      </Link>
    );
  };

  return (
    <nav aria-label="Navigasi utama" className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(12px,env(safe-area-inset-bottom))] md:hidden">
      {/* Content fades out under the bar: two blur layers that each reach a different height, so the blur builds up gradually. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-36">
        <div className="absolute inset-0 backdrop-blur-[3px] [-webkit-mask-image:linear-gradient(to_top,#000_0%,transparent_100%)] [mask-image:linear-gradient(to_top,#000_0%,transparent_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-24 backdrop-blur-[8px] [-webkit-mask-image:linear-gradient(to_top,#000_0%,transparent_100%)] [mask-image:linear-gradient(to_top,#000_0%,transparent_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-14 backdrop-blur-[16px] [-webkit-mask-image:linear-gradient(to_top,#000_0%,transparent_100%)] [mask-image:linear-gradient(to_top,#000_0%,transparent_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--background)/0.7)] via-[hsl(var(--background)/0.25)] to-transparent" />
      </div>
      <div ref={barRef} className="pointer-events-auto relative mx-auto flex max-w-md items-center gap-1 rounded-full bg-[#fffdf8]/55 p-1.5 shadow-[0_16px_34px_-14px_rgb(26_21_18/0.4),inset_0_1px_0_rgb(255_255_255/0.95),inset_0_0_0_1px_rgb(255_255_255/0.55)] backdrop-blur-2xl backdrop-saturate-[1.8]">
        {pill && (
          <span
            aria-hidden
            className="pointer-events-none absolute left-0 top-0 rounded-full bg-gradient-to-b from-[#d02029] via-[#c4141b] to-[#a50f16] shadow-[0_8px_16px_-6px_rgb(196_20_27/0.65),inset_0_1px_0_rgb(255_228_231/0.45)] [transition:transform_420ms_cubic-bezier(0.22,1,0.36,1),width_420ms_cubic-bezier(0.22,1,0.36,1),height_420ms_cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
            style={{ width: pill.w, height: pill.h, transform: `translate(${pill.x}px, ${pill.y}px)` }}
          />
        )}
        {items.slice(0, half).map(renderItem)}
        {action && (
          <Link
            to={action.url}
            aria-label={action.title}
            aria-current={actionActive ? "page" : undefined}
            className="relative z-10 mx-1 grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full text-[#f4efe6] outline-none transition-transform duration-200 ease-out active:scale-90 focus-visible:ring-2 focus-visible:ring-[#1a1512] focus-visible:ring-offset-2"
          >
            <span
              aria-hidden
              className={`absolute inset-0 rounded-full bg-gradient-to-b from-[#2e2824] to-[#1a1512] shadow-[0_10px_20px_-6px_rgb(26_21_18/0.6),inset_0_1px_0_rgb(255_255_255/0.2)] transition-opacity duration-300 ease-out ${actionActive ? "opacity-0" : "opacity-100"}`}
            />
            <action.icon className="relative h-6 w-6" aria-hidden />
          </Link>
        )}
        {items.slice(half).map(renderItem)}
      </div>
    </nav>
  );
};
