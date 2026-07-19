import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Plane, ExternalLink } from "lucide-react";
import { cn, getPriceBadgeStyle, formatPriceJuta, parseListItems } from "@/lib/utils";
import { airlineLogos } from "@/lib/airlineLogos";
import { PackageUrgencyBar } from "@/components/package-detail/PackageUrgencyBar";
import { ItineraryDialog } from "@/components/package-detail/ItineraryDialog";
import type { PublishedPackage } from "@/hooks/usePackages";
import type { PackagePrice } from "@/lib/packageSchema";

interface PackageHeaderProps {
  packageData: PublishedPackage;
  price: PackagePrice | null;
}

export function PackageHeader({ packageData, price }: PackageHeaderProps) {
  const hasItinerary = parseListItems(packageData.itinerary).length > 0;

  return (
    <div className="flex flex-col space-y-4">
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
        {packageData.package_name}
      </h1>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-muted-foreground">Harga mulai dari</span>
        <div className="flex items-center gap-3">
          <span className="text-4xl font-black text-primary tracking-tight">
            {price?.quad ? `Rp ${new Intl.NumberFormat("id-ID").format(price.quad)}` : "Harga belum tersedia"}
          </span>
          <span
            className={cn(
              "px-3 py-1 rounded-full text-xs font-semibold shrink-0",
              getPriceBadgeStyle(packageData.package_name)
            )}
          >
            {price?.quad ? formatPriceJuta(price.quad) : ""}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-sm py-1">
          <Clock className="h-4 w-4 mr-1.5" /> {packageData.duration_days} Hari
        </Badge>
        <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-sm py-1 gap-1.5">
          {airlineLogos[packageData.flight] ? (
            <img src={airlineLogos[packageData.flight]} alt={packageData.flight} className="h-4 object-contain" />
          ) : (
            <Plane className="h-4 w-4" />
          )}
          {packageData.flight}
        </Badge>
      </div>

      <PackageUrgencyBar packageData={packageData} />

      {(packageData.catalog_link || hasItinerary) && (
        <div className="flex flex-wrap gap-2 pt-1">
          {packageData.catalog_link && (
            <a href={packageData.catalog_link} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="gap-2 text-sm">
                <ExternalLink className="h-4 w-4" /> Lihat Katalog
              </Button>
            </a>
          )}
          {hasItinerary && (
            <ItineraryDialog packageName={packageData.package_name} itinerary={packageData.itinerary} />
          )}
        </div>
      )}
    </div>
  );
}
