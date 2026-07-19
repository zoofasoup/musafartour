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
export function AgentPageHeader({ title, description, icon: Icon, action }: AgentPageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Icon className="h-5 w-5" />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground truncate">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
