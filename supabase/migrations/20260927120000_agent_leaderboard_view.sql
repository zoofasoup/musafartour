-- Fix: AgentLeaderboard.tsx queries public.agents directly expecting to see every
-- active agent, but the only SELECT policies on agents are "own row" and "admin all"
-- (20260115160640). A non-admin agent hitting the leaderboard gets back at most their
-- own row, so the leaderboard is effectively broken for its actual users.
--
-- Fix with a narrow view instead of loosening RLS on public.agents directly, since
-- that table also holds email/phone/wa_number/bank_name/bank_account/account_name/
-- available_balance, none of which the leaderboard should expose to peer agents.
-- The view only surfaces the columns AgentLeaderboard.tsx already selects.
CREATE OR REPLACE VIEW public.agent_leaderboard AS
  SELECT id, name, total_sales, total_commission, level
  FROM public.agents
  WHERE status = 'active';

GRANT SELECT ON public.agent_leaderboard TO authenticated;
