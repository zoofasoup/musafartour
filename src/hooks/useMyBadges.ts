import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgentAuth } from "@/hooks/useAgentAuth";
import type { BadgeProgress } from "@/lib/badges";

/** Every badge with the signed-in agent's progress (public.my_badge_progress). */
export const useMyBadges = () => {
  const { agent } = useAgentAuth();
  return useQuery({
    queryKey: ["my-badges", agent?.id],
    enabled: !!agent?.id,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_badge_progress" as never);
      if (error) throw error;
      return (data ?? []) as unknown as BadgeProgress[];
    },
  });
};
