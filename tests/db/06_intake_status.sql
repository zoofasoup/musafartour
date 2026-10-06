-- Cek status pendaftaran: public.get_intake_status(code, phone) and its attempt limit
-- (supabase/migrations/20261006160000_intake_status.sql), as the Cloudflare Function functions/api/cek-status.ts calls it.
--
-- Runs against the live linked project, but only inside a transaction that always aborts (the final
-- RAISE EXCEPTION), so nothing is stored. Run with: ./scripts/run-db-tests.sh tests/db/06_intake_status.sql
--
-- The migration SQL is repeated below inside the transaction so the test works before the migration is pushed;
-- it is idempotent, so it also works after.
--
-- Every report line starts with PASS, FAIL, SKIP or KNOWN. SKIP means prerequisite data is missing.

BEGIN;

-- "Cek status pendaftaran" (/cek-status): a person who registered through /daftar can see where their
-- registration stands with the registration code (MSF-XXXXX) plus the WhatsApp number they registered with.
--
-- Only the website's server function (functions/api/cek-status.ts, service role) can call this. The browser has
-- no access. The answer is deliberately thin: a stage, the package, the departure date and a head count.
-- It never contains the private manifest link, document paths, amounts, names or any form data.
--
-- Guessing protection: Turnstile + Cloudflare in front, and here at most 10 failed attempts per code per hour
-- (counted for any well-formed code, existing or not, so the limit itself reveals nothing).

-- 1. Failed attempts ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.intake_status_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code text NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS intake_status_attempts_code_idx ON public.intake_status_attempts (code, attempted_at DESC);

ALTER TABLE public.intake_status_attempts ENABLE ROW LEVEL SECURITY;   -- no policies: only the function below touches it
REVOKE ALL ON public.intake_status_attempts FROM PUBLIC, anon, authenticated;

-- 2. The lookup --------------------------------------------------------------------------

-- Returns {"found": false} for any code/number that does not match (a failed attempt is recorded, which is why
-- this is a return value and not an exception: an exception would roll the record back). Raises P0001
-- 'rate_limited' once a code has 10 failed attempts in the last hour.
CREATE OR REPLACE FUNCTION public.get_intake_status(_code text, _phone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  -- Business rule (PRODUCT.md): DP Rp 5 jt per person. Keep in sync with DP_MIN_PER_PAX in src/lib/jamaah.ts.
  c_dp_per_person constant numeric := 5000000;
  v_code text := regexp_replace(upper(btrim(coalesce(_code, ''))), '^MSF-?', 'MSF-');
  v_digits text := regexp_replace(coalesce(_phone, ''), '[^0-9]', '', 'g');
  v_phone text;
  v_intake public.jamaah_intakes%ROWTYPE;
  v_pkg public.packages%ROWTYPE;
  v_people integer;
  v_active integer;
  v_due numeric;
  v_paid numeric;
  v_waiting integer;
  v_incomplete integer;
  v_stage text;
  v_label text;
BEGIN
  -- Normalise like the registration form: 0812..., 812..., 62812... -> 62812...
  v_phone := CASE WHEN v_digits LIKE '0%' THEN '62' || substr(v_digits, 2)
                  WHEN v_digits LIKE '8%' THEN '62' || v_digits
                  ELSE v_digits END;

  -- A malformed code can never match; answer the same way without recording anything.
  IF v_code !~ '^MSF-[A-Z2-9]{5}$' OR v_phone !~ '^62[0-9]{8,13}$' THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  IF (SELECT count(*) FROM public.intake_status_attempts
       WHERE code = v_code AND attempted_at > now() - interval '1 hour') >= 10 THEN
    RAISE EXCEPTION 'rate_limited' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_intake FROM public.jamaah_intakes WHERE code = v_code AND contact_phone = v_phone;
  IF NOT FOUND THEN
    INSERT INTO public.intake_status_attempts (code) VALUES (v_code);
    -- Housekeeping, now and then: old attempts are of no use.
    IF random() < 0.05 THEN
      DELETE FROM public.intake_status_attempts WHERE attempted_at < now() - interval '1 day';
    END IF;
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT * INTO v_pkg FROM public.packages WHERE id = v_intake.package_id;

  SELECT count(*) INTO v_people FROM public.jamaah_intake_people WHERE intake_id = v_intake.id;

  SELECT count(*), coalesce(sum(r.list_price - r.discount), 0)
    INTO v_active, v_due
    FROM public.jamaah_registrations r
   WHERE r.intake_id = v_intake.id AND r.status = 'active';

  SELECT coalesce(sum(p.amount) FILTER (WHERE p.status = 'verified'), 0),
         count(*) FILTER (WHERE p.status = 'pending')
    INTO v_paid, v_waiting
    FROM public.jamaah_payments p
    JOIN public.jamaah_registrations r ON r.id = p.registration_id
   WHERE r.intake_id = v_intake.id AND r.status = 'active';

  -- Core data still missing for at least one person (identity, passport, the three documents).
  SELECT count(*) INTO v_incomplete
    FROM public.jamaah_registrations r
   WHERE r.intake_id = v_intake.id AND r.status = 'active'
     AND (r.nik IS NULL OR r.date_of_birth IS NULL OR r.passport_number IS NULL OR r.passport_expiry IS NULL
          OR r.ktp_path IS NULL OR r.passport_path IS NULL OR r.photo_path IS NULL);

  IF v_intake.status = 'new' THEN
    v_stage := 'waiting_cs';  v_label := 'Menunggu CS';
  ELSIF v_intake.status = 'rejected' THEN
    v_stage := 'rejected';    v_label := 'Belum bisa diproses';
  ELSIF v_active = 0 THEN
    v_stage := 'cancelled';   v_label := 'Dibatalkan';
  ELSIF v_due > 0 AND v_paid >= v_due THEN
    v_stage := 'lunas';       v_label := 'Lunas';
  ELSIF v_paid >= c_dp_per_person * v_active THEN
    v_stage := 'dp_received'; v_label := 'DP diterima';
  ELSE
    v_stage := 'accepted';    v_label := 'Diterima CS, menunggu DP';
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'code', v_intake.code,
    'stage', v_stage,
    'label', v_label,
    'package_name', v_pkg.package_name,
    'departure_date', v_pkg.departure_date,
    'people_count', CASE WHEN v_intake.status = 'accepted' AND v_active > 0 THEN v_active ELSE v_people END,
    'data_pending', v_stage IN ('accepted', 'dp_received', 'lunas') AND v_incomplete > 0,
    'payment_checking', v_stage IN ('accepted', 'dp_received') AND v_waiting > 0
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_intake_status(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_intake_status(text, text) TO service_role;

DO $$
DECLARE
  _out text := '';
  _pkg uuid;
  _pkg_name text;
  _staff_uid uuid;
  _phone text;
  _phone2 text;
  _res jsonb;
  _res2 jsonb;
  _id uuid;
  _id2 uuid;
  _id3 uuid;
  _code text;
  _code2 text;
  _tok text;
  _reg1 uuid;
  _reg2 uuid;
  _n bigint;
  _m bigint;
  _i integer;
  _role text;
  _v text;
  _base jsonb;
  _unknown constant text := 'MSF-ZZZZZ';
BEGIN
  SELECT id, package_name INTO _pkg, _pkg_name FROM public.packages
   WHERE status = 'published' AND departure_date::date >= current_date ORDER BY departure_date LIMIT 1;
  SELECT user_id INTO _staff_uid FROM public.user_roles WHERE role = 'superadmin' LIMIT 1;

  IF _pkg IS NULL THEN
    _out := 'SKIP intake status: no upcoming published package in the database';
    RAISE EXCEPTION E'RESULTS\n%', _out;
  END IF;
  IF _staff_uid IS NULL THEN _out := _out || E'SKIP staff: no superadmin, payment stages are not tested\n'; END IF;

  _phone := '62' || lpad(floor(random() * 1e10)::bigint::text, 10, '0');
  _phone2 := '62' || lpad(floor(random() * 1e10)::bigint::text, 10, '0');
  _base := jsonb_build_object(
    'package_id', _pkg, 'contact_name', 'Budi Santoso', 'contact_phone', _phone, 'contact_city', 'Semarang',
    'consent', true, 'consent_version', '2026-10-tos',
    'people', jsonb_build_array(
      jsonb_build_object('full_name', 'Budi Santoso', 'gender', 'L', 'category', 'adult', 'room_type', 'quad', 'relation', 'Suami'),
      jsonb_build_object('full_name', 'Siti Aminah', 'gender', 'P', 'category', 'adult', 'room_type', 'quad', 'relation', 'Istri'),
      jsonb_build_object('full_name', 'Ahmad Kecil', 'gender', 'L', 'category', 'child_nobed', 'room_type', 'non_bed', 'relation', 'Anak')));

  -- =============================================================================================
  -- Who may call it
  -- =============================================================================================
  FOREACH _role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF has_function_privilege(_role, 'public.get_intake_status(text, text)', 'EXECUTE') THEN
      _out := _out || format(E'FAIL access: %s can execute get_intake_status\n', _role);
    ELSE
      _out := _out || format(E'PASS access: %s cannot execute get_intake_status\n', _role);
    END IF;
    IF has_table_privilege(_role, 'public.intake_status_attempts', 'SELECT') OR has_table_privilege(_role, 'public.intake_status_attempts', 'INSERT') THEN
      _out := _out || format(E'FAIL access: %s has rights on intake_status_attempts\n', _role);
    ELSE
      _out := _out || format(E'PASS access: %s has no rights on intake_status_attempts\n', _role);
    END IF;
    -- Really calling it, with the JWT claims PostgREST would set
    BEGIN
      PERFORM set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', _role)::text, true);
      EXECUTE format('SET LOCAL ROLE %I', _role);
      PERFORM public.get_intake_status('MSF-ABCDE', '081234567890');
      RAISE EXCEPTION 'call applied' USING ERRCODE = 'XX001';
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      IF SQLSTATE = '42501' THEN _out := _out || format(E'PASS access: %s calling get_intake_status is refused (42501)\n', _role);
      ELSE _out := _out || format(E'FAIL access: %s calling get_intake_status gave SQLSTATE %s (%s), expected 42501\n', _role, SQLSTATE, SQLERRM); END IF;
    END;
  END LOOP;
  IF has_function_privilege('service_role', 'public.get_intake_status(text, text)', 'EXECUTE') THEN
    _out := _out || E'PASS access: service_role can execute get_intake_status\n';
  ELSE
    _out := _out || E'FAIL access: service_role cannot execute get_intake_status\n';
  END IF;

  -- =============================================================================================
  -- A real submission, then the lookup
  -- =============================================================================================
  SET LOCAL ROLE service_role;
  _res := public.create_jamaah_intake(_base);
  RESET ROLE;
  _id := (_res ->> 'id')::uuid;
  _code := _res ->> 'code';
  SELECT manifest_token INTO _tok FROM public.jamaah_intakes WHERE id = _id;

  BEGIN
    SET LOCAL ROLE service_role;
    _res := public.get_intake_status(_code, _phone);
    RESET ROLE;
    IF (_res ->> 'found')::boolean AND _res ->> 'stage' = 'waiting_cs' AND _res ->> 'label' = 'Menunggu CS'
       AND _res ->> 'code' = _code AND _res ->> 'package_name' = _pkg_name AND (_res ->> 'people_count')::int = 3
       AND (_res ->> 'data_pending')::boolean = false AND (_res ->> 'payment_checking')::boolean = false THEN
      _out := _out || format(E'PASS lookup: right code + phone returns Menunggu CS for %s, 3 people, no data pending\n', _pkg_name);
    ELSE
      _out := _out || format(E'FAIL lookup: right code + phone returned %s\n', _res);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'FAIL lookup: right code + phone raised %s (%s)\n', SQLSTATE, SQLERRM);
  END;

  -- Typing variants: people type lower case, drop the hyphen, use +62 or a leading 8
  FOREACH _v IN ARRAY ARRAY[lower(_code), replace(_code, '-', ''), '  ' || _code || ' '] LOOP
    BEGIN
      SET LOCAL ROLE service_role;
      _res2 := public.get_intake_status(_v, '+' || _phone);
      RESET ROLE;
      IF (_res2 ->> 'found')::boolean AND _res2 ->> 'code' = _code THEN _out := _out || format(E'PASS lookup: code typed as "%s" with +62 phone is found\n', _v);
      ELSE _out := _out || format(E'FAIL lookup: code typed as "%s" gave %s\n', _v, _res2); END IF;
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      _out := _out || format(E'FAIL lookup: code typed as "%s" raised %s (%s)\n', _v, SQLSTATE, SQLERRM);
    END;
  END LOOP;
  BEGIN
    SET LOCAL ROLE service_role;
    _res2 := public.get_intake_status(_code, '0' || substr(_phone, 3));
    RESET ROLE;
    IF (_res2 ->> 'found')::boolean THEN _out := _out || E'PASS lookup: phone typed with a leading 0 is found\n';
    ELSE _out := _out || format(E'FAIL lookup: leading-0 phone gave %s\n', _res2); END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'FAIL lookup: leading-0 phone raised %s (%s)\n', SQLSTATE, SQLERRM);
  END;

  -- What comes back: a fixed set of keys, never the private link or a document path
  SELECT string_agg(k, ',' ORDER BY k) INTO _v FROM jsonb_object_keys(_res) k;
  IF _v = 'code,data_pending,departure_date,found,label,package_name,payment_checking,people_count,stage' THEN
    _out := _out || format(E'PASS leak: result keys are exactly %s\n', _v);
  ELSE
    _out := _out || format(E'FAIL leak: unexpected result keys %s\n', _v);
  END IF;
  IF _res::text ~* '(token|path|nik|passport|phone|manifest)' OR position(_tok in _res::text) > 0 THEN
    _out := _out || format(E'FAIL leak: result mentions token/path/nik/passport/phone/manifest or contains the real token: %s\n', _res);
  ELSE
    _out := _out || E'PASS leak: no token, path, nik, passport, phone or manifest text anywhere in the result, and the real manifest token is not in it\n';
  END IF;

  -- =============================================================================================
  -- Wrong answers all look the same
  -- =============================================================================================
  SET LOCAL ROLE service_role;
  _res  := public.get_intake_status(_code, _phone2);           -- right code, wrong phone
  _res2 := public.get_intake_status(_unknown, _phone);         -- well-formed code nobody has
  RESET ROLE;
  IF _res = '{"found": false}'::jsonb AND _res2 = _res THEN
    _out := _out || E'PASS uniform: wrong phone and unknown code both return exactly {"found": false}\n';
  ELSE
    _out := _out || format(E'FAIL uniform: wrong phone gave %s, unknown code gave %s\n', _res, _res2);
  END IF;
  SET LOCAL ROLE service_role;
  _res := public.get_intake_status('nonsense', _phone);
  _res2 := public.get_intake_status(NULL, NULL);
  RESET ROLE;
  IF _res = '{"found": false}'::jsonb AND _res2 = _res THEN
    _out := _out || E'PASS uniform: malformed or empty input also returns {"found": false}, never an error\n';
  ELSE
    _out := _out || format(E'FAIL uniform: malformed gave %s, null gave %s\n', _res, _res2);
  END IF;
  SELECT count(*) INTO _n FROM public.intake_status_attempts WHERE code = _code;
  SELECT count(*) INTO _m FROM public.intake_status_attempts WHERE code = _unknown;
  IF _n = 1 AND _m = 1 AND (SELECT count(*) FROM public.intake_status_attempts WHERE code !~ '^MSF-') = 0 THEN
    _out := _out || E'PASS attempts: one failed attempt recorded for the real code and one for the unknown code; successes and malformed input record nothing\n';
  ELSE
    _out := _out || format(E'FAIL attempts: real code %s, unknown code %s recorded (expected 1 and 1)\n', _n, _m);
  END IF;

  -- =============================================================================================
  -- Attempt limit: 10 failed attempts per code per hour, then rate_limited
  -- =============================================================================================
  BEGIN
    SET LOCAL ROLE service_role;
    FOR _i IN 2..10 LOOP
      _res := public.get_intake_status(_code, _phone2);
      IF _res <> '{"found": false}'::jsonb THEN RAISE EXCEPTION 'attempt % did not fail: %', _i, _res; END IF;
    END LOOP;
    RESET ROLE;
    _out := _out || E'PASS limit: 10 failed attempts on one code are all answered normally\n';
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'FAIL limit: the first 10 attempts raised %s (%s)\n', SQLSTATE, SQLERRM);
  END;

  BEGIN
    SET LOCAL ROLE service_role;
    PERFORM public.get_intake_status(_code, _phone2);
    RAISE EXCEPTION 'call applied' USING ERRCODE = 'XX001';
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    IF SQLSTATE = 'P0001' AND SQLERRM = 'rate_limited' THEN _out := _out || E'PASS limit: the 11th failed attempt is refused (P0001 rate_limited)\n';
    ELSE _out := _out || format(E'FAIL limit: 11th attempt gave SQLSTATE %s (%s), expected P0001 rate_limited\n', SQLSTATE, SQLERRM); END IF;
  END;

  BEGIN
    SET LOCAL ROLE service_role;
    PERFORM public.get_intake_status(_code, _phone);
    RAISE EXCEPTION 'call applied' USING ERRCODE = 'XX001';
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    IF SQLSTATE = 'P0001' AND SQLERRM = 'rate_limited' THEN _out := _out || E'PASS limit: while locked, even the right phone is refused (a guesser cannot test numbers past the limit)\n';
    ELSE _out := _out || format(E'FAIL limit: right phone while locked gave SQLSTATE %s (%s)\n', SQLSTATE, SQLERRM); END IF;
  END;

  -- Another person's code is not affected
  SET LOCAL ROLE service_role;
  _res := public.create_jamaah_intake(_base || jsonb_build_object('contact_phone', _phone2));
  RESET ROLE;
  _id2 := (_res ->> 'id')::uuid;
  _code2 := _res ->> 'code';
  BEGIN
    SET LOCAL ROLE service_role;
    _res2 := public.get_intake_status(_code2, _phone2);
    RESET ROLE;
    IF (_res2 ->> 'found')::boolean THEN _out := _out || E'PASS limit: another code is not affected by the lock\n';
    ELSE _out := _out || format(E'FAIL limit: another code lookup gave %s\n', _res2); END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'FAIL limit: another code raised %s (%s)\n', SQLSTATE, SQLERRM);
  END;

  -- A code nobody has is limited the same way, so the limit itself tells a guesser nothing
  BEGIN
    SET LOCAL ROLE service_role;
    FOR _i IN 1..9 LOOP PERFORM public.get_intake_status(_unknown, _phone); END LOOP;   -- 1 already recorded above: 10 in total
    PERFORM public.get_intake_status(_unknown, _phone);
    RAISE EXCEPTION 'call applied' USING ERRCODE = 'XX001';
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    IF SQLSTATE = 'P0001' AND SQLERRM = 'rate_limited' THEN _out := _out || E'PASS limit: a code that does not exist is locked after 10 attempts too\n';
    ELSE _out := _out || format(E'FAIL limit: unknown code gave SQLSTATE %s (%s) on the 11th attempt\n', SQLSTATE, SQLERRM); END IF;
  END;

  -- The window is an hour
  UPDATE public.intake_status_attempts SET attempted_at = now() - interval '2 hours' WHERE code = _code;
  BEGIN
    SET LOCAL ROLE service_role;
    _res := public.get_intake_status(_code, _phone);
    RESET ROLE;
    IF (_res ->> 'found')::boolean THEN _out := _out || E'PASS limit: attempts older than an hour no longer count\n';
    ELSE _out := _out || format(E'FAIL limit: after the window passed the lookup gave %s\n', _res); END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'FAIL limit: after the window passed the lookup raised %s (%s)\n', SQLSTATE, SQLERRM);
  END;

  -- =============================================================================================
  -- Stages after CS accepts
  -- =============================================================================================
  UPDATE public.jamaah_intakes SET status = 'accepted', reviewed_at = now() WHERE id = _id;
  INSERT INTO public.jamaah_registrations (package_id, full_name, phone, room_type, list_price, intake_id)
  VALUES (_pkg, 'Budi Santoso', '0' || substr(_phone, 3), 'quad', 30000000, _id) RETURNING id INTO _reg1;
  INSERT INTO public.jamaah_registrations (package_id, full_name, phone, room_type, list_price, intake_id)
  VALUES (_pkg, 'Siti Aminah', '0' || substr(_phone, 3), 'quad', 30000000, _id) RETURNING id INTO _reg2;

  SET LOCAL ROLE service_role;
  _res := public.get_intake_status(_code, _phone);
  RESET ROLE;
  IF _res ->> 'stage' = 'accepted' AND _res ->> 'label' = 'Diterima CS, menunggu DP' AND (_res ->> 'people_count')::int = 2
     AND (_res ->> 'data_pending')::boolean AND NOT (_res ->> 'payment_checking')::boolean THEN
    _out := _out || E'PASS stage: accepted, no money yet -> "Diterima CS, menunggu DP", 2 people, data pending\n';
  ELSE
    _out := _out || format(E'FAIL stage: accepted intake gave %s\n', _res);
  END IF;

  IF _staff_uid IS NOT NULL THEN
    BEGIN
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _staff_uid, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      INSERT INTO public.jamaah_payments (registration_id, amount, paid_on, bank_account, status) VALUES (_reg1, 5000000, current_date, 'BCA', 'pending');
      RESET ROLE;
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      _out := _out || format(E'FAIL stage: could not record a pending payment: %s (%s)\n', SQLSTATE, SQLERRM);
    END;
    SET LOCAL ROLE service_role;
    _res := public.get_intake_status(_code, _phone);
    RESET ROLE;
    IF _res ->> 'stage' = 'accepted' AND (_res ->> 'payment_checking')::boolean THEN _out := _out || E'PASS stage: a pending transfer keeps the stage but shows payment_checking\n';
    ELSE _out := _out || format(E'FAIL stage: pending payment gave %s\n', _res); END IF;

    BEGIN
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _staff_uid, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      INSERT INTO public.jamaah_payments (registration_id, amount, paid_on, bank_account, status) VALUES (_reg1, 5000000, current_date, 'BCA', 'verified');
      RESET ROLE;
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      _out := _out || format(E'FAIL stage: could not record a verified payment: %s (%s)\n', SQLSTATE, SQLERRM);
    END;
    SET LOCAL ROLE service_role;
    _res := public.get_intake_status(_code, _phone);
    RESET ROLE;
    IF _res ->> 'stage' = 'accepted' THEN _out := _out || E'PASS stage: Rp 5 jt verified for 2 people is still short of the DP (needs Rp 10 jt)\n';
    ELSE _out := _out || format(E'FAIL stage: half the DP gave %s\n', _res); END IF;

    BEGIN
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _staff_uid, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      INSERT INTO public.jamaah_payments (registration_id, amount, paid_on, bank_account, status) VALUES (_reg2, 5000000, current_date, 'BNI', 'verified');
      RESET ROLE;
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      _out := _out || format(E'FAIL stage: could not record the second verified payment: %s (%s)\n', SQLSTATE, SQLERRM);
    END;
    SET LOCAL ROLE service_role;
    _res := public.get_intake_status(_code, _phone);
    RESET ROLE;
    IF _res ->> 'stage' = 'dp_received' AND _res ->> 'label' = 'DP diterima' AND (_res ->> 'payment_checking')::boolean THEN
      _out := _out || E'PASS stage: Rp 10 jt verified for 2 people -> "DP diterima" (the earlier pending transfer is still being checked)\n';
    ELSE
      _out := _out || format(E'FAIL stage: full DP gave %s\n', _res);
    END IF;

    BEGIN
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _staff_uid, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      INSERT INTO public.jamaah_payments (registration_id, amount, paid_on, bank_account, status) VALUES (_reg1, 25000000, current_date, 'BCA', 'verified');
      INSERT INTO public.jamaah_payments (registration_id, amount, paid_on, bank_account, status) VALUES (_reg2, 25000000, current_date, 'BCA', 'verified');
      RESET ROLE;
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      _out := _out || format(E'FAIL stage: could not record the balance: %s (%s)\n', SQLSTATE, SQLERRM);
    END;
    SET LOCAL ROLE service_role;
    _res := public.get_intake_status(_code, _phone);
    RESET ROLE;
    IF _res ->> 'stage' = 'lunas' AND _res ->> 'label' = 'Lunas' AND NOT (_res ->> 'payment_checking')::boolean THEN
      _out := _out || E'PASS stage: verified payments cover the full price -> "Lunas"\n';
    ELSE
      _out := _out || format(E'FAIL stage: fully paid gave %s\n', _res);
    END IF;
    IF _res::text ~* '(amount|rupiah|bank|BCA|BNI)' THEN _out := _out || format(E'FAIL leak: a paid result mentions amounts or banks: %s\n', _res);
    ELSE _out := _out || E'PASS leak: even a paid result carries no amounts or bank names, only the stage\n'; END IF;
  END IF;

  -- Data completion: the core fields and the three documents
  UPDATE public.jamaah_registrations
     SET nik = '3201010101010001', date_of_birth = date '1980-01-01', passport_number = 'A1234567', passport_expiry = date '2035-01-01',
         ktp_path = 'manifest/x/ktp-1.jpg', passport_path = 'manifest/x/p-1.jpg', photo_path = 'manifest/x/ph-1.jpg'
   WHERE id = _reg1;
  SET LOCAL ROLE service_role;
  _res := public.get_intake_status(_code, _phone);
  RESET ROLE;
  IF (_res ->> 'data_pending')::boolean THEN _out := _out || E'PASS stage: one person complete, the other not -> data_pending stays true\n';
  ELSE _out := _out || format(E'FAIL stage: data_pending was false with one person incomplete: %s\n', _res); END IF;
  UPDATE public.jamaah_registrations
     SET nik = '3201010101010002', date_of_birth = date '1982-01-01', passport_number = 'B1234567', passport_expiry = date '2035-01-01',
         ktp_path = 'manifest/x/ktp-2.jpg', passport_path = 'manifest/x/p-2.jpg', photo_path = 'manifest/x/ph-2.jpg'
   WHERE id = _reg2;
  SET LOCAL ROLE service_role;
  _res := public.get_intake_status(_code, _phone);
  RESET ROLE;
  IF NOT (_res ->> 'data_pending')::boolean THEN _out := _out || E'PASS stage: everyone complete -> data_pending false\n';
  ELSE _out := _out || format(E'FAIL stage: data_pending stayed true with everyone complete: %s\n', _res); END IF;
  IF _res::text ~* '(A1234567|B1234567|3201010101)' OR _res::text ~ 'manifest/x' THEN _out := _out || format(E'FAIL leak: result contains passport, NIK or a document path: %s\n', _res);
  ELSE _out := _out || E'PASS leak: result contains no passport number, NIK or document path\n'; END IF;

  -- Cancelled: no active registration left
  UPDATE public.jamaah_registrations SET status = 'cancelled', cancel_reason = 'Test' WHERE intake_id = _id;
  SET LOCAL ROLE service_role;
  _res := public.get_intake_status(_code, _phone);
  RESET ROLE;
  IF _res ->> 'stage' = 'cancelled' AND _res ->> 'label' = 'Dibatalkan' AND NOT (_res ->> 'data_pending')::boolean THEN _out := _out || E'PASS stage: every registration cancelled -> "Dibatalkan"\n';
  ELSE _out := _out || format(E'FAIL stage: cancelled intake gave %s\n', _res); END IF;

  -- Rejected by CS: the reason stays private
  UPDATE public.jamaah_intakes SET status = 'rejected', reject_reason = 'Alasan internal yang tidak boleh bocor' WHERE id = _id2;
  SET LOCAL ROLE service_role;
  _res := public.get_intake_status(_code2, _phone2);
  RESET ROLE;
  IF _res ->> 'stage' = 'rejected' AND _res ->> 'label' = 'Belum bisa diproses' AND position('internal' in _res::text) = 0 THEN
    _out := _out || E'PASS stage: rejected intake -> "Belum bisa diproses", the internal reason is not exposed\n';
  ELSE
    _out := _out || format(E'FAIL stage: rejected intake gave %s\n', _res);
  END IF;

  RAISE EXCEPTION E'RESULTS\n%', _out;
END;
$$;
