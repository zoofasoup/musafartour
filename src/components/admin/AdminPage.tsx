import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PkgPanel } from "@/components/package-detail/PkgPanel";
import { cn } from "@/lib/utils";
import "@/styles/pkg-v2.css";

/**
 * Frame of an admin page. On a phone: a dark panel with the title, the main action and optional tabs, then stacked
 * panels edge to edge (like the agent portal). On a desktop: a plain header (title left, actions right) and dense white cards.
 * The shell pads its content, so the frame cancels that padding on the phone.
 */
export function AdminPage({
  title,
  intro,
  actions,
  tabs,
  back,
  children,
}: {
  title: string;
  intro?: string;
  /** The main buttons of the page. Stacked under the title on a phone, on the right of it on a desktop. */
  actions?: ReactNode;
  /** A row of chips (use <Chips> from AgentPage) for the views of the page. */
  tabs?: ReactNode;
  back?: { to: string; label: string };
  children: ReactNode;
}) {
  const backLink = back && (
    <Link to={back.to} className="pkg-label inline-flex min-h-11 items-center gap-1.5 text-pkg-fg-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink">
      <ArrowLeft className="h-4 w-4" aria-hidden /> {back.label}
    </Link>
  );
  return (
    <div className="-mx-4 -mt-4 -mb-4 md:m-0">
      {/* Phone */}
      <PkgPanel tone="ink" top className="admin-hero md:hidden">
        <div className="mx-auto max-w-3xl">
          {backLink && <div className="-ml-1 mb-3">{backLink}</div>}
          <h1 className="pkg-title text-balance !text-[40px]">{title}</h1>
          {intro && <p className="mt-4 text-[17px] leading-[1.5] text-pkg-fg-2">{intro}</p>}
          {actions && <div className="pkg-form mt-6 grid grid-cols-2 gap-3 [&>*:first-child]:col-span-2">{actions}</div>}
          {tabs && <div className="mt-6">{tabs}</div>}
        </div>
      </PkgPanel>
      {/* Desktop */}
      <header className="mb-6 hidden md:block">
        {backLink && <div className="-ml-1 mb-1">{backLink}</div>}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[30px] font-light leading-tight tracking-[-0.03em] text-pkg-fg">{title}</h1>
            {intro && <p className="mt-1 max-w-2xl text-[15px] text-pkg-fg-3">{intro}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
        {tabs && <div className="mt-5 [&>div]:!my-0 [&>div]:!px-0 [&>div]:!py-1">{tabs}</div>}
      </header>
      {children}
    </div>
  );
}

/** One panel of an admin page: a stacked rounded panel on a phone, a dense white card on a desktop. */
export function AdminPanel({
  title,
  description,
  action,
  tone = "cream",
  last,
  className,
  children,
}: {
  title?: string;
  description?: string;
  /** A small control on the right of the heading (a link or a button). */
  action?: ReactNode;
  tone?: "cream" | "cream-2";
  /** The last panel leaves room for the bottom of the screen on a phone. */
  last?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section data-tone={tone} className={cn("admin-panel", last && "admin-panel-last", className)}>
      {(title || action) && (
        <div className="mb-5 flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 className="pkg-h3 !text-[26px] md:!text-[20px]">{title}</h2>}
            {description && <p className="mt-1 text-[14px] text-pkg-fg-3">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
