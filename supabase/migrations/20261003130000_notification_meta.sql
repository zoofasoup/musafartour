-- Notifications carry structured data so the bell can show who did what, a preview card, and open the exact
-- registration; and they can be archived instead of piling up.
--
-- Old rows keep working: meta and archived_at are simply NULL for them.
--
-- Run this in Supabase BEFORE (or right after) deploying the matching frontend. Until it runs, the bell still works but
-- "Arsipkan" shows an error and new notifications have no avatar or preview card.

ALTER TABLE public.admin_notifications
  ADD COLUMN IF NOT EXISTS meta jsonb,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS admin_notifications_archived_idx
  ON public.admin_notifications (archived_at, created_at DESC);

-- 1. Agent signs up: record who.
CREATE OR REPLACE FUNCTION public.handle_new_agent_notification()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' AND NEW.status = 'pending') OR
       (TG_OP = 'UPDATE' AND NEW.status = 'pending' AND OLD.status != 'pending') THEN
       INSERT INTO public.admin_notifications (title, message, type, action_url, meta)
       VALUES (
           'Pendaftaran Agen Baru',
           'Agen baru bernama ' || NEW.name || ' menunggu persetujuan (Pending).',
           'agent_registration',
           '/admin/setup?tab=agents',
           jsonb_build_object('actor', jsonb_build_object('name', NEW.name, 'kind', 'agent'), 'agent_id', NEW.id)
       );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. A registration arrives: same function as before (supabase/migrations/20261003110000_agent_intake.sql), only the
--    notification insert changed (adds meta and a link to that registration).
CREATE OR REPLACE FUNCTION public.create_jamaah_intake(_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pkg public.packages%ROWTYPE;
  v_agent uuid;
  v_agent_name text;
  v_ref text := nullif(btrim(coalesce(_payload ->> 'ref_code', '')), '');
  v_phone text := _payload ->> 'contact_phone';
  v_people jsonb := _payload -> 'people';
  v_id uuid;
  v_code text;
  v_n integer;
  v_person jsonb;
  v_pos integer := 0;
  v_name text := btrim(_payload ->> 'contact_name');
BEGIN
  IF coalesce((_payload ->> 'consent')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'consent_required' USING ERRCODE = 'P0001';
  END IF;
  IF v_people IS NULL OR jsonb_typeof(v_people) <> 'array' THEN RAISE EXCEPTION 'people_required' USING ERRCODE = 'P0001'; END IF;
  v_n := jsonb_array_length(v_people);
  IF v_n < 1 OR v_n > 10 THEN RAISE EXCEPTION 'people_count' USING ERRCODE = 'P0001'; END IF;

  SELECT * INTO v_pkg FROM public.packages
   WHERE id = (_payload ->> 'package_id')::uuid AND status = 'published' AND departure_date::date >= current_date;
  IF NOT FOUND THEN RAISE EXCEPTION 'package_unavailable' USING ERRCODE = 'P0001'; END IF;

  -- At most 5 submissions from one number per day: enough for real families, not for a script.
  IF (SELECT count(*) FROM public.jamaah_intakes WHERE contact_phone = v_phone AND created_at > now() - interval '1 day') >= 5 THEN
    RAISE EXCEPTION 'rate_limited' USING ERRCODE = 'P0001';
  END IF;

  IF v_ref IS NOT NULL THEN
    SELECT id INTO v_agent FROM public.agents WHERE lower(referral_code) = lower(v_ref) AND status = 'active' LIMIT 1;
  END IF;
  IF v_agent IS NOT NULL THEN
    SELECT name INTO v_agent_name FROM public.agents WHERE id = v_agent;
  END IF;

  LOOP
    v_code := public.generate_intake_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.jamaah_intakes WHERE code = v_code);
  END LOOP;

  INSERT INTO public.jamaah_intakes
    (code, package_id, contact_name, contact_phone, contact_city, contact_attending, pay_together,
     agent_id, ref_code, heard_from, notes, source, consent_at, consent_version)
  VALUES
    (v_code, v_pkg.id, v_name, v_phone, nullif(btrim(coalesce(_payload ->> 'contact_city', '')), ''),
     coalesce((_payload ->> 'contact_attending')::boolean, true), coalesce((_payload ->> 'pay_together')::boolean, false),
     v_agent, v_ref, nullif(btrim(coalesce(_payload ->> 'heard_from', '')), ''), nullif(btrim(coalesce(_payload ->> 'notes', '')), ''),
     CASE WHEN _payload ->> 'source' = 'agent' THEN 'agent' ELSE 'public' END, now(), coalesce(_payload ->> 'consent_version', 'v1'))
  RETURNING id INTO v_id;

  FOR v_person IN SELECT * FROM jsonb_array_elements(v_people) LOOP
    v_pos := v_pos + 1;
    INSERT INTO public.jamaah_intake_people (intake_id, position, full_name, gender, category, room_type, relation)
    VALUES (v_id, v_pos, btrim(v_person ->> 'full_name'), v_person ->> 'gender', v_person ->> 'category',
            v_person ->> 'room_type', nullif(btrim(coalesce(v_person ->> 'relation', '')), ''));
  END LOOP;

  INSERT INTO public.admin_notifications (title, message, type, action_url, meta)
  VALUES ('Pendaftaran baru: ' || v_name || ' (' || v_n || ' orang)',
          v_pkg.package_name || ' · kode ' || v_code, 'jamaah_intake', '/admin/jamaah/masuk?intake=' || v_id,
          jsonb_build_object(
            'actor', jsonb_build_object('name', coalesce(v_agent_name, v_name), 'kind', CASE WHEN v_agent IS NOT NULL THEN 'agent' ELSE 'public' END),
            'contact_name', v_name,
            'package_name', v_pkg.package_name,
            'code', v_code,
            'people_count', v_n,
            'intake_id', v_id));

  RETURN jsonb_build_object('id', v_id, 'code', v_code);
END;
$$;

REVOKE ALL ON FUNCTION public.create_jamaah_intake(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_jamaah_intake(jsonb) TO service_role;
