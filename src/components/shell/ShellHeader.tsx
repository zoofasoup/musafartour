import type { ReactNode } from "react";
import { Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { ShellUserMenu } from "./ShellUserMenu";
import type { ShellProfile } from "./types";

interface ShellHeaderProps {
  title: string;
  profile: ShellProfile;
  onSignOut: () => void | Promise<void>;
  /** Hamburger for the drawer on phones (hidden when a bottom bar already carries "Lainnya"). */
  mobileTrigger: boolean;
  /** Notification bell and other round buttons, left of the user menu. */
  actions?: ReactNode;
  onOpenSearch?: () => void;
}

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

export const ShellHeader = ({ title, profile, onSignOut, mobileTrigger, actions, onOpenSearch }: ShellHeaderProps) => {
  const { setOpenMobile } = useSidebar();
  return (
  <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-background/90 px-4 backdrop-blur md:px-6">
    <div className="flex min-w-0 items-center gap-2">
      {mobileTrigger && (
        <Button variant="ghost" size="icon" onClick={() => setOpenMobile(true)} aria-label="Buka menu" className="shrink-0 text-muted-foreground hover:bg-field-hover md:hidden">
          <Menu className="h-5 w-5" aria-hidden />
        </Button>
      )}
      <p className="truncate text-lg font-bold text-foreground" data-testid="shell-page-title">
        {title}
      </p>
    </div>

    <div className="flex shrink-0 items-center gap-1">
      {onOpenSearch && (
        <>
          <button
            type="button"
            onClick={onOpenSearch}
            className="hidden h-10 w-64 items-center gap-2 rounded-md bg-field px-3 text-sm text-muted-foreground outline-none transition-colors hover:bg-field-hover focus-visible:ring-2 focus-visible:ring-ring md:flex"
          >
            <Search className="h-4 w-4 shrink-0" aria-hidden />
            <span className="flex-1 truncate text-left">Cari halaman</span>
            <kbd className="rounded-sm bg-card px-1.5 py-0.5 text-xs font-semibold text-muted-foreground shadow-sm">{isMac ? "⌘K" : "Ctrl K"}</kbd>
          </button>
          <Button variant="ghost" size="icon" onClick={onOpenSearch} aria-label="Cari halaman" className="text-muted-foreground md:hidden">
            <Search className="h-5 w-5" aria-hidden />
          </Button>
        </>
      )}
      {actions}
      <ShellUserMenu profile={profile} onSignOut={onSignOut} />
    </div>
  </header>
);
};
