import { Link } from "react-router-dom";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { PanelLeft, Bell } from "lucide-react";
import musafarLogo from "@/assets/musafar-logo.svg";

export const AgentHeader = () => {
  const { open, toggleSidebar, isMobile } = useSidebar();

  return (
    <div className="w-full flex justify-between items-center px-6 py-4 border-b border-slate-200/60 bg-white/50 backdrop-blur-sm sticky top-0 z-10 rounded-t-xl">
      <div className="flex items-center gap-4">
        {isMobile ? (
          <div className="flex items-center gap-3">
            <SidebarTrigger className="text-slate-500 hover:bg-slate-200 rounded-lg" />
            <Link to="/agent/dashboard" className="flex items-center">
              <img src={musafarLogo} alt="Musafar Tour" className="h-6 w-auto" />
            </Link>
          </div>
        ) : (
          !open && (
            <button 
              onClick={toggleSidebar}
              className="text-slate-500 hover:bg-slate-200 p-2 rounded-lg transition-colors"
              title="Expand Sidebar"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          )
        )}
      </div>

      <div className="flex items-center gap-3">
        <button className="text-slate-500 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100 transition-colors relative">
          <Bell className="h-5 w-5" />
          {/* <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full border border-white"></span> */}
        </button>
      </div>
    </div>
  );
};
