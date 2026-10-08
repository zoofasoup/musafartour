/** WhatsApp of the PIC Agen (Virna, Partnership Management) that agents contact for help, fee proof and approval questions. */
export const AGENT_CS_WHATSAPP = "6285287471835";

/** Opens a chat with CS, prefilled with who is asking. */
export const agentCsWhatsAppUrl = (name: string, referralCode: string, topic = "Saya butuh bantuan untuk akun agen saya."): string =>
  `https://wa.me/${AGENT_CS_WHATSAPP}?text=${encodeURIComponent(`Halo PIC Agen Musafar, saya ${name} (Agent ID ${referralCode}). ${topic}`)}`;

/** Program terms the agent pages and the public "Jadi Agen" page both state. One place so they never disagree. */
export const AGENT_COMMISSION_PER_JAMAAH = 1_500_000;
export const AGENT_MIN_WITHDRAWAL = 100_000;

/** SOP names for the agent states. The database keeps pending / active / suspended; only the labels differ. */
export const AGENT_STATUS_LABELS: Record<string, string> = {
  pending: "Calon Agen",
  active: "Agen Aktif",
  suspended: "Dinonaktifkan",
};
export const agentStatusLabel = (status: string | null | undefined): string => AGENT_STATUS_LABELS[status ?? ""] ?? (status ?? "");

export type RegistrationFeeStatus = "unpaid" | "paid" | "waived";
export const REGISTRATION_FEE_LABELS: Record<RegistrationFeeStatus, string> = {
  unpaid: "Belum dibayar",
  paid: "Sudah dibayar",
  waived: "Dibebaskan",
};
