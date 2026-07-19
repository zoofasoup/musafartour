import { Calendar, Clock, Plane, Bus } from "lucide-react";
import { cn, parseListItems, getTierAccentClasses } from "@/lib/utils";
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

function RouteLeg({
  label,
  from,
  to,
  accent,
}: {
  label: string;
  from: string;
  to: string;
  accent: ReturnType<typeof getTierAccentClasses>;
}) {
  return (
    <div className="flex-1 min-w-0">
      <p className={cn("text-[11px] font-bold uppercase tracking-wide mb-2", accent.text)}>{label}</p>
      <div className="flex items-center gap-2">
        <div className="shrink-0">
          <p className="text-lg font-black leading-none">{from}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{AIRPORT_CITY[from] || ""}</p>
        </div>
        <div className="flex-1 flex items-center px-1">
          <div className={cn("h-px flex-1", accent.ring)} />
          <div className={cn("mx-1.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full", accent.ring)}>
            <Plane className={cn("h-3.5 w-3.5 rotate-90", accent.text)} />
          </div>
          <div className={cn("h-px flex-1", accent.ring)} />
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-black leading-none">{to}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{AIRPORT_CITY[to] || ""}</p>
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
  const accent = getTierAccentClasses(packageData.package_name);

  return (
    <div className="flex flex-col space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
          {packageData.package_name}
        </h1>
        {hasTimeframe && <p className="text-sm font-medium text-muted-foreground">{packageData.timeframe}</p>}
      </div>

      {/* Trip basics - plain inline row, no boxes, just clear icon + value pairs */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 py-4 border-y border-border">
        <div className="flex items-center gap-2">
          <Calendar className={cn("h-4 w-4 shrink-0", accent.text)} />
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide leading-none mb-1">Keberangkatan</p>
            <p className="text-sm font-bold leading-none">{fmtDate(packageData.departure_date)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Clock className={cn("h-4 w-4 shrink-0", accent.text)} />
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide leading-none mb-1">Durasi</p>
            <p className="text-sm font-bold leading-none">{packageData.duration_days} Hari</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {airlineLogos[packageData.flight] ? (
            <img src={airlineLogos[packageData.flight]} alt={packageData.flight} className="h-6 object-contain" />
          ) : (
            <>
              <Plane className={cn("h-4 w-4 shrink-0", accent.text)} />
              <span className="text-sm font-bold">{packageData.flight}</span>
            </>
          )}
        </div>
      </div>

      {/* Price - the one number that matters most, given real visual weight and the package's own tier color */}
      <div className={cn("rounded-2xl border p-5", accent.bg, accent.border)}>
        <span className={cn("text-xs font-semibold uppercase tracking-wide", accent.text)}>Harga mulai dari (Quad)</span>
        <p className={cn("text-4xl md:text-5xl font-black tracking-tight mt-1", accent.text)}>
          {price?.quad ? fmtRupiah(price.quad) : "Harga belum tersedia"}
        </p>
        {(!!price?.triple || !!price?.double) && (
          <div className={cn("flex flex-wrap items-center gap-x-5 gap-y-1 mt-3 pt-3 border-t", accent.border)}>
            {!!price?.triple && (
              <span className="text-xs text-foreground/80">
                <span className="font-bold">Triple</span> · {fmtRupiah(price.triple)}
              </span>
            )}
            {!!price?.double && (
              <span className="text-xs text-foreground/80">
                <span className="font-bold">Double</span> · {fmtRupiah(price.double)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Route - a proper "boarding pass" moment, transport folded in as a footnote */}
      {arriveAt && departFrom && (
        <div className="rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Rute Penerbangan</p>
            {transport && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Bus className="h-3.5 w-3.5" /> {transport}
              </span>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-5 sm:gap-4">
            <RouteLeg label="Berangkat" from={packageData.start_airport!} to={arriveAt} accent={accent} />
            <RouteLeg label="Pulang" from={departFrom} to={packageData.start_airport!} accent={accent} />
          </div>
        </div>
      )}

      <PackageUrgencyBar packageData={packageData} />

      {hasItinerary && (
        <div className="flex flex-wrap gap-2">
          <ItineraryDialog packageName={packageData.package_name} itinerary={packageData.itinerary} />
        </div>
      )}
    </div>
  );
}
