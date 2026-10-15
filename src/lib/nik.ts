/** Why this NIK cannot be right, or null when it at least has the right shape (16 digits, a known province code, a possible birth date). */

const PROVINCE_CODES = new Set([
  "11", "12", "13", "14", "15", "16", "17", "18", "19", "21", "31", "32", "33", "34", "35", "36", "51", "52", "53",
  "61", "62", "63", "64", "65", "71", "72", "73", "74", "75", "76", "81", "82", "91", "92", "93", "94", "95", "96",
]);

export function nikProblem(nik: string): string | null {
  if (!/^\d{16}$/.test(nik)) return "NIK harus 16 angka.";
  if (!PROVINCE_CODES.has(nik.slice(0, 2))) return "Dua angka pertama NIK bukan kode provinsi yang dikenal.";
  const day = Number(nik.slice(6, 8));
  const month = Number(nik.slice(8, 10));
  if (!((day >= 1 && day <= 31) || (day >= 41 && day <= 71)) || month < 1 || month > 12) return "Tanggal lahir di dalam NIK tidak masuk akal.";
  return null;
}
