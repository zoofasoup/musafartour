import type { LucideIcon } from "lucide-react";

export interface ShellNavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  /** Other paths that should light this item up (views that live inside it). */
  alsoActive?: string[];
  /** Match the path exactly; a dashboard at the area root would otherwise match every page. */
  end?: boolean;
}

export interface ShellNavGroup {
  label?: string;
  items: ShellNavItem[];
}

export interface ShellProfile {
  name: string;
  /** Role (admin) or level (agent), under the name. */
  subtitle: string;
  profileUrl: string;
  /** Shown in the avatar instead of the initial, when the person picked one. */
  avatarEmoji?: string;
}

export interface ShellSidebarLink {
  title: string;
  icon: LucideIcon;
  /** Internal route. */
  to?: string;
  /** External link (opens in a new tab). */
  href?: string;
}

export interface ShellExtraTitle {
  path: string;
  title: string;
}
