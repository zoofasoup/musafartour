import { Outlet, Link, useLocation, Navigate } from "react-router-dom";
import { Suspense } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { 
  LogOut, LayoutDashboard, Home, Image, Target, MessageSquare, 
  Images, Package, Plane, Hotel, Calendar, FileText, HelpCircle,
  Settings, Users, TrendingUp, Search, UserCircle, MessageCircleMore, UserCog, Trophy, Link2, ListChecks, Calculator, Sparkles, PanelLeft
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
} from "@/components/ui/sidebar";

import { AdminHeader as NotificationDropdown } from "./AdminHeader";
import { useState } from "react";

const AdminLayout = () => {
  const location = useLocation();
  const { user, loading, isAdmin, signOut } = useAuth();

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

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-muted-foreground mb-4">Anda tidak memiliki akses admin</p>
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

  const menuSections = [
    {
      items: [
        { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
      ]
    },
    {
      label: "CONTENT MANAGEMENT",
      items: [
        { icon: Image, label: "Hero Section", path: "/admin/hero" },
        { icon: Target, label: "Selling Points", path: "/admin/selling-points" },
        { icon: MessageSquare, label: "Testimonials", path: "/admin/testimonials" },
        { icon: Images, label: "Gallery", path: "/admin/gallery" },
      ]
    },
    {
      label: "PRODUCTS & SERVICES",
      items: [
        { icon: Package, label: "Paket Umroh", path: "/admin/packages" },
        { icon: Hotel, label: "Hotel", path: "/admin/hotels" },
        { icon: ListChecks, label: "Fasilitas Paket", path: "/admin/package-items" },
        { icon: Calendar, label: "Jadwal Keberangkatan", path: "/admin/jadwal" },
        { icon: Calculator, label: "Kalkulator Harga", path: "/admin/calculator" },
        { icon: Sparkles, label: "Calculator Leads", path: "/admin/calculator-leads" },
      ]
    },
    {
      label: "CONTENT & BLOG",
      items: [
        { icon: FileText, label: "Artikel", path: "/admin/articles" },
        { icon: HelpCircle, label: "FAQ", path: "/admin/faq" },
      ]
    },
    {
      label: "AGENTS",
      items: [
        { icon: UserCog, label: "Kelola Agent", path: "/admin/agents" },
        { icon: Trophy, label: "Gamification", path: "/admin/gamification" },
      ]
    },
    {
      label: "SETTINGS",
      items: [
        { icon: Settings, label: "Website Settings", path: "/admin/settings" },
        { icon: TrendingUp, label: "Marketing Settings", path: "/admin/settings/marketing" },
        { icon: MessageCircleMore, label: "Chat Rotation", path: "/admin/chat-rotation" },
        { icon: Link2, label: "URL Shortener", path: "/admin/url-shortener" },
        { icon: Search, label: "SEO", path: "/admin/seo" },
        { icon: Users, label: "Team", path: "/admin/team" },
      ]
    }
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <SidebarProvider>
      <SidebarLayout menuSections={menuSections} isActive={isActive} user={user} handleSignOut={handleSignOut} />
    </SidebarProvider>
  );
};

const SidebarLayout = ({ menuSections, isActive, user, handleSignOut }: any) => {
  const { open, toggleSidebar } = useSidebar();
  const [avatarColor, setAvatarColor] = useState("bg-blue-500");

  return (
    <div className="h-svh flex w-full bg-[#F1F5F9] overflow-hidden" style={{ "--sidebar-background": "transparent" } as React.CSSProperties}>
        <Sidebar collapsible="icon" className="border-none h-svh bg-transparent text-slate-600">
        <SidebarHeader className="border-b border-slate-200/50 pt-4 pb-2">
          {open ? (
            <div className="flex items-center justify-between px-4 pb-2">
              <div 
                className="h-8 w-28 bg-slate-800 [mask-image:url('/logo.webp')] [mask-size:contain] [mask-repeat:no-repeat] [mask-position:left] [-webkit-mask-image:url('/logo.webp')] [-webkit-mask-size:contain] [-webkit-mask-repeat:no-repeat] [-webkit-mask-position:left]"
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
                  className="hover:bg-slate-200/50 rounded-lg transition-all duration-300 ease-in-out mx-2 text-slate-500"
                >
                  <PanelLeft className="h-4 w-4" />
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          )}
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Back to Website" className="hover:bg-white hover:shadow-sm rounded-lg transition-all duration-300 ease-in-out mx-2 text-slate-600 mt-2">
                <Link to="/">
                  <Home className="h-4 w-4" />
                  <span className="font-medium">Back to Website</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent className="px-2 py-2">
          {menuSections.map((section: any, idx: number) => (
            <SidebarGroup key={idx}>
              {section.label && (
                <SidebarGroupLabel className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold px-2 mb-1">
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
                          className={`transition-all duration-300 ease-in-out rounded-lg ${
                            active
                              ? "bg-white shadow-sm text-slate-900 border border-slate-100"
                              : "text-slate-500 hover:bg-slate-200/50 hover:text-slate-800"
                          }`}
                          tooltip={item.label}
                        >
                          <Link to={item.path}>
                            <Icon className={`h-4 w-4 ${active ? "text-slate-900" : ""}`} />
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

        <SidebarFooter className="p-4 flex flex-col gap-2 border-t border-slate-200/50">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Notifikasi" className="hover:bg-slate-200/50 rounded-lg transition-all duration-300 ease-in-out mx-2 text-slate-600 mb-2">
                <div>
                  <NotificationDropdown />
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          <div className="flex items-center gap-3 hover:bg-slate-200/50 p-2 rounded-lg transition-all duration-300 ease-in-out group mx-2">
             <div 
               onClick={(e) => { 
                 e.preventDefault(); 
                 const avatars = ["bg-blue-500", "bg-emerald-500", "bg-purple-500", "bg-amber-500", "bg-pink-500", "bg-rose-500", "bg-indigo-500"];
                 const currentIndex = avatars.indexOf(avatarColor);
                 setAvatarColor(avatars[(currentIndex + 1) % avatars.length]); 
               }}
               className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold shrink-0 cursor-pointer transition-colors ${avatarColor}`}
               title="Ganti Avatar"
             >
               {(user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || user?.email || 'A').charAt(0).toUpperCase()}
             </div>
             
             {open && (
               <>
                 <div className="flex-1 overflow-hidden flex flex-col">
                   <p className="text-sm font-semibold text-slate-700 truncate w-full group-hover:text-slate-900">
                     {user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || user?.email}
                   </p>
                   <p className="text-[10px] text-slate-500">Super Admin</p>
                 </div>
                 <Button 
                   variant="ghost" 
                   size="icon" 
                   onClick={handleSignOut} 
                   className="shrink-0 text-slate-400 hover:text-red-600 hover:bg-red-50 h-8 w-8"
                   title="Log Out"
                 >
                   <LogOut className="h-4 w-4" />
                 </Button>
               </>
             )}
          </div>
        </SidebarFooter>
      </Sidebar>

      <div className="flex-1 h-svh p-2 sm:p-4">
        <main className="h-full w-full overflow-auto bg-[#F8FAFC] flex flex-col rounded-xl border border-slate-200/60 relative shadow-sm">
          <div className="p-6 sm:p-8 md:p-10 flex-1">
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
