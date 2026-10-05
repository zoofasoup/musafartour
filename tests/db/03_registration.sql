-- Registration pipeline regression tests, as the Cloudflare Function (functions/_lib/intake.ts) uses it.
--
-- Runs against the live linked project, but only inside a transaction that always aborts (the final
-- RAISE EXCEPTION), so nothing is stored. Run with: ./scripts/run-db-tests.sh tests/db/03_registration.sql
--
-- Report lines start with PASS, FAIL, SKIP (prerequisite data missing) or KNOWN.
--
-- Covers public.create_jamaah_intake(jsonb) (supabase/migrations/20261003090000_jamaah_intake.sql and
-- 20261003110000_agent_intake.sql) and public.sync_registration_commission(uuid)
-- (20261001090100_offline_jamaah_registrations.sql, 20261002090000_import_sheet_support.sql).

BEGIN;

DO $$
DECLARE
  _out text := '';
  _pkg uuid;
  _agent_id uuid;
  _agent_uid uuid;
  _agent_ref text;
  _staff_uid uuid;
  _inactive_ref text;
  _phone text;
  _phone2 text;
  _role text;
  _base jsonb;
  _people jsonb;
  _res jsonb;
  _code text;
  _id uuid;
  _i record;
  _c record;
  _n bigint;
  _m bigint;
  _rc integer;
  _bal0 numeric;
  _bal1 numeric;
  _sales0 integer;
  _commission numeric;
  _reg uuid;
  _reg_skip uuid;
  _reg_free uuid;
  _pay uuid;
  _s record;
BEGIN
  SELECT id INTO _pkg FROM public.packages
   WHERE status = 'published' AND departure_date::date >= current_date ORDER BY departure_date LIMIT 1;
  -- Any active agent works for referral tests; prefer one without staff roles
  SELECT id, user_id, referral_code INTO _agent_id, _agent_uid, _agent_ref FROM public.agents
   WHERE status = 'active' ORDER BY (user_id IN (SELECT user_id FROM public.user_roles)) NULLS FIRST, created_at LIMIT 1;
  SELECT referral_code INTO _inactive_ref FROM public.agents WHERE status <> 'active' LIMIT 1;
  SELECT user_id INTO _staff_uid FROM public.user_roles WHERE role = 'superadmin' LIMIT 1;

  IF _pkg IS NULL THEN
    _out := 'SKIP registration: no upcoming published package in the database';
    RAISE EXCEPTION E'RESULTS\n%', _out;
  END IF;

  _phone := '62' || lpad(floor(random() * 1e10)::bigint::text, 10, '0');
  _phone2 := '62' || lpad(floor(random() * 1e10)::bigint::text, 10, '0');
  _people := jsonb_build_array(
    jsonb_build_object('full_name', 'Budi Santoso', 'gender', 'L', 'category', 'adult', 'room_type', 'quad', 'relation', 'Suami'),
    jsonb_build_object('full_name', 'Siti Aminah', 'gender', 'P', 'category', 'adult', 'room_type', 'quad', 'relation', 'Istri'),
    jsonb_build_object('full_name', 'Ahmad Kecil', 'gender', 'L', 'category', 'child_nobed', 'room_type', 'non_bed', 'relation', 'Anak'));
  _base := jsonb_build_object(
    'package_id', _pkg, 'contact_name', 'Budi Santoso', 'contact_phone', _phone, 'contact_city', 'Semarang',
    'consent', true, 'consent_version', '2026-10-tos', 'people', _people);

  -- =============================================================================================
  -- Public payload (no referral)
  -- =============================================================================================
  BEGIN
    SET LOCAL ROLE service_role;
    _res := public.create_jamaah_intake(_base);
    RESET ROLE;
    _code := _res ->> 'code';
    _id := (_res ->> 'id')::uuid;
    SELECT * INTO _i FROM public.jamaah_intakes WHERE id = _id;
    SELECT count(*) INTO _n FROM public.jamaah_intake_people WHERE intake_id = _id;
    IF _code ~ '^MSF-[A-HJKMNP-Z2-9]{5}$' AND _i.code = _code AND _i.status = 'new' AND _i.source = 'public'
       AND _i.agent_id IS NULL AND _i.contact_phone = _phone AND _i.contact_city = 'Semarang'
       AND _i.consent_at IS NOT NULL AND _i.consent_version = '2026-10-tos' AND _n = 3
       AND length(_i.manifest_token) >= 64 THEN
      _out := _out || format(E'PASS intake: public payload stored (code %s, status new, source public, no agent, 3 people, manifest token set)\n', _code);
    ELSE
      _out := _out || format(E'FAIL intake: public payload stored code=%s status=%s source=%s agent=%s people=%s\n', _code, _i.status, _i.source, _i.agent_id, _n);
    END IF;
    SELECT count(*) INTO _m FROM public.jamaah_intake_people WHERE intake_id = _id AND position = 3 AND category = 'child_nobed' AND room_type = 'non_bed' AND relation = 'Anak';
    IF _m = 1 THEN _out := _out || E'PASS intake: people keep their order, category, room type and relation\n';
    ELSE _out := _out || E'FAIL intake: third person was not stored as position 3 child_nobed / non_bed / Anak\n'; END IF;
    SELECT count(*) INTO _m FROM public.admin_notifications WHERE type = 'jamaah_intake' AND message LIKE '%' || _code || '%';
    IF _m = 1 THEN _out := _out || E'PASS intake: CS gets one admin notification for the submission\n';
    ELSE _out := _out || format(E'FAIL intake: %s admin notifications mention %s, expected 1\n', _m, _code); END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'FAIL intake: public payload via service_role raised %s (%s)\n', SQLSTATE, SQLERRM);
  END;

  -- =============================================================================================
  -- Agent payload: ref_code of an active agent, source 'agent'
  -- =============================================================================================
  IF _agent_id IS NULL THEN
    _out := _out || E'SKIP intake: no active agent, referral linking not tested\n';
  ELSE
    BEGIN
      SET LOCAL ROLE service_role;
      _res := public.create_jamaah_intake(_base || jsonb_build_object('ref_code', _agent_ref, 'source', 'agent', 'contact_phone', _phone2));
      RESET ROLE;
      SELECT * INTO _i FROM public.jamaah_intakes WHERE id = (_res ->> 'id')::uuid;
      IF _i.agent_id = _agent_id AND _i.source = 'agent' AND _i.ref_code = _agent_ref AND (_res ->> 'code') IS NOT NULL THEN
        _out := _out || E'PASS intake: agent payload is linked to the agent, source agent, ref_code kept\n';
      ELSE
        _out := _out || format(E'FAIL intake: agent payload stored agent_id=%s (expected %s) source=%s ref_code=%s\n', _i.agent_id, _agent_id, _i.source, _i.ref_code);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      _out := _out || format(E'FAIL intake: agent payload raised %s (%s)\n', SQLSTATE, SQLERRM);
    END;

    -- The code is matched case-insensitively (people retype links)
    BEGIN
      SET LOCAL ROLE service_role;
      _res := public.create_jamaah_intake(_base || jsonb_build_object('ref_code', lower(_agent_ref), 'contact_phone', '62' || lpad(floor(random() * 1e10)::bigint::text, 10, '0')));
      RESET ROLE;
      SELECT * INTO _i FROM public.jamaah_intakes WHERE id = (_res ->> 'id')::uuid;
      IF _i.agent_id = _agent_id AND _i.source = 'public' THEN
        _out := _out || E'PASS intake: referral code matches regardless of case; without source it stays a public registration\n';
      ELSE
        _out := _out || format(E'FAIL intake: lower-case referral stored agent_id=%s source=%s\n', _i.agent_id, _i.source);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      _out := _out || format(E'FAIL intake: lower-case referral raised %s (%s)\n', SQLSTATE, SQLERRM);
    END;
  END IF;

  -- An unknown or inactive referral never blocks a registration and never links an agent
  FOR _c IN SELECT * FROM (VALUES ('unknown referral code', 'NOSUCHCODE-' || substr(md5(random()::text), 1, 8)),
                                  ('referral code of a non-active agent', _inactive_ref)) AS t(label, ref)
  LOOP
    IF _c.ref IS NULL THEN
      _out := _out || format(E'SKIP intake: %s (no such agent in the database)\n', _c.label);
      CONTINUE;
    END IF;
    BEGIN
      SET LOCAL ROLE service_role;
      _res := public.create_jamaah_intake(_base || jsonb_build_object('ref_code', _c.ref, 'contact_phone', '62' || lpad(floor(random() * 1e10)::bigint::text, 10, '0')));
      RESET ROLE;
      SELECT * INTO _i FROM public.jamaah_intakes WHERE id = (_res ->> 'id')::uuid;
      IF _i.agent_id IS NULL THEN _out := _out || format(E'PASS intake: %s is accepted but not linked to an agent\n', _c.label);
      ELSE _out := _out || format(E'FAIL intake: %s was linked to agent %s\n', _c.label, _i.agent_id); END IF;
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      _out := _out || format(E'FAIL intake: %s raised %s (%s)\n', _c.label, SQLSTATE, SQLERRM);
    END;
  END LOOP;

  -- =============================================================================================
  -- Only the server function may call it
  -- =============================================================================================
  FOREACH _role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    BEGIN
      PERFORM set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', _role)::text, true);
      EXECUTE format('SET LOCAL ROLE %I', _role);
      PERFORM public.create_jamaah_intake(_base);
      RAISE EXCEPTION 'call applied' USING ERRCODE = 'XX001';
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      IF SQLSTATE = '42501' THEN _out := _out || format(E'PASS intake: %s cannot call create_jamaah_intake (42501)\n', _role);
      ELSE _out := _out || format(E'FAIL intake: %s call gave SQLSTATE %s (%s), expected 42501\n', _role, SQLSTATE, SQLERRM); END IF;
    END;
  END LOOP;

  -- =============================================================================================
  -- Validation inside the function (the Function validates first, the database checks again)
  -- =============================================================================================
  FOR _c IN SELECT * FROM (VALUES
    ('no consent',               _base || '{"consent": false}'::jsonb,                       'consent_required'),
    ('consent missing',          _base - 'consent',                                          'consent_required'),
    ('no people',                _base || '{"people": []}'::jsonb,                           'people_count'),
    ('people not an array',      _base || '{"people": "x"}'::jsonb,                          'people_required'),
    ('11 people',                _base || jsonb_build_object('people', (SELECT jsonb_agg(_people -> 0) FROM generate_series(1, 11))), 'people_count'),
    ('unknown package',          _base || jsonb_build_object('package_id', gen_random_uuid()), 'package_unavailable')
  ) AS t(label, payload, expected)
  LOOP
    BEGIN
      SET LOCAL ROLE service_role;
      PERFORM public.create_jamaah_intake(_c.payload);
      RAISE EXCEPTION 'call applied' USING ERRCODE = 'XX001';
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      IF SQLSTATE = 'P0001' AND SQLERRM = _c.expected THEN _out := _out || format(E'PASS intake: %s refused (%s)\n', _c.label, _c.expected);
      ELSE _out := _out || format(E'FAIL intake: %s gave SQLSTATE %s (%s), expected P0001 %s\n', _c.label, SQLSTATE, SQLERRM, _c.expected); END IF;
    END;
  END LOOP;

  -- Table constraints refuse a bad room for a category and a bad phone (nothing is stored)
  FOR _c IN SELECT * FROM (VALUES
    ('adult in a non_bed room',
      _base || jsonb_build_object('people', jsonb_build_array(jsonb_build_object('full_name', 'Budi Santoso', 'gender', 'L', 'category', 'adult', 'room_type', 'non_bed'))), '23514'),
    ('phone not in 62 format',
      _base || '{"contact_phone": "0812345"}'::jsonb, '23514')
  ) AS t(label, payload, expected)
  LOOP
    BEGIN
      SET LOCAL ROLE service_role;
      PERFORM public.create_jamaah_intake(_c.payload);
      RAISE EXCEPTION 'call applied' USING ERRCODE = 'XX001';
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      IF SQLSTATE = _c.expected THEN _out := _out || format(E'PASS intake: %s refused by the table constraint (%s)\n', _c.label, SQLSTATE);
      ELSE _out := _out || format(E'FAIL intake: %s gave SQLSTATE %s (%s), expected %s\n', _c.label, SQLSTATE, SQLERRM, _c.expected); END IF;
    END;
  END LOOP;

  -- =============================================================================================
  -- Daily rate limit: 5 submissions per phone per day
  -- =============================================================================================
  -- _phone already holds 1 intake from the public test above; 4 more are accepted, the 6th overall is refused.
  BEGIN
    SET LOCAL ROLE service_role;
    FOR i IN 1..4 LOOP
      PERFORM public.create_jamaah_intake(_base);
    END LOOP;
    RESET ROLE;
    SELECT count(*) INTO _n FROM public.jamaah_intakes WHERE contact_phone = _phone;
    IF _n = 5 THEN _out := _out || E'PASS rate limit: the first 5 submissions from one phone in a day are accepted\n';
    ELSE _out := _out || format(E'FAIL rate limit: %s intakes stored for the phone, expected 5\n', _n); END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'FAIL rate limit: first 5 submissions raised %s (%s)\n', SQLSTATE, SQLERRM);
  END;

  BEGIN
    SET LOCAL ROLE service_role;
    PERFORM public.create_jamaah_intake(_base);
    RAISE EXCEPTION 'call applied' USING ERRCODE = 'XX001';
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    IF SQLSTATE = 'P0001' AND SQLERRM = 'rate_limited' THEN _out := _out || E'PASS rate limit: the 6th submission from the same phone in a day is refused (rate_limited)\n';
    ELSE _out := _out || format(E'FAIL rate limit: 6th submission gave SQLSTATE %s (%s), expected P0001 rate_limited\n', SQLSTATE, SQLERRM); END IF;
  END;

  BEGIN
    SET LOCAL ROLE service_role;
    PERFORM public.create_jamaah_intake(_base || jsonb_build_object('contact_phone', '62' || lpad(floor(random() * 1e10)::bigint::text, 10, '0')));
    RESET ROLE;
    _out := _out || E'PASS rate limit: a different phone is not affected\n';
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'FAIL rate limit: different phone raised %s (%s)\n', SQLSTATE, SQLERRM);
  END;

  -- The window is a day: the same intakes, two days old, no longer count
  UPDATE public.jamaah_intakes SET created_at = now() - interval '2 days' WHERE contact_phone = _phone;
  BEGIN
    SET LOCAL ROLE service_role;
    PERFORM public.create_jamaah_intake(_base);
    RESET ROLE;
    _out := _out || E'PASS rate limit: submissions older than a day no longer count\n';
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'FAIL rate limit: after the window passed, a submission raised %s (%s)\n', SQLSTATE, SQLERRM);
  END;

  -- =============================================================================================
  -- Commission: credited exactly when verified payments >= price - discount
  -- =============================================================================================
  -- Execute rights first: nobody but the server side may run it
  FOREACH _role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF has_function_privilege(_role, 'public.sync_registration_commission(uuid)', 'EXECUTE') THEN
      _out := _out || format(E'FAIL commission: %s can execute sync_registration_commission\n', _role);
    ELSE
      _out := _out || format(E'PASS commission: %s cannot execute sync_registration_commission\n', _role);
    END IF;
  END LOOP;

  IF _agent_id IS NULL THEN
    _out := _out || E'SKIP commission: no active agent to credit\n';
  ELSIF _staff_uid IS NULL THEN
    _out := _out || E'SKIP commission: no superadmin to verify payments (only the owner can verify)\n';
  ELSE
    -- A flat commission of 1,500,000 on the package for this test (rolled back at the end)
    UPDATE public.packages SET agent_commission_amount = 1500000 WHERE id = _pkg;
    _commission := 1500000;
    SELECT available_balance, total_sales INTO _bal0, _sales0 FROM public.agents WHERE id = _agent_id;

    -- price 30,000,000 - discount 5,000,000 = 25,000,000 due; one registration per agent case
    INSERT INTO public.jamaah_registrations (package_id, full_name, room_type, list_price, discount, agent_id)
    VALUES (_pkg, 'Commission Test Lunas', 'quad', 30000000, 5000000, _agent_id) RETURNING id INTO _reg;
    INSERT INTO public.jamaah_registrations (package_id, full_name, room_type, list_price, discount, agent_id, commission_skipped)
    VALUES (_pkg, 'Commission Test Skipped', 'quad', 30000000, 5000000, _agent_id, true) RETURNING id INTO _reg_skip;
    INSERT INTO public.jamaah_registrations (package_id, full_name, room_type, list_price, discount)
    VALUES (_pkg, 'Commission Test No Agent', 'quad', 30000000, 5000000) RETURNING id INTO _reg_free;

    -- 1. a verified payment one rupiah short of the due amount: nothing credited
    BEGIN
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _staff_uid, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      INSERT INTO public.jamaah_payments (registration_id, amount, paid_on, bank_account, status)
      VALUES (_reg, 24999999, current_date, 'BCA', 'verified');
      INSERT INTO public.jamaah_payments (registration_id, amount, paid_on, bank_account, status)
      VALUES (_reg_skip, 25000000, current_date, 'BCA', 'verified');
      INSERT INTO public.jamaah_payments (registration_id, amount, paid_on, bank_account, status)
      VALUES (_reg_free, 25000000, current_date, 'BCA', 'verified');
      RESET ROLE;
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      _out := _out || format(E'FAIL commission: staff could not record verified payments: %s (%s)\n', SQLSTATE, SQLERRM);
    END;

    SELECT count(*) INTO _n FROM public.agent_sales WHERE registration_id = _reg;
    IF _n = 0 THEN _out := _out || E'PASS commission: 1 rupiah short of price - discount credits nothing\n';
    ELSE _out := _out || format(E'FAIL commission: %s agent_sales rows after a payment 1 rupiah short\n', _n); END IF;

    -- 2. a pending payment never counts, even for the full amount
    BEGIN
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _staff_uid, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      INSERT INTO public.jamaah_payments (registration_id, amount, paid_on, bank_account, status)
      VALUES (_reg, 5000000, current_date, 'BCA', 'pending');
      RESET ROLE;
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      _out := _out || format(E'FAIL commission: staff could not record a pending payment: %s (%s)\n', SQLSTATE, SQLERRM);
    END;
    SET LOCAL ROLE service_role;
    PERFORM public.sync_registration_commission(_reg);
    RESET ROLE;
    SELECT count(*) INTO _n FROM public.agent_sales WHERE registration_id = _reg;
    IF _n = 0 THEN _out := _out || E'PASS commission: a pending payment does not count towards the commission\n';
    ELSE _out := _out || format(E'FAIL commission: %s agent_sales rows although only 24,999,999 is verified\n', _n); END IF;

    -- 3. the last rupiah verified: exactly price - discount is paid
    BEGIN
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _staff_uid, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      INSERT INTO public.jamaah_payments (registration_id, amount, paid_on, bank_account, status)
      VALUES (_reg, 1, current_date, 'BCA', 'verified') RETURNING id INTO _pay;
      RESET ROLE;
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      _out := _out || format(E'FAIL commission: staff could not record the final payment: %s (%s)\n', SQLSTATE, SQLERRM);
    END;
    SELECT * INTO _s FROM public.agent_sales WHERE registration_id = _reg;
    SELECT available_balance, total_sales INTO _bal1, _m FROM public.agents WHERE id = _agent_id;
    IF _s.id IS NOT NULL AND _s.status = 'confirmed' AND _s.agent_id = _agent_id AND _s.commission_amount = _commission
       AND _s.sale_amount = 25000000 AND _s.source = 'registration'
       AND _bal1 = _bal0 + _commission AND _m = _sales0 + 1 THEN
      _out := _out || E'PASS commission: verified payments == price - discount credits the agent once (confirmed, 1,500,000, balance and total_sales updated)\n';
    ELSE
      _out := _out || format(E'FAIL commission: after full payment sale status=%s commission=%s sale_amount=%s balance %s -> %s, total_sales %s -> %s\n',
                             _s.status, _s.commission_amount, _s.sale_amount, _bal0, _bal1, _sales0, _m);
    END IF;

    -- 4. calling the sync again changes nothing (no double credit)
    SET LOCAL ROLE service_role;
    PERFORM public.sync_registration_commission(_reg);
    PERFORM public.sync_registration_commission(_reg);
    RESET ROLE;
    SELECT count(*) INTO _n FROM public.agent_sales WHERE registration_id = _reg;
    SELECT available_balance INTO _bal1 FROM public.agents WHERE id = _agent_id;
    IF _n = 1 AND _bal1 = _bal0 + _commission THEN _out := _out || E'PASS commission: running the sync again does not credit twice\n';
    ELSE _out := _out || format(E'FAIL commission: after re-sync there are %s sales rows and balance %s (expected 1 and %s)\n', _n, _bal1, _bal0 + _commission); END IF;

    -- 5. the agent sees it as earned in "Jamaah Saya"
    IF _agent_uid IS NOT NULL THEN
      BEGIN
        PERFORM set_config('request.jwt.claims', json_build_object('sub', _agent_uid, 'role', 'authenticated')::text, true);
        SET LOCAL ROLE authenticated;
        SELECT commission_status, pay_state, commission_amount INTO _s FROM public.list_my_agent_jamaah() WHERE registration_id = _reg;
        RESET ROLE;
        IF _s.commission_status = 'earned' AND _s.pay_state = 'lunas' AND _s.commission_amount = _commission THEN
          _out := _out || E'PASS commission: list_my_agent_jamaah shows the jamaah as lunas with the commission earned\n';
        ELSE
          _out := _out || format(E'FAIL commission: list_my_agent_jamaah shows commission_status=%s pay_state=%s commission=%s\n', _s.commission_status, _s.pay_state, _s.commission_amount);
        END IF;
      EXCEPTION WHEN OTHERS THEN
        RESET ROLE;
        _out := _out || format(E'FAIL commission: list_my_agent_jamaah raised %s (%s)\n', SQLSTATE, SQLERRM);
      END;
    END IF;

    -- 6. a skipped-commission registration and one without an agent are fully paid but credit nothing
    SELECT count(*) INTO _n FROM public.agent_sales WHERE registration_id IN (_reg_skip, _reg_free);
    IF _n = 0 THEN _out := _out || E'PASS commission: commission_skipped and no-agent registrations credit nothing when fully paid\n';
    ELSE _out := _out || format(E'FAIL commission: %s sales rows for a skipped or agent-less registration\n', _n); END IF;

    -- 7. rejecting the final payment reverses the credit (before payout)
    BEGIN
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _staff_uid, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      UPDATE public.jamaah_payments SET status = 'rejected', reject_reason = 'Test: bukti tidak sesuai' WHERE id = _pay;
      GET DIAGNOSTICS _rc = ROW_COUNT;
      RESET ROLE;
      SELECT status INTO _s FROM public.agent_sales WHERE registration_id = _reg;
      SELECT available_balance, total_sales INTO _bal1, _m FROM public.agents WHERE id = _agent_id;
      IF _rc = 1 AND _s.status = 'cancelled' AND _bal1 = _bal0 AND _m = _sales0 THEN
        _out := _out || E'PASS commission: rejecting the last payment cancels the credit and restores the agent balance\n';
      ELSE
        _out := _out || format(E'FAIL commission: after rejection rows=%s sale status=%s balance %s (expected %s) total_sales %s (expected %s)\n', _rc, _s.status, _bal1, _bal0, _m, _sales0);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      _out := _out || format(E'FAIL commission: rejecting the payment raised %s (%s)\n', SQLSTATE, SQLERRM);
    END;
  END IF;

  RAISE EXCEPTION E'RESULTS\n%', _out;
END
$$;
