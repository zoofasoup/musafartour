import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { LogOut, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import musafarLogo from "@/assets/musafar-logo-dark.svg";
import { findActiveItem } from "./navMatch";
import type { ShellNavGroup, ShellSidebarLink } from "./types";

/**
 * Item look shared by every row: 40 tall (44 on touch), raised white capsule when active,
 * and a centred 44 square in the icon rail. The label turns sr-only in the rail so the
 * accessible name stays.
 */
const ITEM_BASE =
  "h-10 gap-3 rounded-md px-3 text-sm [@media(pointer:coarse)]:h-11 group-data-[collapsible=icon]:!size-11 group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:justify-center [&>svg]:size-[18px]";
const ITEM_ACTIVE = "bg-card font-semibold text-foreground shadow-sm hover:bg-card hover:text-foreground";
const ITEM_IDLE = "font-medium text-muted-foreground hover:bg-field-hover hover:text-foreground";
const LABEL_HIDE_IN_RAIL = "group-data-[collapsible=icon]:sr-only";

interface ShellSidebarProps {
  nav: ShellNavGroup[];
  pathname: string;
  brandTo: string;
  brandBadge?: string;
  links?: ShellSidebarLink[];
  extra?: ReactNode;
  onSignOut: () => void | Promise<void>;
}

/** The collapse toggle lives in the sidebar header in both states, so it never disappears with the menu. */
const CollapseToggle = () => {
  const { open, isMobile, toggleSidebar, setOpenMobile } = useSidebar();

  if (isMobile) {
    return (
      <Button variant="ghost" size="icon" onClick={() => setOpenMobile(false)} aria-label="Tutup menu" className="shrink-0 text-muted-foreground hover:bg-field-hover">
        <X className="h-5 w-5" aria-hidden />
      </Button>
    );
  }

  const label = open ? "Ciutkan menu" : "Buka menu";
  const Icon = open ? PanelLeftClose : PanelLeftOpen;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          aria-label={label}
          aria-expanded={open}
          className="shrink-0 text-muted-foreground hover:bg-field-hover hover:text-foreground"
        >
          <Icon className="h-5 w-5" aria-hidden />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">{label} (Ctrl+B)</TooltipContent>
    </Tooltip>
  );
};

const FooterLink = ({ link }: { link: ShellSidebarLink }) => {
  const Icon = link.icon;
  const inner = (
    <>
      <Icon aria-hidden />
      <span className={LABEL_HIDE_IN_RAIL}>{link.title}</span>
    </>
  );
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild tooltip={link.title} className={`${ITEM_BASE} ${ITEM_IDLE}`}>
        {link.href ? (
          <a href={link.href} target="_blank" rel="noopener noreferrer">
            {inner}
          </a>
        ) : (
          <Link to={link.to ?? "/"}>{inner}</Link>
        )}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

export const ShellSidebar = ({ nav, pathname, brandTo, brandBadge, links, extra, onSignOut }: ShellSidebarProps) => {
  const { isMobile, setOpenMobile } = useSidebar();
  const active = findActiveItem(nav, pathname);
  const closeDrawer = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      {isMobile && (
        <>
          <SheetTitle className="sr-only">Menu navigasi</SheetTitle>
          <SheetDescription className="sr-only">Pilih halaman yang ingin dibuka.</SheetDescription>
        </>
      )}
      <SidebarHeader className="h-16 flex-row items-center justify-between gap-2 p-3 group-data-[collapsible=icon]:justify-center">
        <Link
          to={brandTo}
          onClick={closeDrawer}
          className="flex min-w-0 items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring group-data-[collapsible=icon]:hidden"
          aria-label="Musafar Tour, ke beranda area kerja"
        >
          <img src={musafarLogo} alt="" className="h-8 w-auto shrink-0" />
          {brandBadge && (
            <span className="rounded-sm bg-card px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground shadow-sm">
              {brandBadge}
            </span>
          )}
        </Link>
        <CollapseToggle />
      </SidebarHeader>

      <SidebarContent className="gap-0 px-2 py-2">
        {nav.map((group, idx) => (
          <SidebarGroup
            key={group.label ?? idx}
            className="p-0 pb-3 group-data-[collapsible=icon]:[&:not(:first-child)]:border-t group-data-[collapsible=icon]:[&:not(:first-child)]:pt-3"
          >
            {group.label && (
              <SidebarGroupLabel className="h-8 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = active?.url === item.url;
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        tooltip={item.title}
                        className={`${ITEM_BASE} ${isActive ? ITEM_ACTIVE : ITEM_IDLE}`}
                      >
                        <Link to={item.url} aria-current={isActive ? "page" : undefined} onClick={closeDrawer}>
                          <Icon aria-hidden />
                          <span className={LABEL_HIDE_IN_RAIL}>{item.title}</span>
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

      <SidebarFooter className="gap-2 border-t border-border p-2">
        {extra && <div className="group-data-[collapsible=icon]:hidden">{extra}</div>}
        <SidebarMenu>
          {links?.map((link) => (
            <FooterLink key={link.title} link={link} />
          ))}
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Keluar"
              onClick={() => {
                closeDrawer();
                void onSignOut();
              }}
              className={`${ITEM_BASE} ${ITEM_IDLE} hover:bg-status-bad-bg hover:text-status-bad-fg`}
            >
              <LogOut aria-hidden />
              <span className={LABEL_HIDE_IN_RAIL}>Keluar</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};
