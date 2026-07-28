import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

export interface TierPrice {
  quad: number;
  double: number;
  triple: number;
}

export interface FlyerPackage {
  id: string;
  package_name: string;
  departure_date: string;
  duration_days: number;
  flight: string;
  route: string | null;
  is_sold_out: boolean;
  slots_total: number | null;
  slots_filled: number | null;
  available_tiers: string[] | null;
  package_price: TierPrice | null;
  hemat_package_price: TierPrice | null;
  five_star_package_price: TierPrice | null;
  pelataran_package_price: TierPrice | null;
  makkah_hotel_name: string | null;
  makkah_hotel_star: number | null;
  madinah_hotel_name: string | null;
  madinah_hotel_star: number | null;
}

export const FLYER_PACKAGE_COLUMNS =
  "id,package_name,departure_date,duration_days,flight,route,is_sold_out,slots_total,slots_filled,available_tiers,package_price,hemat_package_price,five_star_package_price,pelataran_package_price,makkah_hotel_name,makkah_hotel_star,madinah_hotel_name,madinah_hotel_star";

/** Max rows (including the header row, so 16 data rows) that fit the measured 1310px-tall safe zone at the team's original ~78px row height. */
export const SAFE_ZONE_MAX_ROWS = 16;

/**
 * The lowest-tier ("quad") price for a package. Tier price data is split
 * across per-tier JSON columns; only the column matching available_tiers[0]
 * actually holds non-zero values (confirmed against live data - the base
 * package_price column is only populated for the "nyaman" tier, which has
 * no dedicated column of its own).
 */
export function getQuadPrice(pkg: FlyerPackage): number {
  const tier = pkg.available_tiers?.[0] ?? "";
  if (tier === "hemat") return pkg.hemat_package_price?.quad ?? 0;
  if (tier === "five-star") return pkg.five_star_package_price?.quad ?? 0;
  if (tier.startsWith("pelataran")) return pkg.pelataran_package_price?.quad ?? 0;
  return pkg.package_price?.quad ?? 0;
}

/** 34400000 -> "34,4" (millions, one decimal, Indonesian comma separator). */
export function formatPriceJuta(amount: number): string {
  return (amount / 1_000_000).toFixed(1).replace(".", ",");
}

/** "2026-07-03" -> "3 Jul 2026" */
export function formatDepartureDate(iso: string): string {
  return format(new Date(iso), "d MMM yyyy", { locale: localeId });
}

/** "2026-07-03" -> "Bulan Juli". December is a special case matching the team's existing copy ("Liburan Desember"). */
export function monthLabel(iso: string): string {
  const date = new Date(iso);
  if (date.getMonth() === 11) return "Liburan Desember";
  return `Bulan ${format(date, "MMMM", { locale: localeId })}`;
}

/** "Sold Out!" or the remaining seat count as a string. */
export function getSeatLabel(pkg: FlyerPackage): string {
  const total = pkg.slots_total ?? 0;
  const filled = pkg.slots_filled ?? 0;
  if (pkg.is_sold_out || filled >= total) return "Sold Out!";
  return String(total - filled);
}
