import { useMemo } from "react";
import { PackageCard } from "@/components/PackageCard";
import { PkgListCard } from "@/components/package-list/PkgListCard";
import { usePublishedPackages } from "@/hooks/usePackages";
import { getTierPrice, formatPriceJuta, isPackageUnavailable, getSlotsTaken } from "@/lib/utils";
import { resolveTierHotels } from "@/lib/roomCombos";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface RelatedPackagesProps {
  currentPackageId: string;
  currentTier: string;
  headingClassName?: string;
  /** pkg-v2 look: flat cards, no box. */
  flat?: boolean;
}

/** Cross-sell: other published packages on the same primary tier, nearest upcoming departure first. */
export function RelatedPackages({ currentPackageId, currentTier, headingClassName = "text-xl font-bold mb-4 text-foreground", flat = false }: RelatedPackagesProps) {
  const { data: packages = [] } = usePublishedPackages();

  const related = useMemo(() => {
    const today = new Date();
    return packages
      .filter((p) => p.id !== currentPackageId)
      .filter((p) => (p.available_tiers?.[0] || "nyaman") === currentTier)
      .filter((p) => new Date(p.departure_date) >= today)
      // Only recommend packages someone can actually book - a sold-out card
      // wastes one of the few cross-sell slots on something unbuyable.
      .filter((p) => !isPackageUnavailable(p))
      .sort((a, b) => new Date(a.departure_date).getTime() - new Date(b.departure_date).getTime())
      .slice(0, 4);
  }, [packages, currentPackageId, currentTier]);

  if (related.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className={headingClassName}>Paket lainnya</h2>
      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory -mx-6 scroll-px-6 px-6 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {related.map((pkg, idx) => {
          const tier = pkg.available_tiers?.[0] || "nyaman";
          const tierHotels = resolveTierHotels(pkg, tier);
          if (flat) {
            return (
              <PkgListCard
                key={pkg.id}
                id={pkg.id}
                slug={pkg.slug || undefined}
                image={pkg.banner_image || "/placeholder.svg"}
                title={pkg.package_name}
                price={formatPriceJuta(getTierPrice(pkg).quad)}
                priceValue={getTierPrice(pkg).quad}
                date={format(new Date(pkg.departure_date), "d MMMM yyyy", { locale: localeId })}
                dateShort={format(new Date(pkg.departure_date), "d MMM yyyy", { locale: localeId })}
                duration={`${pkg.duration_days} Hari`}
                airline={pkg.flight}
                hotelMakkah={tierHotels.makkah.name || undefined}
                hotelMakkahRating={tierHotels.makkah.star || undefined}
                hotelMadinah={tierHotels.madinah.name || undefined}
                hotelMadinahRating={tierHotels.madinah.star || undefined}
                slotsTotal={pkg.slots_total}
                slotsFilled={getSlotsTaken(pkg)}
                index={idx + 4}
                className="w-[280px] shrink-0 snap-start"
              />
            );
          }
          return (
            <PackageCard
              key={pkg.id}
              id={pkg.id}
              slug={pkg.slug || undefined}
              image={pkg.banner_image || "/placeholder.svg"}
              title={pkg.package_name}
              price={formatPriceJuta(getTierPrice(pkg).quad)}
              date={format(new Date(pkg.departure_date), "d MMMM yyyy", { locale: localeId })}
              duration={`${pkg.duration_days} Hari`}
              airline={pkg.flight}
              transit={pkg.flight_type?.toLowerCase() === "direct" ? "Direct" : "Transit"}
              hotelMakkah={tierHotels.makkah.name || undefined}
              hotelMakkahRating={tierHotels.makkah.star || undefined}
              hotelMadinah={tierHotels.madinah.name || undefined}
              hotelMadinahRating={tierHotels.madinah.star || undefined}
              category={tier}
              seatAvailable={!isPackageUnavailable(pkg)}
              isSoldOut={isPackageUnavailable(pkg)}
              waitlistCount={pkg.waitlist_count || 0}
              slotsTotal={pkg.slots_total}
              slotsFilled={getSlotsTaken(pkg)}
              index={idx}
              className="w-[280px] shrink-0 snap-start"
            />
          );
        })}
      </div>
    </section>
  );
}
