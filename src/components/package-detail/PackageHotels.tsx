import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Footprints, Hotel, Star } from "lucide-react";
import type { PublishedPackage } from "@/hooks/usePackages";
import type { PackageHotels as PackageHotelsType } from "@/lib/packageSchema";

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex gap-0.5">
    {[...Array(rating)].map((_, i) => (
      <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
    ))}
  </div>
);

interface PackageHotelsProps {
  packageData: PublishedPackage;
  hotels: PackageHotelsType | null;
}

export function PackageHotels({ packageData, hotels }: PackageHotelsProps) {
  if (!hotels || (!hotels.makkah.name && !hotels.madinah.name)) return null;

  return (
    <Card className="border shadow-sm">
      <CardContent className="p-5">
        <h3 className="text-sm font-bold text-muted-foreground uppercase mb-4">
          Akomodasi
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hotels.makkah.name && (
            <div className="p-4 rounded-xl bg-muted/30 border space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold uppercase text-muted-foreground">
                    Makkah
                  </span>
                  {packageData.nights_makkah && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {packageData.nights_makkah} Malam
                    </Badge>
                  )}
                </div>
                {hotels.makkah.star && <StarRating rating={hotels.makkah.star} />}
              </div>
              <p className="font-semibold text-sm">{hotels.makkah.name}</p>
              {(hotels.makkah.distance || hotels.makkah.walk) && (
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {hotels.makkah.distance && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {hotels.makkah.distance}
                    </span>
                  )}
                  {hotels.makkah.walk && (
                    <span className="inline-flex items-center gap-1">
                      <Footprints className="h-3 w-3" /> {hotels.makkah.walk}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {hotels.madinah.name && (
            <div className="p-4 rounded-xl bg-muted/30 border space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold uppercase text-muted-foreground">
                    Madinah
                  </span>
                  {packageData.nights_madinah && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {packageData.nights_madinah} Malam
                    </Badge>
                  )}
                </div>
                {hotels.madinah.star && <StarRating rating={hotels.madinah.star} />}
              </div>
              <p className="font-semibold text-sm">{hotels.madinah.name}</p>
              {(hotels.madinah.distance || hotels.madinah.walk) && (
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {hotels.madinah.distance && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {hotels.madinah.distance}
                    </span>
                  )}
                  {hotels.madinah.walk && (
                    <span className="inline-flex items-center gap-1">
                      <Footprints className="h-3 w-3" /> {hotels.madinah.walk}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {packageData.hotel_extra && packageData.hotel_extra !== "-" && packageData.nights_extra && (
            <div className="p-4 rounded-xl bg-muted/30 border space-y-2">
              <div className="flex items-center gap-2">
                <Hotel className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold uppercase text-muted-foreground">
                  Transit / Ekstra
                </span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {packageData.nights_extra} Malam
                </Badge>
              </div>
              <p className="font-semibold text-sm">{packageData.hotel_extra}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
