import { Calendar, Clock, Plane, Bus } from "lucide-react";
import { parseListItems } from "@/lib/utils";
import { airlineLogos } from "@/lib/airlineLogos";
import { PackageUrgencyBar } from "@/components/package-detail/PackageUrgencyBar";
import { ItineraryDialog } from "@/components/package-detail/ItineraryDialog";
import type { PublishedPackage } from "@/hooks/usePackages";
import type { PackagePrice } from "@/lib/packageSchema";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

const AIRPORT_CITY: Record<string, string> = {
  CGK: "Jakarta",
  JED: "Jeddah",
  MED: "Madinah",
  SUB: "Surabaya",
  KNO: "Medan",
  DPS: "Denpasar",
};

const fmtDate = (d: string) => {
  try {
    return format(new Date(d), "d MMM yyyy", { locale: localeId });
  } catch {
    return d;
  }
};

const fmtRupiah = (n: number) => `Rp ${new Intl.NumberFormat("id-ID").format(n)}`;

function InfoChip({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/30 px-3 py-2.5">
      <Icon className="h-4 w-4 text-primary shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
        <p className="text-sm font-bold truncate">{value}</p>
      </div>
    </div>
  );
}

function RouteLeg({ label, from, to }: { label: string; from: string; to: string }) {
  return (
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5">{label}</p>
      <div className="flex items-center gap-2">
        <div className="text-center shrink-0">
          <p className="text-sm font-bold">{from}</p>
          <p className="text-[10px] text-muted-foreground">{AIRPORT_CITY[from] || ""}</p>
        </div>
        <div className="flex-1 flex items-center gap-1">
          <div className="h-1 w-1 rounded-full bg-primary shrink-0" />
          <div className="flex-1 border-t border-dashed border-primary/40" />
          <Plane className="h-3.5 w-3.5 text-primary rotate-90 shrink-0" />
          <div className="flex-1 border-t border-dashed border-primary/40" />
          <div className="h-1 w-1 rounded-full bg-primary shrink-0" />
        </div>
        <div className="text-center shrink-0">
          <p className="text-sm font-bold">{to}</p>
          <p className="text-[10px] text-muted-foreground">{AIRPORT_CITY[to] || ""}</p>
        </div>
      </div>
    </div>
  );
}

interface PackageHeaderProps {
  packageData: PublishedPackage;
  price: PackagePrice | null;
  transport?: string;
}

export function PackageHeader({ packageData, price, transport }: PackageHeaderProps) {
  const hasItinerary = parseListItems(packageData.itinerary).length > 0;
  const hasTimeframe = packageData.timeframe && packageData.timeframe !== "-";
  const hasRoute = packageData.route && packageData.route !== "-" && packageData.start_airport;
  const routeParts = hasRoute ? packageData.route!.split("-") : null;
  const [arriveAt, departFrom] = routeParts && routeParts.length === 2 ? routeParts : [null, null];

  return (
    <div className="flex flex-col space-y-5">
      <div className="space-y-1">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
          {packageData.package_name}
        </h1>
        {hasTimeframe && <p className="text-sm font-medium text-muted-foreground">{packageData.timeframe}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <InfoChip icon={Calendar} label="Keberangkatan" value={fmtDate(packageData.departure_date)} />
        <InfoChip icon={Clock} label="Durasi" value={`${packageData.duration_days} Hari`} />
      </div>

      <div className="flex items-center gap-2.5">
        <span className="text-[10px] font-bold text-muted-foreground uppercase">Maskapai</span>
        {airlineLogos[packageData.flight] ? (
          <img src={airlineLogos[packageData.flight]} alt={packageData.flight} className="h-6 object-contain" />
        ) : (
          <span className="text-sm font-bold">{packageData.flight}</span>
        )}
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium text-muted-foreground">Harga mulai dari (Quad)</span>
        <span className="block text-4xl font-black text-primary tracking-tight">
          {price?.quad ? fmtRupiah(price.quad) : "Harga belum tersedia"}
        </span>
        {(!!price?.triple || !!price?.double) && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            {!!price?.triple && (
              <div className="rounded-xl border border-border bg-muted/30 px-3 py-2">
                <p className="text-[10px] text-muted-foreground uppercase">Triple</p>
                <p className="text-sm font-bold">{fmtRupiah(price.triple)}</p>
              </div>
            )}
            {!!price?.double && (
              <div className="rounded-xl border border-border bg-muted/30 px-3 py-2">
                <p className="text-[10px] text-muted-foreground uppercase">Double</p>
                <p className="text-sm font-bold">{fmtRupiah(price.double)}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {arriveAt && departFrom && (
        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <p className="text-[10px] font-bold text-muted-foreground uppercase mb-3">Rute Penerbangan</p>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-3">
            <RouteLeg label="Berangkat" from={packageData.start_airport!} to={arriveAt} />
            <RouteLeg label="Pulang" from={departFrom} to={packageData.start_airport!} />
          </div>
        </div>
      )}

      {transport && <InfoChip icon={Bus} label="Transport" value={transport} />}

      <PackageUrgencyBar packageData={packageData} />

      {hasItinerary && (
        <div className="flex flex-wrap gap-2 pt-1">
          <ItineraryDialog packageName={packageData.package_name} itinerary={packageData.itinerary} />
        </div>
      )}
    </div>
  );
}
