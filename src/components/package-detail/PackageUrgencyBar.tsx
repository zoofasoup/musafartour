import { Progress } from "@/components/ui/progress";
import { ShoppingCart, XCircle } from "lucide-react";
import { cn, isPackageUnavailable } from "@/lib/utils";
import type { PublishedPackage } from "@/hooks/usePackages";

interface PackageUrgencyBarProps {
  packageData: PublishedPackage;
  className?: string;
}

/**
 * Compact seat-availability chip - meant to sit right next to the buy action
 * (sticky mobile bar, desktop calculator) rather than floating alone in the
 * middle of the page, so urgency and the CTA are seen together.
 */
export function PackageUrgencyBar({ packageData, className }: PackageUrgencyBarProps) {
  if (isPackageUnavailable(packageData)) {
    return (
      <div className={cn("flex items-center gap-1.5 text-destructive", className)}>
        <XCircle className="h-3.5 w-3.5 shrink-0" />
        <span className="text-xs font-bold">Paket ini sudah penuh</span>
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
    <div className={cn("flex items-center gap-2", className)}>
      <ShoppingCart className={cn("h-3.5 w-3.5 shrink-0", isAlmostFull ? "text-amber-500" : "text-primary")} />
      <span className="text-xs font-bold shrink-0">
        {isAlmostFull ? `Tersisa ${remaining} seat!` : `${remaining} seat tersisa`}
      </span>
      <Progress value={seatPercentage} className="h-1 flex-1 max-w-[80px]" />
    </div>
  );
}
