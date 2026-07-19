import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface AgentStatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  helper?: ReactNode;
  className?: string;
}

/**
 * The one stat-tile pattern for the whole agent portal. Previously every
 * page (Dashboard, Commission overview, Commission monthly, Profile) had
 * its own hand-copied version with a different number size (4xl/2xl/xl)
 * and a different icon placement - this is the single shared shape.
 */
export function AgentStatCard({ icon: Icon, label, value, helper, className }: AgentStatCardProps) {
  return (
    <Card className={cn("hover:shadow-lg transition-shadow", className)}>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="truncate">{label}</span>
        </div>
        <p className="text-3xl font-bold text-foreground mt-2">{value}</p>
        {helper && <div className="text-sm mt-1">{helper}</div>}
      </CardContent>
    </Card>
  );
}
