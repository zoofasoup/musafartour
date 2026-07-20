-- agent_short_links has never had a public SELECT/UPDATE policy - only the
-- owning agent or an admin can read a row. AgentMarketingKit.tsx generates
-- shareable /l/{code} links for agents to post publicly, but any visitor
-- who isn't the agent themselves would be blocked by RLS from resolving
-- one. A single SECURITY DEFINER RPC does the lookup + click increment
-- atomically without needing to open the table itself to anonymous access.
CREATE OR REPLACE FUNCTION public.redirect_agent_short_link(_code TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _url TEXT;
BEGIN
  UPDATE public.agent_short_links
  SET click_count = click_count + 1
  WHERE short_code = _code
  RETURNING original_url INTO _url;

  RETURN _url;
END;
$$;
