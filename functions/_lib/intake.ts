/**
 * Validation for the public registration form (/daftar). Shared by the server function and its tests.
 * Everything a stranger sends is checked here before it reaches the database; the database checks again.
 */

export const CONSENT_VERSION = "2026-10-tos";
export const MAX_PEOPLE = 10;

export type Category = "adult" | "child_nobed" | "infant";
export type Room = "quad" | "triple" | "double";

export interface CleanIntake {
  slug: string;
  contact_name: string;
  contact_phone: string;
  contact_city: string | null;
  contact_attending: boolean;
  pay_together: boolean;
  ref_code: string | null;
  heard_from: string | null;
  notes: string | null;
  consent: true;
  consent_version: string;
  people: { full_name: string; gender: "L" | "P"; category: Category; room_type: string; relation: string | null }[];
}

export type Checked = { ok: true; value: CleanIntake } | { ok: false; error: string };

const fail = (error: string): Checked => ({ ok: false, error });
const text = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const t = v.replace(/\s+/g, " ").trim();
  return t ? t.slice(0, max) : null;
};
// Names: letters from any script, marks, spaces and the punctuation real names use. No digits, tags or control characters.
const NAME = /^[\p{L}\p{M}][\p{L}\p{M}\s.'’\-,]{1,99}$/u;
/** The passport name must have at least two words (PT's registration requirement 7). */
const twoWords = (name: string) => name.split(" ").filter((w) => /[\p{L}\p{M}]{1,}/u.test(w)).length >= 2;

/** 0812..., +62812..., 62812..., 812... -> 62812... (null when it cannot be a mobile number). */
export function normalizePhone(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let d = raw.replace(/[^\d+]/g, "").replace(/^\+/, "");
  if (d.startsWith("0")) d = "62" + d.slice(1);
  else if (d.startsWith("8")) d = "62" + d;
  return /^62[0-9]{8,13}$/.test(d) ? d : null;
}

export function validateIntake(body: unknown): Checked {
  if (!body || typeof body !== "object") return fail("Data tidak terbaca. Muat ulang halaman lalu coba lagi.");
  const b = body as Record<string, unknown>;

  if (typeof b.website === "string" && b.website.trim()) return fail("Data tidak valid."); // honeypot: people never see this field
  const slug = typeof b.slug === "string" && /^[a-z0-9-]{1,200}$/.test(b.slug) ? b.slug : null;
  if (!slug) return fail("Paket tidak dikenali. Buka lagi link pendaftaran dari halaman paket.");

  const contactName = text(b.contact_name, 100);
  if (!contactName || !NAME.test(contactName)) return fail("Tulis nama kontak dengan huruf (tanpa angka).");
  const phone = normalizePhone(b.contact_phone);
  if (!phone) return fail("Nomor WhatsApp belum benar. Contoh: 0812 3456 7890.");

  if (b.consent !== true) return fail("Centang persetujuan data dan Term of Service untuk melanjutkan.");

  if (!Array.isArray(b.people) || b.people.length < 1) return fail("Tambahkan minimal satu orang yang berangkat.");
  if (b.people.length > MAX_PEOPLE) return fail(`Maksimal ${MAX_PEOPLE} orang per pendaftaran. Untuk rombongan lebih besar, hubungi CS.`);

  const people: CleanIntake["people"] = [];
  for (let i = 0; i < b.people.length; i++) {
    const p = b.people[i] as Record<string, unknown>;
    const n = i + 1;
    const name = text(p?.full_name, 100);
    if (!name || !NAME.test(name)) return fail(`Peserta ${n}: tulis nama sesuai paspor dengan huruf.`);
    if (!twoWords(name)) return fail(`Peserta ${n}: nama di paspor minimal dua kata.`);
    if (p.gender !== "L" && p.gender !== "P") return fail(`Peserta ${n}: pilih jenis kelamin.`);
    const category = p.category;
    if (category !== "adult" && category !== "child_nobed" && category !== "infant") return fail(`Peserta ${n}: pilih jenis peserta.`);
    let room: string;
    if (category === "adult") {
      if (p.room_type !== "quad" && p.room_type !== "triple" && p.room_type !== "double") return fail(`Peserta ${n}: pilih tipe kamar.`);
      room = p.room_type;
    } else {
      room = category === "child_nobed" ? "non_bed" : "infant";
    }
    people.push({ full_name: name, gender: p.gender, category, room_type: room, relation: text(p.relation, 40) });
  }

  const ref = text(b.ref, 40);
  return {
    ok: true,
    value: {
      slug,
      contact_name: contactName,
      contact_phone: phone,
      contact_city: text(b.contact_city, 80),
      contact_attending: b.contact_attending !== false,
      pay_together: b.pay_together === true && people.length > 1,
      ref_code: ref && /^[A-Za-z0-9_-]{2,40}$/.test(ref) ? ref : null,
      heard_from: text(b.heard_from, 100),
      notes: text(b.notes, 500),
      consent: true,
      consent_version: CONSENT_VERSION,
      people,
    },
  };
}
