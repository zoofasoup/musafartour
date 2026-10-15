import { useEffect } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { useAgentAuth } from "@/hooks/useAgentAuth";
import {
  House, CalendarDays, Banknote,
  Megaphone, Medal, BookOpenText, UserRoundPlus, UsersRound, LifeBuoy, Copy, Award,
} from "lucide-react";
import { AppShell, type ShellNavGroup, type ShellNavItem } from "@/components/shell";
import { agentLevelLabel } from "@/lib/agentLevels";
import { agentCsWhatsAppUrl } from "@/lib/agentSupport";
import { agentAvatarUrl, useAvatarVersion } from "@/lib/agentAvatar";
import { copyText } from "@/lib/copy";
import { BadgeCelebration } from "@/components/agent/BadgeCelebration";

const navItems: ShellNavItem[] = [
  { title: "Dashboard", url: "/agent/dashboard", icon: House },
  { title: "Daftarkan Jamaah", url: "/agent/daftar-jamaah", icon: UserRoundPlus },
  { title: "Jamaah Saya", url: "/agent/jamaah", icon: UsersRound },
  { title: "Jadwal", url: "/agent/schedule", icon: CalendarDays },
  { title: "Komisi", url: "/agent/commission", icon: Banknote },
  { title: "Peringkat", url: "/agent/leaderboard", icon: Medal },
  { title: "Pencapaian", url: "/agent/achievements", icon: Award },
  // Packages live inside Marketing now ("Paket" side): the package pages stay reachable from there and light this item up.
  { title: "Marketing", url: "/agent/marketing-kit", icon: Megaphone, alsoActive: ["/agent/packages"] },
  { title: "Panduan", url: "/agent/guide", icon: BookOpenText },
];

const byUrl = (...urls: string[]) => urls.map((url) => navItems.find((i) => i.url === url)!);
// The drawer groups the pages by what the agent is doing; the phone bar picks its own four below.
const nav: ShellNavGroup[] = [
  { items: byUrl("/agent/dashboard", "/agent/jamaah", "/agent/marketing-kit", "/agent/schedule") },
  { label: "Akun", items: byUrl("/agent/commission", "/agent/leaderboard", "/agent/achievements", "/agent/guide") },
];

// DESIGN.md: four main pages on the phone bar, everything else behind "Lainnya".
const SHORT_TITLE: Record<string, string> = { "/agent/dashboard": "Beranda" };
const bottomNav: ShellNavItem[] = ["/agent/dashboard", "/agent/leaderboard", "/agent/marketing-kit", "/agent/commission"]
  .map((url) => navItems.find((i) => i.url === url)!)
  .map((i) => ({ ...i, title: SHORT_TITLE[i.url] ?? i.title }));
// The round button in the middle: the agent's own jamaah.
const bottomAction = navItems.find((i) => i.url === "/agent/jamaah")!;

const AgentLayout = ({ children }: { children?: React.ReactNode }) => {
  const { user, agent, loading, signOut } = useAgentAuth();
  const avatarVersion = useAvatarVersion();
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
    <>
    <BadgeCelebration />
    <AppShell
      nav={nav}
      brandTo="/agent/dashboard"
      brandBadge="Agen"
      titleFallback="Portal Agen"
      extraTitles={[{ path: "/agent/profile", title: "Profil" }, { path: "/agent/daftar-jamaah", title: "Daftarkan Jamaah" }, { path: "/agent/packages", title: "Paket" }]}
      documentTitleSuffix="Portal Agen Musafar Tour"
      profile={{ name: agent.name, subtitle: `Level ${agentLevelLabel(agent.level)}`, profileUrl: "/agent/profile", avatarUrl: agentAvatarUrl(agent.id, avatarVersion) }}
      onSignOut={signOut}
      bottomNav={bottomNav}
      bottomAction={bottomAction}
      inkHeaderOnPhone
      sidebarExtra={
        <button
          type="button"
          onClick={() => void copyText(agent.referral_code, "Agent ID disalin.")}
          className="flex w-full items-center justify-between rounded-[20px] bg-[#f4efe6]/10 px-4 py-3 text-left shadow-[inset_0_1px_0_rgb(244_239_230/0.18)] outline-none focus-visible:ring-2 focus-visible:ring-[#f4efe6]/60"
          aria-label={`Salin Agent ID ${agent.referral_code}`}
        >
          <span>
            <span className="block text-[13px] text-[#f4efe6]/65">Agent ID</span>
            <span className="mt-0.5 block truncate text-[18px] font-medium tracking-wide text-[#f4efe6]">{agent.referral_code}</span>
          </span>
          <Copy className="h-5 w-5 shrink-0 text-[#f4efe6]/65" aria-hidden />
        </button>
      }
      sidebarLinks={[
        {
          title: "Bantuan PIC Agen",
          icon: LifeBuoy,
          href: agentCsWhatsAppUrl(agent.name, agent.referral_code),
        },
      ]}
    >
      {children || <Outlet />}
    </AppShell>
    </>
  );
};

export default AgentLayout;
