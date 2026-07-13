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
