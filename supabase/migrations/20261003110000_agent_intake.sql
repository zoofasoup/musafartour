-- Phase 3: agents register their own jamaah from the agent portal.
--
-- 1. create_jamaah_intake now records where a registration came from ('public' form or 'agent' portal). The Function
--    sets 'agent' only after it verified the agent's login; nobody else can call this (service role only).
-- 2. list_my_agent_intakes(): an agent sees the status of the registrations they sent, and nothing else. It never
--    returns the private stage-2 token, so an agent cannot open a jamaah's personal data link.

CREATE OR REPLACE FUNCTION public.create_jamaah_intake(_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pkg public.packages%ROWTYPE;
  v_agent uuid;
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

  INSERT INTO public.admin_notifications (title, message, type, action_url)
  VALUES ('Pendaftaran baru: ' || v_name || ' (' || v_n || ' orang)',
          v_pkg.package_name || ' · kode ' || v_code, 'jamaah_intake', '/admin/jamaah/masuk');

  RETURN jsonb_build_object('id', v_id, 'code', v_code);
END;
$$;

REVOKE ALL ON FUNCTION public.create_jamaah_intake(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_jamaah_intake(jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.list_my_agent_intakes()
RETURNS TABLE (code text, status text, contact_name text, package_name text, departure_date date, people_count integer, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.code, i.status, i.contact_name, p.package_name, p.departure_date::date,
         (SELECT count(*)::integer FROM public.jamaah_intake_people x WHERE x.intake_id = i.id), i.created_at
    FROM public.jamaah_intakes i
    JOIN public.packages p ON p.id = i.package_id
   WHERE i.agent_id IN (SELECT a.id FROM public.agents a WHERE a.user_id = auth.uid())
   ORDER BY i.created_at DESC
   LIMIT 100
$$;

REVOKE ALL ON FUNCTION public.list_my_agent_intakes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_my_agent_intakes() TO authenticated;
