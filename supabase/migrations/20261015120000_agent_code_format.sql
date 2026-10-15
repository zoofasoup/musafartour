-- Agent ID format: AG0001, AG0002, ... in order of registration (requested by Virna). Replaces the random MUS-XXXXXX.
-- Only NEW agents get the new format; existing codes are untouched here (links already shared with ?ref=MUS-... keep working).
CREATE SEQUENCE IF NOT EXISTS public.agent_code_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN 'AG' || lpad(nextval('public.agent_code_seq')::text, 4, '0');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.generate_referral_code() FROM anon, authenticated, public;
