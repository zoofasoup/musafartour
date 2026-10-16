import type { AdminWorkCounts } from "@/hooks/useAdminWorkCounts";
import { rupiah } from "@/lib/jamaah";

export interface QueueItem {
  key: string;
  label: string;
  value: number;
  hint?: string;
  to: string;
  urgent: boolean;
}

/** Antrean pekerjaan owner. Tiap item menyebut langkahnya; yang mendesak dan berisi tampil lebih dulu, urutan awal dijaga untuk selebihnya. */
export function buildWorkQueue(c: AdminWorkCounts): QueueItem[] {
  const pay = c.payments_pending;
  const due = c.lunas_due;
  const items: QueueItem[] = [
    { key: "payments", label: "Verifikasi pembayaran", value: pay?.count ?? 0, hint: pay?.count ? `${pay.count} menunggu, ${rupiah(pay.amount)}` : undefined, to: "/admin/jamaah/pembayaran", urgent: true },
    { key: "intakes", label: "Terima pendaftaran baru", value: c.intakes_new ?? 0, to: "/admin/jamaah/masuk", urgent: true },
    { key: "belumdp", label: "Jamaah belum DP", value: c.belum_dp ?? 0, hint: "Keberangkatan yang akan datang", to: "/admin/jamaah", urgent: false },
    {
      key: "lunas",
      label: "Ingatkan pelunasan",
      value: due?.count ?? 0,
      hint: [due?.count ? `Sisa ${rupiah(due.amount)}` : "", c.lunas_overdue ? `${c.lunas_overdue} sudah lewat` : ""].filter(Boolean).join(", ") || undefined,
      to: "/admin/jamaah/keuangan",
      urgent: true,
    },
    { key: "komisi", label: "Setujui komisi", value: c.commission_eligible ?? 0, hint: `${c.commission_approved ?? 0} sudah disetujui, layak dibayar`, to: "/admin/pembayaran-komisi", urgent: true },
    { key: "agen", label: "Setujui agen baru", value: c.agents_pending ?? 0, to: "/admin/agents", urgent: true },
    { key: "sengketa", label: "Putuskan sengketa lead", value: c.disputes_open ?? 0, hint: "Komisinya ditahan sampai diputuskan", to: "/admin/agent-leads", urgent: true },
    { key: "seat", label: "Seat hampir penuh", value: c.seats_low ?? 0, hint: "Sisa 3 seat atau kurang", to: "/admin/jadwal", urgent: false },
  ];
  const rank = (x: QueueItem) => (x.urgent && x.value > 0 ? 0 : x.value > 0 ? 1 : 2);
  return items.map((x, i) => ({ x, i })).sort((a, b) => rank(a.x) - rank(b.x) || a.i - b.i).map(({ x }) => x);
}
