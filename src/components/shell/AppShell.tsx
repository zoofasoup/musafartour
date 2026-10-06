import { Suspense, useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { ShellSidebar } from "./ShellSidebar";
import { ShellHeader } from "./ShellHeader";
import { ShellBottomNav } from "./ShellBottomNav";
import { ShellCommandPalette } from "./ShellCommandPalette";
import { readSidebarDefaultOpen } from "./sidebarState";
import { resolvePageTitle } from "./navMatch";
import type { ShellExtraTitle, ShellNavGroup, ShellNavItem, ShellProfile, ShellSidebarLink } from "./types";

export interface AppShellProps {
  nav: ShellNavGroup[];
  brandTo: string;
  /** Small label next to the logo ("Agen", "Admin"). */
  brandBadge?: string;
  /** Title for routes that are not in the menu (profile) and the fallback. */
  extraTitles?: ShellExtraTitle[];
  titleFallback: string;
  /** Tab title is "<page title> - <suffix>". */
  documentTitleSuffix: string;
  profile: ShellProfile;
  onSignOut: () => void | Promise<void>;
  sidebarLinks?: ShellSidebarLink[];
  /** Card above the footer links (agent level and referral code). */
  sidebarExtra?: ReactNode;
  /** Notification bell and similar; sits left of the user menu. */
  headerActions?: ReactNode;
  /** Turns on the page finder (Ctrl/Cmd+K) in the header. */
  searchable?: boolean;
  /** Four main pages for a bottom bar on phones; "Lainnya" opens the drawer. */
  bottomNav?: ShellNavItem[];
  /** "full" fills the width (admin tables); "page" caps the content at 1200 (DESIGN.md). */
  contentWidth?: "full" | "page";
  children: ReactNode;
}

const Fallback = () => (
  <div className="flex h-full items-center justify-center py-12">
    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" role="status" aria-label="Memuat halaman" />
  </div>
);

/**
 * One shell for the agent portal and the admin panel (DESIGN.md "Sidebar kerja"):
 * 260 sidebar that collapses to a 76 icon rail (drawer under 768), the collapse toggle always in the
 * sidebar header, the choice remembered, page title from the menu, notification slot and user menu
 * in the header, logout in the sidebar footer.
 */
export const AppShell = ({
  nav,
  brandTo,
  brandBadge,
  extraTitles,
  titleFallback,
  documentTitleSuffix,
  profile,
  onSignOut,
  sidebarLinks,
  sidebarExtra,
  headerActions,
  searchable,
  bottomNav,
  contentWidth = "page",
  children,
}: AppShellProps) => {
  const { pathname } = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const title = resolvePageTitle(nav, pathname, extraTitles, titleFallback);

  useEffect(() => {
    if (!searchable) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchable]);

  return (
    <SidebarProvider
      defaultOpen={readSidebarDefaultOpen()}
      style={{ "--sidebar-width": "260px", "--sidebar-width-icon": "76px" } as React.CSSProperties}
      className="h-svh min-h-0 overflow-hidden bg-background"
    >
      <Helmet>
        <title>{`${title} - ${documentTitleSuffix}`}</title>
      </Helmet>
      <ShellSidebar
        nav={nav}
        pathname={pathname}
        brandTo={brandTo}
        brandBadge={brandBadge}
        links={sidebarLinks}
        extra={sidebarExtra}
        onSignOut={onSignOut}
      />
      {/* min-w-0: a flex child never shrinks below its content, so one wide table widened the whole page on phones. */}
      <div className="h-svh min-w-0 flex-1">
        <main className="relative flex h-full w-full flex-col overflow-auto bg-background">
          <ShellHeader
            title={title}
            profile={profile}
            onSignOut={onSignOut}
            mobileTrigger={!bottomNav}
            actions={headerActions}
            onOpenSearch={searchable ? () => setSearchOpen(true) : undefined}
          />
          <div className={cn("flex-1 p-4 md:p-6", bottomNav && "pb-24 md:pb-6")}>
            <div className={cn("w-full", contentWidth === "page" && "mx-auto max-w-[1200px]")}>
              <Suspense fallback={<Fallback />}>{children}</Suspense>
            </div>
          </div>
        </main>
      </div>
      {bottomNav && <ShellBottomNav items={bottomNav} pathname={pathname} />}
      {searchable && <ShellCommandPalette groups={nav} open={searchOpen} onOpenChange={setSearchOpen} />}
    </SidebarProvider>
  );
};
