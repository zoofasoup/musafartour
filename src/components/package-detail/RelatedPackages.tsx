import { useMemo } from "react";
import { PackageCard } from "@/components/PackageCard";
import { usePublishedPackages } from "@/hooks/usePackages";
import { getTierPrice, formatPriceJuta, isPackageUnavailable } from "@/lib/utils";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface RelatedPackagesProps {
  currentPackageId: string;
  currentTier: string;
}

/** Cross-sell: other published packages on the same primary tier, nearest upcoming departure first. */
export function RelatedPackages({ currentPackageId, currentTier }: RelatedPackagesProps) {
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
      <h2 className="text-xl font-bold mb-4 text-foreground">Paket Umroh Lainnya</h2>
      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory -mx-6 px-6 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible sm:mx-0 sm:px-0 sm:pb-0">
        {related.map((pkg, idx) => (
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
            category={pkg.available_tiers?.[0] || "nyaman"}
            seatAvailable={!isPackageUnavailable(pkg)}
            isSoldOut={isPackageUnavailable(pkg)}
            waitlistCount={pkg.waitlist_count || 0}
            index={idx}
            className="w-[78%] shrink-0 snap-start sm:w-auto sm:shrink"
          />
        ))}
      </div>
    </section>
  );
}
