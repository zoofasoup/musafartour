import { todayJakarta } from "@/lib/utils";
/**
 * Package lifecycle and who may change it.
 *
 * draft     -> still being discussed; nothing may be promoted from it.
 * final     -> data is fixed: flyers, catalogues and agent materials may be made.
 * published -> on sale on the website (the only status public pages read).
 */
export type PackageStatus = "draft" | "final" | "published";

export const PACKAGE_STATUSES: { value: PackageStatus; label: string; description: string }[] = [
  { value: "draft", label: "Draft", description: "Masih dibahas, belum boleh dipromosikan" },
  { value: "final", label: "Final", description: "Data sudah fix, materi promosi boleh dibuat" },
  { value: "published", label: "Tayang", description: "Dijual dan tampil di website" },
];

export const packageStatusLabel = (status: string | null | undefined) =>
  PACKAGE_STATUSES.find((s) => s.value === status)?.label ?? (status || "Draft");

export const packageStatusBadgeClass = (status: string | null | undefined) => {
  switch (status) {
    case "published":
      return "bg-emerald-500 hover:bg-emerald-600 text-white border-transparent";
    case "final":
      return "bg-sky-100 text-sky-800 hover:bg-sky-100 border-sky-200";
    default:
      return "bg-slate-100 text-slate-600 hover:bg-slate-100 border-slate-200";
  }
};

/** Once a package is Final or on sale, every change must say why (shown in the change log). */
export const statusNeedsChangeReason = (status: string | null | undefined) =>
  status === "final" || status === "published";

/**
 * Roles that decide on package data: the PIC (product_admin) and superadmin/admin.
 * Mirrors the RLS write policies on public.packages.
 */
export const PACKAGE_EDITOR_ROLES = ["admin", "superadmin", "product_admin"];

/** Everyone who may open the package pages (editors plus read-only contributors). */
export const PACKAGE_VIEWER_ROLES = [...PACKAGE_EDITOR_ROLES, "product_contributor"];

export const canEditPackages = (role: string | null | undefined) =>
  !!role && PACKAGE_EDITOR_ROLES.includes(role);

/**
 * Whole days from today (Jakarta) until departure: positive = still ahead, 0 = leaves today,
 * negative = already left. Same "today" as the public site's departed filter.
 */
export const daysUntilDeparture = (departureDate: string, today: string = todayJakarta()) => {
  const day = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
  return Math.round((day(departureDate) - day(today)) / 86_400_000);
};

/**
 * "H-24" under a month out; from 30 days on it switches to whole months ("H-2 Bulan"),
 * so a far-off departure doesn't read as "H-86". Past/today cases are spelled out.
 */
export const departureCountdownLabel = (daysLeft: number) => {
  if (daysLeft > 0) return daysLeft >= 30 ? `H-${Math.floor(daysLeft / 30)} Bulan` : `H-${daysLeft}`;
  return daysLeft === 0 ? "Berangkat hari ini" : `${-daysLeft} hari lalu`;
};

/** Postgres foreign-key violation: the package still has jamaah registered on it. */
export const PACKAGE_HAS_JAMAAH_MESSAGE = "Paket ini sudah punya data jamaah, jadi tidak bisa dihapus.";
