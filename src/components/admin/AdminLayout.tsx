import { Outlet, Link, useLocation, Navigate } from "react-router-dom";
import { loginUrlFor } from "@/lib/adminNext";
import { menuBadgeFor, useAdminWorkCounts } from "@/hooks/useAdminWorkCounts";
import { ADMIN_MENU_SECTIONS } from "./adminMenu";
import { useAuth } from "@/hooks/useAuth";
import { markInternalBrowser } from "@/lib/tracking";
import { Button } from "@/components/ui/button";
import {
  LogOut, LayoutDashboard, Home, Image, Target, MessageSquare,
  Images, Package, Hotel, Calendar, FileText, HelpCircle,
  Settings, Users, TrendingUp, Search, MessageCircleMore, UserCog, Trophy, Link2, ListChecks, Calculator, Sparkles, Backpack, Wallet, Download, CalendarCheck, PenTool, BarChart3
} from "lucide-react";
import { AppShell, type ShellNavGroup } from "@/components/shell";
import { AdminHeader as NotificationDropdown } from "./AdminHeader";

/** Role names as people read them (the database keeps the raw role string). */
const ROLE_LABELS: Record<string, string> = {
  superadmin: "Superadmin",
  admin: "Admin",
  product_admin: "Admin Produk",
  product_contributor: "Kontributor Produk",
  content_admin: "Admin Konten",
  agent_admin: "Admin Agen",
  cs_admin: "CS Administrasi",
  finance: "Finance",
  sales: "Sales",
  advertiser: "Advertiser",
};

const BADGE_LABEL: Record<string, string> = {
  "/admin/jamaah": "pendaftaran baru menunggu",
  "/admin/jamaah/pembayaran": "pembayaran menunggu verifikasi",
  "/admin/pembayaran-komisi": "komisi menunggu persetujuan",
  "/admin/agents": "agen menunggu persetujuan",
};

const AdminLayout = () => {
  const location = useLocation();
  const { user, loading, userRole, signOut } = useAuth();
  // Work-queue counts for the menu badges: one light call every minute, only once a staff role is known
  const { data: workCounts } = useAdminWorkCounts(!!user && !!userRole);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={loginUrlFor(location.pathname, location.search)} replace />;
  }

  // A browser that has opened the admin panel belongs to staff: exclude it from
  // ad pixels and site analytics from now on (see src/lib/tracking.ts).
  if (userRole) markInternalBrowser();

  if (!userRole) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Akses Ditolak</h2>
          <p className="text-muted-foreground mb-4">Kamu tidak punya akses ke panel ini.</p>
          <div className="flex gap-3 justify-center">
            <Button asChild variant="outline">
              <Link to="/">Kembali ke Beranda</Link>
            </Button>
            <Button variant="destructive" onClick={signOut} className="gap-2">
              <LogOut className="h-4 w-4" />
              Keluar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const menuSectionsRaw = ADMIN_MENU_SECTIONS;

  // Filter menu sections based on user role
  const role = userRole || "";
  const menuSections = menuSectionsRaw
    .map(section => ({
      ...section,
      items: section.items.filter(item => item.roles.includes(role))
    }))
    .filter(section => section.items.length > 0);

  // Route protection
  const allAllowedPaths = menuSections.flatMap(section => section.items.map(item => item.path));
  
  // Also allow sub-routes of allowed paths (e.g. if /admin/packages is allowed, /admin/packages/new is allowed)
  const isPathAllowed = (path: string) => {
    if (path === "/admin/profile") return true; // Everyone can access their own profile
    if (path === "/admin") return true; // Everyone can access dashboard
    return allAllowedPaths.some(allowedPath => path === allowedPath || path.startsWith(`${allowedPath}/`));
  };

  if (!isPathAllowed(location.pathname)) {
    return <Navigate to="/admin" replace />;
  }

  const handleSignOut = async () => {
    await signOut();
  };

  // Same menu, same roles; the shell wants it as title/url. "Semua jamaah" and "Masuk" are views inside Data Jamaah, not menu items of their own.
  const nav: ShellNavGroup[] = menuSections.map(section => ({
    label: section.label,
    items: section.items.map(item => ({
      title: item.label,
      url: item.path,
      icon: item.icon,
      end: item.path === "/admin",
      badge: menuBadgeFor(item.path, workCounts),
      badgeLabel: BADGE_LABEL[item.path],
      alsoActive: item.path === "/admin/jamaah" ? ["/admin/jamaah/semua", "/admin/jamaah/masuk"] : undefined,
    })),
  }));

  const meta = user.user_metadata ?? {};
  const name: string = meta.full_name || meta.name || user.email?.split("@")[0] || user.email || "Admin";

  return (
    <AppShell
      nav={nav}
      brandTo="/admin"
      brandBadge="Admin"
      titleFallback="Dashboard"
      extraTitles={[{ path: "/admin/profile", title: "Profil Saya" }]}
      documentTitleSuffix="Admin Musafar Tour"
      profile={{ name, subtitle: ROLE_LABELS[userRole] ?? userRole.replace(/_/g, " "), profileUrl: "/admin/profile", avatarEmoji: meta.avatar_emoji || undefined }}
      onSignOut={handleSignOut}
      sidebarLinks={[{ title: "Kembali ke situs", icon: Home, to: "/" }]}
      headerActions={<NotificationDropdown />}
      searchable
      contentWidth="full"
    >
      <Outlet />
    </AppShell>
  );
};

export default AdminLayout;
