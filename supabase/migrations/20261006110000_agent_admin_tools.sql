-- Agent admin tools (2026-10-06).
--
-- 1. Agents could request commission withdrawals but nobody could process them, and nothing ever deducted
--    agents.available_balance after a payout. process_agent_withdrawal() does both in one transaction.
-- 2. Staff could not read agents' KTP photos: bucket `agent-documents` is private and the owner-scoped SELECT policy
--    only recognises the literal role 'admin' (not superadmin / agent_admin). Add a staff SELECT policy.
-- 3. The upload policy let any signed-in user write to ANY path of the bucket (auth.uid() = owner is true for every
--    upload). Restrict inserts to the user's own folder, which is where the app uploads (`<uid>/<file>`).
-- 4. Admin bell: tell staff when an agent asks for a withdrawal.
--
-- Status vocabulary (what src/pages/agent/AgentCommission.tsx maps): pending -> paid | rejected.
-- Safe to run more than once.

-- ---------------------------------------------------------------------------------------------
-- 1. Process a withdrawal: mark paid (and deduct the balance) or reject (with a reason)
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_agent_withdrawal(_id uuid, _action text, _notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_w public.agent_withdrawals%ROWTYPE;
  v_balance numeric;
  v_notes text := nullif(btrim(coalesce(_notes, '')), '');
BEGIN
  IF auth.uid() IS NULL
     OR NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'agent_admin'::app_role)) THEN
    RAISE EXCEPTION 'Tidak berwenang.' USING ERRCODE = '42501';
  END IF;

  IF _action IS NULL OR _action NOT IN ('paid', 'rejected') THEN
    RAISE EXCEPTION 'Aksi tidak dikenal.' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_w FROM public.agent_withdrawals WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Permintaan penarikan tidak ditemukan.' USING ERRCODE = 'P0001';
  END IF;
  IF v_w.status <> 'pending' THEN
    RAISE EXCEPTION 'Permintaan ini sudah diproses.' USING ERRCODE = 'P0001';
  END IF;

  IF _action = 'paid' THEN
    SELECT available_balance INTO v_balance FROM public.agents WHERE id = v_w.agent_id FOR UPDATE;
    IF NOT FOUND OR COALESCE(v_balance, 0) < v_w.amount THEN
      RAISE EXCEPTION 'Saldo agen tidak cukup.' USING ERRCODE = 'P0001';
    END IF;
    UPDATE public.agents SET available_balance = available_balance - v_w.amount WHERE id = v_w.agent_id;
  ELSE
    IF v_notes IS NULL THEN
      RAISE EXCEPTION 'Tulis alasan penolakan.' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  UPDATE public.agent_withdrawals
     SET status = _action, processed_at = now(), admin_notes = v_notes
   WHERE id = _id
   RETURNING * INTO v_w;

  RETURN to_jsonb(v_w);
END;
$$;

REVOKE ALL ON FUNCTION public.process_agent_withdrawal(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_agent_withdrawal(uuid, text, text) TO authenticated;

-- ---------------------------------------------------------------------------------------------
-- 2 + 3. Storage policies for bucket agent-documents
-- ---------------------------------------------------------------------------------------------
-- "Users can view their own documents" stays as is (owner or first folder = own uid). Staff get their own policy,
-- because that one only knows role = 'admin'.
DROP POLICY IF EXISTS "Staff can view agent documents" ON storage.objects;
CREATE POLICY "Staff can view agent documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'agent-documents'
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'agent_admin'::app_role))
  );

-- Uploads only into your own folder: `<uid>/<file>`.
DROP POLICY IF EXISTS "Agents can upload their own documents" ON storage.objects;
CREATE POLICY "Agents can upload their own documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'agent-documents'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- ---------------------------------------------------------------------------------------------
-- 4. Bell notification when an agent requests a withdrawal
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_agent_withdrawal_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
BEGIN
  IF NEW.status IS DISTINCT FROM 'pending' THEN
    RETURN NEW;
  END IF;
  SELECT name INTO v_name FROM public.agents WHERE id = NEW.agent_id;
  INSERT INTO public.admin_notifications (title, message, type, action_url, meta)
  VALUES (
    'Permintaan penarikan komisi',
    coalesce(v_name, 'Agen') || ' meminta penarikan Rp ' || replace(to_char(NEW.amount, 'FM999G999G999G999'), ',', '.')
      || ' ke ' || NEW.bank_name || '.',
    'agent_withdrawal',
    '/admin/agents?tab=penarikan',
    jsonb_build_object(
      'actor', jsonb_build_object('name', coalesce(v_name, 'Agen'), 'kind', 'agent'),
      'agent_id', NEW.agent_id,
      'withdrawal_id', NEW.id,
      'amount', NEW.amount
    )
  );
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_agent_withdrawal_notification() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS notify_agent_withdrawal ON public.agent_withdrawals;
CREATE TRIGGER notify_agent_withdrawal
  AFTER INSERT ON public.agent_withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_agent_withdrawal_notification();
