import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Flame, Users, XCircle } from "lucide-react";
import { cn, isPackageUnavailable } from "@/lib/utils";
import type { PublishedPackage } from "@/hooks/usePackages";

interface PackageUrgencyBarProps {
  packageData: PublishedPackage;
}

/** Seat-availability / sold-out signal, promoted near the top of the page as the primary urgency cue. */
export function PackageUrgencyBar({ packageData }: PackageUrgencyBarProps) {
  if (isPackageUnavailable(packageData)) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
        <XCircle className="h-5 w-5 text-destructive shrink-0" />
        <div>
          <p className="text-sm font-bold text-destructive">Paket ini sudah penuh</p>
          <p className="text-xs text-muted-foreground">
            {packageData.waitlist_count
              ? `${packageData.waitlist_count} jamaah menunggu di waiting list`
              : "Klik \"Notify Me\" untuk dapat kabar jika ada seat tersedia"}
          </p>
        </div>
      </div>
    );
  }

  const total = packageData.slots_total;
  const filled = packageData.slots_filled || 0;
  if (!total) return null;

  const seatPercentage = Math.min(100, Math.round((filled / total) * 100));
  const remaining = Math.max(0, total - filled);
  const isAlmostFull = seatPercentage >= 80;

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3",
        isAlmostFull ? "border-amber-400/40 bg-amber-500/5" : "border-border bg-muted/20"
      )}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          {isAlmostFull ? (
            <Flame className="h-4 w-4 text-amber-500" />
          ) : (
            <Users className="h-4 w-4 text-primary" />
          )}
          <span className="text-sm font-semibold">
            {isAlmostFull ? `Tersisa ${remaining} seat!` : `${remaining} seat tersisa`}
          </span>
        </div>
        <Badge variant="outline" className="text-xs font-mono">
          {filled}/{total}
        </Badge>
      </div>
      <Progress value={seatPercentage} className="h-2" />
    </div>
  );
}
