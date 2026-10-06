import { Outlet, Link, useLocation, Navigate } from "react-router-dom";
import { Suspense } from "react";
import { useAgentAuth } from "@/hooks/useAgentAuth";
import { Button } from "@/components/ui/button";
import {
  LogOut, LayoutDashboard, Package, Calendar, Wallet,
  Palette, Trophy, BookOpen, UserPlus, Users
} from "lucide-react";
import musafarLogo from "@/assets/musafar-logo-dark.svg";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { AgentHeader } from "./AgentHeader";
import { agentLevelLabel } from "@/lib/agentLevels";

const navItems = [
  { 
    title: "Dashboard", 
    url: "/agent/dashboard", 
    icon: LayoutDashboard,
  },
  { 
    title: "Daftarkan Jamaah", 
    url: "/agent/daftar-jamaah", 
    icon: UserPlus,
  },
  { 
    title: "Jamaah Saya", 
    url: "/agent/jamaah", 
    icon: Users,
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
    title: "Peringkat", 
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
    <div className="min-h-screen bg-muted flex w-full">
      {/* Open on wide screens so the menu is there when an agent lands; phones keep the slide-in menu. */}
      <SidebarProvider defaultOpen={typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches}>
        <Sidebar className="border-r border-border bg-muted">
          <SidebarHeader className="p-4 border-b border-border h-[72px] flex flex-row items-center justify-between gap-2">
            <Link to="/agent/dashboard" className="flex items-center gap-2">
              <img src={musafarLogo} alt="Musafar Tour" className="h-8 w-auto" />
              <span className="font-bold text-xl text-primary hidden sm:inline-block">Agen</span>
            </Link>
            <SidebarTrigger className="hidden h-9 w-9 shrink-0 text-muted-foreground hover:bg-field-hover lg:inline-flex" aria-label="Ciutkan menu" />
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
                              ? "bg-card text-foreground shadow-sm"
                              : "text-muted-foreground hover:bg-field-hover hover:text-foreground"
                          }`}
                          tooltip={item.title}
                        >
                          <Link to={item.url}>
                            <Icon className={`h-4 w-4 ${active ? "text-foreground" : ""}`} />
                            <span className={active ? "font-semibold text-foreground" : "font-medium"}>{item.title}</span>
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
            <Link to="/agent/profile" className="px-2 mb-4 flex flex-col hover:bg-field-hover p-2 rounded-lg transition-all duration-300 ease-in-out cursor-pointer group">
              <p className="text-sm font-semibold text-foreground/80 truncate w-full group-hover:text-foreground">
                {agent.name}
              </p>
              <p className="text-xs text-muted-foreground">
                Level {agentLevelLabel(agent.level)}
              </p>
            </Link>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleSignOut}
                  tooltip="Keluar"
                  className="text-muted-foreground hover:text-destructive hover:bg-status-bad-bg rounded-lg transition-all duration-300 ease-in-out"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="font-medium">Keluar</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        {/* min-w-0: a flex child never shrinks below its content, so one wide table or calendar widened the whole page on phones. */}
        <div className="min-w-0 flex-1 h-svh p-2 sm:p-4">
          <main className="h-full w-full overflow-auto bg-[#F8FAFC] flex flex-col rounded-3xl border border-border/60 relative shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
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