import { Card, CardContent } from "@/components/ui/card";
import { Calendar, PlaneTakeoff, Route, Timer, Bus } from "lucide-react";
import type { PublishedPackage } from "@/hooks/usePackages";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

const fmtDate = (d: string) => {
  try {
    return format(new Date(d), "d MMM yyyy", { locale: localeId });
  } catch {
    return d;
  }
};

interface PackageMetricsProps {
  packageData: PublishedPackage;
  transport?: string;
}

export function PackageMetrics({ packageData, transport }: PackageMetricsProps) {
  return (
    <Card className="border shadow-sm">
      <CardContent className="p-5">
        <h3 className="text-sm font-bold mb-4 text-muted-foreground uppercase tracking-wider">
          Info Keberangkatan
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Berangkat</p>
              <p className="text-sm font-bold">{fmtDate(packageData.departure_date)}</p>
            </div>
          </div>
          {packageData.start_airport && (
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <PlaneTakeoff className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Bandara</p>
                <p className="text-sm font-bold">{packageData.start_airport}</p>
              </div>
            </div>
          )}
          {packageData.route && packageData.route !== "-" && (
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Route className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Rute</p>
                <p className="text-sm font-bold">{packageData.route}</p>
              </div>
            </div>
          )}
          {packageData.timeframe && packageData.timeframe !== "-" && (
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Timer className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Timeframe</p>
                <p className="text-sm font-bold">{packageData.timeframe}</p>
              </div>
            </div>
          )}
        </div>

        {/* Transport */}
        {transport && (
          <div className="flex items-start gap-3 mt-4 pt-4 border-t">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Bus className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Transport</p>
              <p className="text-sm font-bold">{transport}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
