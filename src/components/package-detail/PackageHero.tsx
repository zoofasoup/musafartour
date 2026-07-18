import { Badge } from "@/components/ui/badge";
import { Clock, Plane } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PublishedPackage } from "@/hooks/usePackages";
import type { PackagePrice } from "@/lib/packageSchema";

interface PackageHeroProps {
  packageData: PublishedPackage;
  price: PackagePrice | null;
  children?: React.ReactNode;
}

export function PackageHero({ packageData, price, children }: PackageHeroProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Flyer Image */}
      {packageData.banner_image && (
        <div className="lg:col-span-5 relative rounded-2xl overflow-hidden shadow-lg bg-card border self-start">
          <img
            src={packageData.banner_image}
            alt={packageData.package_name}
            className="w-full h-auto object-cover max-h-[700px]"
            loading="eager"
            fetchPriority="high"
          />
          {packageData.is_sold_out && (
            <div className="absolute top-4 right-4 z-10">
              <Badge className="bg-destructive text-destructive-foreground border-0 shadow text-sm px-3 py-1">
                SOLD OUT
              </Badge>
            </div>
          )}
        </div>
      )}

      {/* Product Details (Right Column) */}
      <div className={cn("flex flex-col space-y-6", packageData.banner_image ? "lg:col-span-7" : "lg:col-span-12")}>
        {/* 1. Title & Price Block */}
        <div className="space-y-4">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
            {packageData.package_name}
          </h1>
          
          <div className="flex flex-col">
            <span className="text-sm font-medium text-muted-foreground mb-1">Harga mulai dari</span>
            <span className="text-4xl font-black text-primary tracking-tight">
              {price?.quad ? `Rp ${new Intl.NumberFormat("id-ID").format(price.quad)}` : 'Harga belum tersedia'}
            </span>
          </div>

          {/* Quick Info Badges */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-sm py-1">
              <Clock className="h-4 w-4 mr-1.5" /> {packageData.duration_days} Hari
            </Badge>
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-sm py-1">
              <Plane className="h-4 w-4 mr-1.5" /> {packageData.flight}
            </Badge>
            {packageData.makkah_hotel_star && (
              <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-sm py-1">
                Hotel ⭐️ {packageData.makkah_hotel_star}
              </Badge>
            )}
          </div>
        </div>

        {/* Children (e.g. Metrics, Hotels, Pricing) injected here */}
        {children}
      </div>
    </div>
  );
}
