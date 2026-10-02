import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Nothing here yet: a small icon, one clear sentence, and at most one action. */
export function EmptyState({ icon: Icon, title, children, action, className }: { icon?: LucideIcon; title: string; children?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-3 rounded-lg border border-dashed border-input px-4 py-8 text-center", className)}>
      {Icon && <Icon className="h-6 w-6 text-muted-foreground" aria-hidden />}
      <p className="font-semibold text-foreground">{title}</p>
      {children && <p className="max-w-sm text-sm text-muted-foreground">{children}</p>}
      {action}
    </div>
  );
}
