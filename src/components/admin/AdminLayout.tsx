import { Outlet, Link, useLocation, Navigate } from "react-router-dom";
import { Suspense } from "react";
import { useAuth } from "@/hooks/useAuth";
import { markInternalBrowser } from "@/lib/tracking";
import { Button } from "@/components/ui/button";
import { 
  LogOut, LayoutDashboard, Home, Image, Target, MessageSquare, 
  Images, Package, Plane, Hotel, Calendar, FileText, HelpCircle,
  Settings, Users, TrendingUp, Search, UserCircle, MessageCircleMore, UserCog, Trophy, Link2, ListChecks, Calculator, Sparkles, PanelLeft, Backpack, Wallet, Download, CalendarCheck, PenTool, BarChart3
} from "lucide-react";
import musafarLogo from "@/assets/musafar-logo-dark.svg";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
  SidebarMenuAction,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { AdminHeader as NotificationDropdown } from "./AdminHeader";

const AdminLayout = () => {
  const location = useLocation();
  const { user, loading, userRole, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // A browser that has opened the admin panel belongs to staff: exclude it from
  // ad pixels and site analytics from now on (see src/lib/tracking.ts).
  if (userRole) markInternalBrowser();

  if (!userRole) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-muted-foreground mb-4">Anda tidak memiliki akses ke panel ini.</p>
          <div className="flex gap-3 justify-center">
            <Button asChild variant="outline">
              <Link to="/">Kembali ke Home</Link>
            </Button>
            <Button variant="destructive" onClick={signOut} className="gap-2">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const menuSectionsRaw = [
    {
      items: [
        { icon: LayoutDashboard, label: "Dashboard", path: "/admin", roles: ["admin", "superadmin", "product_admin", "product_contributor", "content_admin", "agent_admin", "cs_admin"] },
      ]
    },
    {
      // Offline booking. cs_admin (CS Administrasi) records; the owner verifies payments
      // (enforced in the database, see 20261001090100_offline_jamaah_registrations.sql).
      label: "JAMAAH & KEUANGAN",
      items: [
        { icon: CalendarCheck, label: "Data Jamaah", path: "/admin/jamaah", roles: ["admin", "superadmin", "cs_admin"] },
        { icon: Wallet, label: "Verifikasi Pembayaran", path: "/admin/jamaah/pembayaran", roles: ["admin", "superadmin", "cs_admin"] },
        { icon: BarChart3, label: "Laporan Keuangan", path: "/admin/jamaah/keuangan", roles: ["admin", "superadmin"] },
      ]
    },
    {
      label: "SALES & OPERATIONS",
      items: [
        { icon: MessageCircleMore, label: "WhatsApp Inbox", path: "/admin/whatsapp-inbox", roles: ["admin", "superadmin", "sales"] },
        { icon: Sparkles, label: "Calculator Leads", path: "/admin/calculator-leads", roles: ["admin", "superadmin", "product_admin", "sales"] },
      ]
    },
    {
      label: "PRODUCTS & SERVICES",
      items: [
        // product_contributor may browse packages read-only (RLS gives them SELECT only).
        { icon: Package, label: "Paket Umroh", path: "/admin/packages", roles: ["admin", "superadmin", "product_admin", "product_contributor"] },
        // The package form sends users here after saving; it was missing from the menu,
        // so the route guard bounced them to the dashboard.
        { icon: PenTool, label: "Product Development", path: "/admin/product-development", roles: ["admin", "superadmin", "product_admin", "product_contributor"] },
        { icon: Hotel, label: "Hotel", path: "/admin/hotels", roles: ["admin", "superadmin", "product_admin"] },
        { icon: ListChecks, label: "Fasilitas Paket", path: "/admin/package-items", roles: ["admin", "superadmin", "product_admin"] },
        { icon: Backpack, label: "Perlengkapan", path: "/admin/equipment", roles: ["admin", "superadmin", "product_admin"] },
        { icon: Calendar, label: "Jadwal Keberangkatan", path: "/admin/jadwal", roles: ["admin", "superadmin", "product_admin"] },
      ]
    },
    {
      label: "TOOLS & FINANCE",
      items: [
        { icon: Calculator, label: "Kalkulator Harga", path: "/admin/calculator", roles: ["admin", "superadmin", "product_admin"] },
        { icon: Calculator, label: "Master COGS", path: "/admin/master-cogs", roles: ["admin", "superadmin", "product_admin"] },
      ]
    },
    {
      label: "WEBSITE & CONTENT",
      items: [
        { icon: Image, label: "Hero Section", path: "/admin/hero", roles: ["admin", "superadmin", "content_admin"] },
        { icon: Target, label: "Selling Points", path: "/admin/selling-points", roles: ["admin", "superadmin", "content_admin"] },
        { icon: MessageSquare, label: "Testimonials", path: "/admin/testimonials", roles: ["admin", "superadmin", "content_admin"] },
        { icon: Images, label: "Gallery", path: "/admin/gallery", roles: ["admin", "superadmin", "content_admin"] },
        { icon: FileText, label: "Artikel", path: "/admin/articles", roles: ["admin", "superadmin", "content_admin"] },
        { icon: HelpCircle, label: "FAQ", path: "/admin/faq", roles: ["admin", "superadmin", "content_admin"] },
      ]
    },
    {
      label: "MARKETING & AGENTS",
      items: [
        { icon: UserCog, label: "Kelola Agent", path: "/admin/agents", roles: ["admin", "superadmin", "agent_admin"] },
        { icon: Trophy, label: "Gamification", path: "/admin/gamification", roles: ["admin", "superadmin", "agent_admin"] },
        { icon: Download, label: "Flyer Generator", path: "/admin/flyer-generator", roles: ["admin", "superadmin", "content_admin"] },
        // Access is enforced in get_analytics_summary (admin/superadmin/advertiser).
        { icon: BarChart3, label: "Analytics", path: "/admin/analytics", roles: ["admin", "superadmin", "advertiser"] },
        { icon: TrendingUp, label: "Marketing Settings", path: "/admin/settings/marketing", roles: ["admin", "superadmin", "advertiser"] },
        { icon: Wallet, label: "Ad Spend", path: "/admin/ad-spend", roles: ["admin", "superadmin", "advertiser"] },
        { icon: MessageCircleMore, label: "Chat Rotation", path: "/admin/chat-rotation", roles: ["admin", "superadmin", "advertiser"] },
        { icon: Link2, label: "URL Shortener", path: "/admin/url-shortener", roles: ["admin", "superadmin", "advertiser"] },
        { icon: Search, label: "SEO", path: "/admin/seo", roles: ["admin", "superadmin", "content_admin"] },
      ]
    },
    {
      label: "SETTINGS",
      items: [
        { icon: Settings, label: "Website Settings", path: "/admin/settings", roles: ["admin", "superadmin"] },
        { icon: Users, label: "Team", path: "/admin/team", roles: ["admin", "superadmin"] },
      ]
    }
  ];

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

  // "Semua jamaah" is a view inside Data Jamaah, not a menu item of its own.
  const isActive = (path: string) => location.pathname === path || (path === "/admin/jamaah" && (location.pathname === "/admin/jamaah/semua" || location.pathname === "/admin/jamaah/masuk"));

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <SidebarProvider defaultOpen={false}>
      <SidebarLayout menuSections={menuSections} isActive={isActive} user={user} userRole={userRole} handleSignOut={handleSignOut} />
    </SidebarProvider>
  );
};

const SidebarLayout = ({ menuSections, isActive, user, userRole, handleSignOut }: any) => {
  const { open, toggleSidebar } = useSidebar();
  const avatarEmoji = user?.user_metadata?.avatar_emoji || "😎";

  return (
    <div className="h-svh flex w-full bg-white overflow-hidden">
        <Sidebar collapsible="icon" className="border-r border-slate-200 h-svh bg-[#FAFAFA] text-slate-600">
        <SidebarHeader className="border-b border-slate-200 pt-4 pb-2">
          {open ? (
            <div className="flex items-center justify-between px-2 pb-2">
              <div 
                className="h-8 w-28 bg-slate-900 [mask-image:url('/logo.webp')] [mask-size:contain] [mask-repeat:no-repeat] [mask-position:left] [-webkit-mask-image:url('/logo.webp')] [-webkit-mask-size:contain] [-webkit-mask-repeat:no-repeat] [-webkit-mask-position:left]"
                aria-label="Musafar Tour"
              />
              <SidebarTrigger className="text-slate-500 hover:bg-slate-200 rounded-lg" />
            </div>
          ) : (
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={toggleSidebar} 
                  tooltip="Expand Sidebar" 
                  className="hover:bg-slate-200 transition-all duration-300 ease-in-out text-slate-500"
                >
                  <PanelLeft className="h-4 w-4" />
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          )}
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Back to Website" className="hover:bg-white hover:shadow-sm hover:border-slate-200 border border-transparent rounded-lg transition-all duration-300 ease-in-out text-slate-600 mt-2">
                <Link to="/">
                  <Home className="h-4 w-4" />
                  <span className="font-medium">Back to Website</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent className="py-2">
          {menuSections.map((section: any, idx: number) => (
            <SidebarGroup key={idx} className="mb-2">
              {section.label && (
                <SidebarGroupLabel className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold px-2 mb-2">
                  {section.label}
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu>
                  {section.items.map((item: any) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                      <SidebarMenuItem key={item.path} className="mb-1">
                        <SidebarMenuButton
                          asChild
                          className={`transition-all duration-200 ease-in-out rounded-lg ${
                            active
                              ? "bg-white shadow-sm text-slate-900 border border-slate-200"
                              : "text-slate-500 hover:bg-slate-200/50 hover:text-slate-800 border border-transparent"
                          }`}
                          tooltip={item.label}
                        >
                          <Link to={item.path}>
                            <Icon className={`h-[18px] w-[18px] ${active ? "text-slate-900" : ""}`} />
                            <span className={active ? "font-semibold text-slate-900" : "font-medium"}>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter className="pb-4 flex flex-col gap-2 border-t border-slate-200">
          <SidebarMenu>
            <SidebarMenuItem>
              <NotificationDropdown />
            </SidebarMenuItem>
          </SidebarMenu>

          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild tooltip="Profil" className="hover:bg-slate-200/50 transition-all duration-300">
                <Link to="/admin/profile">
                  <Avatar className="h-8 w-8 rounded-full border border-slate-200">
                    <AvatarFallback className="bg-white text-lg font-semibold text-slate-800">
                      {avatarEmoji}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight overflow-hidden">
                    <span className="truncate font-semibold text-slate-800 group-hover:text-slate-900 leading-tight">
                      {user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || user?.email}
                    </span>
                    <span className="truncate text-[10px] text-slate-500 leading-tight capitalize">
                      {userRole ? userRole.replace('_', ' ') : 'Loading...'}
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
              {open && (
                <SidebarMenuAction 
                  onClick={handleSignOut} 
                  title="Log Out" 
                  className="mr-1 text-slate-400 hover:text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                </SidebarMenuAction>
              )}
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <div className="flex-1 h-svh min-w-0">
        <main className="h-full w-full overflow-auto bg-white flex flex-col relative">
          
          {/* Top Header matching the design */}
          <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 sm:px-10 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
              <span>Main Menu</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-800 font-semibold flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4" />
                {menuSections.flatMap(s => s.items).find(i => i.path === (['/admin/jamaah/semua', '/admin/jamaah/masuk'].includes(location.pathname) ? '/admin/jamaah' : location.pathname))?.label || 'Dashboard'}
              </span>
            </div>
            
            <div className="hidden md:flex items-center">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search anything..." 
                  className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm w-[280px] focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 transition-all text-slate-800 placeholder:text-slate-400"
                />
              </div>
            </div>
          </header>

          <div className="p-6 sm:p-10 flex-1">
            <Suspense
              fallback={
                <div className="flex items-center justify-center py-12 h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              }
            >
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
