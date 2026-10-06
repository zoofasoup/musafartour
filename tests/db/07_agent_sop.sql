-- Tests for supabase/migrations/20261006190000_agent_sop_fee.sql (SOP/AGEN/001):
--   registration fee tracking + SOP acceptance on public.agents, the protect_agent_columns() guard,
--   accept_agent_sop(version), and the levels Duta / Silver / Gold / Platinum (no Bronze).
--
-- Runs against the live linked project, but only inside a transaction that always aborts (the final
-- RAISE EXCEPTION), so nothing is stored. Run with: ./scripts/run-db-tests.sh tests/db/07_agent_sop.sql
-- The migration is applied inside the transaction first by scripts/run-db-tests.sh while it is listed in
-- tests/db/pending-migrations.txt; after the push it is simply already there.
--
-- Report lines start with PASS, FAIL, SKIP or KNOWN. Needs one staff user (admin or superadmin); the agents are planted.

BEGIN;

DO $$
DECLARE
  _out text := '';
  _staff uuid;
  _x uuid := gen_random_uuid();   -- plain agent, signed up by email
  _xid uuid;
  _r record;
  _t1 timestamptz;
  _t2 timestamptz;
  _n bigint;
  _def text;
BEGIN
  SELECT user_id INTO _staff FROM public.user_roles WHERE role IN ('superadmin', 'admin') ORDER BY role LIMIT 1;

  -- A plain agent: auth user + agents row through the real function
  INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  VALUES (_x, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'sop-' || substr(md5(random()::text), 1, 10) || '@example.invalid',
          jsonb_build_object('full_name', 'SOP Tester', 'agent_signup', true), now(), now());
  PERFORM set_config('request.jwt.claims', json_build_object('sub', _x, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  PERFORM public.register_agent_profile();
  RESET ROLE;
  SELECT id INTO _xid FROM public.agents WHERE user_id = _x;

  -- ============================ defaults ============================
  SELECT * INTO _r FROM public.agents WHERE id = _xid;
  IF _r.registration_fee_status = 'unpaid' AND _r.registration_fee_paid_at IS NULL AND _r.sop_accepted_at IS NULL AND _r.sop_version IS NULL THEN
    _out := _out || E'PASS sop: a new agent (register_agent_profile) starts unpaid, no paid_at, SOP not accepted\n';
  ELSE
    _out := _out || format(E'FAIL sop: new agent has fee=%s paid_at=%s sop_at=%s sop_version=%s\n', _r.registration_fee_status, _r.registration_fee_paid_at, _r.sop_accepted_at, _r.sop_version);
  END IF;
  IF _r.level = 'duta' THEN _out := _out || E'PASS levels: a new agent starts at duta\n';
  ELSE _out := _out || format(E'FAIL levels: a new agent started at %s\n', _r.level); END IF;

  -- column default for level
  SELECT column_default INTO _def FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'agents' AND column_name = 'level';
  IF _def LIKE '%duta%' THEN _out := _out || E'PASS levels: agents.level default is duta\n';
  ELSE _out := _out || format(E'FAIL levels: agents.level default is %s\n', _def); END IF;

  -- ============================ forced values on a direct INSERT ============================
  DECLARE _y uuid := gen_random_uuid();
  BEGIN
    INSERT INTO auth.users (id, instance_id, aud, role, email, created_at, updated_at)
    VALUES (_y, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sop-' || substr(md5(random()::text), 1, 10) || '@example.invalid', now(), now());
    PERFORM set_config('request.jwt.claims', json_build_object('sub', _y, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    INSERT INTO public.agents (user_id, email, phone, name, referral_code, level, registration_fee_status, registration_fee_paid_at, sop_accepted_at, sop_version)
    VALUES (_y, 'sop-insert@example.invalid', '0800000099', 'SOP Insert', 'SOP' || substr(md5(random()::text), 1, 6), 'platinum', 'paid', now(), now(), 'forged')
    RETURNING level, registration_fee_status, registration_fee_paid_at, sop_accepted_at, sop_version INTO _r;
    RESET ROLE;
    IF _r.registration_fee_status = 'unpaid' AND _r.registration_fee_paid_at IS NULL AND _r.sop_accepted_at IS NULL AND _r.sop_version IS NULL AND _r.level = 'duta' THEN
      _out := _out || E'PASS sop: a direct client INSERT with forged paid/SOP/platinum values is forced to unpaid / no stamps / duta\n';
    ELSE
      _out := _out || format(E'FAIL sop: direct INSERT kept fee=%s paid_at=%s sop_at=%s version=%s level=%s\n', _r.registration_fee_status, _r.registration_fee_paid_at, _r.sop_accepted_at, _r.sop_version, _r.level);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'FAIL sop: direct INSERT raised %s (%s)\n', SQLSTATE, SQLERRM);
  END;

  -- ============================ a plain agent cannot touch the fee columns ============================
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', _x, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    UPDATE public.agents SET registration_fee_status = 'paid' WHERE id = _xid;
    RESET ROLE;
    _out := _out || E'FAIL sop: a plain agent set registration_fee_status = paid\n';
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    IF SQLSTATE = '42501' THEN _out := _out || E'PASS sop: a plain agent cannot change registration_fee_status (42501)\n';
    ELSE _out := _out || format(E'FAIL sop: fee status update raised %s (%s)\n', SQLSTATE, SQLERRM); END IF;
  END;

  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', _x, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    UPDATE public.agents SET registration_fee_paid_at = now() WHERE id = _xid;
    RESET ROLE;
    _out := _out || E'FAIL sop: a plain agent set registration_fee_paid_at\n';
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    IF SQLSTATE = '42501' THEN _out := _out || E'PASS sop: a plain agent cannot change registration_fee_paid_at (42501)\n';
    ELSE _out := _out || format(E'FAIL sop: paid_at update raised %s (%s)\n', SQLSTATE, SQLERRM); END IF;
  END;

  -- nor forge the SOP acceptance directly
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', _x, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    UPDATE public.agents SET sop_accepted_at = now(), sop_version = 'forged' WHERE id = _xid;
    RESET ROLE;
    _out := _out || E'FAIL sop: a plain agent wrote sop_accepted_at directly\n';
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    IF SQLSTATE = '42501' THEN _out := _out || E'PASS sop: a plain agent cannot write sop_accepted_at / sop_version directly (42501)\n';
    ELSE _out := _out || format(E'FAIL sop: direct SOP update raised %s (%s)\n', SQLSTATE, SQLERRM); END IF;
  END;

  -- an ordinary profile edit still works
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', _x, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    UPDATE public.agents SET city = 'Bekasi' WHERE id = _xid;
    RESET ROLE;
    _out := _out || E'PASS sop: an ordinary profile edit (city) is still allowed\n';
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'FAIL sop: ordinary profile edit raised %s (%s)\n', SQLSTATE, SQLERRM);
  END;

  -- ============================ accept_agent_sop ============================
  BEGIN
    PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
    SET LOCAL ROLE anon;
    PERFORM public.accept_agent_sop('SOP/AGEN/001-v01');
    RESET ROLE;
    _out := _out || E'FAIL accept_agent_sop: anon could call it\n';
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    IF SQLSTATE = '42501' THEN _out := _out || E'PASS accept_agent_sop: anon cannot call it (42501)\n';
    ELSE _out := _out || format(E'FAIL accept_agent_sop: anon call raised %s (%s)\n', SQLSTATE, SQLERRM); END IF;
  END;

  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', _x, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    PERFORM public.accept_agent_sop('SOP/AGEN/001-v01');
    RESET ROLE;
    SELECT sop_accepted_at, sop_version INTO _r FROM public.agents WHERE id = _xid;
    _t1 := _r.sop_accepted_at;
    IF _r.sop_accepted_at IS NOT NULL AND _r.sop_version = 'SOP/AGEN/001-v01' THEN
      _out := _out || E'PASS accept_agent_sop: the agent records their own acceptance (timestamp + version)\n';
    ELSE
      _out := _out || format(E'FAIL accept_agent_sop: after the call sop_accepted_at=%s version=%s\n', _r.sop_accepted_at, _r.sop_version);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'FAIL accept_agent_sop: agent call raised %s (%s)\n', SQLSTATE, SQLERRM);
  END;

  -- second call keeps the first timestamp and version (now() is frozen inside a transaction, so the version tells the two apart)
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', _x, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    PERFORM public.accept_agent_sop('SOP/AGEN/001-v99');
    RESET ROLE;
    SELECT sop_accepted_at, sop_version INTO _r FROM public.agents WHERE id = _xid;
    IF _r.sop_accepted_at IS NOT DISTINCT FROM _t1 AND _r.sop_version = 'SOP/AGEN/001-v01' THEN
      _out := _out || E'PASS accept_agent_sop: a second call keeps the first timestamp and version\n';
    ELSE
      _out := _out || format(E'FAIL accept_agent_sop: second call changed it to %s / %s (first %s)\n', _r.sop_accepted_at, _r.sop_version, _t1);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'FAIL accept_agent_sop: second call raised %s (%s)\n', SQLSTATE, SQLERRM);
  END;

  -- it never touches anyone else's row
  BEGIN
    SELECT count(*) INTO _n FROM public.agents WHERE sop_accepted_at IS NOT NULL AND id <> _xid AND sop_version = 'SOP/AGEN/001-v01' AND sop_accepted_at >= _t1;
    IF _n = 0 THEN _out := _out || E'PASS accept_agent_sop: only the caller''s own row got stamped\n';
    ELSE _out := _out || format(E'FAIL accept_agent_sop: %s other rows carry the new stamp\n', _n); END IF;
  END;

  -- an empty version is refused
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', _x, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    PERFORM public.accept_agent_sop('  ');
    RESET ROLE;
    _out := _out || E'FAIL accept_agent_sop: an empty version was accepted\n';
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    IF SQLSTATE = 'P0001' THEN _out := _out || E'PASS accept_agent_sop: an empty version is refused\n';
    ELSE _out := _out || format(E'FAIL accept_agent_sop: empty version raised %s (%s)\n', SQLSTATE, SQLERRM); END IF;
  END;

  -- ============================ staff can set the fee ============================
  IF _staff IS NULL THEN
    _out := _out || E'SKIP sop: no admin/superadmin in user_roles to try the staff update\n';
  ELSE
    BEGIN
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _staff, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      UPDATE public.agents SET registration_fee_status = 'paid', registration_fee_paid_at = now() WHERE id = _xid;
      RESET ROLE;
      SELECT registration_fee_status, registration_fee_paid_at INTO _r FROM public.agents WHERE id = _xid;
      IF _r.registration_fee_status = 'paid' AND _r.registration_fee_paid_at IS NOT NULL THEN
        _out := _out || E'PASS sop: staff can mark the registration fee paid (status + paid_at)\n';
      ELSE
        _out := _out || format(E'FAIL sop: staff update left fee=%s paid_at=%s\n', _r.registration_fee_status, _r.registration_fee_paid_at);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      _out := _out || format(E'FAIL sop: staff fee update raised %s (%s)\n', SQLSTATE, SQLERRM);
    END;

    BEGIN
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _staff, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      UPDATE public.agents SET registration_fee_status = 'waived' WHERE id = _xid;
      RESET ROLE;
      SELECT registration_fee_status INTO _r FROM public.agents WHERE id = _xid;
      IF _r.registration_fee_status = 'waived' THEN _out := _out || E'PASS sop: staff can waive the fee\n';
      ELSE _out := _out || E'FAIL sop: staff waive left another status\n'; END IF;
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      _out := _out || format(E'FAIL sop: staff waive raised %s (%s)\n', SQLSTATE, SQLERRM);
    END;

    -- the check constraint rejects junk
    BEGIN
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _staff, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      UPDATE public.agents SET registration_fee_status = 'maybe' WHERE id = _xid;
      RESET ROLE;
      _out := _out || E'FAIL sop: an unknown fee status was accepted\n';
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      IF SQLSTATE = '23514' THEN _out := _out || E'PASS sop: an unknown fee status is rejected by the check constraint (23514)\n';
      ELSE _out := _out || format(E'FAIL sop: unknown fee status raised %s (%s)\n', SQLSTATE, SQLERRM); END IF;
    END;
  END IF;

  -- ============================ levels ============================
  SELECT count(*) INTO _n FROM public.agents WHERE level = 'bronze';
  IF _n = 0 THEN _out := _out || E'PASS levels: no agent is left at bronze\n';
  ELSE _out := _out || format(E'FAIL levels: %s agents still at bronze\n', _n); END IF;

  BEGIN
    UPDATE public.agents SET level = 'bronze' WHERE id = _xid;
    _out := _out || E'FAIL levels: level = bronze is still allowed by the check constraint\n';
  EXCEPTION WHEN check_violation THEN
    _out := _out || E'PASS levels: bronze is no longer a valid level (check constraint)\n';
  END;

  SELECT string_agg(level_name || ':' || min_sales || '-' || coalesce(max_sales::text, ''), ' ' ORDER BY min_sales) INTO _def FROM public.agent_levels;
  IF _def = 'duta:0-0 silver:1-14 gold:15-29 platinum:30-' THEN _out := _out || E'PASS levels: agent_levels is duta 0 / silver 1 / gold 15 / platinum 30 (no bronze)\n';
  ELSE _out := _out || format(E'FAIL levels: agent_levels reads "%s"\n', _def); END IF;

  SELECT count(*) INTO _n FROM public.agent_levels WHERE benefits IS DISTINCT FROM ARRAY['Komisi sesuai tingkat dan paket', 'Akses marketing kit', 'Dukungan PIC Agen via WhatsApp'];
  IF _n = 0 THEN _out := _out || E'PASS levels: every level carries the three SOP benefits\n';
  ELSE _out := _out || format(E'FAIL levels: %s levels have other benefits\n', _n); END IF;

  RAISE EXCEPTION E'RESULTS\n%', _out;
END
$$;
