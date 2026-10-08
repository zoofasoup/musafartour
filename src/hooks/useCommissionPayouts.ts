import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AdjustmentRow, CommissionRow, DisputeRow } from "@/lib/commissionPayout";

export const COMMISSIONS_KEY = ["admin-commissions"] as const;
export const COMMISSION_ADJUSTMENTS_KEY = ["admin-commission-adjustments"] as const;
export const LEAD_DISPUTES_KEY = ["admin-lead-disputes"] as const;

/** All confirmed / paid commissions. admin_list_commissions() also refreshes eligibility, so the tabs are right without the cron. */
export function useAdminCommissions() {
  return useQuery({
    queryKey: COMMISSIONS_KEY,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<CommissionRow[]> => {
      const { data, error } = await supabase.rpc("admin_list_commissions");
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => ({
        ...r,
        gross_amount: Number(r.gross_amount),
        tax_amount: Number(r.tax_amount),
        net_amount: Number(r.net_amount),
        open_clawback: Number(r.open_clawback),
        reprice_diff: r.reprice_diff == null ? null : Number(r.reprice_diff),
      }));
    },
  });
}

export function useAdminCommissionAdjustments() {
  return useQuery({
    queryKey: COMMISSION_ADJUSTMENTS_KEY,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<AdjustmentRow[]> => {
      const { data, error } = await supabase.rpc("admin_list_commission_adjustments");
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => ({ ...r, amount: Number(r.amount), settled_amount: Number(r.settled_amount), remaining: Number(r.remaining) }));
    },
  });
}

export function useLeadDisputes() {
  return useQuery({
    queryKey: LEAD_DISPUTES_KEY,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<DisputeRow[]> => {
      const { data, error } = await supabase.rpc("admin_list_lead_disputes");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

/** Roles of the signed-in staff user: decides which approval button is shown. */
export function useMyStaffRoles(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-staff-roles", userId],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId!);
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => String(r.role));
    },
  });
}

const useInvalidate = () => {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: COMMISSIONS_KEY });
    qc.invalidateQueries({ queryKey: COMMISSION_ADJUSTMENTS_KEY });
    qc.invalidateQueries({ queryKey: LEAD_DISPUTES_KEY });
  };
};

export interface ApproveResult {
  approved: number;
  skipped: { sale_id: string; reason: string }[];
}

export function useApproveCommissions() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ ids, as }: { ids: string[]; as: "manajemen" | "finance" }): Promise<ApproveResult> => {
      const { data, error } = await supabase.rpc("approve_commissions", { _sale_ids: ids, _as: as });
      if (error) throw new Error(error.message);
      return data as unknown as ApproveResult;
    },
    onSettled: invalidate,
  });
}

export interface PayAgentArgs {
  agentId: string;
  saleIds: string[];
  transferDate: string;
  reference: string;
  /** Proof file; may be null only when the whole payout is netted against a clawback (transfer 0). */
  proof: File | null;
  batchId: string;
}

/** Uploads the proof to commission-proofs/<agent id>/..., then marks the agent's approved commissions paid (one transfer). */
export function usePayAgentCommissions() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (a: PayAgentArgs) => {
      let path: string | null = null;
      if (a.proof) {
        const ext = (a.proof.name.split(".").pop() ?? "pdf").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "pdf";
        path = `${a.agentId}/${a.batchId}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("commission-proofs").upload(path, a.proof, { upsert: false, contentType: a.proof.type || undefined });
        if (upErr) throw new Error("Bukti transfer belum terunggah. Periksa koneksi dan ukuran berkas (maksimal 10 MB), lalu coba lagi.");
      }
      const { data, error } = await supabase.rpc("mark_agent_commissions_paid", {
        _agent_id: a.agentId,
        _sale_ids: a.saleIds,
        _transfer_date: a.transferDate,
        _reference: a.reference,
        _proof_path: path ?? undefined,
        _batch_id: a.batchId,
      });
      if (error) {
        if (path) await supabase.storage.from("commission-proofs").remove([path]);
        throw new Error(error.message);
      }
      return data;
    },
    onSettled: invalidate,
  });
}

export function useResolveLeadDispute() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (a: { intakeId: string; winnerId: string; helperPercent: number | null; note: string }) => {
      const { data, error } = await supabase.rpc("resolve_lead_dispute", {
        _intake_id: a.intakeId,
        _winner_agent_id: a.winnerId,
        _helper_percent: a.helperPercent ?? undefined,
        _note: a.note || undefined,
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSettled: invalidate,
  });
}
