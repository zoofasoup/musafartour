-- P0 fixes from the 6 Oct 2026 audit (docs/audit).

-- ADM-003: the bell was empty for superadmin and cs_admin because the policies checked role = 'admin' literally.
-- has_role() treats superadmin as admin.
DROP POLICY IF EXISTS "Admins can view notifications" ON public.admin_notifications;
CREATE POLICY "Admins can view notifications" ON public.admin_notifications
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'cs_admin'::app_role)
         OR public.has_role(auth.uid(), 'agent_admin'::app_role));
DROP POLICY IF EXISTS "Admins can update notifications" ON public.admin_notifications;
CREATE POLICY "Admins can update notifications" ON public.admin_notifications
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'cs_admin'::app_role)
         OR public.has_role(auth.uid(), 'agent_admin'::app_role));

-- ADM-004: new-agent notifications pointed at the bootstrap page.
UPDATE public.admin_notifications SET action_url = '/admin/agents' WHERE action_url LIKE '/admin/setup?tab=agents%';

CREATE OR REPLACE FUNCTION public.handle_new_agent_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'pending') OR
     (TG_OP = 'UPDATE' AND NEW.status = 'pending' AND OLD.status != 'pending') THEN
    INSERT INTO public.admin_notifications (title, message, type, action_url, meta)
    VALUES (
      'Pendaftaran Agen Baru',
      'Agen baru bernama ' || NEW.name || ' menunggu persetujuan (Pending).',
      'agent_registration',
      '/admin/agents',
      jsonb_build_object('actor', jsonb_build_object('name', NEW.name, 'kind', 'agent'), 'agent_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.handle_new_agent_notification() FROM PUBLIC, anon, authenticated;

-- AGT-007: a suspended or pending agent could still request withdrawals through the API.
CREATE OR REPLACE FUNCTION public.guard_agent_withdrawal()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _balance numeric;
  _pending numeric;
  _status text;
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;
  IF public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'agent_admin'::app_role) THEN
    RETURN NEW;
  END IF;

  NEW.status := 'pending';
  NEW.processed_at := NULL;
  NEW.admin_notes := NULL;

  IF NEW.amount IS NULL OR NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Jumlah penarikan tidak valid.' USING ERRCODE = '22023';
  END IF;

  SELECT a.available_balance, a.status INTO _balance, _status
  FROM public.agents a
  WHERE a.id = NEW.agent_id AND a.user_id = auth.uid();

  IF _status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'Akun agen tidak aktif.' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(SUM(w.amount), 0) INTO _pending
  FROM public.agent_withdrawals w
  WHERE w.agent_id = NEW.agent_id AND w.status = 'pending';

  IF COALESCE(_balance, 0) - _pending < NEW.amount THEN
    RAISE EXCEPTION 'Saldo tidak cukup untuk penarikan ini.' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

-- AGT-003: levels promised percentage commissions and perks that do not exist (commission is a flat amount per
-- lunas jamaah). Keep only statements that are true until the owner decides real level benefits.
UPDATE public.agent_levels
   SET benefits = ARRAY['Komisi tetap per jamaah lunas', 'Akses marketing kit', 'Dukungan CS via WhatsApp'];
