import { Link } from "react-router-dom";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { PanelLeft } from "lucide-react";
import { useAgentAuth } from "@/hooks/useAgentAuth";
import { AGENT_LEVEL_COLORS, agentLevelLabel, type AgentLevel } from "@/lib/agentLevels";
import musafarLogo from "@/assets/musafar-logo-dark.svg";

export const AgentHeader = () => {
  const { open, toggleSidebar, isMobile } = useSidebar();
  const { agent } = useAgentAuth();

  return (
    <div className="w-full flex justify-between items-center px-6 py-4 border-b border-border bg-white/70 backdrop-blur-sm sticky top-0 z-10 rounded-t-3xl">
      <div className="flex items-center gap-4">
        {isMobile ? (
          <div className="flex items-center gap-3">
            <SidebarTrigger className="h-11 w-11 text-muted-foreground hover:bg-muted rounded-lg" />
            <Link to="/agent/dashboard" className="flex min-h-11 items-center">
              <img src={musafarLogo} alt="Musafar Tour" className="h-6 w-auto" />
            </Link>
          </div>
        ) : (
          !open && (
            <button
              onClick={toggleSidebar}
              className="text-muted-foreground hover:bg-muted p-2 rounded-lg transition-colors"
              title="Buka menu" aria-label="Buka menu"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          )
        )}
      </div>

      {agent && (
        <Link
          to="/agent/profile"
          className="flex min-h-11 items-center gap-2 rounded-full pl-1 pr-3 py-1 hover:bg-muted transition-colors"
        >
          <span className={`flex h-7 w-7 items-center justify-center rounded-full text-white text-xs font-bold shrink-0 ${AGENT_LEVEL_COLORS[agent.level as AgentLevel] || AGENT_LEVEL_COLORS.bronze}`}>
            {agent.name?.charAt(0).toUpperCase() || "A"}
          </span>
          <span className="hidden sm:block text-left leading-tight">
            <span className="block text-sm font-semibold text-foreground truncate max-w-[140px]">{agent.name}</span>
            <span className="block text-xs text-muted-foreground">{agentLevelLabel(agent.level)}</span>
          </span>
        </Link>
      )}
    </div>
  );
};
