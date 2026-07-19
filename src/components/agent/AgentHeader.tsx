import { Link } from "react-router-dom";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { PanelLeft } from "lucide-react";
import { useAgentAuth } from "@/hooks/useAgentAuth";
import { AGENT_LEVEL_COLORS, agentLevelLabel, type AgentLevel } from "@/lib/agentLevels";
import musafarLogo from "@/assets/musafar-logo.svg";

export const AgentHeader = () => {
  const { open, toggleSidebar, isMobile } = useSidebar();
  const { agent } = useAgentAuth();

  return (
    <div className="w-full flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-white/70 backdrop-blur-sm sticky top-0 z-10 rounded-t-3xl">
      <div className="flex items-center gap-4">
        {isMobile ? (
          <div className="flex items-center gap-3">
            <SidebarTrigger className="text-slate-500 hover:bg-slate-100 rounded-lg" />
            <Link to="/agent/dashboard" className="flex items-center">
              <img src={musafarLogo} alt="Musafar Tour" className="h-6 w-auto" />
            </Link>
          </div>
        ) : (
          !open && (
            <button
              onClick={toggleSidebar}
              className="text-slate-500 hover:bg-slate-100 p-2 rounded-lg transition-colors"
              title="Expand Sidebar"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          )
        )}
      </div>

      {agent && (
        <Link
          to="/agent/profile"
          className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 hover:bg-slate-100 transition-colors"
        >
          <span className={`flex h-7 w-7 items-center justify-center rounded-full text-white text-xs font-bold shrink-0 ${AGENT_LEVEL_COLORS[agent.level as AgentLevel] || AGENT_LEVEL_COLORS.bronze}`}>
            {agent.name?.charAt(0).toUpperCase() || "A"}
          </span>
          <span className="hidden sm:block text-left leading-tight">
            <span className="block text-sm font-semibold text-slate-800 truncate max-w-[140px]">{agent.name}</span>
            <span className="block text-xs text-slate-500">{agentLevelLabel(agent.level)}</span>
          </span>
        </Link>
      )}
    </div>
  );
};
