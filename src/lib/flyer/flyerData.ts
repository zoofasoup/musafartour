import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { getSlotsTaken } from "@/lib/utils";

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
  slots_booked_online: number | null;
  seat_source?: string | null;
  slots_registered?: number | null;
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
  "id,package_name,departure_date,duration_days,flight,route,is_sold_out,slots_total,slots_filled,slots_booked_online,seat_source,slots_registered,available_tiers,package_price,hemat_package_price,five_star_package_price,pelataran_package_price,makkah_hotel_name,makkah_hotel_star,madinah_hotel_name,madinah_hotel_star";

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
  // Offline (sheet) + online bookings both consume seats - see getSlotsTaken().
  const taken = getSlotsTaken(pkg);
  if (pkg.is_sold_out || taken >= total) return "Sold Out!";
  return String(total - taken);
}

/**
 * Package title color by tier. The brief asked for a gradient per tier
 * (hemat 0C3316-408B53, nyaman 032961-2465C5, pelataran A3452B-CD9208,
 * five-star 772030-D34772); tested that as CSS gradient text
 * (background-clip:text) in the real html2canvas export and it fails
 * outright there - html2canvas paints the background rectangle without
 * clipping it to the text shape, so with color:transparent the title
 * disappears entirely behind a solid block. Using the midpoint of each
 * pair as a flat color instead, which still reads as "that tier's color
 * family" and renders identically in the live preview and the export.
 */
export function getTierColor(pkg: FlyerPackage): string {
  const tier = pkg.available_tiers?.[0] ?? "";
  if (tier === "hemat") return "#265F35";
  if (tier === "five-star") return "#A53451";
  if (tier.startsWith("pelataran")) return "#B86C1A";
  return "#144793";
}

/**
 * Splits free text (package/hotel names) into exactly 2 lines by word,
 * each capped at maxChars, with any remainder past 2 lines hard-cut
 * (never an ellipsis). Line breaks are decided here in plain JS rather
 * than left to CSS wrapping: html2canvas (the flyer's export path)
 * doesn't reliably reproduce the browser's own wrap decisions for
 * height-constrained multi-line text - confirmed it can silently drop a
 * whole word - so line 1 and line 2 are rendered as independent
 * single-line strings instead, which both engines render identically.
 */
export function splitTwoLines(text: string, maxChars: number): [string, string] {
  const words = text.split(" ");
  let line1 = "";
  let i = 0;
  for (; i < words.length; i++) {
    const candidate = line1 ? `${line1} ${words[i]}` : words[i];
    if (candidate.length > maxChars && line1) break;
    line1 = candidate;
  }
  let line2 = words.slice(i).join(" ");
  if (line2.length > maxChars) line2 = line2.slice(0, maxChars);
  return [line1, line2];
}
