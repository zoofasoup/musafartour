import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CommissionLevel } from "@/lib/commission";

export interface CommissionRateRow {
  package_id: string;
  package_name: string;
  departure_date: string;
  flight: string | null;
  status: string;
  tier: string;
  level: CommissionLevel;
  /** null = not filled yet */
  amount: number | null;
  note: string | null;
  updated_at: string | null;
}

export const COMMISSION_RATES_KEY = ["admin-commission-rates"] as const;

export function useCommissionRates() {
  return useQuery({
    queryKey: COMMISSION_RATES_KEY,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<CommissionRateRow[]> => {
      const { data, error } = await supabase.rpc("admin_list_commission_rates");
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => ({
        ...r,
        level: r.level as CommissionLevel,
        amount: r.amount == null ? null : Number(r.amount),
      }));
    },
  });
}

export interface SaveRateArgs {
  package_id: string;
  tier: string;
  level: CommissionLevel;
  /** null clears the rate */
  amount: number | null;
}

/** Saves one cell. Patches the cached list in place so the grid never reflows or refetches mid-typing. */
export function useSaveCommissionRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ package_id, tier, level, amount }: SaveRateArgs) => {
      const { error } =
        amount == null
          ? await supabase.rpc("clear_commission_rate", { _package_id: package_id, _tier: tier, _level: level })
          : await supabase.rpc("set_commission_rate", { _package_id: package_id, _tier: tier, _level: level, _amount: amount });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, v) => {
      qc.setQueryData<CommissionRateRow[]>(COMMISSION_RATES_KEY, (old) =>
        old?.map((r) =>
          r.package_id === v.package_id && r.tier === v.tier && r.level === v.level ? { ...r, amount: v.amount, updated_at: new Date().toISOString() } : r,
        ),
      );
      // Agents' own view of the rates may now be stale.
      qc.invalidateQueries({ queryKey: ["my-commission-rates"] });
    },
  });
}
