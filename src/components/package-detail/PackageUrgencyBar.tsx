import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Flame, Users, XCircle } from "lucide-react";
import { isPackageUnavailable } from "@/lib/utils";
import type { PublishedPackage } from "@/hooks/usePackages";

interface PackageUrgencyBarProps {
  packageData: PublishedPackage;
}

/** Seat-availability / sold-out signal, promoted near the top of the page as the primary urgency cue. */
export function PackageUrgencyBar({ packageData }: PackageUrgencyBarProps) {
  if (isPackageUnavailable(packageData)) {
    return (
      <div className="flex items-center gap-2 text-destructive">
        <XCircle className="h-4 w-4 shrink-0" />
        <span className="text-sm font-bold">Paket ini sudah penuh</span>
        <span className="text-xs text-muted-foreground">
          {packageData.waitlist_count
            ? `• ${packageData.waitlist_count} jamaah menunggu di waiting list`
            : "• Klik \"Notify Me\" untuk dapat kabar jika ada seat tersedia"}
        </span>
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
    <div className="flex items-center gap-3">
      {isAlmostFull ? (
        <Flame className="h-4 w-4 text-amber-500 shrink-0" />
      ) : (
        <Users className="h-4 w-4 text-primary shrink-0" />
      )}
      <span className="text-sm font-semibold shrink-0">
        {isAlmostFull ? `Tersisa ${remaining} seat!` : `${remaining} seat tersisa`}
      </span>
      <Progress value={seatPercentage} className="h-1.5 flex-1 max-w-[160px]" />
      <Badge variant="outline" className="text-xs font-mono shrink-0">
        {filled}/{total}
      </Badge>
    </div>
  );
}
