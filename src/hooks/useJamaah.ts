import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Balance, JamaahGroup, Payment, Registration } from "@/lib/jamaah";
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
        // A long list of ids in one URL breaks past a couple of hundred jamaah, so ask in batches of 100.
        const ids = registrations.map((r) => r.id);
        const batches = Array.from({ length: Math.ceil(ids.length / 100) }, (_, i) => ids.slice(i * 100, i * 100 + 100));
        const results = await Promise.all(
          batches.map((batch) => supabase.from("jamaah_payments").select("*").in("registration_id", batch).order("paid_on"))
        );
        for (const res of results) if (res.error) throw res.error;
        payments = results.flatMap((res) => (res.data ?? []) as Payment[]).sort((a, b) => a.paid_on.localeCompare(b.paid_on));
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

export interface AllJamaahRow {
  reg: Pick<
    Registration,
    "id" | "package_id" | "group_id" | "created_at" | "full_name" | "phone" | "room_type" | "status" | "agent_id" | "referral_note" | "domicile" | "start_city" | "equipment_taken_at" | "list_price" | "discount"
  >;
  balance: Balance;
}

const ALL_REG_COLUMNS =
  "id, package_id, group_id, created_at, full_name, phone, room_type, status, agent_id, referral_note, domicile, start_city, equipment_taken_at, list_price, discount";

/** Reads every row of a table or view, 1000 at a time (the API's page limit). */
async function readAll<T>(table: "jamaah_registrations" | "jamaah_registration_balances", columns: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    // The table name is a union of a table and a view, which the generated client types cannot express.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).from(table).select(columns).order(table === "jamaah_registrations" ? "id" : "registration_id").range(from, from + 999);
    if (error) throw error;
    out.push(...((data ?? []) as unknown as T[]));
    if ((data?.length ?? 0) < 1000) break;
  }
  return out;
}

/** Every jamaah on every package, all time, with verified and pending money from the balances view. */
export function useAllJamaah() {
  return useQuery({
    queryKey: ["jamaah", "all"],
    queryFn: async (): Promise<AllJamaahRow[]> => {
      const [regs, bals] = await Promise.all([
        readAll<AllJamaahRow["reg"]>("jamaah_registrations", ALL_REG_COLUMNS),
        readAll<{ registration_id: string; agreed_price: number; paid_verified: number; paid_pending: number; outstanding: number }>(
          "jamaah_registration_balances",
          "registration_id, agreed_price, paid_verified, paid_pending, outstanding"
        ),
      ]);
      const byReg = new Map(bals.map((b) => [b.registration_id, b]));
      return regs.map((reg) => {
        const b = byReg.get(reg.id);
        const agreed = Number(b?.agreed_price ?? Number(reg.list_price) - Number(reg.discount));
        return {
          reg,
          balance: {
            agreed,
            paidVerified: Number(b?.paid_verified ?? 0),
            paidPending: Number(b?.paid_pending ?? 0),
            outstanding: Number(b?.outstanding ?? agreed),
          },
        };
      });
    },
  });
}
