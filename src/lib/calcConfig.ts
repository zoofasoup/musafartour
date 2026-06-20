// Konfigurasi global Umroh Financial Planner

export const USD_KURS = 18_000; // Asumsi kurs USD untuk pricing umroh

export const PRICING_FOOTNOTE = `Harga paket mengikuti kondisi ekonomi terkini dengan asumsi kurs USD = Rp ${USD_KURS.toLocaleString("id-ID")}. Harga final dikonfirmasi saat pendaftaran.`;

/** Mapping "setara apa" berdasarkan target harian (IDR) */
export function dailyEquivalent(perDay: number): string {
  if (perDay < 10_000) return "Kurang dari parkir motor seharian 🛵";
  if (perDay < 25_000) return "Sekali jajan kopi sachet atau gorengan pagi ☕";
  if (perDay < 50_000) return "Sekali jajan boba 🧋";
  if (perDay < 75_000) return "Sekali makan siang di luar 🍱";
  if (perDay < 100_000) return "Sekali ojek online pulang-pergi 🛵";
  if (perDay < 150_000) return "Sekali nongkrong di kafe ☕🍰";
  return "Setara langganan streaming + jajan 📺";
}

export const DAILY_MOTIVATION = "Disiplin sehari = satu langkah lebih dekat ke Baitullah.";

export const STATUS_OPTIONS = ["NEW", "CONTACTED", "QUALIFIED", "CLOSED"] as const;
export type LeadStatus = typeof STATUS_OPTIONS[number];

/** Parse UTM + Meta click IDs from URL search params */
export function parseTrackingParams(search: string) {
  const sp = new URLSearchParams(search);
  return {
    utm_source: sp.get("utm_source"),
    utm_medium: sp.get("utm_medium"),
    utm_campaign: sp.get("utm_campaign"),
    fbclid: sp.get("fbclid"),
    ctwa_clid: sp.get("ctwa_clid") || sp.get("ctwaclid"),
  };
}
