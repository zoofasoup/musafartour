import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatWhatsAppUrl(phoneNumber: string, message: string) {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

/**
 * Format number with Indonesian thousand separator (dot)
 * Example: 25000000 -> "25.000.000"
 */
export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '0';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  return num.toLocaleString('id-ID');
}

/**
 * Format currency in Indonesian Rupiah
 * Example: 25000000 -> "Rp 25.000.000"
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format price in millions (Juta) for display
 * Example: 25000000 -> "25 Juta"
 */
export function formatPriceJuta(price: number | null | undefined): string {
  if (price === null || price === undefined) return '0 Juta';
  const millions = price / 1000000;
  return millions % 1 === 0
    ? `${millions} Juta`
    : `${millions.toFixed(1).replace('.', ',')} Juta`;
}

type TierPrice = { quad?: number; triple?: number; double?: number } | null | undefined | unknown;

interface PackageWithTierPrices {
  package_price?: TierPrice;
  hemat_package_price?: TierPrice;
  five_star_package_price?: TierPrice;
  pelataran_package_price?: TierPrice;
  available_tiers?: string[] | null;
}

/**
 * Packages only carry a real price on their own tier's price column
 * (package_price = nyaman, hemat_package_price = hemat, etc). The other
 * columns are zeroed out. Resolve the price for a package's actual tier,
 * falling back to any tier that has a price set.
 */
export function getTierPrice(pkg: PackageWithTierPrices): { quad: number; triple: number; double: number } {
  const tier = pkg.available_tiers?.[0] || "nyaman";
  const byTier = (t: string): TierPrice => {
    switch (t) {
      case "hemat": return pkg.hemat_package_price;
      case "five-star": return pkg.five_star_package_price;
      case "pelataran-hemat":
      case "pelataran": return pkg.pelataran_package_price;
      default: return pkg.package_price;
    }
  };
  const candidates = [
    byTier(tier),
    pkg.package_price,
    pkg.hemat_package_price,
    pkg.five_star_package_price,
    pkg.pelataran_package_price,
  ] as { quad?: number; triple?: number; double?: number }[];
  const found = candidates.find((p) => (p?.quad ?? 0) > 0);
  return { quad: found?.quad || 0, triple: found?.triple || 0, double: found?.double || 0 };
}

interface PackageAvailability {
  is_sold_out?: boolean | null;
  slots_total?: number | null;
  slots_filled?: number | null;
  departure_date?: string | null;
}

/**
 * A package is unbookable if it's manually flagged sold out, its seats are
 * full (slots_filled >= slots_total), or its departure date has already
 * passed - a package can go stale on a public listing without anyone
 * flipping is_sold_out or the sheet ever reporting 0 seats left.
 */
export function isPackageUnavailable(pkg: PackageAvailability): boolean {
  if (pkg.is_sold_out) return true;
  if (pkg.slots_total && (pkg.slots_filled || 0) >= pkg.slots_total) return true;
  if (pkg.departure_date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(pkg.departure_date) < today) return true;
  }
  return false;
}

export interface TierAccentClasses {
  /** Light tint background, e.g. for badges */
  bg: string;
  /** Dark, readable text on the light tint */
  text: string;
  /** Slightly stronger tint, for icon circles / dividers */
  ring: string;
  /** Border matching the tint family */
  border: string;
}

/**
 * The site's real color system is per-package-tier, not the neutral (zero-
 * saturation) --primary token - use this wherever a package needs an actual
 * brand-colored accent (price cards, badges, route graphics).
 */
export function getTierAccentClasses(title: string | undefined): TierAccentClasses {
  const t = (title || '').toLowerCase();

  if (t.includes('pelataran hemat')) return { bg: 'bg-orange-50', text: 'text-orange-700', ring: 'bg-orange-100', border: 'border-orange-100' };
  if (t.includes('hemat')) return { bg: 'bg-green-50', text: 'text-green-700', ring: 'bg-green-100', border: 'border-green-100' };
  if (t.includes('nyaman')) return { bg: 'bg-blue-50', text: 'text-blue-700', ring: 'bg-blue-100', border: 'border-blue-100' };
  if (t.includes('plus')) return { bg: 'bg-teal-50', text: 'text-teal-700', ring: 'bg-teal-100', border: 'border-teal-100' };
  if (t.includes('vip') || t.includes('bintang 5') || t.includes('five star') || t.includes('luxury')) {
    return { bg: 'bg-purple-50', text: 'text-purple-700', ring: 'bg-purple-100', border: 'border-purple-100' };
  }

  return { bg: 'bg-rose-50', text: 'text-rose-700', ring: 'bg-rose-100', border: 'border-rose-100' }; // Default fallback
}

/**
 * Get background and text color classes for price based on package classification (title)
 */
export function getPriceBadgeStyle(title: string | undefined): string {
  if (!title) return 'bg-primary/10 text-primary';
  const { bg, text } = getTierAccentClasses(title);
  return `${bg} ${text}`;
}

/**
 * Safely parse list strings or arrays from Supabase
 */
export function parseListItems(items: string | string[] | null | undefined): string[] {
  if (!items) return [];
  if (Array.isArray(items)) return items;
  try {
    const parsed = JSON.parse(items);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // If not JSON, split by newlines as fallback
    return items.split('\n').filter(Boolean);
  }
}

/**
 * Requests a downscaled version of a Supabase Storage image via its
 * /render/image/public/ transform endpoint, for contexts (thumbnails, cards)
 * that don't need the full original resolution. Uses resize=contain
 * (resizing_type:fit) with only `width` set, so the image is scaled down
 * proportionally with no cropping - an earlier attempt at this used the
 * default resizing_type:fill (which forces a target aspect ratio and crops
 * to match it) and visibly cropped/zoomed images, so it was reverted. This
 * mode preserves the original aspect ratio; container-level CSS
 * (object-cover) still handles cropping to fit the card exactly as it does
 * for full-size images.
 * Non-Supabase-Storage URLs (external links, /placeholder.svg) are returned
 * unchanged.
 */
export function getOptimizedImageUrl(url: string | null | undefined, width?: number, quality = 75): string {
  if (!url) return '';
  const marker = '/storage/v1/object/public/';
  const idx = url.indexOf(marker);
  if (idx === -1 || !width) return url;
  const transformed = url.slice(0, idx) + '/storage/v1/render/image/public/' + url.slice(idx + marker.length);
  const separator = transformed.includes('?') ? '&' : '?';
  return `${transformed}${separator}width=${width}&resize=contain&quality=${quality}`;
}
