import { parsePackagePrice, type PackagePrice, type PackageHotels } from "@/lib/packageSchema";
import type { PublishedPackage } from "@/hooks/usePackages";

// Not DB-driven - no per-package child/infant pricing column exists.
export const CHILD_PRICE = 25_000_000;
export const INFANT_PRICE = 15_000_000;

export interface RoomCombo {
  quad: number;
  triple: number;
  double: number;
  totalAdults: number;
  totalRoomCost: number;
  perAdult: number;
  label: string;
}

/** Price for an explicitly chosen tier (as opposed to lib/utils.ts's getTierPrice, which auto-picks whichever tier has a price set). */
export function resolveTierPrice(pkg: PublishedPackage, tier: string): PackagePrice {
  switch (tier) {
    case "five-star": return parsePackagePrice(pkg.five_star_package_price);
    case "hemat": return parsePackagePrice(pkg.hemat_package_price);
    case "pelataran-hemat": return parsePackagePrice(pkg.pelataran_package_price);
    default: return parsePackagePrice(pkg.package_price);
  }
}

export function resolveTierHotels(pkg: PublishedPackage, tier: string): PackageHotels {
  const prefixMap: Record<string, string> = {
    "five-star": "five_star_",
    "hemat": "hemat_",
    "pelataran-hemat": "pelataran_",
    "nyaman": "",
  };
  const p = prefixMap[tier] ?? "";
  const get = (field: string) => (pkg as any)[`${p}${field}`];
  return {
    makkah: {
      name: get("makkah_hotel_name") || "",
      star: get("makkah_hotel_star") || 0,
      distance: get("makkah_distance") || "",
      walk: get("makkah_duration_walk") || "",
    },
    madinah: {
      name: get("madinah_hotel_name") || "",
      star: get("madinah_hotel_star") || 0,
      distance: get("madinah_distance") || "",
      walk: get("madinah_duration_walk") || "",
    },
  };
}

export function resolveTierTransport(pkg: PublishedPackage, tier: string) {
  switch (tier) {
    case "five-star": return pkg.five_star_transport || pkg.best_seller_transport;
    case "hemat": return pkg.hemat_transport || pkg.best_seller_transport;
    case "pelataran-hemat": return pkg.pelataran_transport || pkg.best_seller_transport;
    default: return pkg.best_seller_transport;
  }
}

/** Enumerates valid quad/triple/double room combinations that sum to exactly `adults`, sorted cheapest first. */
export function generateRoomCombos(adults: number, price: PackagePrice, discount: number): RoomCombo[] {
  if (adults <= 0) return [];
  const combos: RoomCombo[] = [];
  const maxQuad = Math.floor(adults / 4);
  const maxTriple = Math.floor(adults / 3);

  for (let q = 0; q <= maxQuad; q++) {
    for (let t = 0; t <= maxTriple; t++) {
      const remaining = adults - (q * 4 + t * 3);
      if (remaining < 0) break;
      if (remaining % 2 !== 0) continue;
      const d = remaining / 2;

      const totalRoomCost =
        q * 4 * Math.max(0, price.quad - discount) +
        t * 3 * Math.max(0, price.triple - discount) +
        d * 2 * Math.max(0, price.double - discount);

      const parts: string[] = [];
      if (q > 0) parts.push(`${q} Quad`);
      if (t > 0) parts.push(`${t} Triple`);
      if (d > 0) parts.push(`${d} Double`);

      combos.push({
        quad: q,
        triple: t,
        double: d,
        totalAdults: adults,
        totalRoomCost,
        perAdult: Math.round(totalRoomCost / adults),
        label: parts.join(" + "),
      });
    }
  }
  combos.sort((a, b) => a.totalRoomCost - b.totalRoomCost);
  return combos;
}
