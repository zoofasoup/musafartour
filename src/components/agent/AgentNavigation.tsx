import { NavLink, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Package, 
  Calendar, 
  Wallet, 
  Palette,
  Trophy,
  User,
  LogOut,
  Menu,
  X,
  ChevronLeft
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAgentAuth } from "@/hooks/useAgentAuth";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import musafarLogo from "@/assets/musafar-logo.svg";

const navItems = [
  { 
    title: "Dashboard", 
    url: "/agent/dashboard", 
    icon: LayoutDashboard,
    description: "Overview & stats"
  },
  { 
    title: "Paket", 
    url: "/agent/packages", 
    icon: Package,
    description: "Browse packages"
  },
  { 
    title: "Jadwal", 
    url: "/agent/schedule", 
    icon: Calendar,
    description: "Departure schedule"
  },
  { 
    title: "Komisi", 
    url: "/agent/commission", 
    icon: Wallet,
    description: "Earnings & withdraw"
  },
  { 
    title: "Leaderboard", 
    url: "/agent/leaderboard", 
    icon: Trophy,
    description: "Rankings & rewards"
  },
  { 
    title: "Marketing", 
    url: "/agent/marketing-kit", 
    icon: Palette,
    description: "Promotional materials"
  },
  { 
    title: "Marketing", 
    url: "/agent/marketing-kit", 
    icon: Palette,
    description: "Promotional materials"
  },
];

interface AgentNavigationProps {
  children: React.ReactNode;
}

export function AgentNavigation({ children }: AgentNavigationProps) {
  const { agent, signOut } = useAgentAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    await signOut();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={cn(
        "flex items-center gap-3 p-4 border-b",
        sidebarCollapsed && !mobile && "justify-center"
      )}>
        {(!sidebarCollapsed || mobile) && (
          <div 
            className="h-8 w-32 bg-current [mask-image:url('/logo.webp')] [mask-size:contain] [mask-repeat:no-repeat] [mask-position:left] [-webkit-mask-image:url('/logo.webp')] [-webkit-mask-size:contain] [-webkit-mask-repeat:no-repeat] [-webkit-mask-position:left]"
            aria-label="Musafar Tour"
          />
        )}
        {!mobile && (
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-8 w-8"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <ChevronLeft className={cn(
              "h-4 w-4 transition-transform",
              sidebarCollapsed && "rotate-180"
            )} />
          </Button>
        )}
      </div>

      {/* Agent Info */}
      <div className={cn(
        "p-4 border-b",
        sidebarCollapsed && !mobile && "flex justify-center"
      )}>
        <div className={cn(
          "flex items-center gap-3",
          sidebarCollapsed && !mobile && "flex-col"
        )}>
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {agent?.name ? getInitials(agent.name) : 'AG'}
            </AvatarFallback>
          </Avatar>
          {(!sidebarCollapsed || mobile) && (
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{agent?.name || 'Agent'}</p>
              <p className="text-xs text-muted-foreground truncate">{agent?.referral_code}</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            onClick={() => mobile && setSidebarOpen(false)}
            className={({ isActive: active }) => cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              active 
                ? "bg-primary text-primary-foreground" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
              sidebarCollapsed && !mobile && "justify-center px-2"
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {(!sidebarCollapsed || mobile) && (
              <span>{item.title}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t">
        <NavLink
          to="/agent/profile"
          onClick={() => mobile && setSidebarOpen(false)}
          className={({ isActive: active }) => cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
            active 
              ? "bg-primary text-primary-foreground" 
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
            sidebarCollapsed && !mobile && "justify-center px-2"
          )}
        >
          <User className="h-5 w-5 shrink-0" />
          {(!sidebarCollapsed || mobile) && <span>Profil</span>}
        </NavLink>
        <button
          onClick={handleSignOut}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full",
            "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20",
            sidebarCollapsed && !mobile && "justify-center px-2"
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {(!sidebarCollapsed || mobile) && <span>Keluar</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex w-full">
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden lg:flex flex-col bg-card border-r transition-all duration-300 shrink-0",
        sidebarCollapsed ? "w-16" : "w-64"
      )}>
        <SidebarContent />
      </aside>

      {/* Mobile Header + Bottom Nav */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between h-14 px-4 border-b bg-background/95 backdrop-blur">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SidebarContent mobile />
            </SheetContent>
          </Sheet>

          <div 
            className="h-7 w-28 bg-current [mask-image:url('/logo.webp')] [mask-size:contain] [mask-repeat:no-repeat] [mask-position:left] [-webkit-mask-image:url('/logo.webp')] [-webkit-mask-size:contain] [-webkit-mask-repeat:no-repeat] [-webkit-mask-position:left]"
            aria-label="Musafar Tour"
          />

          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {agent?.name ? getInitials(agent.name) : 'AG'}
            </AvatarFallback>
          </Avatar>
        </header>

        {/* Main Content */}
        <main className="flex-1 pb-16 lg:pb-0">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-background border-t safe-area-pb">
          <div className="flex items-center justify-around h-16">
            {navItems.slice(0, 5).map((item) => (
              <NavLink
                key={item.url}
                to={item.url}
                className={({ isActive: active }) => cn(
                  "flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-0 flex-1",
                  active 
                    ? "text-primary" 
                    : "text-muted-foreground"
                )}
              >
                <item.icon className={cn(
                  "h-5 w-5",
                  isActive(item.url) && "text-primary"
                )} />
                <span className={cn(
                  "text-[10px] font-medium truncate",
                  isActive(item.url) && "text-primary"
                )}>
                  {item.title}
                </span>
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}

export default AgentNavigation;