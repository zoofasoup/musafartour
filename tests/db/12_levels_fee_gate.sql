-- Tests for supabase/migrations/20261008100000_levels_silver_start.sql:
--   * levels are Silver / Gold / Platinum only, a new agent starts at silver, no 'duta' is left anywhere
--   * registration fee gate: an approved agent whose fee is unpaid cannot create a lead or submit an agent intake
--     (friendly error); paid / waived can; staff can mark the fee paid, an agent cannot.
--
-- Runs against the live linked project inside a transaction that always aborts. Run with:
--   ./scripts/run-db-tests.sh tests/db/12_levels_fee_gate.sql
-- Report lines start with PASS, FAIL, SKIP or KNOWN. Needs one upcoming published package and one admin account.

BEGIN;

-- Runs one statement as a signed-in user (or anon) and returns {"ok":true,"rows":[...]} or {"ok":false,"state":...,"msg":...}.
CREATE FUNCTION pg_temp.as_user(_uid uuid, _sql text, _role text DEFAULT 'authenticated') RETURNS jsonb LANGUAGE plpgsql AS $f$
DECLARE
  _r jsonb;
BEGIN
  IF _role = 'anon' THEN
    PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
    SET LOCAL ROLE anon;
  ELSE
    PERFORM set_config('request.jwt.claims', json_build_object('sub', _uid, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
  END IF;
  BEGIN
    IF upper(left(ltrim(_sql), 6)) = 'SELECT' THEN
      EXECUTE 'SELECT coalesce(jsonb_agg(to_jsonb(t)), ''[]''::jsonb) FROM (' || _sql || ') t' INTO _r;
    ELSE
      EXECUTE _sql;
      _r := '[]'::jsonb;
    END IF;
    RESET ROLE;
    RETURN jsonb_build_object('ok', true, 'rows', _r);
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    RETURN jsonb_build_object('ok', false, 'state', SQLSTATE, 'msg', SQLERRM);
  END;
END
$f$;

CREATE FUNCTION pg_temp.rep(_ok boolean, _label text, _detail text DEFAULT '') RETURNS text LANGUAGE sql AS $f$
  SELECT CASE WHEN coalesce(_ok, false) THEN 'PASS ' || _label || E'\n' ELSE 'FAIL ' || _label || ' [' || coalesce(_detail, '') || E']\n' END
$f$;

DO $$
DECLARE
  _out text := '';
  _pkg uuid;
  _staff uuid;
  _a uuid := gen_random_uuid();   -- active agent, fee unpaid
  _b uuid := gen_random_uuid();   -- active agent, fee waived
  _c uuid := gen_random_uuid();   -- pending agent
  _u uuid;
  _arow public.agents%ROWTYPE;
  _brow public.agents%ROWTYPE;
  _crow public.agents%ROWTYPE;
  _r jsonb;
  _n bigint;
  _t text;
  _payload jsonb;
  _res jsonb;
  _phone text[] := ARRAY[]::text[];
  _i integer;
  c_msg constant text := 'Biaya registrasi belum diterima. Selesaikan pembayaran dulu.';
BEGIN
  SELECT id INTO _pkg FROM public.packages WHERE status = 'published' AND departure_date::date >= current_date ORDER BY departure_date LIMIT 1;
  SELECT user_id INTO _staff FROM public.user_roles WHERE role IN ('superadmin', 'admin') ORDER BY role LIMIT 1;
  IF _pkg IS NULL OR _staff IS NULL THEN
    RAISE EXCEPTION E'RESULTS\nSKIP fee gate: needs an upcoming published package and an admin account\n';
  END IF;
  FOR _i IN 1..6 LOOP
    _phone := _phone || ('628' || lpad(floor(random() * 1e9)::bigint::text, 9, '0'));
  END LOOP;

  FOREACH _u IN ARRAY ARRAY[_a, _b, _c] LOOP
    INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
    VALUES (_u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'gate-' || substr(md5(random()::text), 1, 10) || '@example.invalid',
            jsonb_build_object('full_name', 'GateTest ' || substr(_u::text, 1, 6), 'agent_signup', true), now(), now());
    PERFORM set_config('request.jwt.claims', json_build_object('sub', _u, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    PERFORM public.register_agent_profile();
    RESET ROLE;
  END LOOP;
  SELECT * INTO _crow FROM public.agents WHERE user_id = _c;
  -- staff approve A (fee stays unpaid) and B (fee waived)
  UPDATE public.agents SET status = 'active', approved_at = now() WHERE user_id = _a;
  UPDATE public.agents SET status = 'active', approved_at = now(), registration_fee_status = 'waived' WHERE user_id = _b;
  SELECT * INTO _arow FROM public.agents WHERE user_id = _a;
  SELECT * INTO _brow FROM public.agents WHERE user_id = _b;

  -- ============================ levels ============================
  _out := _out || pg_temp.rep(_crow.level = 'silver' AND _crow.status = 'pending' AND _crow.registration_fee_status = 'unpaid',
                          'register_agent_profile: a new agent is pending / silver / fee unpaid', _crow.level);
  SELECT pg_get_expr(d.adbin, d.adrelid) INTO _t FROM pg_attrdef d JOIN pg_attribute a ON a.attrelid = d.adrelid AND a.attnum = d.adnum
   WHERE d.adrelid = 'public.agents'::regclass AND a.attname = 'level';
  _out := _out || pg_temp.rep(_t LIKE '%silver%', 'agents.level default is silver', _t);
  SELECT count(*) INTO _n FROM public.agents WHERE level = 'duta';
  _out := _out || pg_temp.rep(_n = 0, 'no agent has level duta', _n::text);
  SELECT count(*) INTO _n FROM public.agent_levels WHERE level_name = 'duta';
  _out := _out || pg_temp.rep(_n = 0, 'agent_levels has no duta row', _n::text);
  SELECT string_agg(level_name || ':' || min_sales, ' ' ORDER BY min_sales) INTO _t FROM public.agent_levels;
  _out := _out || pg_temp.rep(_t = 'silver:0 gold:15 platinum:30', 'agent_levels thresholds are silver 0 / gold 15 / platinum 30', _t);
  SELECT count(*) INTO _n FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND prosrc ILIKE '%duta%';
  _out := _out || pg_temp.rep(_n = 0, 'no public function mentions duta', _n::text);
  SELECT count(*) INTO _n FROM pg_constraint WHERE contype = 'c' AND conrelid IN ('public.agents'::regclass, 'public.agent_commission_rates'::regclass) AND pg_get_constraintdef(oid) ILIKE '%duta%';
  _out := _out || pg_temp.rep(_n = 0, 'no CHECK constraint on agents / agent_commission_rates mentions duta', _n::text);
  -- a direct client INSERT is forced to silver
  _u := gen_random_uuid();
  INSERT INTO auth.users (id, instance_id, aud, role, email, created_at, updated_at)
  VALUES (_u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'gate-' || substr(md5(random()::text), 1, 10) || '@example.invalid', now(), now());
  _r := pg_temp.as_user(_u, format('INSERT INTO public.agents (user_id, name, email, phone, referral_code, level, status) VALUES (%L, ''Forge'', ''f@example.invalid'', ''0800'', ''forge%s'', ''platinum'', ''active'')', _u, substr(md5(random()::text), 1, 6)));
  SELECT level INTO _t FROM public.agents WHERE user_id = _u;
  _out := _out || pg_temp.rep(_t IS NULL OR _t = 'silver', 'a forged INSERT (platinum / active) ends as silver, or is refused', coalesce(_t, 'refused') || ' ' || _r::text);
  _r := pg_temp.as_user(_staff, format('SELECT public.set_commission_rate(%L, ''Quad'', ''duta'', 1)', _pkg));
  _out := _out || pg_temp.rep(NOT (_r ->> 'ok')::boolean, 'set_commission_rate refuses level duta', _r::text);

  -- ============================ fee gate: leads ============================
  _r := pg_temp.as_user(_a, format('SELECT public.create_agent_lead(%L, %L)', 'Gate Lead', _phone[1]));
  _out := _out || pg_temp.rep(NOT (_r ->> 'ok')::boolean AND _r ->> 'msg' = c_msg, 'active agent with unpaid fee cannot create a lead (friendly message)', _r::text);
  SELECT count(*) INTO _n FROM public.agent_leads WHERE agent_id = _arow.id;
  _out := _out || pg_temp.rep(_n = 0, 'the refused lead stored nothing', _n::text);
  _r := pg_temp.as_user(_b, format('SELECT public.create_agent_lead(%L, %L)', 'Gate Lead B', _phone[2]));
  _out := _out || pg_temp.rep((_r ->> 'ok')::boolean, 'active agent with waived fee can create a lead', _r::text);
  _r := pg_temp.as_user(_a, 'SELECT * FROM public.list_my_agent_leads()');
  _out := _out || pg_temp.rep((_r ->> 'ok')::boolean, 'active agent with unpaid fee can still read the portal (list_my_agent_leads)', _r::text);

  -- ============================ fee gate: agent intake ============================
  _payload := jsonb_build_object('package_id', _pkg, 'contact_name', 'Gate Intake', 'consent', true, 'consent_version', 'test', 'source', 'agent',
                'people', jsonb_build_array(jsonb_build_object('full_name', 'Gate Satu', 'gender', 'L', 'category', 'adult', 'room_type', 'quad')));
  BEGIN
    SET LOCAL ROLE service_role;
    _res := public.create_jamaah_intake(_payload || jsonb_build_object('ref_code', _arow.referral_code, 'contact_phone', _phone[3]));
    RESET ROLE;
    _out := _out || 'FAIL intake: agent source with unpaid fee was accepted' || E'\n';
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || pg_temp.rep(SQLERRM = c_msg, 'create_jamaah_intake (source agent) refuses an unpaid-fee agent with the friendly message', SQLSTATE || ' ' || SQLERRM);
  END;
  -- a public visitor on the unpaid agent's link still registers, without attribution
  SET LOCAL ROLE service_role;
  _res := public.create_jamaah_intake((_payload - 'source') || jsonb_build_object('ref_code', _arow.referral_code, 'contact_phone', _phone[4]));
  RESET ROLE;
  SELECT count(*) INTO _n FROM public.jamaah_intakes WHERE id = (_res ->> 'id')::uuid AND agent_id IS NULL AND source = 'public';
  _out := _out || pg_temp.rep(_n = 1, 'a public intake on an unpaid-fee agent link registers but is not attributed to the agent', _res::text);
  SET LOCAL ROLE service_role;
  _res := public.create_jamaah_intake(_payload || jsonb_build_object('ref_code', _brow.referral_code, 'contact_phone', _phone[5]));
  RESET ROLE;
  SELECT count(*) INTO _n FROM public.jamaah_intakes WHERE id = (_res ->> 'id')::uuid AND agent_id = _brow.id AND source = 'agent';
  _out := _out || pg_temp.rep(_n = 1, 'create_jamaah_intake (source agent) works for a waived-fee agent and attributes it', _res::text);

  -- ============================ staff vs agent marking the fee ============================
  _r := pg_temp.as_user(_a, format('UPDATE public.agents SET registration_fee_status = ''paid'' WHERE user_id = %L', _a));
  SELECT registration_fee_status INTO _t FROM public.agents WHERE user_id = _a;
  _out := _out || pg_temp.rep(_t = 'unpaid', 'an agent cannot mark their own fee paid', _t || ' ' || _r::text);
  _r := pg_temp.as_user(_staff, format('UPDATE public.agents SET registration_fee_status = ''paid'', registration_fee_paid_at = now() WHERE user_id = %L', _a));
  SELECT registration_fee_status INTO _t FROM public.agents WHERE user_id = _a;
  _out := _out || pg_temp.rep(_t = 'paid', 'staff can mark the fee paid', _t || ' ' || _r::text);
  _r := pg_temp.as_user(_a, format('SELECT public.create_agent_lead(%L, %L)', 'Gate Lead After', _phone[6]));
  _out := _out || pg_temp.rep((_r ->> 'ok')::boolean, 'after staff mark it paid the same agent can create a lead', _r::text);

  RAISE EXCEPTION E'RESULTS\n%', _out;
END
$$;
