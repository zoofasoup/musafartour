import type { Database } from "@/integrations/supabase/types";

/** One row of admin_list_commissions(): a commission (or a helper share) of one jamaah. */
export type CommissionRow = Database["public"]["Functions"]["admin_list_commissions"]["Returns"][number];
export type AdjustmentRow = Database["public"]["Functions"]["admin_list_commission_adjustments"]["Returns"][number];
export type DisputeRow = Database["public"]["Functions"]["admin_list_lead_disputes"]["Returns"][number];

export type CommissionTab = "menunggu" | "layak" | "disetujui" | "dibayar" | "ditahan";

export const COMMISSION_TABS: { value: CommissionTab; label: string }[] = [
  { value: "menunggu", label: "Menunggu" },
  { value: "layak", label: "Layak dibayar" },
  { value: "disetujui", label: "Disetujui" },
  { value: "dibayar", label: "Dibayar" },
  { value: "ditahan", label: "Ditahan" },
];

/** Which tab a row belongs to. A held row (suspended agent, open lead dispute) is PENDING in the database but sits in Ditahan. */
export const tabOf = (r: Pick<CommissionRow, "state" | "hold_reason">): CommissionTab => {
  if (r.state === "pending") return r.hold_reason ? "ditahan" : "menunggu";
  if (r.state === "eligible") return "layak";
  if (r.state === "approved") return "disetujui";
  return "dibayar";
};

export const HOLD_LABEL: Record<string, string> = {
  suspended: "Agen tidak aktif",
  dispute: "Sengketa lead",
};

/** PPh 5% withheld from the gross; net = round(gross * 0.95) in whole rupiah, tax = gross - net (same as the database). */
export const netOf = (gross: number): number => Math.round(Number(gross) * 0.95);
export const taxOf = (gross: number): number => Number(gross) - netOf(gross);

export interface AgentGroup {
  agent_id: string;
  agent_name: string;
  agent_code: string;
  agent_level: string;
  bank_name: string | null;
  bank_account: string | null;
  account_name: string | null;
  agent_nik: string | null;
  nik_ok: boolean;
  agent_status: string;
  rows: CommissionRow[];
  gross: number;
  tax: number;
  net: number;
  /** Open clawback of this agent, netted from this payout (never more than the net). */
  clawback: number;
  /** What is actually transferred: net minus the clawback. */
  transfer: number;
}

/** One transfer per agent: groups the rows by agent, with the money maths and the clawback that will be netted. */
export function groupByAgent(rows: CommissionRow[]): AgentGroup[] {
  const map = new Map<string, AgentGroup>();
  for (const r of rows) {
    let g = map.get(r.agent_id);
    if (!g) {
      g = {
        agent_id: r.agent_id,
        agent_name: r.agent_name,
        agent_code: r.agent_code,
        agent_level: r.agent_level,
        bank_name: r.bank_name,
        bank_account: r.bank_account,
        account_name: r.account_name,
        agent_nik: r.agent_nik,
        nik_ok: r.nik_ok,
        agent_status: r.agent_status,
        rows: [],
        gross: 0,
        tax: 0,
        net: 0,
        clawback: 0,
        transfer: 0,
      };
      map.set(r.agent_id, g);
    }
    g.rows.push(r);
    g.gross += Number(r.gross_amount);
    g.net += netOf(Number(r.gross_amount));
    g.clawback = Number(r.open_clawback);
  }
  const groups = [...map.values()];
  for (const g of groups) {
    g.tax = g.gross - g.net;
    g.clawback = Math.min(g.clawback, g.net);
    g.transfer = g.net - g.clawback;
  }
  return groups.sort((a, b) => a.agent_name.localeCompare(b.agent_name, "id"));
}

const csvCell = (v: unknown): string => {
  const s = v == null ? "" : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * CSV for the bank / finance: one line per agent of a payout batch. Account number and NIK are written as ="..." so a
 * spreadsheet keeps them as text instead of turning 16 digits into 3,2E+15. Separator ; (Indonesian Excel).
 */
export function payoutBatchCsv(groups: AgentGroup[]): string {
  const head = ["Agen", "Agent ID", "Bank", "Nomor rekening", "Atas nama", "NIK", "Jumlah jamaah", "Komisi bruto", "PPh 5%", "Potongan komisi lama", "Jumlah transfer"];
  const lines = groups.map((g) =>
    [
      g.agent_name,
      g.agent_code,
      g.bank_name ?? "",
      g.bank_account ? `="${g.bank_account}"` : "",
      g.account_name ?? "",
      g.agent_nik ? `="${g.agent_nik}"` : "",
      g.rows.length,
      g.gross,
      g.tax,
      g.clawback,
      g.transfer,
    ].map(csvCell).join(";"),
  );
  return "﻿" + [head.map(csvCell).join(";"), ...lines].join("\r\n") + "\r\n";
}

/** Friendly text for an error raised by the commission functions. */
export const commissionErrorMessage = (error: unknown): string => {
  const raw = (error as { message?: string } | null)?.message ?? "";
  if (!raw) return "Belum berhasil. Coba lagi sebentar lagi.";
  if (raw.includes("Dua persetujuan harus dari dua pengguna berbeda")) {
    return "Dua persetujuan harus dari dua pengguna berbeda. Kamu sudah memberi persetujuan lain untuk komisi ini, jadi persetujuan kedua harus dari orang lain.";
  }
  // Messages written in Indonesian by the database are already meant for people.
  if (/[a-z]/.test(raw) && !/^(permission|new row|duplicate|violates|invalid input|JWT|fetch|Failed)/i.test(raw)) return raw;
  return "Belum berhasil. Coba lagi sebentar lagi.";
};
