import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface AgentPageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
}

/**
 * Every agent page previously hand-rolled its own header - a bare <h1>
 * with no container on some pages, a full gradient Card on others, mixed
 * type sizes. One shared header so every page reads as part of the same
 * tool.
 */
export function AgentPageHeader({ title, description, action }: AgentPageHeaderProps) {
  // The page title is large and light (the page's own heading, the header bar only carries the logo on a phone).
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-balance text-[36px] font-light leading-[1.05] tracking-[-0.035em] text-foreground md:text-[40px]">{title}</h1>
        {description && <p className="mt-3 text-[16px] leading-[1.5] text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
