-- agent_leaderboard (name, total_sales, total_commission, level of every active agent) was readable with the
-- public key: Supabase grants new views to anon by default and the view runs with its owner's rights, so RLS
-- on agents did not apply. Only signed-in agents use it (src/pages/agent/AgentLeaderboard.tsx).
REVOKE ALL ON public.agent_leaderboard FROM PUBLIC, anon;
GRANT SELECT ON public.agent_leaderboard TO authenticated;
