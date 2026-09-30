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
