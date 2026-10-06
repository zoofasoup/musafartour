import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type LeadStatus = "active" | "inactive" | "registered" | "lost";
export type FollowupKind = "chat" | "call" | "meeting" | "note";

/** One lead of the signed-in agent (list_my_agent_leads). */
export interface AgentLead {
  id: string;
  name: string;
  whatsapp: string;
  package_id: string | null;
  package_name: string | null;
  interest_note: string | null;
  status: LeadStatus;
  registered_at: string;
  protected_until: string;
  days_left: number;
  last_followup_at: string | null;
  followup_count: number;
  helper_code: string | null;
  intake_code: string | null;
  intake_status: string | null;
  inactive_reason: string | null;
}

export interface LeadFollowup {
  id: string;
  kind: FollowupKind;
  note: string | null;
  created_at: string;
}

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  active: "Aktif",
  inactive: "Tidak aktif",
  registered: "Sudah daftar",
  lost: "Gugur",
};

export const LEAD_STATUS_KIND: Record<LeadStatus, "ok" | "mute" | "info" | "bad"> = {
  active: "ok",
  inactive: "mute",
  registered: "info",
  lost: "bad",
};

export const FOLLOWUP_LABEL: Record<FollowupKind, string> = {
  chat: "Chat WhatsApp",
  call: "Telepon",
  meeting: "Bertemu langsung",
  note: "Catatan",
};

/** "0812..." style input -> same rule as the registration form (62812...), null when it cannot be a mobile number. */
export { normalizePhone } from "@/lib/intakeForm";

/** The sentence to show for a failed lead action: our own Indonesian server messages pass through. */
export function leadErrorMessage(error: unknown): string {
  const msg = (error as { message?: string } | null)?.message ?? "";
  const code = (error as { code?: string } | null)?.code;
  if (code === "P0001" || code === "42501") return msg;
  return "Belum berhasil disimpan. Periksa internet kamu, lalu coba lagi.";
}

const KEY = ["agent-leads"] as const;

export function useAgentLeads(enabled = true) {
  return useQuery({
    queryKey: KEY,
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_my_agent_leads");
      if (error) throw error;
      return (data ?? []) as unknown as AgentLead[];
    },
  });
}

/** Follow-up history of one lead (own rows only, enforced by RLS). */
export function useLeadFollowups(leadId: string | null) {
  return useQuery({
    queryKey: ["agent-lead-followups", leadId],
    enabled: !!leadId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_lead_followups")
        .select("id, kind, note, created_at")
        .eq("lead_id", leadId as string)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as LeadFollowup[];
    },
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { name: string; whatsapp: string; packageId: string | null; note: string }) => {
      const { data, error } = await supabase.rpc("create_agent_lead", {
        _name: v.name,
        _whatsapp: v.whatsapp,
        _package_id: v.packageId ?? undefined,
        _note: v.note.trim() || undefined,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useAddFollowup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { leadId: string; kind: FollowupKind; note: string }) => {
      const { error } = await supabase.rpc("add_lead_followup", { _lead_id: v.leadId, _kind: v.kind, _note: v.note.trim() || undefined });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["agent-lead-followups", v.leadId] });
    },
  });
}

export function useSetLeadStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { leadId: string; status: "active" | "inactive" | "lost"; reason?: string }) => {
      const { error } = await supabase.rpc("set_lead_status", { _lead_id: v.leadId, _status: v.status, _reason: v.reason?.trim() || undefined });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useSetLeadHelper() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { leadId: string; code: string }) => {
      const { error } = await supabase.rpc("set_lead_helper", { _lead_id: v.leadId, _helper_referral_code: v.code });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** "3 hari lalu", "hari ini", "Belum pernah". */
export function followupText(iso: string | null): string {
  if (!iso) return "Belum pernah";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "Hari ini";
  return `${days} hari lalu`;
}

export const waLeadUrl = (whatsapp: string, name: string) =>
  `https://wa.me/${whatsapp}?text=${encodeURIComponent(`Assalamualaikum ${name}, saya dari Musafar Tour.`)}`;
