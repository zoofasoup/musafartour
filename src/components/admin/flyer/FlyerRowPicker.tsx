import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { formatDepartureDate, getSeatLabel, type FlyerPackage } from "@/lib/flyer/flyerData";

interface FlyerRowPickerProps {
  packages: FlyerPackage[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}

export function FlyerRowPicker({ packages, selectedIds, onToggle }: FlyerRowPickerProps) {
  if (packages.length === 0) {
    return <div className="text-sm text-muted-foreground py-4">Belum ada paket published dengan keberangkatan mendatang.</div>;
  }

  return (
    <div className="space-y-1 max-h-[600px] overflow-y-auto pr-2">
      {packages.map((pkg) => {
        const seatLabel = getSeatLabel(pkg);
        return (
          <label
            key={pkg.id}
            className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
          >
            <Checkbox
              checked={selectedIds.has(pkg.id)}
              onCheckedChange={() => onToggle(pkg.id)}
              className="mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <Label className="cursor-pointer text-sm font-medium leading-tight">
                {pkg.package_name}
              </Label>
              <div className="text-xs text-muted-foreground">
                {formatDepartureDate(pkg.departure_date)} · {seatLabel === "Sold Out!" ? "Sold Out" : `${seatLabel} seat`}
              </div>
            </div>
          </label>
        );
      })}
    </div>
  );
}
