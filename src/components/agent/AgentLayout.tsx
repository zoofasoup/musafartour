import { Outlet, Link, useLocation, Navigate } from "react-router-dom";
import { Suspense } from "react";
import { useAgentAuth } from "@/hooks/useAgentAuth";
import { Button } from "@/components/ui/button";
import {
  LogOut, LayoutDashboard, Package, Calendar, Wallet,
  Palette, Trophy, BookOpen
} from "lucide-react";
import musafarLogo from "@/assets/musafar-logo.svg";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { AgentHeader } from "./AgentHeader";

const navItems = [
  { 
    title: "Dashboard", 
    url: "/agent/dashboard", 
    icon: LayoutDashboard,
  },
  { 
    title: "Paket", 
    url: "/agent/packages", 
    icon: Package,
  },
  { 
    title: "Jadwal", 
    url: "/agent/schedule", 
    icon: Calendar,
  },
  { 
    title: "Komisi", 
    url: "/agent/commission", 
    icon: Wallet,
  },
  { 
    title: "Leaderboard", 
    url: "/agent/leaderboard", 
    icon: Trophy,
  },
  {
    title: "Marketing",
    url: "/agent/marketing-kit",
    icon: Palette,
  },
  {
    title: "Panduan",
    url: "/agent/guide",
    icon: BookOpen,
  },
];

const AgentLayout = ({ children }: { children?: React.ReactNode }) => {
  const location = useLocation();
  const { user, agent, loading, signOut } = useAgentAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !agent) {
    return <Navigate to="/agent/login" replace />;
  }

  if (agent.status !== 'active') {
    return <Navigate to="/agent/onboarding" replace />;
  }

  const handleSignOut = async () => {
    await signOut();
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-slate-50 flex w-full">
      <SidebarProvider defaultOpen={false}>
        <Sidebar className="border-r border-slate-100 bg-white">
          <SidebarHeader className="p-4 border-b border-slate-100 h-[72px] flex items-center justify-center">
            <Link to="/agent/dashboard" className="flex items-center gap-2 transition-transform hover:scale-105">
              <img src={musafarLogo} alt="Musafar Tour" className="h-8 w-auto" />
              <span className="font-bold text-xl text-primary hidden sm:inline-block">Agent</span>
            </Link>
          </SidebarHeader>

          <SidebarContent className="p-2 gap-0 pt-4">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.url);
                    return (
                      <SidebarMenuItem key={item.url} className="mb-1">
                        <SidebarMenuButton
                          asChild
                          className={`transition-all duration-300 ease-in-out rounded-lg ${
                            active
                              ? "bg-emerald-50 text-emerald-700"
                              : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                          }`}
                          tooltip={item.title}
                        >
                          <Link to={item.url}>
                            <Icon className={`h-4 w-4 ${active ? "text-emerald-600" : ""}`} />
                            <span className={active ? "font-semibold text-slate-900" : "font-medium"}>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="p-4">
            <Link to="/agent/profile" className="px-2 mb-4 flex flex-col hover:bg-slate-100 p-2 rounded-lg transition-all duration-300 ease-in-out cursor-pointer group">
              <p className="text-sm font-semibold text-slate-700 truncate w-full group-hover:text-slate-900">
                {agent.name}
              </p>
              <p className="text-xs text-slate-500">
                Level: {agent.experience_level === 'beginner' ? 'Pemula' : agent.experience_level === 'intermediate' ? 'Berpengalaman' : 'Profesional'}
              </p>
            </Link>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleSignOut}
                  tooltip="Sign Out"
                  className="text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-300 ease-in-out"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="font-medium">Sign Out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 h-svh p-2 sm:p-4">
          <main className="h-full w-full overflow-auto bg-[#F8FAFC] flex flex-col rounded-3xl border border-slate-100/60 relative shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
            <AgentHeader />
            <div className="p-4 sm:p-6 md:p-8 flex-1">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-12 h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                }
              >
                {children || <Outlet />}
              </Suspense>
            </div>
          </main>
        </div>
      </SidebarProvider>
    </div>
  );
};

export default AgentLayout;