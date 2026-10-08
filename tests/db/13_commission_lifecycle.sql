-- Commission lifecycle (migrations 20261008105000_role_finance, 20261008110000_commission_lifecycle,
-- 20261008111000_commission_proofs_storage): PENDING -> ELIGIBLE -> APPROVED -> PAID, two distinct approvers, 5% PPh,
-- NIK, transfer proof, clawback, re-price on package move, lead-dispute and suspended holds, double-credit safety,
-- no more agent self-withdrawals.
--
-- Runs against the live linked project, but only inside a transaction that always aborts (the final
-- RAISE EXCEPTION), so nothing is stored. Run with: ./scripts/run-db-tests.sh tests/db/13_commission_lifecycle.sql
-- Report lines start with PASS, FAIL, SKIP (prerequisite data missing) or KNOWN.
--
-- ABOUT THE 'finance' ROLE: Postgres forbids using a new enum value in the transaction that adds it, and every test
-- here runs in ONE transaction together with the pending migrations (tests/db/pending-migrations.txt). So the real
-- user_roles row 'finance' cannot be created before the migration is pushed. The migration checks the role only through
-- public.commission_is_finance(uid) (role::text = 'finance'); this file replaces THAT ONE helper with a stub that treats
-- the role agent_admin as "finance" (clearly named test stub below) and tests all approval logic through it. When the
-- enum value already exists in the database (after the push) the real helper is tested first with a real finance user.
--
-- Sections: 0 setup, 1 money maths, 2 state machine, 3 approvals, 4 payout (NIK, proof, tax), 5 storage, 6 clawback,
-- 7 package move, 8 lead dispute and split, 9 suspended, 10 concurrency, 11 old withdrawals, 12 access.

BEGIN;

CREATE FUNCTION pg_temp.act_as(_uid uuid) RETURNS void LANGUAGE plpgsql AS $f$
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', _uid, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
END $f$;

-- Runs _sql as the user (NULL = anon). Returns 'OK' or 'SQLSTATE: message'. Effects of a successful statement stay.
CREATE FUNCTION pg_temp.run_as(_uid uuid, _sql text) RETURNS text LANGUAGE plpgsql AS $f$
BEGIN
  IF _uid IS NULL THEN
    PERFORM set_config('request.jwt.claims', '', true);
    SET LOCAL ROLE anon;
  ELSE
    PERFORM pg_temp.act_as(_uid);
  END IF;
  EXECUTE _sql;
  RESET ROLE;
  RETURN 'OK';
EXCEPTION WHEN OTHERS THEN
  RESET ROLE;
  RETURN SQLSTATE || ': ' || SQLERRM;
END $f$;

-- Number of rows _sql returns for the user.
CREATE FUNCTION pg_temp.rows_as(_uid uuid, _sql text) RETURNS bigint LANGUAGE plpgsql AS $f$
DECLARE _n bigint;
BEGIN
  IF _uid IS NULL THEN
    PERFORM set_config('request.jwt.claims', '', true);
    SET LOCAL ROLE anon;
  ELSE
    PERFORM pg_temp.act_as(_uid);
  END IF;
  EXECUTE 'SELECT count(*) FROM (' || _sql || ') q' INTO _n;
  RESET ROLE;
  RETURN _n;
EXCEPTION WHEN OTHERS THEN
  RESET ROLE;
  RETURN -1;
END $f$;

-- One jamaah through the real path: intake (with the agent's referral code) -> CS accepts it.
CREATE FUNCTION pg_temp.plant_reg(_ref text, _pkg uuid, _staff uuid, _price numeric, _name text, _phone text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql AS $f$
DECLARE
  _res jsonb; _intake uuid; _ids jsonb; _reg uuid;
  _ph text := coalesce(_phone, '62' || lpad(floor(random() * 1e10)::bigint::text, 10, '0'));
BEGIN
  SET LOCAL ROLE service_role;
  _res := public.create_jamaah_intake(jsonb_build_object(
    'package_id', _pkg, 'contact_name', _name, 'contact_phone', _ph, 'consent', true, 'consent_version', 'test',
    'source', CASE WHEN _ref IS NULL THEN 'public' ELSE 'agent' END, 'ref_code', _ref,
    'people', jsonb_build_array(jsonb_build_object('full_name', _name, 'gender', 'L', 'category', 'adult', 'room_type', 'quad'))));
  RESET ROLE;
  _intake := (_res ->> 'id')::uuid;
  SELECT jsonb_agg(jsonb_build_object('id', id, 'full_name', full_name, 'room_type', room_type, 'list_price', _price, 'include', true) ORDER BY position)
    INTO _ids FROM public.jamaah_intake_people WHERE intake_id = _intake;
  PERFORM pg_temp.act_as(_staff);
  PERFORM public.accept_jamaah_intake(_intake, _ids, true);
  RESET ROLE;
  SELECT id INTO _reg FROM public.jamaah_registrations WHERE intake_id = _intake;
  RETURN _reg;
END $f$;

-- A payment entered by the owner (verified) or any status.
CREATE FUNCTION pg_temp.pay(_reg uuid, _staff uuid, _amount numeric, _status text) RETURNS uuid LANGUAGE plpgsql AS $f$
DECLARE _id uuid;
BEGIN
  PERFORM pg_temp.act_as(_staff);
  INSERT INTO public.jamaah_payments (registration_id, amount, paid_on, bank_account, status)
  VALUES (_reg, _amount, current_date, 'BCA', _status) RETURNING id INTO _id;
  RESET ROLE;
  RETURN _id;
END $f$;

-- Plant a lunas jamaah for the agent on the package and return the sale id.
CREATE FUNCTION pg_temp.lunas(_ref text, _pkg uuid, _staff uuid, _name text, _phone text DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql AS $f$
DECLARE _reg uuid; _sale uuid;
BEGIN
  _reg := pg_temp.plant_reg(_ref, _pkg, _staff, 30000000, _name, _phone);
  PERFORM pg_temp.pay(_reg, _staff, 30000000, 'verified');
  SELECT id INTO _sale FROM public.agent_sales WHERE registration_id = _reg;
  RETURN _sale;
END $f$;

CREATE FUNCTION pg_temp.reg_of(_sale uuid) RETURNS uuid LANGUAGE sql AS $f$
  SELECT registration_id FROM public.agent_sales WHERE id = _sale $f$;

CREATE FUNCTION pg_temp.st(_sale uuid) RETURNS text LANGUAGE sql AS $f$
  SELECT commission_state || '/' || status || '/' || coalesce(hold_reason, '-') || '/' || CASE WHEN counted THEN 'counted' ELSE 'uncounted' END
    FROM public.agent_sales WHERE id = _sale $f$;

CREATE FUNCTION pg_temp.bal(_agent uuid) RETURNS numeric LANGUAGE sql AS $f$
  SELECT available_balance FROM public.agents WHERE id = _agent $f$;

-- Departure date of the package, moved inside this transaction.
CREATE FUNCTION pg_temp.depart(_pkg uuid, _days integer) RETURNS void LANGUAGE sql AS $f$
  UPDATE public.packages SET departure_date = current_date + _days WHERE id = _pkg $f$;

-- A transfer proof file in the commission-proofs bucket.
CREATE FUNCTION pg_temp.proof(_agent uuid, _file text) RETURNS text LANGUAGE plpgsql AS $f$
DECLARE _p text := _agent::text || '/' || _file;
BEGIN
  INSERT INTO storage.objects (bucket_id, name) VALUES ('commission-proofs', _p) ON CONFLICT DO NOTHING;
  RETURN _p;
END $f$;

-- Make a sale ELIGIBLE -> APPROVED with the two approvers.
CREATE FUNCTION pg_temp.approve_both(_sale uuid, _mgmt uuid, _fin uuid) RETURNS text LANGUAGE plpgsql AS $f$
DECLARE _r text;
BEGIN
  _r := pg_temp.run_as(_mgmt, format('SELECT public.approve_commissions(ARRAY[%L]::uuid[], ''manajemen'')', _sale));
  IF _r <> 'OK' THEN RETURN 'mgmt: ' || _r; END IF;
  _r := pg_temp.run_as(_fin, format('SELECT public.approve_commissions(ARRAY[%L]::uuid[], ''finance'')', _sale));
  IF _r <> 'OK' THEN RETURN 'fin: ' || _r; END IF;
  RETURN 'OK';
END $f$;

DO $$
DECLARE
  _out text := '';
  _mgmt uuid; _mgmt2 uuid;          -- two superadmins (management)
  _fin uuid;                        -- finance (stub: agent_admin)
  _cs uuid;
  _a record; _b record; _c record;  -- agent A (NIK, gold), agent B (no NIK), agent C (suspended case)
  _pk1 uuid; _g1 numeric;           -- configured package, highest gold rate
  _pk2 uuid; _g2 numeric;           -- configured package, lowest gold rate
  _pkf uuid; _flat numeric;         -- unconfigured package (flat fallback)
  _s1 uuid; _s2 uuid; _s3 uuid; _s4 uuid;
  _reg uuid; _reg2 uuid;
  _t text; _t2 text;
  _n bigint; _m bigint;
  _x numeric; _y numeric; _z numeric;
  _r record;
  _j jsonb;
  _pp text;
  _dummy text;
BEGIN
  -- ===========================================================================================
  -- 0. Setup
  -- ===========================================================================================
  SELECT user_id INTO _mgmt FROM public.user_roles WHERE role = 'superadmin' ORDER BY user_id LIMIT 1;
  SELECT user_id INTO _mgmt2 FROM public.user_roles WHERE role = 'superadmin' AND user_id <> _mgmt ORDER BY user_id LIMIT 1;

  SELECT r.package_id, r.amount INTO _pk1, _g1
    FROM public.agent_commission_rates r JOIN public.packages p ON p.id = r.package_id
   WHERE r.level = 'gold' AND p.status = 'published' AND p.departure_date >= current_date + 10 AND array_length(p.available_tiers, 1) = 1
   ORDER BY r.amount DESC, p.departure_date LIMIT 1;
  SELECT r.package_id, r.amount INTO _pk2, _g2
    FROM public.agent_commission_rates r JOIN public.packages p ON p.id = r.package_id
   WHERE r.level = 'gold' AND p.status = 'published' AND p.departure_date >= current_date + 10 AND array_length(p.available_tiers, 1) = 1
     AND r.package_id <> _pk1 AND r.amount <> _g1
   ORDER BY r.amount, p.departure_date LIMIT 1;
  SELECT p.id, coalesce(p.agent_commission_amount, 0) INTO _pkf, _flat FROM public.packages p
   WHERE p.status = 'published' AND p.departure_date >= current_date + 10 AND array_length(p.available_tiers, 1) = 1
     AND NOT EXISTS (SELECT 1 FROM public.agent_commission_rates r WHERE r.package_id = p.id)
   ORDER BY p.departure_date LIMIT 1;

  IF _mgmt IS NULL OR _mgmt2 IS NULL OR _pk1 IS NULL OR _pk2 IS NULL OR _pkf IS NULL THEN
    RAISE EXCEPTION E'RESULTS\n%', format('SKIP commission lifecycle: needs two superadmins, two configured packages with different gold rates and one unconfigured package (mgmt=%s mgmt2=%s pk1=%s pk2=%s flat=%s)', _mgmt, _mgmt2, _pk1, _pk2, _pkf);
  END IF;

  -- Real finance helper first, when the enum value is already committed in this database (after the push).
  DECLARE _fu uuid := gen_random_uuid();
  BEGIN
    INSERT INTO auth.users (id, instance_id, aud, role, email, created_at, updated_at)
    VALUES (_fu, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'fin-' || substr(md5(random()::text), 1, 10) || '@example.invalid', now(), now());
    EXECUTE format('INSERT INTO public.user_roles (user_id, role) VALUES (%L, %L)', _fu, 'finance');
    IF public.commission_is_finance(_fu) AND NOT public.commission_is_finance(_mgmt) THEN
      _out := _out || E'PASS finance: with the committed enum value a real finance user is recognised and a superadmin is not\n';
    ELSE
      _out := _out || E'FAIL finance: commission_is_finance does not recognise a real finance user\n';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE IN ('55P04', '22P02') THEN
      _out := _out || E'KNOWN finance: the enum value ''finance'' is added in the same transaction as the tests (Postgres forbids using it there), so a real finance user cannot be created; every approval test below uses the stub commission_is_finance (agent_admin acts as finance). Re-run after the push to exercise the real helper.\n';
    ELSE
      _out := _out || format(E'FAIL finance: unexpected %s (%s)\n', SQLSTATE, SQLERRM);
    END IF;
  END;

  -- Static check of the real helper (before the stub replaces it): text comparison, no enum literal.
  _t := pg_get_functiondef('public.commission_is_finance(uuid)'::regprocedure);
  IF _t LIKE '%role::text = ''finance''%' AND _t NOT LIKE '%''finance''::%' THEN
    _out := _out || E'PASS finance: commission_is_finance compares role::text with ''finance'' (no enum literal, safe in the same transaction)\n';
  ELSE
    _out := _out || E'FAIL finance: commission_is_finance does not use the text comparison\n';
  END IF;

  -- >>> TEST STUB: agent_admin acts as finance for the rest of this file <<<
  CREATE OR REPLACE FUNCTION public.commission_is_finance(_uid uuid) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
  AS 'SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid AND role = ''agent_admin'')';

  _fin := gen_random_uuid(); _cs := gen_random_uuid();
  INSERT INTO auth.users (id, instance_id, aud, role, email, created_at, updated_at)
  VALUES (_fin, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'fin-' || substr(md5(random()::text), 1, 10) || '@example.invalid', now(), now()),
         (_cs, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cs-' || substr(md5(random()::text), 1, 10) || '@example.invalid', now(), now());
  INSERT INTO public.user_roles (user_id, role) VALUES (_fin, 'agent_admin'), (_cs, 'cs_admin');

  -- Three test agents: A (valid NIK), B (no NIK), C (spare, valid NIK). All gold, active, fee paid.
  FOR _r IN SELECT n FROM generate_series(1, 3) n LOOP
    DECLARE _u uuid := gen_random_uuid();
    BEGIN
      INSERT INTO auth.users (id, instance_id, aud, role, email, created_at, updated_at)
      VALUES (_u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'lc-' || substr(md5(random()::text), 1, 10) || '@example.invalid', now(), now());
      INSERT INTO public.agents (user_id, email, phone, name, referral_code, status, level, registration_fee_status, registration_fee_paid_at,
                                 sop_accepted_at, sop_version, ktp_number, bank_name, bank_account, account_name)
      VALUES (_u, 'lc' || _r.n || '@example.invalid', '08000000' || _r.n, 'Agen Siklus ' || _r.n, 'LC' || _r.n || upper(substr(md5(random()::text), 1, 5)),
              'active', 'gold', 'paid', now(), now(), 'test',
              CASE WHEN _r.n = 2 THEN NULL ELSE '320100000000000' || _r.n END, 'BCA', '12345678' || _r.n, 'Agen Siklus ' || _r.n);
    END;
  END LOOP;
  SELECT id, user_id, referral_code INTO _a FROM public.agents WHERE name = 'Agen Siklus 1';
  SELECT id, user_id, referral_code INTO _b FROM public.agents WHERE name = 'Agen Siklus 2';
  SELECT id, user_id, referral_code INTO _c FROM public.agents WHERE name = 'Agen Siklus 3';
  UPDATE public.agents SET available_balance = 0, total_commission = 0, total_sales = 0 WHERE id IN (_a.id, _b.id, _c.id);

  -- ===========================================================================================
  -- 1. Money maths: PPh 5% withheld, net = round(gross * 0.95) in whole rupiah, tax = gross - net
  -- ===========================================================================================
  FOR _r IN SELECT * FROM (VALUES (3000000::numeric, 2850000::numeric, 150000::numeric), (1000001, 950001, 50000),
                                  (1500003, 1425003, 75000), (333, 316, 17), (1500000, 1425000, 75000)) v(g, n, tx) LOOP
    _x := public.commission_net(_r.g);
    IF _x = _r.n AND _r.g - _x = _r.tx THEN
      _out := _out || format(E'PASS tax: gross %s -> tax %s, net %s\n', _r.g, _r.g - _x, _x);
    ELSE
      _out := _out || format(E'FAIL tax: gross %s gave net %s (tax %s), expected net %s tax %s\n', _r.g, _x, _r.g - _x, _r.n, _r.tx);
    END IF;
  END LOOP;

  -- ===========================================================================================
  -- 2. State machine: PENDING until the departure date, ELIGIBLE from that day, evaluated lazily
  -- ===========================================================================================
  _s1 := pg_temp.lunas(_a.referral_code, _pkf, _mgmt, 'Siklus Satu');
  _s2 := pg_temp.lunas(_a.referral_code, _pkf, _mgmt, 'Siklus Dua');
  _s3 := pg_temp.lunas(_a.referral_code, _pk1, _mgmt, 'Siklus Tiga');
  _s4 := pg_temp.lunas(_b.referral_code, _pkf, _mgmt, 'Siklus Empat');

  _t := pg_temp.st(_s1);
  SELECT commission_amount INTO _x FROM public.agent_sales WHERE id = _s1;
  IF _t = 'pending/confirmed/-/counted' AND _x = _flat AND pg_temp.bal(_a.id) = 2 * _flat + _g1 THEN
    _out := _out || format(E'PASS state: lunas records the commission (flat %s, rate %s) as PENDING, counted in the agent totals\n', _flat, _g1);
  ELSE
    _out := _out || format(E'FAIL state: after lunas state=%s amount=%s balance=%s (expected pending/confirmed/-/counted, %s, %s)\n', _t, _x, pg_temp.bal(_a.id), _flat, 2 * _flat + _g1);
  END IF;

  -- The agent's statement before the jamaah departs: pending, gross = amount, 5% shown, nothing approved or paid.
  PERFORM pg_temp.act_as(_a.user_id);
  SELECT * INTO _r FROM public.list_my_commissions() WHERE sale_id = _s1;
  RESET ROLE;
  IF _r.state = 'pending' AND _r.gross_amount = _flat AND _r.net_amount = round(_flat * 0.95) AND _r.tax_amount = _flat - round(_flat * 0.95)
     AND _r.paid_at IS NULL AND _r.hold_reason IS NULL AND _r.role = 'utama' THEN
    _out := _out || E'PASS state: list_my_commissions shows the jamaah as pending with gross, 5% tax and net\n';
  ELSE
    _out := _out || format(E'FAIL state: statement row state=%s gross=%s tax=%s net=%s\n', _r.state, _r.gross_amount, _r.tax_amount, _r.net_amount);
  END IF;

  -- Not ELIGIBLE before departure: approval refused with a clear reason.
  _t := pg_temp.run_as(_mgmt, format('SELECT public.approve_commissions(ARRAY[%L]::uuid[], ''manajemen'')', _s3));
  IF _t LIKE 'P0001: Komisi belum layak%' THEN _out := _out || E'PASS state: a commission before departure cannot be approved (belum layak)\n';
  ELSE _out := _out || format(E'FAIL state: approving a not-yet-departed commission gave %s\n', _t); END IF;

  -- Departure day = today: ELIGIBLE (H counts); tomorrow: back to PENDING.
  PERFORM pg_temp.depart(_pk1, 0);
  PERFORM pg_temp.act_as(_a.user_id); PERFORM count(*) FROM public.list_my_commissions(); RESET ROLE;
  _t := pg_temp.st(_s3);
  PERFORM pg_temp.depart(_pk1, 1);
  PERFORM pg_temp.act_as(_a.user_id); PERFORM count(*) FROM public.list_my_commissions(); RESET ROLE;
  _t2 := pg_temp.st(_s3);
  IF _t = 'eligible/confirmed/-/counted' AND _t2 = 'pending/confirmed/-/counted' THEN
    _out := _out || E'PASS state: eligible on the departure day itself, pending again when the departure moves to tomorrow\n';
  ELSE
    _out := _out || format(E'FAIL state: departure today gave %s, tomorrow gave %s\n', _t, _t2);
  END IF;

  -- Departure passed for the unconfigured package: lazily evaluated inside list_my_commissions (no cron needed).
  PERFORM pg_temp.depart(_pkf, -1);
  PERFORM pg_temp.act_as(_a.user_id);
  SELECT * INTO _r FROM public.list_my_commissions() WHERE sale_id = _s1;
  RESET ROLE;
  IF _r.state = 'eligible' AND _r.eligible_at IS NOT NULL THEN _out := _out || E'PASS state: after the departure date list_my_commissions shows ELIGIBLE (lazy evaluation)\n';
  ELSE _out := _out || format(E'FAIL state: after departure the statement says %s\n', _r.state); END IF;

  SELECT count(*) INTO _n FROM public.admin_notifications WHERE type = 'commission_eligible' AND meta ->> 'package_id' = _pkf::text;
  SELECT (meta ->> 'count')::int INTO _m FROM public.admin_notifications WHERE type = 'commission_eligible' AND meta ->> 'package_id' = _pkf::text ORDER BY created_at DESC LIMIT 1;
  IF _n = 1 AND _m >= 2 THEN
    _out := _out || format(E'PASS notify: one commission_eligible notification for the whole departure (%s jamaah), not one per jamaah\n', _m);
  ELSE
    _out := _out || format(E'FAIL notify: %s notifications for the package, count field %s\n', _n, _m);
  END IF;
  PERFORM public.commission_refresh(NULL);
  SELECT count(*) INTO _m FROM public.admin_notifications WHERE type = 'commission_eligible' AND meta ->> 'package_id' = _pkf::text;
  IF _m = 1 THEN _out := _out || E'PASS notify: running the refresh again does not repeat the notification\n';
  ELSE _out := _out || format(E'FAIL notify: refresh repeated the notification (%s)\n', _m); END IF;

  -- The daily job is scheduled (pg_cron) and the function is service_role only.
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    SELECT count(*) INTO _n FROM cron.job WHERE jobname = 'commission-eligibility-daily' AND schedule = '0 18 * * *' AND command LIKE '%refresh_commission_eligibility%';
    IF _n = 1 THEN _out := _out || E'PASS cron: job commission-eligibility-daily runs refresh_commission_eligibility() daily at 18:00 UTC = 01:00 Asia/Jakarta\n';
    ELSE _out := _out || format(E'FAIL cron: %s jobs named commission-eligibility-daily with the expected schedule\n', _n); END IF;
  ELSE
    _out := _out || E'SKIP cron: pg_cron is not installed\n';
  END IF;
  _t := pg_temp.run_as(_a.user_id, 'SELECT public.refresh_commission_eligibility()');
  _t2 := pg_temp.run_as(NULL, 'SELECT public.refresh_commission_eligibility()');
  IF _t LIKE '42501%' AND _t2 LIKE '42501%' THEN _out := _out || E'PASS cron: refresh_commission_eligibility is refused to agents and anon (42501)\n';
  ELSE _out := _out || format(E'FAIL cron: agent got %s, anon got %s\n', _t, _t2); END IF;

  -- ===========================================================================================
  -- 3. Approvals: management (superadmin) + finance, two DIFFERENT users
  -- ===========================================================================================
  FOREACH _dummy IN ARRAY ARRAY['agent', 'anon', 'cs'] LOOP
    _t := pg_temp.run_as(CASE _dummy WHEN 'agent' THEN _a.user_id WHEN 'cs' THEN _cs ELSE NULL END,
                         format('SELECT public.approve_commissions(ARRAY[%L]::uuid[], ''manajemen'')', _s1));
    IF _t LIKE '42501%' THEN _out := _out || format(E'PASS approve: %s cannot approve (42501)\n', _dummy);
    ELSE _out := _out || format(E'FAIL approve: %s got %s\n', _dummy, _t); END IF;
  END LOOP;
  _t := pg_temp.run_as(_fin, format('SELECT public.approve_commissions(ARRAY[%L]::uuid[], ''manajemen'')', _s1));
  _t2 := pg_temp.run_as(_mgmt, format('SELECT public.approve_commissions(ARRAY[%L]::uuid[], ''finance'')', _s1));
  IF _t LIKE '42501%' AND _t2 LIKE '42501%' THEN _out := _out || E'PASS approve: finance cannot approve as manajemen and a superadmin cannot approve as finance (42501)\n';
  ELSE _out := _out || format(E'FAIL approve: finance-as-manajemen gave %s, superadmin-as-finance gave %s\n', _t, _t2); END IF;
  _t := pg_temp.run_as(_mgmt, format('SELECT public.approve_commissions(ARRAY[%L]::uuid[], ''bogus'')', _s1));
  IF _t LIKE '22023%' THEN _out := _out || E'PASS approve: an unknown approval role is refused (22023)\n'; ELSE _out := _out || format(E'FAIL approve: bogus role gave %s\n', _t); END IF;

  -- NIK required before any approval ("NIK agen belum lengkap"); agent B has none.
  _t := pg_temp.run_as(_mgmt, format('SELECT public.approve_commissions(ARRAY[%L]::uuid[], ''manajemen'')', _s4));
  IF _t = 'P0001: NIK agen belum lengkap.' THEN _out := _out || E'PASS nik: approval is refused for an agent without a 16-digit NIK (friendly message)\n';
  ELSE _out := _out || format(E'FAIL nik: approval for an agent without NIK gave %s\n', _t); END IF;
  UPDATE public.agents SET ktp_number = '12345' WHERE id = _b.id;
  _t := pg_temp.run_as(_mgmt, format('SELECT public.approve_commissions(ARRAY[%L]::uuid[], ''manajemen'')', _s4));
  IF _t = 'P0001: NIK agen belum lengkap.' THEN _out := _out || E'PASS nik: a NIK that is not 16 digits is refused too\n';
  ELSE _out := _out || format(E'FAIL nik: a 5-digit NIK gave %s\n', _t); END IF;

  -- First approval (management) leaves the row ELIGIBLE; the same step again is refused.
  _t := pg_temp.run_as(_mgmt, format('SELECT public.approve_commissions(ARRAY[%L]::uuid[], ''manajemen'')', _s1));
  SELECT commission_state, approved_mgmt_by, approved_fin_by INTO _r FROM public.agent_sales WHERE id = _s1;
  IF _t = 'OK' AND _r.commission_state = 'eligible' AND _r.approved_mgmt_by = _mgmt AND _r.approved_fin_by IS NULL THEN
    _out := _out || E'PASS approve: the management approval alone keeps the commission ELIGIBLE and records who approved\n';
  ELSE _out := _out || format(E'FAIL approve: management approval gave %s, state %s\n', _t, _r.commission_state); END IF;
  _t := pg_temp.run_as(_mgmt, format('SELECT public.approve_commissions(ARRAY[%L]::uuid[], ''manajemen'')', _s1));
  _t2 := pg_temp.run_as(_mgmt2, format('SELECT public.approve_commissions(ARRAY[%L]::uuid[], ''manajemen'')', _s1));
  IF _t LIKE 'P0001: Sudah disetujui manajemen%' AND _t2 LIKE 'P0001: Sudah disetujui manajemen%' THEN
    _out := _out || E'PASS approve: the management step cannot be repeated, not even by a second superadmin\n';
  ELSE _out := _out || format(E'FAIL approve: repeated management approval gave %s / %s\n', _t, _t2); END IF;

  -- A user who holds both roles cannot give both approvals on one commission.
  INSERT INTO public.user_roles (user_id, role) VALUES (_mgmt2, 'agent_admin') ON CONFLICT DO NOTHING;
  _t := pg_temp.run_as(_mgmt2, format('SELECT public.approve_commissions(ARRAY[%L]::uuid[], ''manajemen'')', _s2));
  _t2 := pg_temp.run_as(_mgmt2, format('SELECT public.approve_commissions(ARRAY[%L]::uuid[], ''finance'')', _s2));
  SELECT commission_state INTO _dummy FROM public.agent_sales WHERE id = _s2;
  IF _t = 'OK' AND _t2 LIKE 'P0001: Dua persetujuan harus dari dua pengguna berbeda%' AND _dummy = 'eligible' THEN
    _out := _out || E'PASS approve: the same user cannot approve a commission twice, once as manajemen and once as finance (clear message), it stays ELIGIBLE\n';
  ELSE _out := _out || format(E'FAIL approve: dual-role user got %s then %s, state %s\n', _t, _t2, _dummy); END IF;
  _t := pg_temp.run_as(_mgmt2, format('SELECT public.approve_commissions(ARRAY[%L]::uuid[], ''finance'')', _s1));
  SELECT commission_state INTO _dummy FROM public.agent_sales WHERE id = _s1;
  IF _t = 'OK' AND _dummy = 'approved' THEN
    _out := _out || E'PASS approve: a different user (mgmt2 as finance) completes the pair, the row becomes APPROVED\n';
  ELSE _out := _out || format(E'FAIL approve: second user as finance gave %s, state %s\n', _t, _dummy); END IF;
  _t := pg_temp.run_as(_fin, format('SELECT public.approve_commissions(ARRAY[%L]::uuid[], ''finance'')', _s2));
  SELECT commission_state, approved_at INTO _r FROM public.agent_sales WHERE id = _s2;
  IF _t = 'OK' AND _r.commission_state = 'approved' AND _r.approved_at IS NOT NULL THEN
    _out := _out || E'PASS approve: finance approval after the management approval gives APPROVED with approved_at\n';
  ELSE _out := _out || format(E'FAIL approve: finance approval gave %s, state %s\n', _t, _r.commission_state); END IF;
  _t := pg_temp.run_as(_fin, format('SELECT public.approve_commissions(ARRAY[%L]::uuid[], ''finance'')', _s2));
  IF _t LIKE 'P0001:%' THEN _out := _out || E'PASS approve: an approved commission cannot be approved again\n'; ELSE _out := _out || format(E'FAIL approve: re-approval gave %s\n', _t); END IF;

  -- Bulk call: valid + invalid ids -> approves the valid, reports the other (second agent C row planted here).
  _s4 := pg_temp.lunas(_c.referral_code, _pk2, _mgmt, 'Siklus Bulk');
  PERFORM pg_temp.depart(_pk2, -2);
  PERFORM public.commission_refresh(NULL);
  PERFORM pg_temp.act_as(_mgmt);
  _j := public.approve_commissions(ARRAY[_s4, _s3]::uuid[], 'manajemen');
  RESET ROLE;
  IF (_j ->> 'approved')::int = 1 AND jsonb_array_length(_j -> 'skipped') = 1 THEN
    _out := _out || E'PASS approve: a bulk call approves the eligible row and reports the pending one in skipped\n';
  ELSE _out := _out || format(E'FAIL approve: bulk result %s\n', _j); END IF;

  -- Direct writes cannot move the state machine, and approved rows cannot be re-priced by hand.
  _t := pg_temp.run_as(_mgmt, format('UPDATE public.agent_sales SET commission_state = ''paid'' WHERE id = %L', _s3));
  _t2 := pg_temp.run_as(_mgmt, format('UPDATE public.agent_sales SET commission_amount = 1 WHERE id = %L', _s1));
  IF _t LIKE '42501%' AND _t2 LIKE '42501%' THEN _out := _out || E'PASS guard: staff cannot set commission_state directly nor edit the amount of an approved sale (42501)\n';
  ELSE _out := _out || format(E'FAIL guard: direct state update gave %s, amount edit of approved gave %s\n', _t, _t2); END IF;
  _t := pg_temp.run_as(_mgmt, format('INSERT INTO public.agent_sales (agent_id, customer_name, customer_phone, package_name, commission_amount, status, commission_state, approved_at) VALUES (%L, ''Manual'', ''1'', ''P'', 5, ''confirmed'', ''approved'', now())', _a.id));
  SELECT commission_state, approved_at INTO _r FROM public.agent_sales WHERE customer_name = 'Manual' AND agent_id = _a.id;
  IF _t = 'OK' AND _r.commission_state = 'pending' AND _r.approved_at IS NULL THEN _out := _out || E'PASS guard: a manual INSERT by staff cannot start in a later state (forced to pending)\n';
  ELSE _out := _out || format(E'FAIL guard: manual insert gave %s, state %s\n', _t, _r.commission_state); END IF;
  DELETE FROM public.agent_sales WHERE customer_name = 'Manual' AND agent_id = _a.id;
  _t := pg_temp.run_as(_a.user_id, format('UPDATE public.agent_sales SET commission_amount = 99999999 WHERE id = %L', _s1));
  SELECT commission_amount INTO _x FROM public.agent_sales WHERE id = _s1;
  IF _x <> 99999999 THEN _out := _out || E'PASS guard: an agent cannot edit their own sale (RLS)\n'; ELSE _out := _out || E'FAIL guard: agent edited own sale\n'; END IF;

  -- ===========================================================================================
  -- 4. Payout: staff only, NIK, reference, proof, 5% tax, one transfer per agent
  -- ===========================================================================================
  -- Known amounts: s1 = 3,000,000, s2 = 1,000,001 (odd). Totals follow the edit.
  UPDATE public.agent_sales SET commission_amount = 3000000 WHERE id = _s1;
  UPDATE public.agent_sales SET commission_amount = 1000001 WHERE id = _s2;
  UPDATE public.agents SET available_balance = available_balance + (3000000 - _flat) + (1000001 - _flat), total_commission = total_commission + (3000000 - _flat) + (1000001 - _flat) WHERE id = _a.id;
  _x := pg_temp.bal(_a.id);
  _pp := pg_temp.proof(_a.id, 'bukti-1.pdf');

  FOREACH _dummy IN ARRAY ARRAY['agent', 'anon', 'cs'] LOOP
    _t := pg_temp.run_as(CASE _dummy WHEN 'agent' THEN _a.user_id WHEN 'cs' THEN _cs ELSE NULL END,
      format('SELECT public.mark_agent_commissions_paid(%L, ARRAY[%L]::uuid[], current_date, ''TRX'', %L)', _a.id, _s1, _pp));
    IF _t LIKE '42501%' THEN _out := _out || format(E'PASS pay: %s cannot mark a commission paid (42501)\n', _dummy);
    ELSE _out := _out || format(E'FAIL pay: %s got %s\n', _dummy, _t); END IF;
  END LOOP;

  -- Validation, each refused without changing anything.
  FOR _r IN SELECT * FROM (VALUES
      ('reference missing', format('SELECT public.mark_agent_commissions_paid(%L, ARRAY[%L]::uuid[], current_date, '' '', %L)', _a.id, _s1, _pp), '22023'),
      ('transfer date in the future', format('SELECT public.mark_agent_commissions_paid(%L, ARRAY[%L]::uuid[], current_date + 3, ''TRX'', %L)', _a.id, _s1, _pp), '22023'),
      ('proof missing', format('SELECT public.mark_agent_commissions_paid(%L, ARRAY[%L]::uuid[], current_date, ''TRX'', NULL)', _a.id, _s1), '22023'),
      ('proof in another agent folder', format('SELECT public.mark_agent_commissions_paid(%L, ARRAY[%L]::uuid[], current_date, ''TRX'', %L)', _a.id, _s1, pg_temp.proof(_c.id, 'x.pdf')), '22023'),
      ('proof file not uploaded', format('SELECT public.mark_agent_commissions_paid(%L, ARRAY[%L]::uuid[], current_date, ''TRX'', %L)', _a.id, _s1, _a.id::text || '/tidak-ada.pdf'), '22023'),
      ('commission of another agent', format('SELECT public.mark_agent_commissions_paid(%L, ARRAY[%L]::uuid[], current_date, ''TRX'', %L)', _a.id, _s4, _pp), 'P0001'),
      ('commission not yet approved', format('SELECT public.mark_agent_commissions_paid(%L, ARRAY[%L]::uuid[], current_date, ''TRX'', %L)', _a.id, _s3, _pp), 'P0001')
    ) v(label, sql, code) LOOP
    _t := pg_temp.run_as(_fin, _r.sql);
    IF _t LIKE _r.code || '%' THEN _out := _out || format(E'PASS pay: %s is refused (%s)\n', _r.label, _r.code);
    ELSE _out := _out || format(E'FAIL pay: %s gave %s, expected %s\n', _r.label, _t, _r.code); END IF;
  END LOOP;

  -- NIK checked again at payout time.
  UPDATE public.agents SET ktp_number = NULL WHERE id = _a.id;
  _t := pg_temp.run_as(_fin, format('SELECT public.mark_agent_commissions_paid(%L, ARRAY[%L]::uuid[], current_date, ''TRX'', %L)', _a.id, _s1, _pp));
  UPDATE public.agents SET ktp_number = '3201000000000001' WHERE id = _a.id;
  IF _t = 'P0001: NIK agen belum lengkap.' THEN _out := _out || E'PASS nik: payout is refused when the agent has no NIK\n';
  ELSE _out := _out || format(E'FAIL nik: payout without NIK gave %s\n', _t); END IF;
  UPDATE public.agents SET status = 'suspended' WHERE id = _a.id;
  _t := pg_temp.run_as(_fin, format('SELECT public.mark_agent_commissions_paid(%L, ARRAY[%L]::uuid[], current_date, ''TRX'', %L)', _a.id, _s1, _pp));
  UPDATE public.agents SET status = 'active' WHERE id = _a.id;
  IF _t LIKE 'P0001: Agen tidak aktif%' THEN _out := _out || E'PASS pay: a suspended agent is not paid\n'; ELSE _out := _out || format(E'FAIL pay: suspended agent got %s\n', _t); END IF;
  SELECT pg_temp.st(_s1) INTO _t;
  IF _t = 'approved/confirmed/-/counted' THEN _out := _out || E'PASS pay: all the refusals left the commissions APPROVED\n'; ELSE _out := _out || format(E'FAIL pay: after refusals the state is %s\n', _t); END IF;

  -- The payout: 3,000,000 + 1,000,001 gross, tax 150,000 + 50,000, net 2,850,000 + 950,001.
  _t := pg_temp.run_as(_fin, format('SELECT public.mark_agent_commissions_paid(%L, ARRAY[%L, %L]::uuid[], current_date - 1, ''TRX-0001'', %L)', _a.id, _s1, _s2, _pp));
  SELECT * INTO _r FROM public.commission_payouts WHERE agent_id = _a.id;
  IF _t = 'OK' AND _r.gross_amount = 4000001 AND _r.tax_amount = 200000 AND _r.net_amount = 3800001 AND _r.clawback_amount = 0
     AND _r.transfer_reference = 'TRX-0001' AND _r.transfer_date = current_date - 1 AND _r.proof_path = _pp AND _r.paid_by = _fin THEN
    _out := _out || E'PASS pay: payout row stores gross 4.000.001, PPh 5% 200.000 and net 3.800.001 with reference, date, proof path and who paid\n';
  ELSE _out := _out || format(E'FAIL pay: payout gave %s, row gross=%s tax=%s net=%s\n', _t, _r.gross_amount, _r.tax_amount, _r.net_amount); END IF;
  SELECT status, commission_state, tax_amount, net_amount, payout_id, paid_by INTO _r FROM public.agent_sales WHERE id = _s1;
  IF _r.status = 'paid' AND _r.commission_state = 'paid' AND _r.tax_amount = 150000 AND _r.net_amount = 2850000 AND _r.payout_id IS NOT NULL AND _r.paid_by = _fin THEN
    _out := _out || E'PASS pay: 3.000.000 -> tax 150.000, net 2.850.000 stored on the sale; state PAID\n';
  ELSE _out := _out || format(E'FAIL pay: sale after payout status=%s state=%s tax=%s net=%s\n', _r.status, _r.commission_state, _r.tax_amount, _r.net_amount); END IF;
  SELECT tax_amount, net_amount INTO _r FROM public.agent_sales WHERE id = _s2;
  IF _r.tax_amount = 50000 AND _r.net_amount = 950001 THEN _out := _out || E'PASS pay: an odd amount 1.000.001 rounds to net 950.001 (tax 50.000)\n';
  ELSE _out := _out || format(E'FAIL pay: odd amount gave tax %s net %s\n', _r.tax_amount, _r.net_amount); END IF;
  IF pg_temp.bal(_a.id) = _x - 4000001 THEN _out := _out || E'PASS pay: the recorded-and-unpaid balance goes down by the gross\n';
  ELSE _out := _out || format(E'FAIL pay: balance %s, expected %s\n', pg_temp.bal(_a.id), _x - 4000001); END IF;
  _t := pg_temp.run_as(_fin, format('SELECT public.mark_agent_commissions_paid(%L, ARRAY[%L]::uuid[], current_date, ''TRX-2'', %L)', _a.id, _s1, _pp));
  IF _t LIKE 'P0001:%' THEN _out := _out || E'PASS pay: a paid commission cannot be paid twice\n'; ELSE _out := _out || format(E'FAIL pay: second payment gave %s\n', _t); END IF;
  _t := pg_temp.run_as(_mgmt, format('UPDATE public.agent_sales SET commission_amount = 5, status = ''confirmed'' WHERE id = %L', _s1));
  IF _t LIKE '42501%' THEN _out := _out || E'PASS pay: a paid sale cannot be edited or re-opened by hand (42501)\n'; ELSE _out := _out || format(E'FAIL pay: edit of a paid sale gave %s\n', _t); END IF;

  -- The agent's statement after payment: PAID with date, reference, proof; sees only own rows.
  PERFORM pg_temp.act_as(_a.user_id);
  SELECT * INTO _r FROM public.list_my_commissions() WHERE sale_id = _s1;
  SELECT count(*) INTO _n FROM public.list_my_commissions();
  RESET ROLE;
  IF _r.state = 'paid' AND _r.gross_amount = 3000000 AND _r.tax_amount = 150000 AND _r.net_amount = 2850000 AND _r.transfer_reference = 'TRX-0001' AND _r.proof_path = _pp THEN
    _out := _out || E'PASS statement: the agent sees PAID with gross, tax, net, transfer reference and proof path\n';
  ELSE _out := _out || format(E'FAIL statement: paid row state=%s gross=%s net=%s ref=%s\n', _r.state, _r.gross_amount, _r.net_amount, _r.transfer_reference); END IF;
  SELECT count(*) INTO _m FROM public.agent_sales WHERE agent_id = _a.id AND status IN ('confirmed', 'paid');
  IF _n = _m THEN _out := _out || format(E'PASS statement: the agent sees exactly their own %s commission rows\n', _n); ELSE _out := _out || format(E'FAIL statement: %s rows vs %s own rows\n', _n, _m); END IF;
  PERFORM pg_temp.act_as(_c.user_id);
  SELECT count(*) INTO _n FROM public.list_my_commissions() WHERE sale_id IN (_s1, _s2, _s3);
  RESET ROLE;
  IF _n = 0 THEN _out := _out || E'PASS statement: another agent sees none of agent A''s rows\n'; ELSE _out := _out || format(E'FAIL statement: agent C sees %s of A''s rows\n', _n); END IF;
  _t := pg_temp.run_as(NULL, 'SELECT * FROM public.list_my_commissions()');
  _t2 := pg_temp.run_as(NULL, 'SELECT * FROM public.list_my_commission_adjustments()');
  IF _t LIKE '42501%' AND _t2 LIKE '42501%' THEN _out := _out || E'PASS statement: anon is refused (42501)\n'; ELSE _out := _out || format(E'FAIL statement: anon got %s / %s\n', _t, _t2); END IF;

  SELECT count(*) INTO _n FROM public.commission_payouts WHERE agent_id = _a.id;
  IF pg_temp.rows_as(_a.user_id, 'SELECT 1 FROM public.commission_payouts') = _n AND pg_temp.rows_as(_c.user_id, 'SELECT 1 FROM public.commission_payouts') = 0
     AND pg_temp.rows_as(NULL, 'SELECT 1 FROM public.commission_payouts') <= 0 THEN
    _out := _out || E'PASS rls: an agent reads only own payouts; another agent and anon read none\n';
  ELSE _out := _out || E'FAIL rls: payout visibility is wrong\n'; END IF;

  -- ===========================================================================================
  -- 5. Storage: the agent reads ONLY proofs of payouts made to them
  -- ===========================================================================================
  PERFORM pg_temp.proof(_a.id, 'belum-dipakai.pdf');
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'commission-proofs' AND NOT public) THEN _out := _out || E'PASS storage: bucket commission-proofs exists and is private\n';
  ELSE _out := _out || E'FAIL storage: bucket commission-proofs missing or public\n'; END IF;
  _n := pg_temp.rows_as(_a.user_id, 'SELECT 1 FROM storage.objects WHERE bucket_id = ''commission-proofs''');
  _m := pg_temp.rows_as(_c.user_id, 'SELECT 1 FROM storage.objects WHERE bucket_id = ''commission-proofs''');
  IF _n = 1 AND _m = 0 AND pg_temp.rows_as(NULL, 'SELECT 1 FROM storage.objects WHERE bucket_id = ''commission-proofs''') <= 0 THEN
    _out := _out || E'PASS storage: agent A reads only the proof of their payout (not an unused upload), agent C and anon read none\n';
  ELSE _out := _out || format(E'FAIL storage: A sees %s, C sees %s\n', _n, _m); END IF;
  IF pg_temp.rows_as(_fin, 'SELECT 1 FROM storage.objects WHERE bucket_id = ''commission-proofs''') >= 3
     AND pg_temp.rows_as(_cs, 'SELECT 1 FROM storage.objects WHERE bucket_id = ''commission-proofs''') = 0 THEN
    _out := _out || E'PASS storage: finance reads all proofs, CS reads none\n';
  ELSE _out := _out || E'FAIL storage: staff proof visibility is wrong\n'; END IF;
  _t := pg_temp.run_as(_mgmt, format('INSERT INTO storage.objects (bucket_id, name) VALUES (''commission-proofs'', %L)', _a.id::text || '/dari-staf.pdf'));
  _t2 := pg_temp.run_as(_a.user_id, format('INSERT INTO storage.objects (bucket_id, name) VALUES (''commission-proofs'', %L)', _a.id::text || '/dari-agen.pdf'));
  IF _t = 'OK' AND _t2 NOT LIKE 'OK%' THEN _out := _out || E'PASS storage: staff (superadmin) can upload a proof, an agent cannot\n';
  ELSE _out := _out || format(E'FAIL storage: staff upload %s, agent upload %s\n', _t, _t2); END IF;

  -- ===========================================================================================
  -- 6. Refund / cancel AFTER payout: clawback record, never a negative balance, netted against the NEXT payout (AGT-104)
  -- ===========================================================================================
  -- Before approval a rejected payment simply cancels the commission (the old behaviour, kept).
  PERFORM pg_temp.depart(_pk2, 30);
  _s4 := pg_temp.lunas(_a.referral_code, _pk2, _mgmt, 'Siklus Batal Sebelum');
  _reg := pg_temp.reg_of(_s4);
  _x := pg_temp.bal(_a.id);
  _t := pg_temp.run_as(_mgmt, format('UPDATE public.jamaah_payments SET status = ''rejected'', reject_reason = ''uji'' WHERE registration_id = %L', _reg));
  IF _t = 'OK' AND pg_temp.st(_s4) = 'pending/cancelled/-/uncounted' AND pg_temp.bal(_a.id) < _x THEN
    _out := _out || E'PASS refund: a rejected payment before approval cancels the commission and takes it off the totals\n';
  ELSE _out := _out || format(E'FAIL refund: before approval gave %s, state %s\n', _t, pg_temp.st(_s4)); END IF;

  -- After PAID: s1 (3.000.000, net 2.850.000) loses its payment; s2 (1.000.001, net 950.001) is cancelled.
  _x := pg_temp.bal(_a.id);
  _t := pg_temp.run_as(_mgmt, format('UPDATE public.jamaah_payments SET status = ''rejected'', reject_reason = ''uji'' WHERE registration_id = %L', pg_temp.reg_of(_s1)));
  _t2 := pg_temp.run_as(_mgmt, format('UPDATE public.jamaah_registrations SET status = ''cancelled'', cancelled_at = now(), cancel_reason = ''uji batal'' WHERE id = %L', pg_temp.reg_of(_s2)));
  SELECT count(*), coalesce(sum(amount), 0) INTO _n, _y FROM public.agent_commission_adjustments WHERE agent_id = _a.id AND status = 'open';
  IF _t = 'OK' AND _t2 = 'OK' AND _n = 2 AND _y = 2850000 + 950001 THEN
    _out := _out || E'PASS clawback: a rejected payment and a cancellation after PAID each create an open adjustment for what the agent received (2.850.000 and 950.001)\n';
  ELSE _out := _out || format(E'FAIL clawback: %s / %s, %s open adjustments, total %s\n', _t, _t2, _n, _y); END IF;
  IF pg_temp.st(_s1) = 'paid/paid/-/counted' AND pg_temp.st(_s2) = 'paid/paid/-/counted' AND pg_temp.bal(_a.id) = _x AND pg_temp.bal(_a.id) >= 0 THEN
    _out := _out || E'PASS clawback: the paid sales stay PAID (history) and the balance is not touched, so it never goes negative\n';
  ELSE _out := _out || format(E'FAIL clawback: sales %s / %s, balance %s -> %s\n', pg_temp.st(_s1), pg_temp.st(_s2), _x, pg_temp.bal(_a.id)); END IF;
  PERFORM public.sync_registration_commission(pg_temp.reg_of(_s1));
  SELECT count(*) INTO _n FROM public.agent_commission_adjustments WHERE agent_id = _a.id;
  IF _n = 2 THEN _out := _out || E'PASS clawback: syncing again does not duplicate the adjustment (unique per sale)\n'; ELSE _out := _out || format(E'FAIL clawback: %s adjustments after a second sync\n', _n); END IF;
  IF EXISTS (SELECT 1 FROM public.admin_notifications WHERE type = 'commission_clawback' AND meta ->> 'agent_id' = _a.id::text) THEN
    _out := _out || E'PASS clawback: management gets a commission_clawback notification\n'; ELSE _out := _out || E'FAIL clawback: no notification\n'; END IF;
  IF pg_temp.rows_as(_a.user_id, 'SELECT * FROM public.list_my_commission_adjustments()') = 2
     AND pg_temp.rows_as(_c.user_id, 'SELECT * FROM public.list_my_commission_adjustments()') = 0
     AND pg_temp.rows_as(_fin, 'SELECT * FROM public.admin_list_commission_adjustments()') >= 2 THEN
    _out := _out || E'PASS clawback: the agent sees own open adjustments (other agents none), staff see all\n';
  ELSE _out := _out || E'FAIL clawback: adjustment visibility is wrong\n'; END IF;

  -- Next payout 1: a small commission (net below the debt) -> net 0, no proof needed, the debt is only partly settled.
  _s4 := pg_temp.lunas(_a.referral_code, _pk2, _mgmt, 'Siklus Potong Satu');
  PERFORM pg_temp.depart(_pk2, -2);
  PERFORM public.commission_refresh(NULL);
  _dummy := pg_temp.approve_both(_s4, _mgmt, _fin);
  SELECT commission_amount INTO _y FROM public.agent_sales WHERE id = _s4;
  _t := pg_temp.run_as(_fin, format('SELECT public.mark_agent_commissions_paid(%L, ARRAY[%L]::uuid[], current_date, ''TRX-POTONG-1'', NULL)', _a.id, _s4));
  SELECT * INTO _r FROM public.commission_payouts WHERE transfer_reference = 'TRX-POTONG-1';
  SELECT coalesce(sum(settled_amount), 0) INTO _z FROM public.agent_commission_adjustments WHERE agent_id = _a.id;
  IF _dummy = 'OK' AND _t = 'OK' AND _r.gross_amount = _y AND _r.clawback_amount = round(_y * 0.95) AND _r.net_amount = 0 AND _z = round(_y * 0.95) THEN
    _out := _out || format(E'PASS clawback: the next payout (gross %s, net %s) is netted entirely against the debt, transfer 0, debt left %s\n', _y, round(_y * 0.95), 3800001 - _z);
  ELSE _out := _out || format(E'FAIL clawback: payout 1 gave %s/%s gross=%s claw=%s net=%s settled=%s\n', _dummy, _t, _r.gross_amount, _r.clawback_amount, _r.net_amount, _z); END IF;
  SELECT status INTO _t FROM public.agent_commission_adjustments WHERE agent_id = _a.id ORDER BY created_at, id LIMIT 1;

  -- Next payout 2: a bigger commission clears the rest of the debt and the remainder is transferred (proof required).
  PERFORM pg_temp.depart(_pk1, 30);
  _s4 := pg_temp.lunas(_a.referral_code, _pk1, _mgmt, 'Siklus Potong Dua');
  -- A commission larger than the remaining debt (5.000.000, edited before approval; totals kept in step).
  SELECT commission_amount INTO _y FROM public.agent_sales WHERE id = _s4;
  UPDATE public.agent_sales SET commission_amount = 5000000 WHERE id = _s4;
  UPDATE public.agents SET available_balance = available_balance + (5000000 - _y), total_commission = total_commission + (5000000 - _y) WHERE id = _a.id;
  PERFORM pg_temp.depart(_pk1, -2);
  PERFORM public.commission_refresh(NULL);
  _dummy := pg_temp.approve_both(_s4, _mgmt, _fin);
  SELECT commission_amount INTO _y FROM public.agent_sales WHERE id = _s4;
  _x := 3800001 - _z;   -- debt left
  _t := pg_temp.run_as(_fin, format('SELECT public.mark_agent_commissions_paid(%L, ARRAY[%L]::uuid[], current_date, ''TRX-POTONG-2'', NULL)', _a.id, _s4));
  IF _t LIKE '22023: Bukti transfer wajib%' THEN _out := _out || E'PASS clawback: when money is still transferred after netting, the proof is required\n';
  ELSE _out := _out || format(E'FAIL clawback: payout 2 without proof gave %s\n', _t); END IF;
  _t := pg_temp.run_as(_fin, format('SELECT public.mark_agent_commissions_paid(%L, ARRAY[%L]::uuid[], current_date, ''TRX-POTONG-2'', %L)', _a.id, _s4, pg_temp.proof(_a.id, 'bukti-2.pdf')));
  SELECT * INTO _r FROM public.commission_payouts WHERE transfer_reference = 'TRX-POTONG-2';
  SELECT count(*) INTO _n FROM public.agent_commission_adjustments WHERE agent_id = _a.id AND status = 'open';
  IF _t = 'OK' AND _r.clawback_amount = _x AND _r.net_amount = round(_y * 0.95) - _x AND _n = 0 THEN
    _out := _out || format(E'PASS clawback: the second payout clears the remaining debt %s and transfers %s; no open adjustment is left\n', _x, _r.net_amount);
  ELSE _out := _out || format(E'FAIL clawback: payout 2 gave %s claw=%s net=%s open=%s (debt %s, gross %s)\n', _t, _r.clawback_amount, _r.net_amount, _n, _x, _y); END IF;

  -- ===========================================================================================
  -- 7. Package move: re-price before approval, frozen after (AGT-103)
  -- ===========================================================================================
  PERFORM pg_temp.depart(_pk1, 30);
  PERFORM pg_temp.depart(_pk2, 30);
  _s1 := pg_temp.lunas(_c.referral_code, _pk1, _mgmt, 'Siklus Pindah');
  _reg := pg_temp.reg_of(_s1);
  SELECT commission_amount INTO _x FROM public.agent_sales WHERE id = _s1;
  _y := pg_temp.bal(_c.id);
  _t := pg_temp.run_as(_mgmt, format('UPDATE public.jamaah_registrations SET package_id = %L WHERE id = %L', _pk2, _reg));
  SELECT commission_amount, package_id, departure_date INTO _r FROM public.agent_sales WHERE id = _s1;
  IF _t = 'OK' AND _x = _g1 AND _r.commission_amount = _g2 AND _r.package_id = _pk2
     AND _r.departure_date = (SELECT departure_date FROM public.packages WHERE id = _pk2)
     AND pg_temp.bal(_c.id) = _y - _g1 + _g2 AND pg_temp.st(_s1) = 'pending/confirmed/-/counted' THEN
    _out := _out || format(E'PASS reprice: moving a PENDING commission to another package re-prices it (%s -> %s), updates package and departure, and the agent totals follow\n', _g1, _g2);
  ELSE _out := _out || format(E'FAIL reprice: move gave %s, amount %s -> %s, balance %s -> %s\n', _t, _x, _r.commission_amount, _y, pg_temp.bal(_c.id)); END IF;
  _t := pg_temp.run_as(_mgmt, format('UPDATE public.jamaah_registrations SET package_id = %L WHERE id = %L', _pk1, _reg));
  SELECT commission_amount INTO _z FROM public.agent_sales WHERE id = _s1;
  IF _t = 'OK' AND _z = _g1 AND pg_temp.bal(_c.id) = _y THEN _out := _out || E'PASS reprice: moving back gives the first amount again (no drift in the totals)\n';
  ELSE _out := _out || format(E'FAIL reprice: moving back gave %s, amount %s, balance %s\n', _t, _z, pg_temp.bal(_c.id)); END IF;

  PERFORM pg_temp.depart(_pk1, -3);
  PERFORM pg_temp.depart(_pk2, -3);
  PERFORM public.commission_refresh(NULL);
  _dummy := pg_temp.approve_both(_s1, _mgmt, _fin);
  _t := pg_temp.run_as(_mgmt, format('UPDATE public.jamaah_registrations SET package_id = %L WHERE id = %L', _pk2, _reg));
  SELECT commission_amount, package_id, reprice_diff, commission_state INTO _r FROM public.agent_sales WHERE id = _s1;
  IF _dummy = 'OK' AND _t = 'OK' AND _r.commission_state = 'approved' AND _r.commission_amount = _g1 AND _r.package_id = _pk1 AND _r.reprice_diff = _g2 - _g1 THEN
    _out := _out || format(E'PASS reprice: after APPROVED the amount is frozen (%s) and the difference %s is flagged in reprice_diff for admin\n', _g1, _g2 - _g1);
  ELSE _out := _out || format(E'FAIL reprice: frozen case gave %s/%s state=%s amount=%s diff=%s\n', _dummy, _t, _r.commission_state, _r.commission_amount, _r.reprice_diff); END IF;
  _t := pg_temp.run_as(_mgmt, format('UPDATE public.jamaah_registrations SET package_id = %L WHERE id = %L', _pk1, _reg));
  SELECT reprice_diff INTO _z FROM public.agent_sales WHERE id = _s1;
  IF _z IS NULL THEN _out := _out || E'PASS reprice: moving back to the original package clears the flag\n'; ELSE _out := _out || format(E'FAIL reprice: flag %s after moving back\n', _z); END IF;

  -- ===========================================================================================
  -- 8. Lead dispute (AGT-106) and helper split 30/70
  -- ===========================================================================================
  UPDATE public.agents SET ktp_number = '3201000000000002' WHERE id = _b.id;
  DECLARE
    _ph1 text := '62' || lpad(floor(random() * 1e10)::bigint::text, 10, '0');
    _ph2 text := '62' || lpad(floor(random() * 1e10)::bigint::text, 10, '0');
    _ph3 text := '62' || lpad(floor(random() * 1e10)::bigint::text, 10, '0');
    _intake uuid; _child uuid; _bb numeric;
  BEGIN
    -- Scenario 1: the dispute is open when the jamaah turns lunas -> recorded, held, not counted.
    PERFORM pg_temp.depart(_pk1, 30);
    PERFORM pg_temp.act_as(_b.user_id);
    PERFORM public.create_agent_lead('Sengketa Satu', _ph1, NULL, NULL);
    RESET ROLE;
    _x := pg_temp.bal(_a.id);
    _reg := pg_temp.plant_reg(_a.referral_code, _pk1, _mgmt, 30000000, 'Sengketa Satu', _ph1);
    SELECT intake_id INTO _intake FROM public.jamaah_registrations WHERE id = _reg;
    SELECT count(*) INTO _n FROM public.lead_disputes WHERE intake_id = _intake AND status = 'open' AND lead_agent_id = _b.id AND intake_agent_id = _a.id;
    IF _n = 1 THEN _out := _out || E'PASS dispute: the lead_conflict notification opens a lead_disputes row (lead agent B, intake agent A)\n';
    ELSE _out := _out || format(E'FAIL dispute: %s open disputes for the intake\n', _n); END IF;
    PERFORM pg_temp.pay(_reg, _mgmt, 30000000, 'verified');
    SELECT id INTO _s1 FROM public.agent_sales WHERE registration_id = _reg;
    IF _s1 IS NOT NULL AND pg_temp.st(_s1) = 'pending/confirmed/dispute/uncounted' AND pg_temp.bal(_a.id) = _x THEN
      _out := _out || E'PASS dispute: lunas with an open dispute records the sale as PENDING with hold ''dispute'' and does not touch the agent totals\n';
    ELSE _out := _out || format(E'FAIL dispute: sale %s state %s balance %s -> %s\n', _s1, pg_temp.st(_s1), _x, pg_temp.bal(_a.id)); END IF;
    PERFORM pg_temp.depart(_pk1, -1);
    PERFORM public.commission_refresh(NULL);
    _t := pg_temp.run_as(_mgmt, format('SELECT public.approve_commissions(ARRAY[%L]::uuid[], ''manajemen'')', _s1));
    IF pg_temp.st(_s1) = 'pending/confirmed/dispute/uncounted' AND _t LIKE 'P0001: Komisi ditahan: sengketa%' THEN
      _out := _out || E'PASS dispute: even after the departure the commission stays PENDING and cannot be approved while the dispute is open\n';
    ELSE _out := _out || format(E'FAIL dispute: after departure %s, approve gave %s\n', pg_temp.st(_s1), _t); END IF;
    PERFORM pg_temp.act_as(_a.user_id);
    SELECT * INTO _r FROM public.list_my_commissions() WHERE sale_id = _s1;
    RESET ROLE;
    IF _r.state = 'pending' AND _r.hold_reason = 'dispute' THEN _out := _out || E'PASS dispute: the agent''s statement shows the row as held (hold_reason dispute)\n';
    ELSE _out := _out || format(E'FAIL dispute: statement state=%s hold=%s\n', _r.state, _r.hold_reason); END IF;

    _t := pg_temp.run_as(_a.user_id, format('SELECT public.resolve_lead_dispute(%L, %L, NULL, NULL)', _intake, _a.id));
    _t2 := pg_temp.run_as(NULL, format('SELECT public.resolve_lead_dispute(%L, %L, NULL, NULL)', _intake, _a.id));
    IF _t LIKE '42501%' AND _t2 LIKE '42501%' THEN _out := _out || E'PASS dispute: an agent and anon cannot resolve a dispute (42501)\n'; ELSE _out := _out || format(E'FAIL dispute: agent %s, anon %s\n', _t, _t2); END IF;
    _t := pg_temp.run_as(_mgmt, format('SELECT public.resolve_lead_dispute(%L, %L, NULL, NULL)', _intake, _c.id));
    _t2 := pg_temp.run_as(_mgmt, format('SELECT public.resolve_lead_dispute(%L, %L, 50, NULL)', _intake, _a.id));
    IF _t LIKE '22023%' AND _t2 LIKE '22023%' THEN _out := _out || E'PASS dispute: a winner outside the two agents and a helper share other than 30/40 are refused (22023)\n'; ELSE _out := _out || format(E'FAIL dispute: bad winner %s, bad percent %s\n', _t, _t2); END IF;
    IF pg_temp.rows_as(_a.user_id, 'SELECT * FROM public.admin_list_lead_disputes()') = -1 AND pg_temp.rows_as(_fin, 'SELECT * FROM public.admin_list_lead_disputes() WHERE status = ''open''') >= 1 THEN
      _out := _out || E'PASS dispute: staff list the disputes, an agent is refused\n'; ELSE _out := _out || E'FAIL dispute: admin_list_lead_disputes access is wrong\n'; END IF;

    _x := pg_temp.bal(_a.id);
    _t := pg_temp.run_as(_mgmt, format('SELECT public.resolve_lead_dispute(%L, %L, NULL, ''uji'')', _intake, _a.id));
    SELECT agent_id INTO _y FROM (SELECT NULL::numeric agent_id) z;   -- placeholder to keep types simple
    IF _t = 'OK' AND pg_temp.st(_s1) = 'eligible/confirmed/-/counted' AND pg_temp.bal(_a.id) = _x + _g1
       AND (SELECT agent_id FROM public.jamaah_registrations WHERE id = _reg) = _a.id
       AND (SELECT status FROM public.lead_disputes WHERE intake_id = _intake) = 'resolved' THEN
      _out := _out || format(E'PASS dispute: resolving for A (100%%) releases the hold: the sale is ELIGIBLE (departed), counted, %s credited to A\n', _g1);
    ELSE _out := _out || format(E'FAIL dispute: resolve gave %s, state %s, balance %s -> %s\n', _t, pg_temp.st(_s1), _x, pg_temp.bal(_a.id)); END IF;
    _t := pg_temp.run_as(_mgmt, format('SELECT public.resolve_lead_dispute(%L, %L, NULL, NULL)', _intake, _a.id));
    IF _t LIKE 'P0001%' THEN _out := _out || E'PASS dispute: a resolved dispute cannot be resolved twice\n'; ELSE _out := _out || format(E'FAIL dispute: second resolve gave %s\n', _t); END IF;

    -- Scenario 2: decided before lunas with a 30% helper share for B.
    PERFORM pg_temp.depart(_pk1, 30);
    PERFORM pg_temp.act_as(_b.user_id); PERFORM public.create_agent_lead('Sengketa Dua', _ph2, NULL, NULL); RESET ROLE;
    _reg2 := pg_temp.plant_reg(_a.referral_code, _pk1, _mgmt, 30000000, 'Sengketa Dua', _ph2);
    SELECT intake_id INTO _intake FROM public.jamaah_registrations WHERE id = _reg2;
    _t := pg_temp.run_as(_mgmt, format('SELECT public.resolve_lead_dispute(%L, %L, 30, ''bantuan'')', _intake, _a.id));
    _x := pg_temp.bal(_a.id); _bb := pg_temp.bal(_b.id);
    PERFORM pg_temp.pay(_reg2, _mgmt, 30000000, 'verified');
    SELECT id, commission_amount INTO _s2, _y FROM public.agent_sales WHERE registration_id = _reg2;
    SELECT id, commission_amount, agent_id INTO _child, _z, _dummy FROM public.agent_sales WHERE parent_sale_id = _s2;
    SELECT agent_id::text INTO _dummy FROM public.agent_sales WHERE id = _child;
    IF _t = 'OK' AND _y = _g1 - round(_g1 * 0.3) AND _z = round(_g1 * 0.3) AND _y + _z = _g1 AND _dummy = _b.id::text
       AND pg_temp.bal(_a.id) = _x + _y AND pg_temp.bal(_b.id) = _bb + _z THEN
      _out := _out || format(E'PASS split: 30/70 gives A %s and B %s (sum %s = the rate for A''s level); two rows, both counted\n', _y, _z, _g1);
    ELSE _out := _out || format(E'FAIL split: resolve %s main %s helper %s agent %s balances A %s B %s\n', _t, _y, _z, _dummy, pg_temp.bal(_a.id), pg_temp.bal(_b.id)); END IF;
    PERFORM pg_temp.act_as(_b.user_id); SELECT * INTO _r FROM public.list_my_commissions() WHERE sale_id = _child; RESET ROLE;
    PERFORM pg_temp.act_as(_a.user_id); SELECT * INTO STRICT _j FROM (SELECT to_jsonb(l) FROM public.list_my_commissions() l WHERE l.sale_id = _s2) q; RESET ROLE;
    IF _r.role = 'bantuan' AND _r.share_percent = 30 AND _r.gross_amount = _z AND (_j ->> 'role') = 'utama' AND (_j ->> 'share_percent')::int = 70 THEN
      _out := _out || E'PASS split: B''s statement shows the helper row (30%), A''s the main row (70%)\n';
    ELSE _out := _out || format(E'FAIL split: statement role=%s share=%s main=%s\n', _r.role, _r.share_percent, _j); END IF;

    PERFORM pg_temp.depart(_pk1, -1);
    PERFORM public.commission_refresh(NULL);
    _dummy := pg_temp.approve_both(_child, _mgmt, _fin);
    _t := pg_temp.run_as(_fin, format('SELECT public.mark_agent_commissions_paid(%L, ARRAY[%L]::uuid[], current_date, ''TRX-BANTUAN'', %L)', _b.id, _child, pg_temp.proof(_b.id, 'bantuan.pdf')));
    IF _dummy = 'OK' AND _t = 'OK' AND pg_temp.st(_s2) = 'eligible/confirmed/-/counted' THEN
      _out := _out || E'PASS split: the helper row runs its own approval and payout while the main row is still ELIGIBLE\n';
    ELSE _out := _out || format(E'FAIL split: helper flow %s / %s, main %s\n', _dummy, _t, pg_temp.st(_s2)); END IF;
    _t := pg_temp.run_as(_mgmt, format('UPDATE public.jamaah_registrations SET status = ''cancelled'', cancelled_at = now(), cancel_reason = ''uji batal'' WHERE id = %L', _reg2));
    SELECT count(*) INTO _n FROM public.agent_commission_adjustments WHERE agent_id = _b.id AND sale_id = _child;
    IF _t = 'OK' AND pg_temp.st(_s2) = 'eligible/cancelled/-/uncounted' AND _n = 1 THEN
      _out := _out || E'PASS split: cancelling the registration cancels the unpaid main row and creates a clawback for the already paid helper row\n';
    ELSE _out := _out || format(E'FAIL split: cancel gave %s, main %s, helper clawbacks %s\n', _t, pg_temp.st(_s2), _n); END IF;

    -- Scenario 3: management gives the jamaah to the LEAD agent B (the commission moves to B, A gets nothing).
    PERFORM pg_temp.depart(_pk1, 30);
    PERFORM pg_temp.act_as(_b.user_id); PERFORM public.create_agent_lead('Sengketa Tiga', _ph3, NULL, NULL); RESET ROLE;
    _reg := pg_temp.plant_reg(_a.referral_code, _pk1, _mgmt, 30000000, 'Sengketa Tiga', _ph3);
    SELECT intake_id INTO _intake FROM public.jamaah_registrations WHERE id = _reg;
    _t := pg_temp.run_as(_fin, format('SELECT public.resolve_lead_dispute(%L, %L, NULL, NULL)', _intake, _b.id));
    PERFORM pg_temp.pay(_reg, _mgmt, 30000000, 'verified');
    SELECT count(*) INTO _n FROM public.agent_sales WHERE registration_id = _reg AND agent_id = _b.id AND status = 'confirmed' AND commission_amount = _g1;
    SELECT count(*) INTO _m FROM public.agent_sales WHERE registration_id = _reg AND agent_id = _a.id;
    IF _t = 'OK' AND _n = 1 AND _m = 0 THEN _out := _out || E'PASS dispute: a decision for the lead agent B credits B and nothing to A (agent_admin may decide)\n';
    ELSE _out := _out || format(E'FAIL dispute: decision for B gave %s, B rows %s, A rows %s\n', _t, _n, _m); END IF;
  END;

  -- ===========================================================================================
  -- 9. Suspended agent accrues nothing (AGT-109): recorded, held ("Ditahan"), released on reactivation
  -- ===========================================================================================
  PERFORM pg_temp.depart(_pk2, 30);
  _reg := pg_temp.plant_reg(_c.referral_code, _pk2, _mgmt, 30000000, 'Siklus Ditahan');
  _x := pg_temp.bal(_c.id);
  UPDATE public.agents SET status = 'suspended' WHERE id = _c.id;
  _y := pg_temp.bal(_c.id);   -- C's other pending / eligible commissions are held too, so this is lower than _x
  PERFORM pg_temp.pay(_reg, _mgmt, 30000000, 'verified');
  SELECT id INTO _s1 FROM public.agent_sales WHERE registration_id = _reg;
  IF _s1 IS NOT NULL AND pg_temp.st(_s1) = 'pending/confirmed/suspended/uncounted' AND pg_temp.bal(_c.id) = _y THEN
    _out := _out || E'PASS suspended: lunas of a suspended agent''s jamaah is recorded as PENDING with hold ''suspended'' and adds nothing to the agent totals\n';
  ELSE _out := _out || format(E'FAIL suspended: sale %s state %s balance %s -> %s\n', _s1, pg_temp.st(_s1), _y, pg_temp.bal(_c.id)); END IF;
  PERFORM pg_temp.depart(_pk2, -1);
  PERFORM public.commission_refresh(NULL);
  _t := pg_temp.run_as(_mgmt, format('SELECT public.approve_commissions(ARRAY[%L]::uuid[], ''manajemen'')', _s1));
  IF pg_temp.st(_s1) = 'pending/confirmed/suspended/uncounted' AND _t LIKE 'P0001: Komisi ditahan: agen tidak aktif%' THEN
    _out := _out || E'PASS suspended: after the departure it stays PENDING (Ditahan) and cannot be approved\n';
  ELSE _out := _out || format(E'FAIL suspended: after departure %s, approve gave %s\n', pg_temp.st(_s1), _t); END IF;
  UPDATE public.agents SET status = 'active' WHERE id = _c.id;
  IF pg_temp.st(_s1) = 'eligible/confirmed/-/counted' AND pg_temp.bal(_c.id) = _x + _g2 THEN
    _out := _out || E'PASS suspended: reactivating the agent releases the hold at once: ELIGIBLE and counted\n';
  ELSE _out := _out || format(E'FAIL suspended: after reactivation %s, balance %s (expected %s)\n', pg_temp.st(_s1), pg_temp.bal(_c.id), _x + _g2); END IF;
  _t := pg_temp.run_as(_mgmt, format('SELECT public.approve_commissions(ARRAY[%L]::uuid[], ''manajemen'')', _s1));
  UPDATE public.agents SET status = 'suspended' WHERE id = _c.id;
  SELECT commission_state, approved_mgmt_by INTO _r FROM public.agent_sales WHERE id = _s1;
  IF _t = 'OK' AND _r.commission_state = 'pending' AND _r.approved_mgmt_by IS NULL AND pg_temp.bal(_c.id) = _y THEN
    _out := _out || E'PASS suspended: suspending an agent whose commission is ELIGIBLE sends it back to PENDING, a half approval is void, totals go down\n';
  ELSE _out := _out || format(E'FAIL suspended: after suspension state %s approver %s balance %s\n', _r.commission_state, _r.approved_mgmt_by, pg_temp.bal(_c.id)); END IF;
  UPDATE public.agents SET status = 'active' WHERE id = _c.id;

  -- ===========================================================================================
  -- 9b. Manual sales (log_agent_sale) credit the totals themselves: they are born counted, so a hold and a release do not double count
  -- ===========================================================================================
  _x := pg_temp.bal(_a.id);
  _t := pg_temp.run_as(_mgmt, format('SELECT public.log_agent_sale(%L, ''Manual Uji'', ''08123'', NULL, ''Paket Manual'', 10000000, 4.5, current_date - 1, ''confirmed'', NULL)', _a.id));
  SELECT id, counted, commission_state, commission_amount INTO _r FROM public.agent_sales WHERE customer_name = 'Manual Uji' AND agent_id = _a.id;
  IF _t = 'OK' AND _r.counted AND _r.commission_amount > 0 AND pg_temp.bal(_a.id) = _x + _r.commission_amount THEN
    _out := _out || E'PASS manual: a sale logged with log_agent_sale is credited once by the function and marked counted\n';
  ELSE _out := _out || format(E'FAIL manual: log_agent_sale gave %s counted=%s balance %s -> %s\n', _t, _r.counted, _x, pg_temp.bal(_a.id)); END IF;
  _s1 := _r.id; _y := _r.commission_amount;
  UPDATE public.agents SET status = 'suspended' WHERE id = _a.id;
  UPDATE public.agents SET status = 'active' WHERE id = _a.id;
  IF pg_temp.bal(_a.id) = _x + _y AND pg_temp.st(_s1) = 'eligible/confirmed/-/counted' THEN
    _out := _out || E'PASS manual: suspending and re-activating the agent returns the manual sale to ELIGIBLE (its departure passed) without double counting\n';
  ELSE _out := _out || format(E'FAIL manual: after suspend / re-activate balance %s (expected %s), state %s\n', pg_temp.bal(_a.id), _x + _y, pg_temp.st(_s1)); END IF;

  -- ===========================================================================================
  -- 10. Concurrency / double credit (AGT-112)
  -- ===========================================================================================
  _t := pg_get_functiondef('public.sync_registration_commission(uuid)'::regprocedure);
  IF _t LIKE '%FROM public.jamaah_registrations WHERE id = _registration_id FOR UPDATE%' THEN
    _out := _out || E'PASS concurrency: sync_registration_commission locks the registration row FOR UPDATE before it reads or writes the sale\n';
  ELSE _out := _out || E'FAIL concurrency: no FOR UPDATE on the registration row\n'; END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'agent_sales_registration_uidx' AND indexdef LIKE '%UNIQUE%registration_id%') THEN
    _out := _out || E'PASS concurrency: the unique partial index on agent_sales.registration_id is still the backstop\n';
  ELSE _out := _out || E'FAIL concurrency: unique index on registration_id missing\n'; END IF;
  PERFORM pg_temp.depart(_pk2, 30);
  _reg := pg_temp.plant_reg(_a.referral_code, _pk2, _mgmt, 30000000, 'Siklus Ganda');
  _x := pg_temp.bal(_a.id);
  PERFORM pg_temp.pay(_reg, _mgmt, 30000000, 'verified');
  _y := pg_temp.bal(_a.id);
  PERFORM public.sync_registration_commission(_reg);
  PERFORM public.sync_registration_commission(_reg);
  PERFORM pg_temp.pay(_reg, _mgmt, 1000000, 'verified');   -- an overpayment verified afterwards
  SELECT count(*) INTO _n FROM public.agent_sales WHERE registration_id = _reg;
  IF _n = 1 AND pg_temp.bal(_a.id) = _y AND _y = _x + _g2 THEN
    _out := _out || E'PASS concurrency: repeated syncs and a later extra payment credit the jamaah exactly once (one row, balance +rate once)\n';
  ELSE _out := _out || format(E'FAIL concurrency: %s rows, balance %s -> %s -> %s\n', _n, _x, _y, pg_temp.bal(_a.id)); END IF;
  _t := pg_temp.run_as(_mgmt, format('INSERT INTO public.agent_sales (agent_id, customer_name, customer_phone, package_name, registration_id, commission_amount, status, source) SELECT agent_id, ''dup'', ''1'', ''P'', registration_id, 1, ''confirmed'', ''registration'' FROM public.agent_sales WHERE registration_id = %L', _reg));
  IF _t LIKE '23505%' THEN _out := _out || E'PASS concurrency: a second sale row for the same registration is refused by the unique index (23505)\n';
  ELSE _out := _out || format(E'FAIL concurrency: duplicate sale insert gave %s\n', _t); END IF;
  _out := _out || E'KNOWN concurrency: two truly parallel sessions cannot be simulated inside one test transaction; the lock is verified from the function definition and the sequential cases above, not with two live connections\n';

  -- ===========================================================================================
  -- 11. Old withdrawals stay readable; the agent can no longer create one
  -- ===========================================================================================
  INSERT INTO public.agent_withdrawals (agent_id, amount, bank_name, bank_account, account_name, status)
  VALUES (_a.id, 100000, 'BCA', '1', 'Lama', 'paid');
  IF pg_temp.rows_as(_a.user_id, 'SELECT 1 FROM public.agent_withdrawals') = 1 AND pg_temp.rows_as(_c.user_id, 'SELECT 1 FROM public.agent_withdrawals') = 0
     AND pg_temp.rows_as(_mgmt, 'SELECT 1 FROM public.agent_withdrawals') >= 1 THEN
    _out := _out || E'PASS withdrawals: old rows are untouched and readable (the agent sees own, others none, staff all)\n';
  ELSE _out := _out || E'FAIL withdrawals: old rows are not readable as before\n'; END IF;
  UPDATE public.agents SET available_balance = available_balance + 5000000 WHERE id = _a.id;
  _t := pg_temp.run_as(_a.user_id, format('INSERT INTO public.agent_withdrawals (agent_id, amount, bank_name, bank_account, account_name) VALUES (%L, 100000, ''BCA'', ''1'', ''Baru'')', _a.id));
  IF _t LIKE '42501%' THEN _out := _out || E'PASS withdrawals: an agent can no longer create a withdrawal request, even with balance (42501)\n';
  ELSE _out := _out || format(E'FAIL withdrawals: agent insert gave %s\n', _t); END IF;
  UPDATE public.agents SET available_balance = available_balance - 5000000 WHERE id = _a.id;
  IF to_regprocedure('public.process_agent_withdrawal(uuid,text,text)') IS NOT NULL AND to_regprocedure('public.guard_agent_withdrawal()') IS NOT NULL THEN
    _out := _out || E'PASS withdrawals: process_agent_withdrawal and the guard trigger function are still in the database (unused)\n';
  ELSE _out := _out || E'FAIL withdrawals: legacy withdrawal functions are gone\n'; END IF;

  -- ===========================================================================================
  -- 12. Access: staff-only and internal functions
  -- ===========================================================================================
  FOR _r IN SELECT * FROM (VALUES
      ('admin_list_commissions', 'SELECT * FROM public.admin_list_commissions()'),
      ('admin_list_commission_adjustments', 'SELECT * FROM public.admin_list_commission_adjustments()'),
      ('admin_list_lead_disputes', 'SELECT * FROM public.admin_list_lead_disputes()'),
      ('approve_commissions', 'SELECT public.approve_commissions(ARRAY[gen_random_uuid()], ''manajemen'')'),
      ('mark_agent_commissions_paid', 'SELECT public.mark_agent_commissions_paid(gen_random_uuid(), ARRAY[gen_random_uuid()], current_date, ''x'', ''y'')'),
      ('resolve_lead_dispute', 'SELECT public.resolve_lead_dispute(gen_random_uuid(), gen_random_uuid(), NULL, NULL)'),
      ('refresh_commission_eligibility', 'SELECT public.refresh_commission_eligibility()'),
      ('commission_refresh', 'SELECT public.commission_refresh(NULL)'),
      ('commission_recount', 'SELECT public.commission_recount(gen_random_uuid())'),
      ('commission_evaluate', 'SELECT public.commission_evaluate(gen_random_uuid())'),
      ('commission_clawback', 'SELECT public.commission_clawback(gen_random_uuid(), ''x'')'),
      ('commission_notify_eligible', 'SELECT public.commission_notify_eligible(gen_random_uuid())'),
      ('commission_hold_for', 'SELECT public.commission_hold_for(gen_random_uuid())')
    ) v(fn, sql) LOOP
    _t := pg_temp.run_as(_a.user_id, _r.sql);
    _t2 := pg_temp.run_as(NULL, _r.sql);
    IF _t LIKE '42501%' AND _t2 LIKE '42501%' THEN _out := _out || format(E'PASS access: %s is refused to an agent and to anon (42501)\n', _r.fn);
    ELSE _out := _out || format(E'FAIL access: %s agent=%s anon=%s\n', _r.fn, _t, _t2); END IF;
  END LOOP;
  IF pg_temp.rows_as(_cs, 'SELECT * FROM public.admin_list_commissions()') = -1 AND pg_temp.rows_as(_fin, 'SELECT * FROM public.admin_list_commissions()') >= 1
     AND pg_temp.rows_as(_mgmt, 'SELECT * FROM public.admin_list_commissions()') >= 1 THEN
    _out := _out || E'PASS access: admin_list_commissions works for superadmin and finance and is refused to cs_admin\n';
  ELSE _out := _out || E'FAIL access: admin_list_commissions role handling is wrong\n'; END IF;

  -- Invariant: the agent's balance equals the sum of their counted, not yet paid commissions (no drift anywhere above).
  FOR _r IN SELECT id, name, available_balance FROM public.agents WHERE id IN (_a.id, _b.id, _c.id) LOOP
    SELECT coalesce(sum(commission_amount), 0) INTO _x FROM public.agent_sales WHERE agent_id = _r.id AND counted AND status = 'confirmed';
    IF _x = _r.available_balance THEN _out := _out || format(E'PASS invariant: %s balance %s = sum of counted unpaid commissions\n', _r.name, _r.available_balance);
    ELSE _out := _out || format(E'FAIL invariant: %s balance %s but counted unpaid commissions sum to %s\n', _r.name, _r.available_balance, _x); END IF;
  END LOOP;

  --RESULTS-MARKER-SECTION-1--
  RAISE EXCEPTION E'RESULTS\n%', _out;
END $$;
