import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TierKey, TierOption } from "@/lib/umrohCalc";
import { TIER_PRICE_OVERRIDE } from "@/lib/calcConfig";

const TIER_LABELS: Record<TierKey, string> = {
  hemat: "Hemat",
  nyaman: "Nyaman",
  "five-star": "Five Star",
  "pelataran-hemat": "Pelataran Hemat",
};

const priceOf = (price: any): number => {
  const q = Number(price?.quad ?? 0);
  return q > 0 ? q : Number(price?.triple ?? 0) || Number(price?.double ?? 0) || 0;
};

/** Pick cheapest published package per tier with a real price */
export const useCalculatorTiers = () => {
  return useQuery({
    queryKey: ["calculator-tiers"],
    queryFn: async (): Promise<TierOption[]> => {
      const { data, error } = await supabase
        .from("packages")
        .select(
          "id, package_name, departure_date, package_price, hemat_package_price, five_star_package_price, pelataran_package_price, available_tiers, is_sold_out",
        )
        .eq("status", "published")
        .order("departure_date", { ascending: true });
      if (error) throw error;

      const today = new Date();
      const tierField: Record<TierKey, string> = {
        hemat: "hemat_package_price",
        nyaman: "package_price",
        "five-star": "five_star_package_price",
        "pelataran-hemat": "pelataran_package_price",
      };

      const tiers: TierOption[] = [];
      (Object.keys(TIER_LABELS) as TierKey[]).forEach((tier) => {
        let best: TierOption | undefined;
        for (const row of data || []) {
          if (row.is_sold_out) continue;
          if (new Date(row.departure_date) < today) continue;
          const price = priceOf((row as any)[tierField[tier]]);
          if (price <= 0) continue;
          // ensure tier is offered
          const offered = row.available_tiers?.includes(tier) ?? (tier === "nyaman");
          if (!offered && tier !== "nyaman") continue;
          if (!best || price < best.pricePerPerson) {
            best = {
              tier,
              label: TIER_LABELS[tier],
              pricePerPerson: price,
              packageId: row.id,
              packageName: row.package_name,
              earliestDeparture: row.departure_date,
            };
          }
        }
        if (best) tiers.push(best);
      });
      // Apply calculator price override (DB packages remain untouched)
      const overridden = tiers.map((t) => ({
        ...t,
        pricePerPerson: TIER_PRICE_OVERRIDE[t.tier] ?? t.pricePerPerson,
      }));
      // Sort cheapest to most premium
      overridden.sort((a, b) => a.pricePerPerson - b.pricePerPerson);
      return overridden;
    },
    staleTime: 5 * 60 * 1000,
  });
};
