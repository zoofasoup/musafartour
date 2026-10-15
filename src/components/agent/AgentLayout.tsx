import { useEffect } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { useAgentAuth } from "@/hooks/useAgentAuth";
import {
  House, Luggage, CalendarDays, HandCoins,
  Megaphone, Medal, BookOpenText, UserRoundPlus, UsersRound, LifeBuoy, Target,
} from "lucide-react";
import { AppShell, type ShellNavGroup, type ShellNavItem } from "@/components/shell";
import { agentLevelLabel } from "@/lib/agentLevels";
import { agentCsWhatsAppUrl } from "@/lib/agentSupport";
import { agentAvatarUrl } from "@/lib/agentAvatar";

const navItems: ShellNavItem[] = [
  { title: "Dashboard", url: "/agent/dashboard", icon: House },
  { title: "Daftarkan Jamaah", url: "/agent/daftar-jamaah", icon: UserRoundPlus },
  { title: "Lead Saya", url: "/agent/leads", icon: Target },
  { title: "Jamaah Saya", url: "/agent/jamaah", icon: UsersRound },
  { title: "Paket", url: "/agent/packages", icon: Luggage },
  { title: "Jadwal", url: "/agent/schedule", icon: CalendarDays },
  { title: "Komisi", url: "/agent/commission", icon: HandCoins },
  { title: "Peringkat", url: "/agent/leaderboard", icon: Medal },
  { title: "Marketing", url: "/agent/marketing-kit", icon: Megaphone },
  { title: "Panduan", url: "/agent/guide", icon: BookOpenText },
];

const nav: ShellNavGroup[] = [{ items: navItems }];

// DESIGN.md: four main pages on the phone bar, everything else behind "Lainnya".
const SHORT_TITLE: Record<string, string> = { "/agent/dashboard": "Beranda", "/agent/jamaah": "Jamaah" };
const bottomNav: ShellNavItem[] = ["/agent/dashboard", "/agent/jamaah", "/agent/packages", "/agent/commission"]
  .map((url) => navItems.find((i) => i.url === url)!)
  .map((i) => ({ ...i, title: SHORT_TITLE[i.url] ?? i.title }));
const bottomAction = navItems.find((i) => i.url === "/agent/daftar-jamaah")!;

const AgentLayout = ({ children }: { children?: React.ReactNode }) => {
  const { user, agent, loading, signOut } = useAgentAuth();
  // Marks the portal so dialogs, sheets, menus and selects (which render outside the page) take its look.
  useEffect(() => {
    document.documentElement.classList.add("pkg-agent");
    return () => document.documentElement.classList.remove("pkg-agent");
  }, []);

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
      profile={{ name: agent.name, subtitle: `Level ${agentLevelLabel(agent.level)}`, profileUrl: "/agent/profile", avatarUrl: agentAvatarUrl(agent.id) }}
      onSignOut={signOut}
      bottomNav={bottomNav}
      bottomAction={bottomAction}
      inkHeaderOnPhone
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
