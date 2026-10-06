import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, Image, Target, MessageSquare,
  Images, Package, Hotel, Calendar, FileText, HelpCircle,
  Settings, Users, TrendingUp, Search, MessageCircleMore, UserCog, Trophy, Link2, ListChecks, Calculator, Sparkles, Backpack, Wallet, Download, CalendarCheck, PenTool, BarChart3,
} from "lucide-react";

/**
 * Single source of truth for "which admin role sees which menu item".
 * Extracted verbatim from AdminLayout.tsx so that the landing redirect
 * (getAdminHomePath, used by pages/admin/Dashboard.tsx) can reuse it.
 */
export interface AdminMenuItem {
  icon: LucideIcon;
  label: string;
  path: string;
  roles: string[];
}
export interface AdminMenuSection {
  label?: string;
  items: AdminMenuItem[];
}

export const ADMIN_MENU_SECTIONS: AdminMenuSection[] = [
  {
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/admin", roles: ["admin", "superadmin", "product_admin", "product_contributor", "content_admin", "agent_admin", "cs_admin"] },
    ]
  },
  {
    // Offline booking. cs_admin (CS Administrasi) records; the owner verifies payments
    // (enforced in the database, see 20261001090100_offline_jamaah_registrations.sql).
    label: "Jamaah & Keuangan",
    items: [
      { icon: CalendarCheck, label: "Data Jamaah", path: "/admin/jamaah", roles: ["admin", "superadmin", "cs_admin"] },
      { icon: Wallet, label: "Verifikasi Pembayaran", path: "/admin/jamaah/pembayaran", roles: ["admin", "superadmin", "cs_admin"] },
      { icon: BarChart3, label: "Laporan Keuangan", path: "/admin/jamaah/keuangan", roles: ["admin", "superadmin"] },
    ]
  },
  {
    label: "Penjualan & Operasional",
    items: [
      { icon: MessageCircleMore, label: "Kotak Masuk WhatsApp", path: "/admin/whatsapp-inbox", roles: ["admin", "superadmin", "sales"] },
      { icon: Sparkles, label: "Prospek Kalkulator", path: "/admin/calculator-leads", roles: ["admin", "superadmin", "product_admin", "sales"] },
    ]
  },
  {
    label: "Produk & Layanan",
    items: [
      // product_contributor may browse packages read-only (RLS gives them SELECT only).
      { icon: Package, label: "Paket Umroh", path: "/admin/packages", roles: ["admin", "superadmin", "product_admin", "product_contributor"] },
      // The package form sends users here after saving; it was missing from the menu,
      // so the route guard bounced them to the dashboard.
      { icon: PenTool, label: "Pengembangan Produk", path: "/admin/product-development", roles: ["admin", "superadmin", "product_admin", "product_contributor"] },
      { icon: Hotel, label: "Hotel", path: "/admin/hotels", roles: ["admin", "superadmin", "product_admin"] },
      { icon: ListChecks, label: "Fasilitas Paket", path: "/admin/package-items", roles: ["admin", "superadmin", "product_admin"] },
      { icon: Backpack, label: "Perlengkapan", path: "/admin/equipment", roles: ["admin", "superadmin", "product_admin"] },
      { icon: Calendar, label: "Jadwal Keberangkatan", path: "/admin/jadwal", roles: ["admin", "superadmin", "product_admin"] },
    ]
  },
  {
    label: "Alat & Keuangan",
    items: [
      { icon: Calculator, label: "Kalkulator Harga", path: "/admin/calculator", roles: ["admin", "superadmin", "product_admin"] },
      { icon: Calculator, label: "Master COGS", path: "/admin/master-cogs", roles: ["admin", "superadmin", "product_admin"] },
    ]
  },
  {
    label: "Situs & Konten",
    items: [
      { icon: Image, label: "Hero Beranda", path: "/admin/hero", roles: ["admin", "superadmin", "content_admin"] },
      { icon: Target, label: "Keunggulan", path: "/admin/selling-points", roles: ["admin", "superadmin", "content_admin"] },
      { icon: MessageSquare, label: "Testimoni", path: "/admin/testimonials", roles: ["admin", "superadmin", "content_admin"] },
      { icon: Images, label: "Galeri", path: "/admin/gallery", roles: ["admin", "superadmin", "content_admin"] },
      { icon: FileText, label: "Artikel", path: "/admin/articles", roles: ["admin", "superadmin", "content_admin"] },
      { icon: HelpCircle, label: "FAQ", path: "/admin/faq", roles: ["admin", "superadmin", "content_admin"] },
    ]
  },
  {
    label: "Pemasaran & Agen",
    items: [
      { icon: UserCog, label: "Kelola Agen", path: "/admin/agents", roles: ["admin", "superadmin", "agent_admin"] },
      { icon: Target, label: "Lead Agen", path: "/admin/agent-leads", roles: ["admin", "superadmin", "agent_admin", "cs_admin"] },
      { icon: Trophy, label: "Gamifikasi", path: "/admin/gamification", roles: ["admin", "superadmin", "agent_admin"] },
      { icon: Download, label: "Pembuat Flyer", path: "/admin/flyer-generator", roles: ["admin", "superadmin", "content_admin"] },
      // Access is enforced in get_analytics_summary (admin/superadmin/advertiser).
      { icon: BarChart3, label: "Analitik", path: "/admin/analytics", roles: ["admin", "superadmin", "advertiser"] },
      { icon: TrendingUp, label: "Pengaturan Pemasaran", path: "/admin/settings/marketing", roles: ["admin", "superadmin", "advertiser"] },
      { icon: Wallet, label: "Biaya Iklan", path: "/admin/ad-spend", roles: ["admin", "superadmin", "advertiser"] },
      { icon: MessageCircleMore, label: "Rotasi Chat", path: "/admin/chat-rotation", roles: ["admin", "superadmin", "advertiser"] },
      { icon: Link2, label: "Pemendek Tautan", path: "/admin/url-shortener", roles: ["admin", "superadmin", "advertiser"] },
      { icon: Search, label: "SEO", path: "/admin/seo", roles: ["admin", "superadmin", "content_admin"] },
    ]
  },
  {
    label: "Pengaturan",
    items: [
      { icon: Settings, label: "Pengaturan Situs", path: "/admin/settings", roles: ["admin", "superadmin"] },
      { icon: Users, label: "Tim", path: "/admin/team", roles: ["admin", "superadmin"] },
    ]
  }
];

/** Roles that see the owner Dashboard at /admin. Everyone else is redirected. */
export const OWNER_ROLES = ["admin", "superadmin"];

export const getMenuSectionsForRole = (role: string | null | undefined): AdminMenuSection[] =>
  ADMIN_MENU_SECTIONS
    .map((section) => ({ ...section, items: section.items.filter((item) => !!role && item.roles.includes(role)) }))
    .filter((section) => section.items.length > 0);

// Where a role should land when it opens /admin. Defaults to the first menu item the
// role may open (excluding the dashboard); overrides only where the first item is not
// the role's main workspace.
const HOME_OVERRIDE: Record<string, string> = {
  product_admin: "/admin/packages",
  product_contributor: "/admin/packages",
};

/**
 * First allowed page for a staff role, or null for owners (they keep the Dashboard)
 * and for roles with no allowed page other than the dashboard / profile.
 */
export const getAdminHomePath = (role: string | null | undefined): string | null => {
  if (!role || OWNER_ROLES.includes(role)) return null;
  const items = getMenuSectionsForRole(role).flatMap((s) => s.items).filter((i) => i.path !== "/admin");
  const override = HOME_OVERRIDE[role];
  if (override && items.some((i) => i.path === override)) return override;
  return items[0]?.path ?? null;
};
