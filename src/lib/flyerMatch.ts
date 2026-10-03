/**
 * Matches marketing flyer files to packages by their filename, e.g.
 *   "FLYER 2026.11.05 - 9D - Nyaman - November - QR.png"
 *   → departure 2026-11-05, 9 days, tier nyaman, airline QR (Qatar).
 */

export interface ParsedFlyer {
  date: string; // YYYY-MM-DD
  days: number;
  tier: string | null; // hemat | nyaman | five-star | pelataran-hemat
  airline: string | null; // SV | WY | QR | GA ...
}

export interface FlyerPackage {
  id: string;
  package_name: string;
  departure_date: string;
  duration_days: number;
  flight: string | null;
  available_tiers: string[] | null;
  banner_image?: string | null;
}

export type FlyerMatch =
  | { kind: "match"; pkg: FlyerPackage }
  | { kind: "check"; pkg: FlyerPackage; note: string }
  | { kind: "none"; note: string };

const AIRLINE_WORDS: Record<string, string[]> = {
  SV: ["saudi", "saudia", "sv"],
  WY: ["oman", "wy"],
  QR: ["qatar", "qr"],
  GA: ["garuda", "ga"],
  EK: ["emirates", "ek"],
  EY: ["etihad", "ey"],
};

const tierFromText = (text: string): string | null => {
  const t = text.toLowerCase();
  if (/five[\s-]?star/.test(t)) return "five-star";
  if (t.includes("pelataran")) return "pelataran-hemat";
  if (t.includes("hemat")) return "hemat";
  if (t.includes("nyaman")) return "nyaman";
  return null;
};

export const parseFlyerName = (fileName: string): ParsedFlyer | null => {
  const m = fileName.match(/(\d{4})\.(\d{2})\.(\d{2})\s*-\s*(\d+)\s*D\b(.*)\.[a-z0-9]+$/i);
  if (!m) return null;
  const rest = m[5].split("-").map(s => s.trim()).filter(Boolean);
  const last = rest[rest.length - 1] ?? "";
  const airline = /^[A-Z]{2}$/.test(last) ? last : null;
  return {
    date: `${m[1]}-${m[2]}-${m[3]}`,
    days: Number(m[4]),
    tier: tierFromText(rest.join(" ")),
    airline,
  };
};

const pkgTier = (p: FlyerPackage) => p.available_tiers?.[0] ?? tierFromText(p.package_name);

const airlineMatches = (code: string | null, flight: string | null) => {
  if (!code || !flight) return false;
  const f = flight.toLowerCase();
  return (AIRLINE_WORDS[code] ?? [code.toLowerCase()]).some(w => f.includes(w));
};

export const matchFlyer = (parsed: ParsedFlyer | null, packages: FlyerPackage[]): FlyerMatch => {
  if (!parsed) return { kind: "none", note: "Nama file tidak sesuai pola FLYER YYYY.MM.DD - 9D - Tier" };
  const sameTrip = packages.filter(
    p => p.departure_date.slice(0, 10) === parsed.date && p.duration_days === parsed.days,
  );
  if (!sameTrip.length) return { kind: "none", note: "Tidak ada paket dengan tanggal & durasi ini" };

  const byTier = parsed.tier ? sameTrip.filter(p => pkgTier(p) === parsed.tier) : sameTrip;
  if (byTier.length === 1) return { kind: "match", pkg: byTier[0] };

  const pool = byTier.length ? byTier : sameTrip;
  const byAirline = pool.filter(p => airlineMatches(parsed.airline, p.flight));
  if (byAirline.length === 1) {
    return byTier.length
      ? { kind: "match", pkg: byAirline[0] }
      : { kind: "check", pkg: byAirline[0], note: "Tier di nama file beda dengan paket, dicocokkan lewat maskapai" };
  }
  return { kind: "none", note: pool.length > 1 ? `${pool.length} paket cocok, tidak bisa dipastikan` : "Tidak ada paket dengan tier ini" };
};
