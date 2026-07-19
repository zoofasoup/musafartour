import { Calendar, Clock, Plane, Bus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn, parseListItems, getTierAccentClasses } from "@/lib/utils";
import { airlineLogos } from "@/lib/airlineLogos";
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
  MCT: "Muscat",
  DOH: "Doha",
  DXB: "Dubai",
  AUH: "Abu Dhabi",
  SIN: "Singapura",
  KUL: "Kuala Lumpur",
};

/**
 * Typical layover hub per airline on Indonesia-Saudi umrah routes, used only
 * when the package isn't a direct flight. Saudia and Garuda Indonesia fly
 * CGK-JED direct so they intentionally have no entry - we only show a transit
 * airport when we're confident which one it actually is.
 */
const AIRLINE_TRANSIT_HUB: Record<string, string> = {
  "Oman Air": "MCT",
  "Qatar Airways": "DOH",
  "Emirates": "DXB",
  "Etihad Airways": "AUH",
  "Scoot": "SIN",
  "Lion Air": "KUL",
};

const fmtDate = (d: string) => {
  try {
    return format(new Date(d), "d MMM yyyy", { locale: localeId });
  } catch {
    return d;
  }
};

const fmtRupiah = (n: number) => `Rp ${new Intl.NumberFormat("id-ID").format(n)}`;

function InfoItem({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide leading-none mb-1">{label}</p>
        <div className="text-sm font-bold leading-none">{children}</div>
      </div>
    </div>
  );
}

function Connector({ accent }: { accent: ReturnType<typeof getTierAccentClasses> }) {
  return (
    <div className="flex-1 flex items-center px-1">
      <div className={cn("h-px flex-1", accent.ring)} />
      <div className={cn("mx-1.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full", accent.ring)}>
        <Plane className={cn("h-3.5 w-3.5 rotate-90", accent.text)} />
      </div>
      <div className={cn("h-px flex-1", accent.ring)} />
    </div>
  );
}

function RouteLeg({
  label,
  from,
  to,
  via,
  accent,
}: {
  label: string;
  from: string;
  to: string;
  via?: string;
  accent: ReturnType<typeof getTierAccentClasses>;
}) {
  return (
    <div className="flex-1 min-w-0">
      <p className={cn("text-[11px] font-bold uppercase tracking-wide mb-2", accent.text)}>{label}</p>
      <div className="flex items-center gap-1">
        <div className="shrink-0">
          <p className="text-lg font-black leading-none">{from}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{AIRPORT_CITY[from] || ""}</p>
        </div>
        <Connector accent={accent} />
        {via && (
          <>
            <div className="shrink-0 text-center opacity-80">
              <p className="text-sm font-bold leading-none">{via}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{AIRPORT_CITY[via] || ""}</p>
            </div>
            <Connector accent={accent} />
          </>
        )}
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
  const isDirect = packageData.flight_type?.toLowerCase() === "direct";
  const transitAirport = isDirect ? undefined : AIRLINE_TRANSIT_HUB[packageData.flight];

  return (
    <div className="flex flex-col space-y-4">
      <div className="space-y-1">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
          {packageData.package_name}
        </h1>
        {hasTimeframe && <p className="text-sm font-medium text-muted-foreground">{packageData.timeframe}</p>}
      </div>

      {/* One consolidated card for everything about the trip itself - quick
          facts, price, route - sharing one border/radius/shadow instead of
          each being its own competing floating box. */}
      <Card className="p-0 overflow-hidden divide-y divide-border/60">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
          <InfoItem icon={<Calendar className={cn("h-4 w-4 shrink-0", accent.text)} />} label="Keberangkatan">
            {fmtDate(packageData.departure_date)}
          </InfoItem>
          <InfoItem icon={<Clock className={cn("h-4 w-4 shrink-0", accent.text)} />} label="Durasi">
            {packageData.duration_days} Hari
          </InfoItem>
          <InfoItem
            icon={
              airlineLogos[packageData.flight] ? null : <Plane className={cn("h-4 w-4 shrink-0", accent.text)} />
            }
            label="Maskapai"
          >
            {airlineLogos[packageData.flight] ? (
              <img src={airlineLogos[packageData.flight]} alt={packageData.flight} className="h-5 object-contain" />
            ) : (
              packageData.flight
            )}
          </InfoItem>
          {transport && (
            <InfoItem icon={<Bus className={cn("h-4 w-4 shrink-0", accent.text)} />} label="Transportasi">
              {transport}
            </InfoItem>
          )}
        </div>

        {/* Price - the one number that matters most, given real visual weight and the package's own tier color */}
        <div className={cn("px-5 py-5", accent.bg)}>
          <span className={cn("text-xs font-semibold uppercase tracking-wide", accent.text)}>Harga mulai dari (Quad)</span>
          <p className={cn("text-4xl md:text-5xl font-black tracking-tight mt-1", accent.text)}>
            {price?.quad ? (
              <>
                {fmtRupiah(price.quad)}
                <span className="text-base md:text-lg font-bold ml-1.5 opacity-70">/orang</span>
              </>
            ) : (
              "Harga belum tersedia"
            )}
          </p>
          {(!!price?.triple || !!price?.double) && (
            <div className={cn("flex flex-wrap items-center gap-x-5 gap-y-1 mt-3 pt-3 border-t", accent.border)}>
              {!!price?.triple && (
                <span className="text-xs text-foreground/80">
                  <span className="font-bold">Triple</span> · {fmtRupiah(price.triple)}/orang
                </span>
              )}
              {!!price?.double && (
                <span className="text-xs text-foreground/80">
                  <span className="font-bold">Double</span> · {fmtRupiah(price.double)}/orang
                </span>
              )}
            </div>
          )}
        </div>

        {/* Route - a proper "boarding pass" moment */}
        {arriveAt && departFrom && (
          <div className="px-5 py-5">
            <p className="text-sm font-bold text-muted-foreground uppercase mb-4">Rute Penerbangan</p>
            <div className="flex flex-col sm:flex-row gap-5 sm:gap-4">
              <RouteLeg label="Berangkat" from={packageData.start_airport!} to={arriveAt} via={transitAirport} accent={accent} />
              <RouteLeg label="Pulang" from={departFrom} to={packageData.start_airport!} via={transitAirport} accent={accent} />
            </div>
          </div>
        )}
      </Card>

      {hasItinerary && <ItineraryDialog packageName={packageData.package_name} itinerary={packageData.itinerary} accent={accent} />}
    </div>
  );
}
