// Umroh Readiness Calculator — pure logic
// Pricing model assumptions (no DB columns yet):
//   - Down payment to lock seat: Rp 5,000,000 per pilgrim
//   - Full balance due: 40 days before departure (pelunasan)

export const DP_PER_PERSON = 5_000_000;
export const PELUNASAN_DAYS_BEFORE = 40;

export type TierKey = "hemat" | "nyaman" | "five-star" | "pelataran-hemat";

export interface TierOption {
  tier: TierKey;
  label: string;
  pricePerPerson: number; // cheapest (quad) realistic entry price
  packageId?: string;
  packageName?: string;
  earliestDeparture?: string; // ISO date string from DB
}

export interface CalcInput {
  monthlySaving: number;
  pilgrimCount: number;
  existingSavings: number;
}

export interface TierResult extends TierOption {
  totalNeeded: number;       // price * pilgrims
  netNeeded: number;         // after existing savings
  monthsRequired: number;    // earliest realistic months from today
  feasibleDate: string;      // ISO yyyy-mm-dd
  feasibleLabel: string;     // "Maret 2027"
  matchesRealDeparture: boolean; // can they hit an actual scheduled departure
}

const ID_MONTHS = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember",
];

export const formatIDR = (n: number) =>
  "Rp " + Math.round(n).toLocaleString("id-ID");

export const formatMonthYear = (iso: string) => {
  const d = new Date(iso);
  return `${ID_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

const addMonths = (date: Date, months: number) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

const toISO = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Smart cashflow check: given monthly saving + existing savings,
 * can the visitor cover (1) DP at month 0, and (2) full balance
 * by pelunasan (40 days before departure)?
 * Returns minimum months from today that's realistic.
 */
export function earliestMonthsToDepart(
  totalNeeded: number,
  monthlySaving: number,
  existingSavings: number,
  pilgrimCount: number,
): number {
  if (monthlySaving <= 0) return 999;
  const dpRequired = DP_PER_PERSON * pilgrimCount;

  // Need DP first. If existing < DP, we need months to save up to DP before booking.
  const monthsToDP = existingSavings >= dpRequired
    ? 0
    : Math.ceil((dpRequired - existingSavings) / monthlySaving);

  // Remaining balance after DP
  const remaining = Math.max(0, totalNeeded - dpRequired);
  // Savings rate also pays the rest. Pelunasan must be paid 40d (~1.3 months) before departure.
  // So we need `remaining` saved by month (M - 1.3), starting from month `monthsToDP`.
  // Effective saving months for the balance = M - monthsToDP - 1.3
  // remaining <= monthlySaving * (M - monthsToDP - 1.3)
  // M >= monthsToDP + 1.3 + remaining/monthlySaving
  const balanceMonths = remaining / monthlySaving;
  const pelunasanLeadMonths = PELUNASAN_DAYS_BEFORE / 30;
  const months = monthsToDP + pelunasanLeadMonths + balanceMonths;
  return Math.max(1, Math.ceil(months));
}

export function buildTierResult(
  tier: TierOption,
  input: CalcInput,
): TierResult {
  const totalNeeded = tier.pricePerPerson * input.pilgrimCount;
  const netNeeded = Math.max(0, totalNeeded - input.existingSavings);
  const months = earliestMonthsToDepart(
    totalNeeded,
    input.monthlySaving,
    input.existingSavings,
    input.pilgrimCount,
  );
  const feasible = addMonths(new Date(), months);
  let matchesRealDeparture = false;
  if (tier.earliestDeparture) {
    matchesRealDeparture = new Date(tier.earliestDeparture) >= feasible;
  }
  return {
    ...tier,
    totalNeeded,
    netNeeded,
    monthsRequired: months,
    feasibleDate: toISO(feasible),
    feasibleLabel: formatMonthYear(toISO(feasible)),
    matchesRealDeparture,
  };
}

/** Relatable reframe based on per-day amount */
export function dailyReframe(perDay: number): string {
  if (perDay <= 15_000) return "Setara segelas teh manis di warung ☕";
  if (perDay <= 25_000) return "Kurang dari sekali jajan kopi sachet pagi ☕";
  if (perDay <= 40_000) return "Setara satu gelas kopi kekinian ☕";
  if (perDay <= 60_000) return "Kurang dari biaya langganan streaming bulanan 📺";
  if (perDay <= 100_000) return "Setara satu kali makan siang di luar 🍱";
  if (perDay <= 150_000) return "Setara isi bensin motor 2 hari 🛵";
  return "Konsisten setiap hari — kuncinya disiplin 💪";
}

/** "Speed it up" — show impact of +Rp 500k/month */
export function speedUpImpact(
  totalNeeded: number,
  monthlySaving: number,
  existingSavings: number,
  pilgrimCount: number,
  bump = 500_000,
): { newMonths: number; monthsSaved: number; bump: number } {
  const baseline = earliestMonthsToDepart(totalNeeded, monthlySaving, existingSavings, pilgrimCount);
  const boosted = earliestMonthsToDepart(totalNeeded, monthlySaving + bump, existingSavings, pilgrimCount);
  return { newMonths: boosted, monthsSaved: Math.max(0, baseline - boosted), bump };
}

/** Pick the recommended tier: the most affordable one feasible within 24 months,
 * otherwise the cheapest tier (hemat). */
export function pickRecommended(results: TierResult[]): TierResult {
  const feasible = results.filter((r) => r.monthsRequired <= 24);
  if (feasible.length > 0) {
    // Prefer the most premium feasible (longest months but still <=24)
    return feasible.reduce((a, b) => (b.pricePerPerson > a.pricePerPerson ? b : a));
  }
  // Fallback: cheapest
  return results.reduce((a, b) => (a.pricePerPerson < b.pricePerPerson ? a : b));
}
