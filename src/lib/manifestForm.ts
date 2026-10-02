/**
 * Stage 2 of the registration: what each person must fill in before departure, mirrored from the database
 * function save_manifest_by_token (supabase/migrations/20261003100000_jamaah_manifest_fields.sql), which checks again.
 * The list follows the paper form "Formulir Pendaftaran Umrah" of PT Musa Amanah Wisata.
 */

export interface ManifestPerson {
  id: string;
  full_name: string;
  gender: "L" | "P" | null;
  room_type: string;
  is_child: boolean;
  nik: string | null;
  birth_place: string | null;
  date_of_birth: string | null;
  passport_number: string | null;
  passport_issued_at: string | null;
  passport_expiry: string | null;
  passport_issue_office: string | null;
  father_name: string | null;
  marital_status: "married" | "single" | null;
  address: string | null;
  email: string | null;
  occupation: string | null;
  education: "sd" | "smp" | "sma" | "s1" | "other" | null;
  blood_type: "A" | "B" | "AB" | "O" | null;
  emergency_name: string | null;
  emergency_relation: string | null;
  emergency_phone: string | null;
  medical_notes: string | null;
  mahram_name: string | null;
  mahram_relation: string | null;
  meningitis_vaccinated_at: string | null;
  polio_vaccinated_at: string | null;
  equipment_size: string | null;
  roommate_note: string | null;
  has_ktp: boolean;
  has_passport: boolean;
  has_photo: boolean;
}

export interface Manifest {
  code: string;
  contact_name: string;
  package_name: string;
  departure_date: string;
  people: ManifestPerson[];
}

export type FieldKey =
  | "nik" | "birth_place" | "date_of_birth" | "father_name" | "marital_status" | "address" | "email" | "occupation" | "education" | "blood_type"
  | "passport_number" | "passport_issued_at" | "passport_expiry" | "passport_issue_office"
  | "emergency_name" | "emergency_relation" | "emergency_phone" | "medical_notes"
  | "mahram_name" | "mahram_relation" | "meningitis_vaccinated_at" | "polio_vaccinated_at" | "equipment_size" | "roommate_note";

export type Draft = Record<FieldKey, string>;

export const FIELD_KEYS: FieldKey[] = [
  "nik", "birth_place", "date_of_birth", "father_name", "marital_status", "address", "email", "occupation", "education", "blood_type",
  "passport_number", "passport_issued_at", "passport_expiry", "passport_issue_office",
  "emergency_name", "emergency_relation", "emergency_phone", "medical_notes",
  "mahram_name", "mahram_relation", "meningitis_vaccinated_at", "polio_vaccinated_at", "equipment_size", "roommate_note",
];

/** Required for everyone. Children (non bed, infant) are not asked for marital status, job or education, and need no email of their own. */
const REQUIRED_ALL: FieldKey[] = [
  "nik", "birth_place", "date_of_birth", "father_name", "address", "blood_type",
  "passport_number", "passport_issued_at", "passport_expiry",
  "emergency_name", "emergency_relation", "emergency_phone",
];
const REQUIRED_ADULT: FieldKey[] = ["marital_status", "email", "occupation", "education"];

export const LABEL: Record<FieldKey, string> = {
  nik: "NIK", birth_place: "Tempat lahir", date_of_birth: "Tanggal lahir", father_name: "Nama ayah kandung", marital_status: "Status kawin",
  address: "Alamat rumah", email: "Email", occupation: "Pekerjaan", education: "Pendidikan", blood_type: "Golongan darah",
  passport_number: "Nomor paspor", passport_issued_at: "Tanggal terbit paspor", passport_expiry: "Paspor berlaku hingga", passport_issue_office: "Kantor imigrasi penerbit",
  emergency_name: "Nama kontak darurat", emergency_relation: "Hubungan kontak darurat", emergency_phone: "No HP kontak darurat", medical_notes: "Riwayat penyakit kronis",
  mahram_name: "Nama mahram", mahram_relation: "Hubungan mahram", meningitis_vaccinated_at: "Tanggal vaksin meningitis", polio_vaccinated_at: "Tanggal vaksin polio",
  equipment_size: "Ukuran perlengkapan", roommate_note: "Teman sekamar",
};

export const requiredFields = (p: Pick<ManifestPerson, "is_child">): FieldKey[] => (p.is_child ? REQUIRED_ALL : [...REQUIRED_ALL, ...REQUIRED_ADULT]);

export const draftOf = (p: ManifestPerson): Draft =>
  Object.fromEntries(FIELD_KEYS.map((k) => [k, (p[k] ?? "") as string])) as Draft;

const today = () => new Date().toISOString().slice(0, 10);

/** One message per problem, in the words shown next to the field. Only fields with a value are checked here; emptiness is `missing`. */
export function fieldProblem(key: FieldKey, raw: string): string | null {
  const v = raw.replace(/\s+/g, " ").trim();
  if (!v) return null;
  switch (key) {
    case "nik": return /^\d{16}$/.test(v) ? null : "NIK harus 16 angka.";
    case "email": return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) ? null : "Alamat email belum benar.";
    case "emergency_phone": return /^\d{8,15}$/.test(v.replace(/\D/g, "")) ? null : "Nomor HP belum benar.";
    case "passport_number": return /^[A-Za-z0-9]{5,12}$/.test(v) ? null : "Nomor paspor belum benar (huruf dan angka, tanpa spasi).";
    case "date_of_birth": return v >= "1900-01-01" && v <= today() ? null : "Tanggal lahir belum benar.";
    case "passport_issued_at":
    case "meningitis_vaccinated_at":
    case "polio_vaccinated_at": return v <= today() ? null : "Tanggal tidak boleh di masa depan.";
    case "passport_expiry": return v >= today() ? null : "Paspor sudah kedaluwarsa.";
    default: return null;
  }
}

/** The fields still empty that this person has to give. */
export const missing = (p: ManifestPerson, d: Draft): FieldKey[] => requiredFields(p).filter((k) => !d[k].trim());

export const docsMissing = (p: ManifestPerson): number => [p.has_ktp, p.has_passport, p.has_photo].filter((x) => !x).length;

export function isComplete(p: ManifestPerson, d: Draft): boolean {
  return missing(p, d).length === 0 && docsMissing(p) === 0 && !FIELD_KEYS.some((k) => fieldProblem(k, d[k]));
}

/** The PT asks for a passport valid at least 12 months from the departure date. Shown as a warning, never blocks saving. */
export function passportWarning(expiry: string, departure: string): string | null {
  if (!expiry || !/^\d{4}-\d{2}-\d{2}$/.test(expiry)) return null;
  const need = new Date(`${departure.slice(0, 10)}T00:00:00`);
  need.setMonth(need.getMonth() + 12);
  return new Date(`${expiry}T00:00:00`) < need
    ? "Syarat PT: paspor berlaku minimal 12 bulan dari tanggal berangkat. Paspor ini kurang dari itu. Hubungi CS untuk solusinya."
    : null;
}

/** Only what changed, so saving one section never rewrites the rest. Blank optional values clear the field. */
export function changes(p: ManifestPerson, d: Draft): Partial<Draft> {
  const base = draftOf(p);
  const out: Partial<Draft> = {};
  for (const k of FIELD_KEYS) if (d[k].trim() !== base[k].trim()) out[k] = d[k];
  return out;
}

export const EDUCATION: { value: NonNullable<ManifestPerson["education"]>; label: string }[] = [
  { value: "sd", label: "SD" },
  { value: "smp", label: "SMP" },
  { value: "sma", label: "SMA / SMK" },
  { value: "s1", label: "S1 / D4 atau lebih" },
  { value: "other", label: "Lainnya" },
];

export const BLOOD = ["A", "B", "AB", "O"] as const;

export const KIND_LABEL = { ktp: "KTP", passport: "Halaman data paspor", photo: "Pasfoto" } as const;
