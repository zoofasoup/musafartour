import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MyCommissionRate } from "@/lib/commission";

export const MY_COMMISSION_RATES_KEY = ["my-commission-rates"] as const;

/**
 * The signed-in agent's own commission per package and tier. The server only returns rows for the
 * caller's own level, so the amounts here are never other levels' numbers.
 */
export function useMyCommissionRates(enabled = true) {
  return useQuery({
    queryKey: MY_COMMISSION_RATES_KEY,
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<MyCommissionRate[]> => {
      const { data, error } = await supabase.rpc("get_my_commission_rates");
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => ({
        package_id: r.package_id,
        tier: r.tier,
        amount: r.amount == null ? null : Number(r.amount),
      }));
    },
  });
}
