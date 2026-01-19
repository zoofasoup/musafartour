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
