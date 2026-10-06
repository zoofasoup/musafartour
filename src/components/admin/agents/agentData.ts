/** Shared types and small pure helpers for the admin agent screens. */

export interface Agent {
  id: string;
  user_id: string;
  email: string;
  phone: string;
  wa_number: string | null;
  name: string;
  level: "duta" | "silver" | "gold" | "platinum";
  total_sales: number;
  total_commission: number;
  available_balance: number;
  referral_code: string;
  referred_by_id: string | null;
  bank_name: string | null;
  bank_account: string | null;
  account_name: string | null;
  status: "pending" | "active" | "suspended";
  created_at: string;
  approved_at: string | null;
  registration_fee_status?: "unpaid" | "paid" | "waived";
  registration_fee_paid_at?: string | null;
  sop_accepted_at?: string | null;
  sop_version?: string | null;
  ktp_number: string | null;
  ktp_image_url: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
}

export interface Withdrawal {
  id: string;
  agent_id: string;
  amount: number;
  bank_name: string;
  bank_account: string;
  account_name: string;
  status: string;
  requested_at: string;
  processed_at: string | null;
  admin_notes: string | null;
}

export const AGENT_LOGIN_URL = "https://musafartour.com/agent/login";

/**
 * Digits only, Indonesian international form (62...). Returns null for anything that is not a plausible real number,
 * including the placeholder numbers that start with 000 (the agent's real data was lost when the row was auto-created).
 */
export function normalizeWaNumber(raw: string | null | undefined): string | null {
  let d = (raw ?? "").replace(/\D/g, "");
  if (!d || d.startsWith("000")) return null;
  if (d.startsWith("0")) d = "62" + d.slice(1);
  else if (d.startsWith("8")) d = "62" + d;
  if (d.startsWith("620")) d = "62" + d.slice(3);
  if (!d.startsWith("62") || d.length < 10 || d.length > 15) return null;
  return d;
}

/** Best number to reach the agent on WhatsApp: the WA number if it is real, otherwise the phone. */
export function agentWaNumber(agent: Pick<Agent, "wa_number" | "phone">): string | null {
  return normalizeWaNumber(agent.wa_number) ?? normalizeWaNumber(agent.phone);
}

export const waLink = (number: string, text: string) => `https://wa.me/${number}?text=${encodeURIComponent(text)}`;

export function approvedMessage(agent: Pick<Agent, "name" | "email" | "referral_code">): string {
  return (
    `Assalamu'alaikum ${agent.name},\n\n` +
    `Akun agen Musafar Tour kamu sudah aktif. Silakan masuk di ${AGENT_LOGIN_URL} dengan email ${agent.email}.\n` +
    `Agent ID kamu: ${agent.referral_code}.\n\n` +
    `Kalau ada kendala saat masuk, balas pesan ini ya. Jazakumullah khairan.`
  );
}

export function helperMessage(agent: Pick<Agent, "name">, missing: string[]): string {
  if (missing.length === 0) return `Assalamu'alaikum ${agent.name}, ini dari tim Musafar Tour.`;
  return (
    `Assalamu'alaikum ${agent.name}, ini dari tim Musafar Tour.\n\n` +
    `Data agen kamu belum lengkap: ${missing.join(", ")}. Mohon lengkapi di ${AGENT_LOGIN_URL} atau kirim langsung lewat chat ini ya.`
  );
}

export type MissingKey = "ktp_number" | "ktp_photo" | "address" | "phone";
export const MISSING_LABEL: Record<MissingKey, string> = {
  ktp_number: "Nomor KTP",
  ktp_photo: "Foto KTP",
  address: "Alamat",
  phone: "Nomor telepon asli",
};

/** Which identity fields are missing. Empty array = complete. */
export function missingFields(agent: Pick<Agent, "ktp_number" | "ktp_image_url" | "address" | "phone" | "wa_number">): MissingKey[] {
  const out: MissingKey[] = [];
  if (!agent.ktp_number?.trim()) out.push("ktp_number");
  if (!agent.ktp_image_url?.trim()) out.push("ktp_photo");
  if (!agent.address?.trim()) out.push("address");
  if (!agentWaNumber(agent)) out.push("phone");
  return out;
}

/**
 * Everything worth a second look before approving: missing identity data, the registration fee not received,
 * the SOP not accepted. Approving anyway stays possible; this only feeds the warning.
 */
export function approvalWarnings(
  agent: Pick<Agent, "ktp_number" | "ktp_image_url" | "address" | "phone" | "wa_number" | "registration_fee_status" | "sop_accepted_at">
): string[] {
  const out = missingFields(agent).map((k) => MISSING_LABEL[k]);
  if ((agent.registration_fee_status ?? "unpaid") === "unpaid") out.push("Biaya registrasi belum diterima");
  if (!agent.sop_accepted_at) out.push("SOP belum disetujui");
  return out;
}

/** Storage path inside bucket agent-documents, from the (never loadable) public URL saved at upload time. */
export function ktpStoragePath(url: string | null | undefined): string | null {
  const raw = (url ?? "").trim();
  if (!raw) return null;
  const marker = "/agent-documents/";
  const i = raw.indexOf(marker);
  const rest = i >= 0 ? raw.slice(i + marker.length) : /^https?:\/\//i.test(raw) ? "" : raw;
  const path = rest.split("?")[0];
  if (!path) return null;
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

export const isPaidStatus = (s: string) => s === "paid" || s === "completed";

export const LEVEL_LABEL: Record<Agent["level"], string> = { duta: "Duta Musafar", silver: "Silver", gold: "Gold", platinum: "Platinum" };
