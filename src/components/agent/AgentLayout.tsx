import { Outlet, Navigate } from "react-router-dom";
import { useAgentAuth } from "@/hooks/useAgentAuth";
import {
  LayoutDashboard, Package, Calendar, Wallet,
  Palette, Trophy, BookOpen, UserPlus, Users, LifeBuoy, Target,
} from "lucide-react";
import { AppShell, type ShellNavGroup, type ShellNavItem } from "@/components/shell";
import { agentLevelLabel } from "@/lib/agentLevels";
import { agentCsWhatsAppUrl } from "@/lib/agentSupport";

const navItems: ShellNavItem[] = [
  { title: "Dashboard", url: "/agent/dashboard", icon: LayoutDashboard },
  { title: "Daftarkan Jamaah", url: "/agent/daftar-jamaah", icon: UserPlus },
  { title: "Lead Saya", url: "/agent/leads", icon: Target },
  { title: "Jamaah Saya", url: "/agent/jamaah", icon: Users },
  { title: "Paket", url: "/agent/packages", icon: Package },
  { title: "Jadwal", url: "/agent/schedule", icon: Calendar },
  { title: "Komisi", url: "/agent/commission", icon: Wallet },
  { title: "Peringkat", url: "/agent/leaderboard", icon: Trophy },
  { title: "Marketing", url: "/agent/marketing-kit", icon: Palette },
  { title: "Panduan", url: "/agent/guide", icon: BookOpen },
];

const nav: ShellNavGroup[] = [{ items: navItems }];

// DESIGN.md: four main pages on the phone bar, everything else behind "Lainnya".
const bottomNav: ShellNavItem[] = ["/agent/dashboard", "/agent/jamaah", "/agent/packages", "/agent/commission"]
  .map((url) => navItems.find((i) => i.url === url)!);

const AgentLayout = ({ children }: { children?: React.ReactNode }) => {
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

  return (
    <AppShell
      nav={nav}
      brandTo="/agent/dashboard"
      brandBadge="Agen"
      titleFallback="Portal Agen"
      extraTitles={[{ path: "/agent/profile", title: "Profil" }]}
      documentTitleSuffix="Portal Agen Musafar Tour"
      profile={{ name: agent.name, subtitle: `Level ${agentLevelLabel(agent.level)}`, profileUrl: "/agent/profile" }}
      onSignOut={signOut}
      bottomNav={bottomNav}
      sidebarExtra={
        <div className="rounded-md bg-card p-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Agent ID</p>
          <p className="mt-0.5 truncate text-sm font-semibold text-foreground">{agent.referral_code}</p>
        </div>
      }
      sidebarLinks={[
        {
          title: "Butuh bantuan? Hubungi PIC Agen",
          icon: LifeBuoy,
          href: agentCsWhatsAppUrl(agent.name, agent.referral_code),
        },
      ]}
    >
      {children || <Outlet />}
    </AppShell>
  );
};

export default AgentLayout;
