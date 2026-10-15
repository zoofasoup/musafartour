import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Menu, Search } from "lucide-react";
import musafarLogo from "@/assets/musafar-logo.svg";
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
  /** Phone only: a dark bar with the logo instead of the page title (the page carries its own large title). */
  inkOnPhone?: boolean;
}

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

export const ShellHeader = ({ title, profile, onSignOut, mobileTrigger, actions, onOpenSearch, inkOnPhone }: ShellHeaderProps) => {
  const { setOpenMobile } = useSidebar();
  return (
  <header className={`sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-background/90 px-4 backdrop-blur md:px-6 ${inkOnPhone ? "max-md:h-14 max-md:border-0 max-md:bg-[#1a1512] max-md:text-[#f4efe6]" : ""}`}>
    <div className="flex min-w-0 items-center gap-2">
      {mobileTrigger && (
        <Button variant="ghost" size="icon" onClick={() => setOpenMobile(true)} aria-label="Buka menu" className={`shrink-0 hover:bg-field-hover md:hidden ${inkOnPhone ? "text-[#f4efe6] hover:bg-white/10 hover:text-[#f4efe6]" : "text-muted-foreground"}`}>
          <Menu className="h-5 w-5" aria-hidden />
        </Button>
      )}
      {inkOnPhone && <Link to="/" aria-label="Musafar Tour" className="md:hidden"><img src={musafarLogo} alt="" className="h-7 brightness-0 invert" /></Link>}
      <p className={`truncate text-lg font-bold text-foreground ${inkOnPhone ? "max-md:hidden" : ""}`} data-testid="shell-page-title">
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
