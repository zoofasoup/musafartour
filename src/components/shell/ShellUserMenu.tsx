import { Link } from "react-router-dom";
import { ChevronDown, LogOut, UserRound } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { ShellProfile } from "./types";

const initialOf = (name: string) => name.trim().charAt(0).toUpperCase() || "?";

export const ShellAvatar = ({ profile, className = "h-9 w-9" }: { profile: Pick<ShellProfile, "name" | "avatarEmoji">; className?: string }) => (
  <span
    className={`flex shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground ${className}`}
    aria-hidden
  >
    {profile.avatarEmoji || initialOf(profile.name)}
  </span>
);

export const ShellUserMenu = ({ profile, onSignOut }: { profile: ShellProfile; onSignOut: () => void | Promise<void> }) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button
        type="button"
        aria-label={`Menu akun ${profile.name}`}
        className="flex h-10 items-center gap-2 rounded-full pl-0.5 pr-2 outline-none transition-colors hover:bg-field-hover focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-field-hover [@media(pointer:coarse)]:h-11"
      >
        <ShellAvatar profile={profile} />
        <span className="hidden min-w-0 text-left leading-tight sm:block">
          <span className="block max-w-[160px] truncate text-sm font-semibold text-foreground">{profile.name}</span>
          <span className="block max-w-[160px] truncate text-xs text-muted-foreground">{profile.subtitle}</span>
        </span>
        <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" aria-hidden />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-60 rounded-lg p-1.5 shadow-lg">
      <DropdownMenuLabel className="flex items-center gap-3 px-2 py-2 font-normal">
        <ShellAvatar profile={profile} className="h-10 w-10" />
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-sm font-semibold text-foreground">{profile.name}</span>
          <span className="block truncate text-xs text-muted-foreground">{profile.subtitle}</span>
        </span>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild className="h-10 gap-2 rounded-md px-2 text-sm [@media(pointer:coarse)]:h-11">
        <Link to={profile.profileUrl}>
          <UserRound className="h-4 w-4" aria-hidden />
          Profil
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem
        onSelect={() => void onSignOut()}
        className="h-10 gap-2 rounded-md px-2 text-sm text-status-bad-fg focus:bg-status-bad-bg focus:text-status-bad-fg [@media(pointer:coarse)]:h-11"
      >
        <LogOut className="h-4 w-4" aria-hidden />
        Keluar
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);
