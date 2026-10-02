/**
 * Rules of the public registration form, mirrored from the server (functions/_lib/intake.ts) so people see the
 * problem next to the field instead of after pressing the button. The server checks everything again.
 */

export const MAX_PEOPLE = 10;

export type Category = "adult" | "child_nobed" | "infant";
export type Room = "quad" | "triple" | "double";

export const CATEGORY_LABEL: Record<Category, string> = {
  adult: "Dewasa",
  child_nobed: "Anak, tidur bersama orang tua (Non bed)",
  infant: "Bayi (di bawah 2 tahun)",
};

export const RELATIONS = ["Diri sendiri", "Suami", "Istri", "Anak", "Ayah", "Ibu", "Saudara", "Teman", "Lainnya"];

export interface PersonDraft {
  key: string;
  name: string;
  /** The person typed this name themselves, so stop copying the contact's name into it. */
  nameTouched: boolean;
  gender: "L" | "P" | "";
  category: Category;
  room: Room;
  relation: string;
}

// Letters of any script, marks, spaces and the punctuation real names use. No digits or tags.
const NAME = /^[\p{L}\p{M}][\p{L}\p{M}\s.'’\-,]{1,99}$/u;

export const validName = (v: string) => NAME.test(v.replace(/\s+/g, " ").trim());

/** Passport names need at least two words (PT's registration requirement 7). */
export const validPassportName = (v: string) => validName(v) && v.trim().split(/\s+/).filter((w) => /[\p{L}\p{M}]/u.test(w)).length >= 2;

/** 0812..., +62812..., 62812..., 812... -> 62812... (null when it cannot be a mobile number). */
export function normalizePhone(raw: string): string | null {
  let d = raw.replace(/[^\d+]/g, "").replace(/^\+/, "");
  if (d.startsWith("0")) d = "62" + d.slice(1);
  else if (d.startsWith("8")) d = "62" + d;
  return /^62[0-9]{8,13}$/.test(d) ? d : null;
}

export interface FormErrors {
  contactName?: string;
  contactPhone?: string;
  consentData?: string;
  consentPay?: string;
  turnstile?: string;
  people: Record<string, { name?: string; gender?: string }>;
}

export interface ContactDraft {
  name: string;
  phone: string;
  city: string;
}

/** What is wrong with the form right now, in the words shown to the person. Empty `people` and no keys = fine. */
export function checkForm(contact: ContactDraft, people: PersonDraft[], consentData: boolean, consentPay: boolean, needTurnstile: boolean, hasToken: boolean): FormErrors {
  const errors: FormErrors = { people: {} };
  if (!validName(contact.name)) errors.contactName = "Tulis nama kontak dengan huruf (tanpa angka).";
  if (!normalizePhone(contact.phone)) errors.contactPhone = "Nomor WhatsApp belum benar. Contoh: 0812 3456 7890.";
  for (const p of people) {
    const e: { name?: string; gender?: string } = {};
    if (!validName(p.name)) e.name = "Tulis nama sesuai paspor dengan huruf.";
    else if (!validPassportName(p.name)) e.name = "Nama di paspor minimal dua kata. Tulis nama lengkap.";
    if (!p.gender) e.gender = "Pilih jenis kelamin.";
    if (e.name || e.gender) errors.people[p.key] = e;
  }
  if (!consentData) errors.consentData = "Centang persetujuan ini untuk melanjutkan.";
  if (!consentPay) errors.consentPay = "Centang persetujuan ini untuk melanjutkan.";
  if (needTurnstile && !hasToken) errors.turnstile = "Tunggu verifikasi keamanan selesai, atau muat ulang halaman.";
  return errors;
}

export const hasErrors = (e: FormErrors) =>
  !!(e.contactName || e.contactPhone || e.consentData || e.consentPay || e.turnstile || Object.keys(e.people).length);
