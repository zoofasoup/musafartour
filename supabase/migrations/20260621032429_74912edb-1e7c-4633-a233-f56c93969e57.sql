
-- 1. Fix calculator leads PII exposure: replace open SELECT with token-based RPC
ALTER TABLE public.umroh_calculator_leads
  ADD COLUMN IF NOT EXISTS share_token text NOT NULL DEFAULT gen_random_uuid()::text;

CREATE UNIQUE INDEX IF NOT EXISTS umroh_calculator_leads_share_token_key
  ON public.umroh_calculator_leads(share_token);

DROP POLICY IF EXISTS "Anyone can view a lead by id" ON public.umroh_calculator_leads;

-- Public can no longer SELECT directly; remove anon SELECT grant
REVOKE SELECT ON public.umroh_calculator_leads FROM anon;
REVOKE SELECT ON public.umroh_calculator_leads FROM authenticated;
GRANT INSERT ON public.umroh_calculator_leads TO anon, authenticated;

-- Security definer RPC: only returns a lead when caller supplies the right token
CREATE OR REPLACE FUNCTION public.get_calculator_lead_by_token(_token text)
RETURNS public.umroh_calculator_leads
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.umroh_calculator_leads
  WHERE share_token = _token
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_calculator_lead_by_token(text) TO anon, authenticated;

-- 2. Restrict listing policies to authenticated only
DROP POLICY IF EXISTS "Challenges viewable by authenticated" ON public.agent_challenges;
CREATE POLICY "Challenges viewable by authenticated"
  ON public.agent_challenges FOR SELECT
  TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Rewards viewable by authenticated" ON public.agent_rewards;
CREATE POLICY "Rewards viewable by authenticated"
  ON public.agent_rewards FOR SELECT
  TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Marketing materials viewable by authenticated users" ON public.marketing_materials;
CREATE POLICY "Marketing materials viewable by authenticated users"
  ON public.marketing_materials FOR SELECT
  TO authenticated
  USING (is_active = true);
