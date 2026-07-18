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

/**
 * Get background and text color classes for price based on package classification (title)
 */
export function getPriceBadgeStyle(title: string | undefined): string {
  if (!title) return 'bg-primary/10 text-primary';
  const t = title.toLowerCase();
  
  if (t.includes('pelataran hemat')) return 'bg-orange-50 text-orange-700';
  if (t.includes('hemat')) return 'bg-green-50 text-green-700';
  if (t.includes('nyaman')) return 'bg-blue-50 text-blue-700';
  if (t.includes('plus')) return 'bg-teal-50 text-teal-700';
  if (t.includes('vip') || t.includes('bintang 5') || t.includes('five star') || t.includes('luxury')) return 'bg-purple-50 text-purple-700';
  
  return 'bg-rose-50 text-rose-700'; // Default fallback color
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
 * Returns the image URL as-is. Previously used Supabase's /render/image/public/
 * endpoint for on-the-fly WebP conversion, but that applies resizing_type:fill
 * by default which crops/zooms images. Images are now served directly.
 */
export function getOptimizedImageUrl(url: string | null | undefined, _width?: number, _quality = 80): string {
  if (!url) return '';
  return url;
}
