import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** What admin_work_counts returns. A key is missing when the signed-in role may not open the page behind it. */
export interface AdminWorkCounts {
  intakes_new?: number;
  payments_pending?: { count: number; amount: number };
  commission_eligible?: number;
  commission_approved?: number;
  agents_pending?: number;
  disputes_open?: number;
  belum_dp?: number;
  lunas_due?: { count: number; amount: number };
  lunas_overdue?: number;
  seats_low?: number;
}

/** One light read for the menu badges and the owner dashboard; refreshes every minute. */
export function useAdminWorkCounts(enabled = true) {
  return useQuery({
    queryKey: ["admin-work-counts"],
    enabled,
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_work_counts");
      if (error) throw error;
      return (data ?? {}) as AdminWorkCounts;
    },
  });
}

/** Badge number per menu path, from the counts. 0 and missing both hide the badge. */
export function menuBadgeFor(path: string, c: AdminWorkCounts | undefined): number {
  if (!c) return 0;
  switch (path) {
    case "/admin/jamaah": return c.intakes_new ?? 0;
    case "/admin/jamaah/pembayaran": return c.payments_pending?.count ?? 0;
    case "/admin/pembayaran-komisi": return c.commission_eligible ?? 0;
    case "/admin/agents": return c.agents_pending ?? 0;
    default: return 0;
  }
}
