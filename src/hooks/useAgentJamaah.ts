import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PAY_STATE_CLASS, PAY_STATE_LABEL, STATUS_BADGE, daysUntil, type PayState } from "@/lib/jamaah";

/** Where one of the agent's jamaah stands. "batal" is a cancelled registration. */
export type AgentJamaahState = PayState | "batal";
export type CommissionStatus = "earned" | "waiting" | "none";

export interface AgentJamaah {
  registration_id: string;
  full_name: string;
  phone: string | null;
  package_name: string;
  departure_date: string;
  room_type: string;
  status: string;
  agreed_price: number;
  paid_verified: number;
  paid_pending: number;
  outstanding: number;
  due_date: string;
  pay_state: AgentJamaahState;
  commission_amount: number;
  commission_status: CommissionStatus;
  created_at: string;
}

export interface AgentIntake {
  code: string;
  status: "new" | "accepted" | "rejected";
  contact_name: string;
  package_name: string;
  departure_date: string;
  people_count: number;
  created_at: string;
}

/** The jamaah this agent brought in, with payment and commission progress (list_my_agent_jamaah). */
export function useAgentJamaah(enabled = true) {
  return useQuery({
    queryKey: ["agent-jamaah"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_my_agent_jamaah");
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        agreed_price: Number(r.agreed_price),
        paid_verified: Number(r.paid_verified),
        paid_pending: Number(r.paid_pending),
        outstanding: Number(r.outstanding),
        commission_amount: Number(r.commission_amount),
      })) as unknown as AgentJamaah[];
    },
  });
}

/** Registrations the agent sent that CS has not decided yet, or has accepted or rejected (list_my_agent_intakes). */
export function useAgentIntakes(enabled = true) {
  return useQuery({
    queryKey: ["agent-intakes"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_my_agent_intakes");
      if (error) throw error;
      return (data ?? []) as unknown as AgentIntake[];
    },
  });
}

export const AGENT_STATE_LABEL: Record<AgentJamaahState, string> = { ...PAY_STATE_LABEL, batal: "Batal" };
export const AGENT_STATE_CLASS: Record<AgentJamaahState, string> = { ...PAY_STATE_CLASS, batal: STATUS_BADGE.bad };

/** Still owes money and has not been cancelled: the ones an agent should chase. */
export const needsPayment = (j: AgentJamaah) => j.pay_state === "belum_dp" || j.pay_state === "dp";

/** Most urgent first: nobody has paid a DP yet, then the nearest payment deadline. */
export function byUrgency(a: AgentJamaah, b: AgentJamaah): number {
  const rank = (j: AgentJamaah) => (j.pay_state === "belum_dp" ? 0 : 1);
  return rank(a) - rank(b) || a.due_date.localeCompare(b.due_date);
}

/** "5 hari lagi", "hari ini", "terlambat 3 hari" for a payment deadline (YYYY-MM-DD). */
export function deadlineText(dueDate: string): string {
  const d = daysUntil(dueDate);
  if (d === 0) return "batas lunas hari ini";
  return d > 0 ? `batas lunas ${d} hari lagi` : `lewat batas lunas ${Math.abs(d)} hari`;
}
