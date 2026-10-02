import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { BANK_LABELS, PAYMENT_STATUS_LABEL, ROOM_SHORT, rupiah, type JamaahGroup, type Payment } from "@/lib/jamaah";
import type { AgentOption } from "@/hooks/useJamaah";

/** One row of jamaah_audit_log as the app reads it. */
export interface AuditRow {
  id: string;
  table_name: string;
  row_id: string;
  action: string;
  /** update: { field: { old, new } }; insert and delete: { _snapshot: the whole row } */
  changes: unknown;
  actor_name: string | null;
  actor_email: string | null;
  created_at: string;
}

export interface HistoryLookups {
  agents: AgentOption[];
  groups: Pick<JamaahGroup, "id" | "name">[];
  payments: Pick<Payment, "id" | "amount" | "bank_account">[];
}

export interface HistoryEntry {
  id: string;
  who: string;
  what: string;
  when: string;
  lines: { label: string; from: string; to: string }[];
}

/** Short name for the history: the display name if there is one, otherwise the part of the email before "@". */
export function actorNickname(name: string | null | undefined, email: string | null | undefined): string {
  const n = name?.trim();
  if (n) return n;
  const local = email?.split("@")[0]?.trim();
  // No account behind a change means the jamaah filled it in themselves through the private link.
  return local ? local.charAt(0).toUpperCase() + local.slice(1) : "Jamaah (lewat form)";
}

const LABELS: Record<string, string> = {
  // registrations
  full_name: "Nama", phone: "No. WA", room_type: "Kamar", list_price: "Harga", discount: "Diskon", price_note: "Keterangan harga",
  agent_id: "Agen", referral_note: "Catatan referral", domicile: "Domisili", start_city: "Kota start", equipment_size: "Size",
  equipment_taken_at: "Perlengkapan", status: "Status", cancel_reason: "Alasan batal", refund_amount: "Refund",
  refund_paid_at: "Refund dibayar", group_id: "Keluarga", gender: "Jenis kelamin", nik: "NIK", birth_place: "Tempat lahir",
  date_of_birth: "Tanggal lahir", passport_number: "Nomor paspor", passport_issued_at: "Paspor terbit", passport_expiry: "Paspor berlaku sampai",
  passport_issue_office: "Kantor penerbit paspor", mahram_name: "Nama mahram", mahram_relation: "Hubungan mahram",
  meningitis_vaccinated_at: "Vaksin meningitis", polio_vaccinated_at: "Vaksin polio", roommate_note: "Teman sekamar",
  father_name: "Nama ayah", marital_status: "Status kawin", address: "Alamat", email: "Email", occupation: "Pekerjaan", education: "Pendidikan",
  blood_type: "Golongan darah", emergency_name: "Kontak darurat", emergency_relation: "Hubungan kontak darurat", emergency_phone: "HP kontak darurat",
  medical_notes: "Riwayat penyakit", ktp_path: "Foto KTP", passport_path: "Scan paspor", photo_path: "Pas foto", notes: "Catatan",
  // payments
  amount: "Nominal", paid_on: "Tanggal transfer", bank_account: "Rekening", payer_name: "Nama pengirim",
  proof_path: "Bukti transfer", reject_reason: "Alasan ditolak",
};

/** Bookkeeping columns nobody needs to read in a history. */
const HIDDEN = new Set([
  "id", "package_id", "registration_id", "transfer_id", "created_at", "created_by", "updated_at", "cancelled_at",
  "recorded_by", "recorded_at", "verified_by", "verified_at", "commission_skipped",
]);

const MONEY = new Set(["list_price", "discount", "refund_amount", "amount"]);
const DATES = new Set(["paid_on", "refund_paid_at", "date_of_birth", "passport_issued_at", "passport_expiry", "meningitis_vaccinated_at", "polio_vaccinated_at"]);
const FILES = new Set(["ktp_path", "passport_path", "photo_path", "proof_path"]);
const REGISTRATION_STATUS: Record<string, string> = { active: "Aktif", cancelled: "Batal" };
const GENDER: Record<string, string> = { L: "Laki-laki", P: "Perempuan" };

const day = (v: string) => format(new Date(v.length === 10 ? `${v}T00:00:00` : v), "d MMM yyyy", { locale: localeId });

/** One stored value as a person would say it. */
export function formatHistoryValue(table: string, key: string, value: unknown, lookups: HistoryLookups): string {
  if (value === null || value === undefined || value === "") {
    if (FILES.has(key)) return "belum ada";
    if (key === "equipment_taken_at") return "belum diambil";
    return "kosong";
  }
  if (MONEY.has(key)) return rupiah(Number(value));
  if (DATES.has(key)) return day(String(value));
  if (FILES.has(key)) return "sudah diunggah";
  if (key === "equipment_taken_at") return "sudah diambil";
  if (key === "status") {
    const v = String(value);
    return (table === "jamaah_payments" ? PAYMENT_STATUS_LABEL[v] : REGISTRATION_STATUS[v]) ?? v;
  }
  if (key === "room_type") return ROOM_SHORT[String(value)] ?? String(value);
  if (key === "bank_account") return BANK_LABELS[String(value)] ?? String(value);
  if (key === "gender") return GENDER[String(value)] ?? String(value);
  if (key === "agent_id") return lookups.agents.find((a) => a.id === value)?.name ?? "agen lain";
  if (key === "group_id") return lookups.groups.find((g) => g.id === value)?.name ?? "keluarga lain";
  return String(value);
}

type Diff = Record<string, { old: unknown; new: unknown }>;

/** Turns an audit row into "who did what", and for edits the list of "field: from → to". */
export function buildHistoryEntry(row: AuditRow, lookups: HistoryLookups): HistoryEntry {
  const changes = (row.changes ?? {}) as Record<string, unknown>;
  const snapshot = (changes._snapshot ?? null) as Record<string, unknown> | null;
  const isPayment = row.table_name === "jamaah_payments";

  // The payment this entry is about: its snapshot, else the row as it is now.
  const current = isPayment ? lookups.payments.find((p) => p.id === row.row_id) : undefined;
  const amount = Number(snapshot?.amount ?? (changes.amount as { new?: unknown } | undefined)?.new ?? current?.amount ?? NaN);
  const bank = (snapshot?.bank_account ?? current?.bank_account) as string | undefined;
  const money = Number.isFinite(amount) ? ` ${rupiah(amount)}` : "";
  const via = bank ? ` via ${BANK_LABELS[bank] ?? bank}` : "";

  const diff: Diff = row.action === "update" ? (changes as Diff) : {};
  const lines = Object.entries(diff)
    .filter(([key]) => !HIDDEN.has(key) && key !== "_snapshot")
    .map(([key, v]) => ({
      label: LABELS[key] ?? key.replace(/_/g, " "),
      from: formatHistoryValue(row.table_name, key, v.old, lookups),
      to: formatHistoryValue(row.table_name, key, v.new, lookups),
    }))
    .filter((l) => l.from !== l.to);

  let what: string;
  if (isPayment) {
    const status = diff.status?.new;
    what =
      row.action === "insert" ? `mencatat pembayaran${money}${via}`
      : row.action === "delete" ? `menghapus catatan pembayaran${money}${via}`
      : status === "verified" ? `memverifikasi pembayaran${money}`
      : status === "rejected" ? `menolak pembayaran${money}`
      : `mengubah pembayaran${money}`;
  } else {
    what =
      row.action === "insert" ? "mendaftarkan jamaah"
      : row.action === "delete" ? "menghapus pendaftaran"
      : diff.status?.new === "cancelled" ? "membatalkan pendaftaran"
      : "mengubah data";
  }

  return {
    id: row.id,
    who: actorNickname(row.actor_name, row.actor_email),
    what,
    when: format(new Date(row.created_at), "d MMM yyyy, HH.mm", { locale: localeId }),
    lines,
  };
}
