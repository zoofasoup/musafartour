import { cn } from "@/lib/utils";

export const TIER_LABELS: Record<string, string> = {
  nyaman: "Best Seller",
  "five-star": "Five Star",
  hemat: "Hemat",
  "pelataran-hemat": "Pelataran",
};

interface TierSelectorProps {
  availableTiers: string[];
  effectiveTier: string;
  packageName: string;
  onSelectTier: (tier: string) => void;
}

export function TierSelector({
  availableTiers,
  effectiveTier,
  packageName,
  onSelectTier,
}: TierSelectorProps) {
  if (availableTiers.length <= 1) return null;

  return (
    <div className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-20">
      <div className="container mx-auto px-6 md:px-8 py-2 flex items-center justify-between">
        <h1 className="text-sm font-bold truncate max-w-xs lg:max-w-md">{packageName}</h1>
        <div className="flex gap-1.5">
          {availableTiers.map((t) => (
            <button
              key={t}
              onClick={() => onSelectTier(t)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                effectiveTier === t
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {TIER_LABELS[t] || t}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
