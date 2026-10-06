import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LeaderboardRow {
  id: string;
  name: string;
  total_sales: number;
  level: string;
}

/**
 * The ranking of active agents: name, sales and level only. The database function answers active agents and
 * staff, and never returns anyone's commission (peers' income is private). Highest sales first.
 * One query key for the Peringkat page and the dashboard rank, so both show the same number.
 */
export const useAgentLeaderboard = (enabled = true) =>
  useQuery({
    queryKey: ["agent-leaderboard-rows"],
    enabled,
    queryFn: async (): Promise<LeaderboardRow[]> => {
      const { data, error } = await supabase.rpc("get_agent_leaderboard");
      if (error) throw error;
      return (data ?? []) as LeaderboardRow[];
    },
  });
