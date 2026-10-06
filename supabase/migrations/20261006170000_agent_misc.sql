-- Agent portal audit (docs/audit/02-agent.md): referral for Google sign-ups (AGT-011) and a private leaderboard (AGT-008, AGT-009).
-- Idempotent: safe to run twice.
--
-- 1. set_agent_referrer(code): a person who signs up with Google has no referral code in their user metadata, so
--    register_agent_profile() cannot attribute them. The browser remembers ?ref= and calls this after the agents row
--    exists. It is deliberately forgiving: anything that is not a clean "set the referrer once" is a silent no-op, so
--    it can never be used to probe which codes exist.
--
-- 2. get_agent_leaderboard(): replaces the view public.agent_leaderboard. The view ran with its owner's rights, so any
--    signed-in account (sign-up by email is open, no agents row needed) could read the name, sales and TOTAL COMMISSION
--    of every active agent. The function answers only an ACTIVE agent or staff, and it never returns commission:
--    other agents' income is private, name + sales + level is what the ranking page needs. The dashboard rank
--    (AGT-009) used to be computed from public.agents, which an agent can only read for their own row, so it always
--    said "#1 of 1"; it now uses this function too.

-- ---------------------------------------------------------------------------------------------------------------
-- 1. set_agent_referrer
-- ---------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_agent_referrer(_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid   uuid := auth.uid();
  _me    uuid;
  _input text := upper(btrim(COALESCE(_code, '')));
  _ref   uuid;
BEGIN
  IF _uid IS NULL OR _input = '' THEN
    RETURN;
  END IF;

  -- Only the caller's own row, and only while it has no referrer yet.
  SELECT a.id INTO _me
  FROM public.agents a
  WHERE a.user_id = _uid AND a.referred_by_id IS NULL;
  IF _me IS NULL THEN
    RETURN;
  END IF;

  -- The code must belong to an ACTIVE agent other than the caller, and must not point back at the caller
  -- (no two-agent loops).
  SELECT r.id INTO _ref
  FROM public.agents r
  WHERE upper(r.referral_code) = _input
    AND r.status = 'active'
    AND r.id <> _me
    AND r.referred_by_id IS DISTINCT FROM _me
  LIMIT 1;
  IF _ref IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.agents
     SET referred_by_id = _ref
   WHERE id = _me AND referred_by_id IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.set_agent_referrer(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_agent_referrer(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_agent_referrer(text) TO authenticated;

-- ---------------------------------------------------------------------------------------------------------------
-- 2. get_agent_leaderboard (replaces the view)
-- ---------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_agent_leaderboard()
RETURNS TABLE (
  id          uuid,
  name        text,
  total_sales public.agents.total_sales%TYPE,
  level       text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RETURN;
  END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM public.agents me WHERE me.user_id = _uid AND me.status = 'active')
    OR public.has_role(_uid, 'admin'::public.app_role)
    OR public.has_role(_uid, 'agent_admin'::public.app_role)
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT a.id, a.name, a.total_sales, a.level::text
  FROM public.agents a
  WHERE a.status = 'active'
  ORDER BY a.total_sales DESC, a.name, a.id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_agent_leaderboard() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_agent_leaderboard() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_agent_leaderboard() TO authenticated;

-- Nothing in the app reads the view any more (src/pages/agent/AgentLeaderboard.tsx and AgentDashboard.tsx use the function).
DROP VIEW IF EXISTS public.agent_leaderboard;
