import type { LucideIcon } from "lucide-react";
import { AlertTriangle, ArrowUpCircle, CheckCircle2, CircleDashed, Clock, Info, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatusKind = "ok" | "info" | "warn" | "over" | "bad" | "mute";

const ICON: Record<StatusKind, LucideIcon> = {
  ok: CheckCircle2,
  info: CircleDashed,
  warn: Clock,
  over: ArrowUpCircle,
  bad: XCircle,
  mute: Clock,
};

/**
 * One status pill for the whole site (DESIGN.md): pastel, an icon and the word, never colour alone.
 * Payment states map as Belum DP = warn, Sudah DP = info, Lunas = ok, Lebih bayar = over, Batal = bad.
 */
export function StatusBadge({ kind, children, icon, className }: { kind: StatusKind; children: React.ReactNode; icon?: LucideIcon; className?: string }) {
  const Icon = icon ?? (kind === "warn" ? AlertTriangle : ICON[kind]);
  const Shown = kind === "info" && !icon ? Info : Icon;
  return (
    <Badge variant={kind} className={cn("h-6 gap-1.5 whitespace-nowrap px-2 text-[12.5px] font-semibold", className)}>
      <Shown className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {children}
    </Badge>
  );
}
