import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

/**
 * Offline registration rules (owner, 2026-10-01):
 * - DP at least Rp 5 jt per pax
 * - cicilan any time, any amount
 * - lunas at the latest H-30 before departure
 * - every payment goes to a PT Musa Amanah Wisata account
 */
export const DP_MIN_PER_PAX = 5_000_000;
export const LUNAS_DAYS_BEFORE_DEPARTURE = 30;

export const PT_ACCOUNTS = [
  { code: "BCA", number: "1643337111" },
  { code: "BSI", number: "7213170788" },
  { code: "BNI", number: "1784469461" },
] as const;
export const PT_ACCOUNT_HOLDER = "PT Musa Amanah Wisata";

export type BankAccount = (typeof PT_ACCOUNTS)[number]["code"] | "SALDO_AWAL";
export const BANK_LABELS: Record<string, string> = {
  BCA: "BCA",
  BSI: "BSI",
  BNI: "BNI",
  SALDO_AWAL: "Saldo awal (dari sheet)",
};

export type Registration = Tables<"jamaah_registrations">;
export type Payment = Tables<"jamaah_payments">;
export type JamaahGroup = Tables<"jamaah_groups">;

export const ROOM_LABELS: Record<string, string> = {
  quad: "Quad (ber-4)",
  triple: "Triple (ber-3)",
  double: "Double (ber-2)",
  non_bed: "Non bed (anak tanpa kasur)",
  infant: "Infant (bayi)",
};
export const ROOM_SHORT: Record<string, string> = { quad: "Quad", triple: "Triple", double: "Double", non_bed: "Non bed", infant: "Infant" };

export const rupiah = (n: number | null | undefined) => `Rp ${new Intl.NumberFormat("id-ID").format(Math.round(n ?? 0))}`;
export const juta = (n: number | null | undefined) => {
  const v = n ?? 0;
  if (Math.abs(v) < 1_000_000) return rupiah(v);
  return `${(v / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
};

/** YYYY-MM-DD in Jakarta time. */
export const todayIso = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });

export const dueDateFor = (departureDate: string) => {
  const d = new Date(`${departureDate.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - LUNAS_DAYS_BEFORE_DEPARTURE);
  return d.toISOString().slice(0, 10);
};

export const daysUntil = (isoDate: string) => {
  const ms = new Date(`${isoDate.slice(0, 10)}T00:00:00Z`).getTime() - new Date(`${todayIso()}T00:00:00Z`).getTime();
  return Math.round(ms / 86_400_000);
};

export interface Balance {
  agreed: number;
  paidVerified: number;
  paidPending: number;
  outstanding: number;
}

/** Money for one registration from its payments (rejected payments never count). */
export function balanceOf(reg: Pick<Registration, "list_price" | "discount">, payments: Pick<Payment, "amount" | "status">[]): Balance {
  const agreed = Number(reg.list_price) - Number(reg.discount);
  const paidVerified = payments.filter((p) => p.status === "verified").reduce((s, p) => s + Number(p.amount), 0);
  const paidPending = payments.filter((p) => p.status === "pending").reduce((s, p) => s + Number(p.amount), 0);
  return { agreed, paidVerified, paidPending, outstanding: agreed - paidVerified };
}

/**
 * Split one family transfer evenly across its members, the way families think
 * about it ("total rombongan, bayar rata"). A member is never pushed past their
 * own remaining bill: their unused share goes evenly to the others. Money left
 * once everyone is fully paid is spread evenly too (shows up as lebih bayar).
 * Whole rupiah; any odd rupiah goes to the first members.
 */
export function splitEvenly(total: number, members: { id: string; outstanding: number }[]): Record<string, number> {
  const out: Record<string, number> = Object.fromEntries(members.map((m) => [m.id, 0]));
  if (!members.length || total <= 0) return out;
  const room = (m: { id: string; outstanding: number }) => Math.max(0, m.outstanding - out[m.id]);

  const spread = (amount: number, pool: { id: string }[]) => {
    const share = Math.floor(amount / pool.length);
    let extra = amount - share * pool.length;
    for (const m of pool) {
      out[m.id] += share + (extra > 0 ? 1 : 0);
      if (extra > 0) extra--;
    }
  };

  let left = total;
  // Repeatedly hand out an even share to everyone who still owes money.
  for (let guard = 0; left > 0 && guard < members.length + 1; guard++) {
    const owing = members.filter((m) => room(m) > 0);
    if (!owing.length) break;
    const share = Math.floor(left / owing.length);
    const smallest = Math.min(...owing.map(room));
    if (share <= smallest) {
      spread(left, owing);
      left = 0;
      break;
    }
    // Someone owes less than an even share: pay them off and share the rest again.
    for (const m of owing) {
      const give = Math.min(room(m), share);
      out[m.id] += give;
      left -= give;
    }
  }
  if (left > 0) spread(left, members);
  return out;
}

export type PayState = "belum_dp" | "dp" | "lunas" | "lebih";

// ---------------------------------------------------------------------------
// Families: members of one group pay together, so money, remaining bill and status are shown once
// per family (like the merged cells of the old sheet).
// ---------------------------------------------------------------------------

/**
 * Put the members of each group next to each other. A group sits where its first member appears and the
 * order inside it is kept. `groupOf` returns null for anyone who should not be merged (no group, cancelled).
 */
export function clusterByGroup<T>(items: T[], groupOf: (item: T) => string | null): T[] {
  const out: T[] = [];
  const placed = new Set<string>();
  for (const item of items) {
    const g = groupOf(item);
    if (!g) {
      out.push(item);
      continue;
    }
    if (placed.has(g)) continue;
    placed.add(g);
    out.push(...items.filter((x) => groupOf(x) === g));
  }
  return out;
}

/** Stretches of 2 or more neighbouring rows of one group: where merged cells go. */
export function groupRuns<T>(items: T[], groupOf: (item: T) => string | null): { start: number; length: number; group: string }[] {
  const runs: { start: number; length: number; group: string }[] = [];
  let i = 0;
  while (i < items.length) {
    const g = groupOf(items[i]);
    let j = i + 1;
    while (g && j < items.length && groupOf(items[j]) === g) j++;
    if (g && j - i >= 2) runs.push({ start: i, length: j - i, group: g });
    i = j;
  }
  return runs;
}

/** Everyone's money added up. */
export function groupBalance(members: Balance[]): Balance {
  return members.reduce(
    (t, b) => ({
      agreed: t.agreed + b.agreed,
      paidVerified: t.paidVerified + b.paidVerified,
      paidPending: t.paidPending + b.paidPending,
      outstanding: t.outstanding + b.outstanding,
    }),
    { agreed: 0, paidVerified: 0, paidPending: 0, outstanding: 0 }
  );
}

/** Status of a whole family: Lunas when the family owes nothing, Sudah DP when the DP of every member is in. */
export function groupPayState(members: Balance[]): PayState {
  const b = groupBalance(members);
  if (b.outstanding < 0) return "lebih";
  if (b.outstanding === 0 && b.agreed > 0) return "lunas";
  if (b.paidVerified >= Math.min(DP_MIN_PER_PAX * members.length, b.agreed)) return "dp";
  return "belum_dp";
}

/** Where a jamaah stands, from verified money only. */
export function payState(b: Balance): PayState {
  if (b.outstanding < 0) return "lebih";
  if (b.outstanding === 0 && b.agreed > 0) return "lunas";
  if (b.paidVerified >= Math.min(DP_MIN_PER_PAX, b.agreed)) return "dp";
  return "belum_dp";
}

export const PAY_STATE_LABEL: Record<PayState, string> = {
  belum_dp: "Belum DP",
  dp: "Sudah DP",
  lunas: "Lunas",
  lebih: "Lebih bayar",
};

export const PAY_STATE_CLASS: Record<PayState, string> = {
  belum_dp: "bg-amber-100 text-amber-900 border-amber-200",
  dp: "bg-sky-100 text-sky-900 border-sky-200",
  lunas: "bg-emerald-100 text-emerald-900 border-emerald-200",
  lebih: "bg-violet-100 text-violet-900 border-violet-200",
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu verifikasi",
  verified: "Terverifikasi",
  rejected: "Ditolak",
};

export const PAYMENT_STATUS_CLASS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-900 border-amber-200",
  verified: "bg-emerald-100 text-emerald-900 border-emerald-200",
  rejected: "bg-red-100 text-red-900 border-red-200",
};

/** Manifest documents a jamaah needs before departure. */
export function documentChecklist(r: Registration) {
  const passportOk =
    !!r.passport_number && !!r.passport_expiry && daysUntil(r.passport_expiry) > 0;
  return [
    { key: "ktp", label: "KTP", done: !!r.nik && !!r.ktp_path },
    { key: "passport", label: "Paspor", done: passportOk && !!r.passport_path },
    { key: "photo", label: "Foto", done: !!r.photo_path },
    { key: "meningitis", label: "Vaksin meningitis", done: !!r.meningitis_vaccinated_at },
    { key: "mahram", label: "Mahram (jamaah wanita)", done: r.gender !== "P" || !!r.mahram_name },
  ];
}

// --- Private documents (bucket jamaah-docs) ---------------------------------

const DOCS_BUCKET = "jamaah-docs";

/** Upload a transfer proof / KTP / passport / photo. Returns the storage path to save. */
export async function uploadJamaahDoc(file: File, folder: string): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(DOCS_BUCKET).upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  return path;
}

/** Short-lived link to view a private document. */
export async function docUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from(DOCS_BUCKET).createSignedUrl(path, 60 * 10);
  return data?.signedUrl ?? null;
}

// --- WhatsApp reminders (sent by CS from her own WhatsApp) -------------------

export function reminderWhatsAppUrl(opts: {
  phone: string | null;
  name: string;
  packageName: string;
  departureDate: string;
  outstanding: number;
  dueDate: string;
}) {
  const phone = (opts.phone || "").replace(/\D/g, "").replace(/^0/, "62");
  const accounts = PT_ACCOUNTS.map((a) => `${a.code} ${a.number}`).join(" / ");
  const due = new Date(`${opts.dueDate}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  const dep = new Date(`${opts.departureDate.slice(0, 10)}T00:00:00`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const text =
    `Assalamu'alaikum ${opts.name},\n\n` +
    `Kami dari Musafar Tour ingin mengingatkan sisa pembayaran paket *${opts.packageName}* (berangkat ${dep}) ` +
    `sebesar *${rupiah(opts.outstanding)}*, paling lambat *${due}*.\n\n` +
    `Pembayaran hanya melalui rekening ${PT_ACCOUNT_HOLDER}: ${accounts}.\n` +
    `Mohon kirim bukti transfer ke nomor ini. Jazakumullah khairan.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
