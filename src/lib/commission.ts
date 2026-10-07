/** Per-departure, per-tier, per-level agent commission: shared labels and helpers. */

export const COMMISSION_LEVELS = ["duta", "silver", "gold", "platinum"] as const;
export type CommissionLevel = (typeof COMMISSION_LEVELS)[number];

export const COMMISSION_LEVEL_LABEL: Record<CommissionLevel, string> = {
  duta: "Duta",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

/** Tier keys as stored in packages.available_tiers. */
export const TIER_LABEL: Record<string, string> = {
  nyaman: "Nyaman",
  hemat: "Hemat",
  "pelataran-hemat": "Pelataran",
  "five-star": "Five-Star",
};

/** Display order for tiers (Nyaman first, as the agent screens list them). */
export const TIER_ORDER = ["nyaman", "hemat", "pelataran-hemat", "five-star"];

export const tierLabel = (tier: string): string => TIER_LABEL[tier] ?? tier;

export const tierRank = (tier: string): number => {
  const i = TIER_ORDER.indexOf(tier);
  return i === -1 ? TIER_ORDER.length : i;
};

/** Fallback commission when a package has no rate row at all (shown to admins only). */
export const STANDARD_COMMISSION = 1_500_000;

export const rupiah = (n: number): string => "Rp " + Math.round(n).toLocaleString("id-ID");

export interface MyCommissionRate {
  package_id: string;
  tier: string;
  amount: number | null;
}

/** Amounts of one package, one per tier the agent's level has a number for (tier display order). */
export function packageCommissionRows(rates: MyCommissionRate[] | undefined, packageId: string): { tier: string; amount: number }[] {
  if (!rates) return [];
  return rates
    .filter((r) => r.package_id === packageId && r.amount != null && r.amount > 0)
    .map((r) => ({ tier: r.tier, amount: Number(r.amount) }))
    .sort((a, b) => tierRank(a.tier) - tierRank(b.tier));
}

/** One line for a package card: "Mulai Rp 2.000.000", "Rp 2.000.000" or null when nothing is confirmed. */
export function commissionSummary(rows: { tier: string; amount: number }[]): string | null {
  if (rows.length === 0) return null;
  const min = Math.min(...rows.map((r) => r.amount));
  const max = Math.max(...rows.map((r) => r.amount));
  return min === max ? rupiah(min) : `Mulai ${rupiah(min)}`;
}
