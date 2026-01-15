import { ReactNode } from "react";
import { AgentNavigation } from "./AgentNavigation";

interface AgentLayoutProps {
  children: ReactNode;
}

export function AgentLayout({ children }: AgentLayoutProps) {
  return (
    <AgentNavigation>
      {children}
    </AgentNavigation>
  );
}

export default AgentLayout;