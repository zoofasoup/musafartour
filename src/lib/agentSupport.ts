/** WhatsApp of the Musafar CS that agents contact (same number the pending/suspended screens use). */
export const AGENT_CS_WHATSAPP = "6281917403797";

/** Opens a chat with CS, prefilled with who is asking. */
export const agentCsWhatsAppUrl = (name: string, referralCode: string, topic = "Saya butuh bantuan untuk akun agen saya."): string =>
  `https://wa.me/${AGENT_CS_WHATSAPP}?text=${encodeURIComponent(`Halo CS Musafar, saya ${name} (kode ${referralCode}). ${topic}`)}`;

/** Program terms the agent pages and the public "Jadi Agen" page both state. One place so they never disagree. */
export const AGENT_COMMISSION_PER_JAMAAH = 1_500_000;
export const AGENT_MIN_WITHDRAWAL = 100_000;
