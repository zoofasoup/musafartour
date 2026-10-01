import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { JamaahGroup, Payment, Registration } from "@/lib/jamaah";
import { tierFieldNames } from "@/lib/roomCombos";

export const JAMAAH_PACKAGE_COLUMNS =
  "id, package_name, slug, departure_date, duration_days, status, flight, available_tiers, slots_total, slots_filled, " +
  "slots_registered, slots_booked_online, seat_source, agent_commission_amount, cogs_data, " +
  "package_price, hemat_package_price, five_star_package_price, pelataran_package_price";

export interface JamaahPackage {
  id: string;
  package_name: string;
  slug: string;
  departure_date: string;
  duration_days: number;
  status: string;
  flight: string | null;
  available_tiers: string[] | null;
  slots_total: number | null;
  slots_filled: number | null;
  slots_registered: number;
  slots_booked_online: number | null;
  seat_source: "sheet" | "website";
  agent_commission_amount: number | null;
  cogs_data: unknown;
  package_price: unknown;
  hemat_package_price: unknown;
  five_star_package_price: unknown;
  pelataran_package_price: unknown;
}

export interface AgentOption {
  id: string;
  name: string;
  referral_code: string;
  status: string;
}

/** Price per person for a room type on this package's own tier (0 when not set). */
export function packageRoomPrice(pkg: JamaahPackage | undefined, room: string): number {
  if (!pkg) return 0;
  const column = tierFieldNames(pkg.available_tiers?.[0]).priceColumn as keyof JamaahPackage;
  const price = pkg[column] as Record<string, number> | null;
  return Number(price?.[room] ?? 0) || 0;
}

/** Packages to register jamaah on: Final and live ones, newest departures last. */
export function useJamaahPackages() {
  return useQuery({
    queryKey: ["jamaah-packages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select(JAMAAH_PACKAGE_COLUMNS)
        .in("status", ["final", "published"])
        .order("departure_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as JamaahPackage[];
    },
  });
}

/** Everything for one package: registrations, their payments and the travel groups. */
export function useJamaahForPackage(packageId: string | undefined) {
  return useQuery({
    queryKey: ["jamaah", packageId],
    enabled: !!packageId,
    queryFn: async () => {
      const [regRes, groupRes] = await Promise.all([
        supabase.from("jamaah_registrations").select("*").eq("package_id", packageId!).order("created_at"),
        supabase.from("jamaah_groups").select("*").eq("package_id", packageId!).order("created_at"),
      ]);
      if (regRes.error) throw regRes.error;
      if (groupRes.error) throw groupRes.error;
      const registrations = (regRes.data ?? []) as Registration[];
      let payments: Payment[] = [];
      if (registrations.length) {
        const { data, error } = await supabase
          .from("jamaah_payments")
          .select("*")
          .in("registration_id", registrations.map((r) => r.id))
          .order("paid_on");
        if (error) throw error;
        payments = (data ?? []) as Payment[];
      }
      return { registrations, payments, groups: (groupRes.data ?? []) as JamaahGroup[] };
    },
  });
}

export function useAgentOptions() {
  return useQuery({
    queryKey: ["agent-options"],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_agent_options");
      if (error) throw error;
      return (data ?? []) as AgentOption[];
    },
  });
}

/** Refresh every jamaah-related view after a change. */
export function useInvalidateJamaah() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["jamaah"] });
    qc.invalidateQueries({ queryKey: ["jamaah-packages"] });
    qc.invalidateQueries({ queryKey: ["jamaah-payments"] });
    qc.invalidateQueries({ queryKey: ["jamaah-finance"] });
  };
}
