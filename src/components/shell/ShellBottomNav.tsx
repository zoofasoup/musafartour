import { Link } from "react-router-dom";
import { Menu } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { findActiveItem } from "./navMatch";
import type { ShellNavItem } from "./types";

/** Phone navigation for the agent portal: four main pages plus "Lainnya", which opens the full menu drawer. */
export const ShellBottomNav = ({ items, pathname }: { items: ShellNavItem[]; pathname: string }) => {
  const { setOpenMobile } = useSidebar();
  const active = findActiveItem([{ items }], pathname);
  const cell =
    "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-1 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-30 flex items-stretch gap-1 border-t border-border bg-card px-2 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] md:hidden"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = active?.url === item.url;
        return (
          <Link
            key={item.url}
            to={item.url}
            aria-current={isActive ? "page" : undefined}
            className={`${cell} ${isActive ? "bg-muted font-semibold text-foreground" : "text-muted-foreground"}`}
          >
            <Icon className="h-5 w-5" aria-hidden />
            <span className="max-w-full truncate">{item.title}</span>
          </Link>
        );
      })}
      <button type="button" onClick={() => setOpenMobile(true)} className={`${cell} text-muted-foreground`}>
        <Menu className="h-5 w-5" aria-hidden />
        <span>Lainnya</span>
      </button>
    </nav>
  );
};
