import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { FileText, Search, Share2, SlidersHorizontal, UserPlus } from "lucide-react";
import { useAgentAuth } from "@/hooks/useAgentAuth";
import { usePublishedPackages } from "@/hooks/usePackages";
import { AgentEmpty, AgentPage, AgentPanel, agentGlass } from "@/components/agent/AgentPage";
import { MyCommission } from "@/components/agent/MyCommission";
import { PkgListCard } from "@/components/package-list/PkgListCard";
import { PkgCardSkeleton } from "@/components/package-list/PkgSkeletons";
import { PackageFilterSheet } from "@/components/package-list/PackageFilterSheet";
import { usePackageFilters } from "@/components/package-list/usePackageFilters";
import PackageShareModal from "@/components/package-detail/PackageShareModal";
import { LoadError } from "@/components/admin/jamaah/LoadError";
import { formatPriceJuta, getSlotsTaken, getTierPrice, isPackageUnavailable, cn } from "@/lib/utils";
import { resolveTierHotels } from "@/lib/roomCombos";
import type { PublishedPackage } from "@/hooks/usePackages";

/**
 * The agent's package list: the same list, filters and order as the public Paket Umroh page (same hook, same card, same
 * filter sheet), with the agent's own actions under each card: share with their Agent ID, register a jamaah, the catalog.
 */
const AgentPackages = () => {
  const { agent } = useAgentAuth();
  const navigate = useNavigate();
  const { data: packages = [], isLoading, error, refetch, isFetching } = usePublishedPackages();
  const { category, setCategory, filterConfigs, categoryChips, sortedPackages, isFiltered, activeFilterCount, resetFilters } = usePackageFilters(packages);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sharePackage, setSharePackage] = useState<PublishedPackage | null>(null);

  if (error) {
    return (
      <AgentPage title="Paket umroh">
        <AgentPanel last><LoadError what="Daftar paket" error={error} onRetry={() => refetch()} retrying={isFetching} /></AgentPanel>
      </AgentPage>
    );
  }

  return (
    <>
    <AgentPage
      title="Paket umroh"
      hero={
        <>
          <div className="-mx-6 -mb-4 mt-7 flex gap-2 overflow-x-auto px-6 py-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              className="pkg-press pkg-glass-deep pkg-label inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-cream"
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden /> Filter
              {activeFilterCount > 0 && <span className="pkg-glass-red inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs">{activeFilterCount}</span>}
            </button>
            {categoryChips.map((c) => (
              <button
                key={c.value}
                type="button"
                aria-pressed={category === c.value}
                onClick={() => setCategory(c.value)}
                className={cn(
                  "pkg-press pkg-label h-11 shrink-0 rounded-full px-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-cream",
                  category === c.value ? "pkg-glass-red !text-pkg-on-red" : "pkg-glass"
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </>
      }
    >
      <AgentPanel last>
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{[...Array(4)].map((_, i) => <PkgCardSkeleton key={i} />)}</div>
        ) : sortedPackages.length === 0 ? (
          <AgentEmpty icon={Search} text="Tidak ada paket" action={isFiltered ? <button type="button" className={agentGlass} onClick={resetFilters}>Reset filter</button> : undefined} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-8">
            {sortedPackages.map((pkg, idx) => {
              const primaryTier = pkg.available_tiers?.[0] || "nyaman";
              const hotels = resolveTierHotels(pkg, primaryTier);
              const unavailable = isPackageUnavailable(pkg);
              const price = getTierPrice(pkg).quad;
              const date = new Date(`${pkg.departure_date.slice(0, 10)}T00:00:00`);
              return (
                <PkgListCard
                  key={pkg.id}
                  id={pkg.id}
                  slug={pkg.slug ?? undefined}
                  hrefOverride={`/agent/packages/${pkg.id}`}
                  hideCart
                  image={pkg.banner_image || "/placeholder.svg"}
                  title={pkg.package_name}
                  price={formatPriceJuta(price)}
                  priceValue={price}
                  date={format(date, "d MMMM yyyy", { locale: localeId })}
                  dateShort={format(date, "d MMM yyyy", { locale: localeId })}
                  duration={`${pkg.duration_days} Hari`}
                  airline={pkg.flight}
                  hotelMakkah={hotels.makkah.name || undefined}
                  hotelMakkahRating={hotels.makkah.star || undefined}
                  hotelMadinah={hotels.madinah.name || undefined}
                  hotelMadinahRating={hotels.madinah.star || undefined}
                  isSoldOut={unavailable}
                  waitlistCount={pkg.waitlist_count || 0}
                  slotsTotal={pkg.slots_total}
                  slotsFilled={getSlotsTaken(pkg)}
                  index={idx}
                  footer={
                    <div>
                      <MyCommission packageId={pkg.id} variant="compact" />
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSharePackage(pkg)}
                          className="pkg-press pkg-glass-red pkg-label inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink focus-visible:ring-offset-2"
                        >
                          <Share2 className="h-5 w-5" aria-hidden /> Bagikan
                        </button>
                        <button type="button" onClick={() => navigate(`/agent/daftar-jamaah?paket=${pkg.id}`)} className={agentGlass}>
                          <UserPlus className="h-5 w-5" aria-hidden /> Daftarkan
                        </button>
                        {pkg.catalog_link && (
                          <a href={pkg.catalog_link} target="_blank" rel="noopener noreferrer" aria-label="Katalog PDF" className="pkg-press pkg-glass grid h-12 w-12 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pkg-ink focus-visible:ring-offset-2">
                            <FileText className="h-5 w-5" aria-hidden />
                          </a>
                        )}
                      </div>
                    </div>
                  }
                />
              );
            })}
          </div>
        )}
      </AgentPanel>
    </AgentPage>

    <PackageFilterSheet open={filterOpen} onOpenChange={setFilterOpen} filterConfigs={filterConfigs} isFiltered={isFiltered} onReset={resetFilters} count={sortedPackages.length} />

    {sharePackage && (
      <PackageShareModal
        open={!!sharePackage}
        onOpenChange={(open) => !open && setSharePackage(null)}
        package={{
          id: sharePackage.id,
          slug: sharePackage.slug,
          package_name: sharePackage.package_name,
          departure_date: sharePackage.departure_date,
          duration_days: sharePackage.duration_days,
          flight: sharePackage.flight,
          flight_type: sharePackage.flight_type || "Direct",
          madinah_hotel_name: sharePackage.madinah_hotel_name ?? null,
          madinah_hotel_star: sharePackage.madinah_hotel_star,
          makkah_hotel_name: sharePackage.makkah_hotel_name ?? null,
          makkah_hotel_star: sharePackage.makkah_hotel_star,
          package_price: sharePackage.package_price as { quad: number; double: number; triple: number },
          hemat_package_price: sharePackage.hemat_package_price,
          five_star_package_price: sharePackage.five_star_package_price,
          pelataran_package_price: sharePackage.pelataran_package_price,
          available_tiers: sharePackage.available_tiers,
        }}
        agentCode={agent?.referral_code || ""}
      />
    )}
    </>
  );
};

export default AgentPackages;
