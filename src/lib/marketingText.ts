import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { formatPriceJuta, getSlotsTaken, getTierPrice } from "@/lib/utils";
import { resolveTierHotels } from "@/lib/roomCombos";
import type { PublishedPackage } from "@/hooks/usePackages";

export interface PackageTexts {
  link: string;
  wa_short: string;
  wa_full: string;
  instagram: string;
}

const stars = (n: number) => (n ? ` (${n}⭐)` : "");

/** The agent's link to a package: the public package page with their Agent ID in it. */
export function packageReferralLink(pkg: Pick<PublishedPackage, "id" | "slug">, agentCode: string, origin: string): string {
  return `${origin}/paket-umroh/${pkg.slug || pkg.id}${agentCode ? `?ref=${agentCode}` : ""}`;
}

/**
 * Ready-to-send promo texts for one package, filled from its data and the agent's link. Nothing is left in square
 * brackets for the agent to fill in, and a missing detail (no hotel, no seat count) is simply left out.
 */
export function buildPackageTexts(pkg: PublishedPackage, agentCode: string, origin: string): PackageTexts {
  const link = packageReferralLink(pkg, agentCode, origin);
  const date = format(new Date(pkg.departure_date), "d MMMM yyyy", { locale: localeId });
  const year = new Date(pkg.departure_date).getFullYear();
  const tier = pkg.available_tiers?.[0] || "nyaman";
  const hotels = resolveTierHotels(pkg, tier);
  const price = getTierPrice(pkg).quad;
  const priceLine = price > 0 ? `💰 Mulai ${formatPriceJuta(price)} per orang` : null;
  const seatsLeft = pkg.slots_total ? Math.max(0, pkg.slots_total - getSlotsTaken(pkg)) : 0;
  const hotelLines = [
    hotels.makkah.name ? `• Makkah: ${hotels.makkah.name}${stars(hotels.makkah.star)}${hotels.makkah.distance ? `, ${hotels.makkah.distance} dari Masjidil Haram` : ""}` : "",
    hotels.madinah.name ? `• Madinah: ${hotels.madinah.name}${stars(hotels.madinah.star)}${hotels.madinah.distance ? `, ${hotels.madinah.distance} dari Masjid Nabawi` : ""}` : "",
  ].filter(Boolean);
  // null = leave this line out; "" = a blank line on purpose.
  const join = (lines: (string | null)[]) => lines.filter((l) => l !== null).join("\n");

  const wa_short = join([
    "Assalamu'alaikum 🙏",
    "",
    `🕌 *${pkg.package_name}*`,
    `📅 ${date}, ${pkg.duration_days} hari`,
    priceLine,
    "",
    `Info lengkap: ${link}`,
  ]);

  const wa_full = join([
    "Assalamu'alaikum 🙏",
    "",
    `🕌 *${pkg.package_name}*`,
    "",
    `📅 Berangkat: ${date}`,
    `⏱️ Durasi: ${pkg.duration_days} hari`,
    pkg.flight ? `✈️ ${pkg.flight}${pkg.flight_type ? ` (${pkg.flight_type})` : ""}` : null,
    ...(hotelLines.length ? ["", "🏨 Hotel:", ...hotelLines] : []),
    "",
    priceLine,
    "DP Rp 5 juta per orang, sisanya bisa dicicil sampai lunas 30 hari sebelum berangkat.",
    seatsLeft > 0 && seatsLeft <= 10 ? `Sisa seat: ${seatsLeft}` : null,
    "",
    `Lihat detail dan daftar: ${link}`,
  ]);

  const instagram = join([
    `🕌 ${pkg.package_name}`,
    "",
    `📅 ${date} • ${pkg.duration_days} hari`,
    ...hotelLines.map((l) => l.replace("• ", "🏨 ")),
    priceLine,
    "",
    `Info dan pendaftaran: ${link}`,
    "",
    `#umroh #paketumroh #umroh${year} #musafartour #baitullah`,
  ]);

  return { link, wa_short, wa_full, instagram };
}
