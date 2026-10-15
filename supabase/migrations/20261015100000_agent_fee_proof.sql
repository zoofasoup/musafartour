-- Agent uploads the registration-fee transfer proof on the website; admins get a bell notification.
-- The file goes to the private bucket `agent-documents` under `<uid>/...` (existing policies: the agent uploads into their own
-- folder, staff can read). Idempotent.
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS fee_proof_path text;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS fee_proof_sent_at timestamptz;

CREATE OR REPLACE FUNCTION public.notify_agent_fee_proof()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.fee_proof_sent_at IS NULL OR NEW.fee_proof_sent_at IS NOT DISTINCT FROM OLD.fee_proof_sent_at THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.admin_notifications (title, message, type, action_url, meta)
  VALUES (
    'Bukti transfer biaya registrasi',
    coalesce(NEW.name, 'Agen') || ' mengirim bukti transfer biaya registrasi.',
    'agent_fee_proof',
    '/admin/agents',
    jsonb_build_object(
      'actor', jsonb_build_object('name', coalesce(NEW.name, 'Agen'), 'kind', 'agent'),
      'agent_id', NEW.id
    )
  );
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_agent_fee_proof() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS notify_agent_fee_proof ON public.agents;
CREATE TRIGGER notify_agent_fee_proof
  AFTER UPDATE OF fee_proof_sent_at ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.notify_agent_fee_proof();
