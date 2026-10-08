-- Commission rates per departure / tier / agent level (migration 20261007100000_commission_rates.sql).
--
-- Runs against the live linked project, but only inside a transaction that always aborts (the final
-- RAISE EXCEPTION), so nothing is stored. Run with: ./scripts/run-db-tests.sh tests/db/09_commission_rates.sql
--
-- Report lines start with PASS, FAIL, SKIP (prerequisite data missing) or KNOWN.
-- "Must be refused" pattern: the statement runs in its own sub-block as the simulated role; if it succeeds we raise
-- XX001 ourselves (rolling its effects back) and the handler reports FAIL.
--
-- Sections:
--   1. Table: RLS, no direct writes, staff-only reads.
--   2. set / clear / admin_list: who may call them, validation, upsert, clear.
--   3. get_my_commission_rates: only the caller's own level, never other levels or other agents.
--   4. agent_commission_for / registration_commission_tier (internal): fallback, configured, missing level.
--   5. End to end: intake -> accept -> DP -> lunas credits the rate of the agent's level; level change before lunas;
--      level change after lunas changes nothing; a level without a rate row earns 0; reject / cancel reverse; list_my_agent_jamaah agrees.
--   6. The letter seed.

BEGIN;

-- Helpers that live only in this transaction (pg_temp).
CREATE FUNCTION pg_temp.act_as(_uid uuid) RETURNS void LANGUAGE plpgsql AS $f$
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', _uid, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
END $f$;

-- One jamaah through the real path: intake with the agent's referral code -> CS accepts it. Returns the registration id.
CREATE FUNCTION pg_temp.plant_reg(_ref text, _pkg uuid, _staff uuid, _price numeric, _name text) RETURNS uuid LANGUAGE plpgsql AS $f$
DECLARE
  _res jsonb; _intake uuid; _ids jsonb; _reg uuid;
  _phone text := '62' || lpad(floor(random() * 1e10)::bigint::text, 10, '0');
BEGIN
  SET LOCAL ROLE service_role;
  _res := public.create_jamaah_intake(jsonb_build_object(
    'package_id', _pkg, 'contact_name', _name, 'contact_phone', _phone, 'consent', true, 'consent_version', 'test',
    'source', 'agent', 'ref_code', _ref,
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

-- A verified (or other status) payment entered by staff.
CREATE FUNCTION pg_temp.pay(_reg uuid, _staff uuid, _amount numeric, _status text) RETURNS uuid LANGUAGE plpgsql AS $f$
DECLARE _id uuid;
BEGIN
  PERFORM pg_temp.act_as(_staff);
  INSERT INTO public.jamaah_payments (registration_id, amount, paid_on, bank_account, status)
  VALUES (_reg, _amount, current_date, 'BCA', _status) RETURNING id INTO _id;
  RESET ROLE;
  RETURN _id;
END $f$;

DO $$
DECLARE
  _out text := '';
  _a record;            -- plain active agent A (no staff role)
  _b record;            -- plain active agent B
  _p record;            -- a pending agent (no staff role), may be absent
  _staff uuid;          -- superadmin / admin
  _pkg uuid;            -- upcoming published package, no rates in the live data (fallback + test bed)
  _pkg_tier text;
  _pkg_flat numeric;
  _other_pkg uuid;
  _outsider uuid := gen_random_uuid();
  _cs uuid; _aa uuid;   -- plain agents temporarily given cs_admin / agent_admin
  _c record;
  _r jsonb;
  _rc_dummy bigint;
  _n bigint;
  _m bigint;
  _num numeric;
  _txt text;
  _lvl_a text;
  _lvl_b text;
  _s record;
  _bal0 numeric; _bal1 numeric;
  _rr public.agent_commission_rates%ROWTYPE;   -- a rate row taken out for a moment, put back afterwards
  _reg uuid; _reg2 uuid; _reg3 uuid; _pay uuid;
  c_silver constant numeric := 1500000;
  c_gold constant numeric := 2200000;
  c_plat constant numeric := 3300000;
BEGIN
  SELECT id, user_id, referral_code, level INTO _a FROM public.agents
   WHERE status = 'active' AND user_id IS NOT NULL AND user_id NOT IN (SELECT user_id FROM public.user_roles) ORDER BY created_at LIMIT 1;
  SELECT id, user_id, referral_code, level INTO _b FROM public.agents
   WHERE status = 'active' AND user_id IS NOT NULL AND user_id NOT IN (SELECT user_id FROM public.user_roles) AND id <> _a.id ORDER BY created_at LIMIT 1;
  SELECT id, user_id, level INTO _p FROM public.agents
   WHERE status = 'pending' AND user_id IS NOT NULL AND user_id NOT IN (SELECT user_id FROM public.user_roles) ORDER BY created_at LIMIT 1;
  SELECT user_id INTO _staff FROM public.user_roles WHERE role IN ('superadmin', 'admin') ORDER BY role LIMIT 1;
  SELECT p.id, p.available_tiers[1], coalesce(p.agent_commission_amount, 0) INTO _pkg, _pkg_tier, _pkg_flat FROM public.packages p
   WHERE p.status = 'published' AND p.departure_date >= current_date AND array_length(p.available_tiers, 1) = 1
     AND NOT EXISTS (SELECT 1 FROM public.agent_commission_rates r WHERE r.package_id = p.id)
   ORDER BY p.departure_date LIMIT 1;
  SELECT p.id INTO _other_pkg FROM public.packages p
   WHERE p.status = 'published' AND p.id <> _pkg ORDER BY p.departure_date LIMIT 1;

  IF _a.id IS NULL OR _b.id IS NULL OR _staff IS NULL OR _pkg IS NULL THEN
    _out := format('SKIP commission rates: needs two plain active agents, a superadmin/admin and an upcoming published single-tier package without rates (A=%s B=%s staff=%s package=%s)',
                   _a.id, _b.id, _staff, _pkg);
    RAISE EXCEPTION E'RESULTS\n%', _out;
  END IF;

  -- =============================================================================================
  -- 1. The table
  -- =============================================================================================
  SELECT relrowsecurity INTO STRICT _c FROM pg_class WHERE oid = 'public.agent_commission_rates'::regclass;
  IF _c.relrowsecurity THEN _out := _out || E'PASS table: row level security is on for agent_commission_rates\n';
  ELSE _out := _out || E'FAIL table: row level security is OFF for agent_commission_rates\n'; END IF;

  SELECT count(*) INTO _n FROM information_schema.role_table_grants
   WHERE table_schema = 'public' AND table_name = 'agent_commission_rates'
     AND grantee IN ('anon', 'authenticated', 'PUBLIC') AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE');
  SELECT count(*) INTO _m FROM information_schema.role_table_grants
   WHERE table_schema = 'public' AND table_name = 'agent_commission_rates' AND grantee IN ('anon', 'PUBLIC');
  IF _n = 0 AND _m = 0 THEN _out := _out || E'PASS table: anon / PUBLIC have no privilege at all, authenticated has no write grant\n';
  ELSE _out := _out || format(E'FAIL table: write grants for anon/authenticated=%s, any grant for anon/PUBLIC=%s\n', _n, _m); END IF;

  -- Plant rates as postgres for the read checks (one package, all four levels, distinct amounts)
  INSERT INTO public.agent_commission_rates (package_id, tier, level, amount)
  VALUES (_pkg, _pkg_tier, 'silver', c_silver), (_pkg, _pkg_tier, 'gold', c_gold), (_pkg, _pkg_tier, 'platinum', c_plat);

  -- A plain agent reads nothing from the table; direct writes are refused for agent and staff alike
  BEGIN
    PERFORM pg_temp.act_as(_a.user_id);
    SELECT count(*) INTO _n FROM public.agent_commission_rates;
    RESET ROLE;
    IF _n = 0 THEN _out := _out || E'PASS table: a plain agent selecting agent_commission_rates directly gets 0 rows (RLS)\n';
    ELSE _out := _out || format(E'FAIL table: a plain agent reads %s rows of agent_commission_rates directly\n', _n); END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'PASS table: a plain agent selecting agent_commission_rates directly is refused (%s)\n', SQLSTATE);
  END;

  BEGIN
    PERFORM pg_temp.act_as(_staff);
    SELECT count(*) INTO _n FROM public.agent_commission_rates WHERE package_id = _pkg;
    RESET ROLE;
    IF _n = 3 THEN _out := _out || E'PASS table: staff can read agent_commission_rates directly\n';
    ELSE _out := _out || format(E'FAIL table: staff sees %s of 3 planted rows\n', _n); END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'FAIL table: staff select raised %s (%s)\n', SQLSTATE, SQLERRM);
  END;

  FOR _c IN SELECT * FROM (VALUES ('plain agent', _a.user_id), ('staff', _staff)) AS t(who, uid) LOOP
    BEGIN
      PERFORM pg_temp.act_as(_c.uid);
      INSERT INTO public.agent_commission_rates (package_id, tier, level, amount) VALUES (_pkg, 'zz-direct', 'silver', 1);
      RAISE EXCEPTION 'direct insert succeeded' USING ERRCODE = 'XX001';
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      IF SQLSTATE = '42501' THEN _out := _out || format(E'PASS table: %s cannot INSERT directly (42501)\n', _c.who);
      ELSE _out := _out || format(E'FAIL table: %s direct INSERT gave %s (%s)\n', _c.who, SQLSTATE, SQLERRM); END IF;
    END;
    BEGIN
      PERFORM pg_temp.act_as(_c.uid);
      UPDATE public.agent_commission_rates SET amount = 99 WHERE package_id = _pkg;
      GET DIAGNOSTICS _n = ROW_COUNT;
      RAISE EXCEPTION 'direct update succeeded (% rows)', _n USING ERRCODE = 'XX001';
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      IF SQLSTATE = '42501' THEN _out := _out || format(E'PASS table: %s cannot UPDATE directly (42501)\n', _c.who);
      ELSE _out := _out || format(E'FAIL table: %s direct UPDATE gave %s (%s)\n', _c.who, SQLSTATE, SQLERRM); END IF;
    END;
    BEGIN
      PERFORM pg_temp.act_as(_c.uid);
      DELETE FROM public.agent_commission_rates WHERE package_id = _pkg;
      RAISE EXCEPTION 'direct delete succeeded' USING ERRCODE = 'XX001';
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      IF SQLSTATE = '42501' THEN _out := _out || format(E'PASS table: %s cannot DELETE directly (42501)\n', _c.who);
      ELSE _out := _out || format(E'FAIL table: %s direct DELETE gave %s (%s)\n', _c.who, SQLSTATE, SQLERRM); END IF;
    END;
  END LOOP;

  BEGIN
    SET LOCAL ROLE anon;
    PERFORM 1 FROM public.agent_commission_rates LIMIT 1;
    RAISE EXCEPTION 'anon select succeeded' USING ERRCODE = 'XX001';
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    IF SQLSTATE = '42501' THEN _out := _out || E'PASS table: anon cannot SELECT agent_commission_rates (42501)\n';
    ELSE _out := _out || format(E'FAIL table: anon select gave %s (%s)\n', SQLSTATE, SQLERRM); END IF;
  END;

  -- =============================================================================================
  -- 2. set / clear / admin_list
  -- =============================================================================================
  -- 2a. who may NOT call them: a plain agent, anon, an outsider (signed in, no role)
  FOR _c IN SELECT * FROM (VALUES
      ('plain agent', _a.user_id, 'authenticated'), ('outsider', _outsider, 'authenticated'), ('anon', NULL::uuid, 'anon')) AS t(who, uid, rl)
  LOOP
    BEGIN
      IF _c.rl = 'anon' THEN
        PERFORM set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
        SET LOCAL ROLE anon;
      ELSE
        PERFORM pg_temp.act_as(_c.uid);
      END IF;
      PERFORM public.set_commission_rate(_pkg, _pkg_tier, 'silver', 1);
      RAISE EXCEPTION 'set succeeded' USING ERRCODE = 'XX001';
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      IF SQLSTATE = '42501' THEN _out := _out || format(E'PASS permissions: %s cannot call set_commission_rate (42501)\n', _c.who);
      ELSE _out := _out || format(E'FAIL permissions: %s set_commission_rate gave %s (%s)\n', _c.who, SQLSTATE, SQLERRM); END IF;
    END;
    BEGIN
      IF _c.rl = 'anon' THEN
        PERFORM set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
        SET LOCAL ROLE anon;
      ELSE
        PERFORM pg_temp.act_as(_c.uid);
      END IF;
      PERFORM public.clear_commission_rate(_pkg, _pkg_tier, 'silver');
      RAISE EXCEPTION 'clear succeeded' USING ERRCODE = 'XX001';
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      IF SQLSTATE = '42501' THEN _out := _out || format(E'PASS permissions: %s cannot call clear_commission_rate (42501)\n', _c.who);
      ELSE _out := _out || format(E'FAIL permissions: %s clear_commission_rate gave %s (%s)\n', _c.who, SQLSTATE, SQLERRM); END IF;
    END;
    BEGIN
      IF _c.rl = 'anon' THEN
        PERFORM set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
        SET LOCAL ROLE anon;
      ELSE
        PERFORM pg_temp.act_as(_c.uid);
      END IF;
      PERFORM * FROM public.admin_list_commission_rates();
      RAISE EXCEPTION 'list succeeded' USING ERRCODE = 'XX001';
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      IF SQLSTATE = '42501' THEN _out := _out || format(E'PASS permissions: %s cannot call admin_list_commission_rates (42501)\n', _c.who);
      ELSE _out := _out || format(E'FAIL permissions: %s admin_list_commission_rates gave %s (%s)\n', _c.who, SQLSTATE, SQLERRM); END IF;
    END;
  END LOOP;

  -- 2b. agent_admin may set and list, cs_admin may only list (roles planted on two plain agents for this transaction)
  _cs := _b.user_id; _aa := _a.user_id;
  BEGIN
    INSERT INTO public.user_roles (user_id, role) VALUES (_aa, 'agent_admin'::public.app_role), (_cs, 'cs_admin'::public.app_role);
    BEGIN
      PERFORM pg_temp.act_as(_aa);
      _r := public.set_commission_rate(_pkg, 'zz-d', 'silver', 100000, 'agent_admin test');
      RESET ROLE;
      _out := _out || E'PASS permissions: agent_admin can call set_commission_rate\n';
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      _out := _out || format(E'FAIL permissions: agent_admin set_commission_rate raised %s (%s)\n', SQLSTATE, SQLERRM);
    END;
    BEGIN
      PERFORM pg_temp.act_as(_cs);
      PERFORM public.set_commission_rate(_pkg, 'zz-d', 'silver', 1);
      RAISE EXCEPTION 'cs_admin set succeeded' USING ERRCODE = 'XX001';
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      IF SQLSTATE = '42501' THEN _out := _out || E'PASS permissions: cs_admin cannot call set_commission_rate (42501)\n';
      ELSE _out := _out || format(E'FAIL permissions: cs_admin set_commission_rate gave %s (%s)\n', SQLSTATE, SQLERRM); END IF;
    END;
    BEGIN
      PERFORM pg_temp.act_as(_cs);
      SELECT count(*) INTO _n FROM public.admin_list_commission_rates();
      RESET ROLE;
      IF _n > 0 THEN _out := _out || E'PASS permissions: cs_admin can call admin_list_commission_rates\n';
      ELSE _out := _out || E'FAIL permissions: cs_admin admin_list_commission_rates returned no rows\n'; END IF;
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      _out := _out || format(E'FAIL permissions: cs_admin admin_list_commission_rates raised %s (%s)\n', SQLSTATE, SQLERRM);
    END;
    DELETE FROM public.user_roles WHERE user_id IN (_aa, _cs) AND role IN ('agent_admin'::public.app_role, 'cs_admin'::public.app_role);
    DELETE FROM public.agent_commission_rates WHERE package_id = _pkg AND tier = 'zz-d';
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'SKIP permissions: could not plant agent_admin / cs_admin roles (%s)\n', SQLERRM);
  END;

  -- 2c. validation: every one of these must be refused (22023) and store nothing
  FOR _c IN SELECT * FROM (VALUES
      ('unknown level',        _pkg, _pkg_tier, 'bronze',   1000000::numeric),
      ('empty level',          _pkg, _pkg_tier, '',         1000000::numeric),
      ('negative amount',      _pkg, _pkg_tier, 'silver',   -1::numeric),
      ('decimal amount',       _pkg, _pkg_tier, 'silver',   1500000.5::numeric),
      ('null amount',          _pkg, _pkg_tier, 'silver',   NULL::numeric),
      ('empty tier',           _pkg, '',        'silver',   1000000::numeric),
      ('blank tier',           _pkg, '   ',     'silver',   1000000::numeric),
      ('unknown package',      gen_random_uuid(), _pkg_tier, 'silver', 1000000::numeric)
    ) AS t(label, pkg, tier, lvl, amt)
  LOOP
    BEGIN
      PERFORM pg_temp.act_as(_staff);
      PERFORM public.set_commission_rate(_c.pkg, _c.tier, _c.lvl, _c.amt);
      RAISE EXCEPTION 'accepted' USING ERRCODE = 'XX001';
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      IF SQLSTATE = '22023' THEN _out := _out || format(E'PASS validation: %s is rejected (22023)\n', _c.label);
      ELSE _out := _out || format(E'FAIL validation: %s gave %s (%s)\n', _c.label, SQLSTATE, SQLERRM); END IF;
    END;
  END LOOP;

  -- the table check constraints hold even for a migration-role insert
  FOR _c IN SELECT * FROM (VALUES ('level bronze', 'bronze', 1::numeric), ('negative amount', 'silver', -5::numeric)) AS t(label, lvl, amt) LOOP
    BEGIN
      INSERT INTO public.agent_commission_rates (package_id, tier, level, amount) VALUES (_pkg, 'zz-check', _c.lvl, _c.amt);
      RAISE EXCEPTION 'accepted' USING ERRCODE = 'XX001';
    EXCEPTION WHEN OTHERS THEN
      IF SQLSTATE = '23514' THEN _out := _out || format(E'PASS validation: the table check constraint rejects %s (23514)\n', _c.label);
      ELSE _out := _out || format(E'FAIL validation: table insert with %s gave %s (%s)\n', _c.label, SQLSTATE, SQLERRM); END IF;
    END;
  END LOOP;

  -- 2d. staff: create, update (upsert keeps one row), note, updated_by, clear (twice)
  BEGIN
    PERFORM pg_temp.act_as(_staff);
    _r := public.set_commission_rate(_pkg, 'zz-d', 'silver', 500000, 'silver awal');
    _r := public.set_commission_rate(_pkg, 'zz-d', 'silver', 750000, 'silver naik');
    RESET ROLE;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'FAIL staff: set_commission_rate raised %s (%s)\n', SQLSTATE, SQLERRM);
  END;
  SELECT count(*), max(amount), max(note), max(updated_by::text) INTO _n, _num, _txt, _lvl_a
    FROM public.agent_commission_rates WHERE package_id = _pkg AND tier = 'zz-d' AND level = 'silver';
  IF _n = 1 AND _num = 750000 AND _txt = 'silver naik' AND _lvl_a = _staff::text THEN
    _out := _out || E'PASS staff: set creates, a second set updates the same row (amount, note) and records updated_by = the caller\n';
  ELSE
    _out := _out || format(E'FAIL staff: after create + update rows=%s amount=%s note=%s updated_by=%s (expected 1 / 750000 / silver naik / %s)\n', _n, _num, _txt, _lvl_a, _staff);
  END IF;

  BEGIN
    PERFORM pg_temp.act_as(_staff);
    _r := public.set_commission_rate(_pkg, 'zz-d', 'silver', 0);
    RESET ROLE;
    SELECT amount INTO _num FROM public.agent_commission_rates WHERE package_id = _pkg AND tier = 'zz-d' AND level = 'silver';
    IF _num = 0 THEN _out := _out || E'PASS staff: an explicit amount of 0 is accepted and stored as 0 (not as unset)\n';
    ELSE _out := _out || format(E'FAIL staff: amount 0 stored as %s\n', _num); END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'FAIL staff: set amount 0 raised %s (%s)\n', SQLSTATE, SQLERRM);
  END;

  BEGIN
    PERFORM pg_temp.act_as(_staff);
    _r := public.clear_commission_rate(_pkg, 'zz-d', 'silver');
    _num := (_r ->> 'deleted')::numeric;
    _r := public.clear_commission_rate(_pkg, 'zz-d', 'silver');
    RESET ROLE;
    SELECT count(*) INTO _n FROM public.agent_commission_rates WHERE package_id = _pkg AND tier = 'zz-d' AND level = 'silver';
    IF _num = 1 AND (_r ->> 'deleted')::int = 0 AND _n = 0 THEN
      _out := _out || E'PASS staff: clear_commission_rate deletes the row (deleted=1), clearing again is a harmless deleted=0\n';
    ELSE
      _out := _out || format(E'FAIL staff: first clear deleted=%s, second deleted=%s, rows left=%s\n', _num, _r ->> 'deleted', _n);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'FAIL staff: clear_commission_rate raised %s (%s)\n', SQLSTATE, SQLERRM);
  END;

  -- 2e. admin_list: published + draft, one row per (package, tier, level), NULL where unset
  BEGIN
    PERFORM pg_temp.act_as(_staff);
    SELECT count(*) INTO _n FROM public.admin_list_commission_rates() WHERE package_id = _pkg AND tier = _pkg_tier;
    SELECT count(*) INTO _m FROM public.admin_list_commission_rates() WHERE package_id = _pkg AND tier = _pkg_tier AND level = 'duta';
    SELECT count(*) INTO _rc_dummy FROM public.admin_list_commission_rates() WHERE package_id = _pkg AND amount IN (c_silver, c_gold, c_plat);
    SELECT count(DISTINCT package_id) INTO _num FROM public.admin_list_commission_rates();
    RESET ROLE;
    SELECT count(*) INTO _bal0 FROM public.packages WHERE status IN ('published', 'draft') AND departure_date >= current_date - 30;
    IF _n = 3 AND _m = 0 AND _rc_dummy = 3 AND _num = _bal0 THEN
      _out := _out || format(E'PASS admin_list: package %s has 3 level rows (silver/gold/platinum set, no duta), and %s packages (published + draft, from 30 days ago) are listed\n', _pkg, _num);
    ELSE
      _out := _out || format(E'FAIL admin_list: level rows=%s duta rows=%s set rows=%s, listed packages=%s expected %s\n', _n, _m, _rc_dummy, _num, _bal0);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'FAIL admin_list: raised %s (%s)\n', SQLSTATE, SQLERRM);
  END;

  -- =============================================================================================
  -- 3. get_my_commission_rates: only the caller's own level
  -- =============================================================================================
  UPDATE public.agents SET level = 'silver' WHERE id = _a.id;
  UPDATE public.agents SET level = 'gold' WHERE id = _b.id;
  SELECT id INTO _reg FROM public.packages WHERE status = 'draft' ORDER BY departure_date LIMIT 1;
  IF _reg IS NOT NULL THEN
    INSERT INTO public.agent_commission_rates (package_id, tier, level, amount)
    SELECT _reg, coalesce(available_tiers[1], 'nyaman'), 'silver', 4400000 FROM public.packages WHERE id = _reg;
  END IF;

  FOR _c IN SELECT * FROM (VALUES ('A', 'silver', _a.user_id, c_silver, c_gold, c_plat), ('B', 'gold', _b.user_id, c_gold, c_silver, c_plat)) AS t(who, lvl, uid, mine, other1, other2) LOOP
    BEGIN
      PERFORM pg_temp.act_as(_c.uid);
      SELECT count(*) INTO _n FROM public.get_my_commission_rates() WHERE package_id = _pkg AND tier = _pkg_tier AND amount = _c.mine;
      SELECT count(*) INTO _m FROM public.get_my_commission_rates() WHERE package_id = _pkg AND (tier <> _pkg_tier OR amount IN (_c.other1, _c.other2));
      SELECT count(*) INTO _num FROM public.get_my_commission_rates();
      RESET ROLE;
      -- everything returned must be a rate of the caller's own level on a published package
      SELECT count(*) INTO _rc_dummy FROM public.agent_commission_rates r JOIN public.packages p ON p.id = r.package_id
       WHERE r.level = _c.lvl AND p.status = 'published';
      IF _n = 1 AND _m = 0 AND _num = _rc_dummy THEN
        _out := _out || format(E'PASS my rates: %s agent (%s) gets own-level amount %s for the package, nothing of the other levels, %s rows in total = every %s rate on a published package\n', _c.who, _c.lvl, _c.mine, _num, _c.lvl);
      ELSE
        _out := _out || format(E'FAIL my rates: %s agent (%s): own amount rows=%s, other-level rows=%s, total=%s expected %s\n', _c.who, _c.lvl, _n, _m, _num, _rc_dummy);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      _out := _out || format(E'FAIL my rates: agent %s raised %s (%s)\n', _c.who, SQLSTATE, SQLERRM);
    END;
  END LOOP;

  IF _reg IS NOT NULL THEN
    BEGIN
      PERFORM pg_temp.act_as(_a.user_id);
      SELECT count(*) INTO _n FROM public.get_my_commission_rates() WHERE package_id = _reg;
      RESET ROLE;
      IF _n = 0 THEN _out := _out || E'PASS my rates: a rate on a draft package is not shown to the agent\n';
      ELSE _out := _out || format(E'FAIL my rates: the agent sees %s rows of a draft package\n', _n); END IF;
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      _out := _out || format(E'FAIL my rates: draft check raised %s (%s)\n', SQLSTATE, SQLERRM);
    END;
  ELSE
    _out := _out || E'SKIP my rates: no draft package in the data, the "drafts stay hidden" check is skipped\n';
  END IF;

  -- changing the level changes what is returned (no caching, no other level leaks)
  BEGIN
    UPDATE public.agents SET level = 'platinum' WHERE id = _a.id;
    PERFORM pg_temp.act_as(_a.user_id);
    SELECT count(*) INTO _n FROM public.get_my_commission_rates() WHERE package_id = _pkg AND amount = c_plat;
    SELECT count(*) INTO _m FROM public.get_my_commission_rates() WHERE package_id = _pkg AND amount IN (c_silver, c_gold);
    RESET ROLE;
    IF _n = 1 AND _m = 0 THEN _out := _out || E'PASS my rates: after promotion to platinum the agent gets the platinum amount only\n';
    ELSE _out := _out || format(E'FAIL my rates: platinum agent platinum rows=%s other rows=%s\n', _n, _m); END IF;
    -- a level without a rate row (the silver row is taken out for a moment): no row, and none of the other levels
    SELECT * INTO _rr FROM public.agent_commission_rates WHERE package_id = _pkg AND tier = _pkg_tier AND level = 'silver';
    DELETE FROM public.agent_commission_rates WHERE package_id = _pkg AND tier = _pkg_tier AND level = 'silver';
    UPDATE public.agents SET level = 'silver' WHERE id = _a.id;
    PERFORM pg_temp.act_as(_a.user_id);
    SELECT count(*) INTO _n FROM public.get_my_commission_rates() WHERE package_id = _pkg AND tier = _pkg_tier;
    RESET ROLE;
    INSERT INTO public.agent_commission_rates SELECT (_rr).*;
    IF _n = 0 THEN _out := _out || E'PASS my rates: an agent whose level has no rate row for a class gets no row for it (and none of the other levels)\n';
    ELSE _out := _out || format(E'FAIL my rates: agent without a rate row sees %s rows for the class\n', _n); END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'FAIL my rates: level change check raised %s (%s)\n', SQLSTATE, SQLERRM);
  END;
  UPDATE public.agents SET level = 'silver' WHERE id = _a.id;

  -- pending agent: sees own level; outsider (no agent row): sees nothing; anon: refused
  IF _p.id IS NULL THEN
    _out := _out || E'SKIP my rates: no pending agent with a login, the pending case is skipped\n';
  ELSE
    BEGIN
      UPDATE public.agents SET level = 'gold' WHERE id = _p.id;
      PERFORM pg_temp.act_as(_p.user_id);
      SELECT count(*) INTO _n FROM public.get_my_commission_rates() WHERE package_id = _pkg AND amount = c_gold;
      SELECT count(*) INTO _m FROM public.get_my_commission_rates() WHERE package_id = _pkg AND amount IN (c_silver, c_plat);
      RESET ROLE;
      IF _n = 1 AND _m = 0 THEN _out := _out || E'PASS my rates: a pending agent gets the rate of its own level (gold) only\n';
      ELSE _out := _out || format(E'FAIL my rates: pending agent own=%s other=%s\n', _n, _m); END IF;
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      _out := _out || format(E'FAIL my rates: pending agent raised %s (%s)\n', SQLSTATE, SQLERRM);
    END;
  END IF;

  BEGIN
    PERFORM pg_temp.act_as(_outsider);
    SELECT count(*) INTO _n FROM public.get_my_commission_rates();
    RESET ROLE;
    IF _n = 0 THEN _out := _out || E'PASS my rates: a signed-in user without an agent row gets nothing\n';
    ELSE _out := _out || format(E'FAIL my rates: an outsider gets %s rows\n', _n); END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'FAIL my rates: outsider raised %s (%s)\n', SQLSTATE, SQLERRM);
  END;

  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
    SET LOCAL ROLE anon;
    PERFORM * FROM public.get_my_commission_rates();
    RAISE EXCEPTION 'anon succeeded' USING ERRCODE = 'XX001';
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    IF SQLSTATE = '42501' THEN _out := _out || E'PASS my rates: anon cannot call get_my_commission_rates (42501)\n';
    ELSE _out := _out || format(E'FAIL my rates: anon gave %s (%s)\n', SQLSTATE, SQLERRM); END IF;
  END;

  -- =============================================================================================
  -- 4. Internal functions: agent_commission_for / registration_commission_tier
  -- =============================================================================================
  FOR _c IN SELECT * FROM (VALUES ('authenticated', _a.user_id), ('anon', NULL::uuid)) AS t(rl, uid) LOOP
    BEGIN
      IF _c.rl = 'anon' THEN
        PERFORM set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
        SET LOCAL ROLE anon;
      ELSE
        PERFORM pg_temp.act_as(_c.uid);
      END IF;
      PERFORM public.agent_commission_for(_pkg, _pkg_tier, _a.id);
      RAISE EXCEPTION 'callable' USING ERRCODE = 'XX001';
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      IF SQLSTATE = '42501' THEN _out := _out || format(E'PASS internal: %s cannot execute agent_commission_for (42501)\n', _c.rl);
      ELSE _out := _out || format(E'FAIL internal: %s calling agent_commission_for gave %s (%s)\n', _c.rl, SQLSTATE, SQLERRM); END IF;
    END;
    BEGIN
      IF _c.rl = 'anon' THEN
        PERFORM set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
        SET LOCAL ROLE anon;
      ELSE
        PERFORM pg_temp.act_as(_c.uid);
      END IF;
      PERFORM public.registration_commission_tier(_pkg, 'quad', 1);
      RAISE EXCEPTION 'callable' USING ERRCODE = 'XX001';
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      IF SQLSTATE = '42501' THEN _out := _out || format(E'PASS internal: %s cannot execute registration_commission_tier (42501)\n', _c.rl);
      ELSE _out := _out || format(E'FAIL internal: %s calling registration_commission_tier gave %s (%s)\n', _c.rl, SQLSTATE, SQLERRM); END IF;
    END;
  END LOOP;

  -- fallback: a package with no rate rows at all pays the flat packages.agent_commission_amount, whatever the level
  SELECT p.id, coalesce(p.agent_commission_amount, 0) INTO _other_pkg, _num FROM public.packages p
   WHERE p.status = 'published' AND p.id <> _pkg AND p.departure_date >= current_date
     AND NOT EXISTS (SELECT 1 FROM public.agent_commission_rates r WHERE r.package_id = p.id)
   ORDER BY p.departure_date LIMIT 1;
  IF _other_pkg IS NULL THEN
    _out := _out || E'SKIP fallback: no second published package without rates\n';
  ELSE
    UPDATE public.agents SET level = 'silver' WHERE id = _a.id;
    _bal0 := public.agent_commission_for(_other_pkg, 'nyaman', _a.id);
    UPDATE public.agents SET level = 'platinum' WHERE id = _a.id;
    _bal1 := public.agent_commission_for(_other_pkg, 'nyaman', _a.id);
    UPDATE public.agents SET level = 'silver' WHERE id = _a.id;
    IF _num > 0 AND _bal0 = _num AND _bal1 = _num THEN
      _out := _out || format(E'PASS fallback: a package with no rate rows pays packages.agent_commission_amount (%s) to a silver and to a platinum agent\n', _num);
    ELSE
      _out := _out || format(E'FAIL fallback: flat amount=%s, silver agent gets %s, platinum agent gets %s\n', _num, _bal0, _bal1);
    END IF;
    IF _num = 1500000 THEN _out := _out || E'PASS fallback: the live flat amount is still 1,500,000 (unconfigured packages keep working as before)\n';
    ELSE _out := _out || format(E'KNOWN fallback: the flat amount on %s is %s, not the 1,500,000 documented on 2026-10-06\n', _other_pkg, _num); END IF;
  END IF;

  -- configured package: the amount for the agent's CURRENT level; a missing level is 0, never the flat amount
  FOR _c IN SELECT * FROM (VALUES ('silver', c_silver), ('gold', c_gold), ('platinum', c_plat)) AS t(lvl, expected) LOOP
    UPDATE public.agents SET level = _c.lvl WHERE id = _a.id;
    _num := public.agent_commission_for(_pkg, _pkg_tier, _a.id);
    IF _num = _c.expected THEN
      _out := _out || format(E'PASS configured: a %s agent earns %s on the configured package%s\n', _c.lvl, _num,
        '');
    ELSE
      _out := _out || format(E'FAIL configured: a %s agent gets %s, expected %s\n', _c.lvl, _num, _c.expected);
    END IF;
  END LOOP;
  -- a level without a rate row on a configured package earns 0, not the flat amount (the silver row is taken out for a moment)
  SELECT * INTO _rr FROM public.agent_commission_rates WHERE package_id = _pkg AND tier = _pkg_tier AND level = 'silver';
  DELETE FROM public.agent_commission_rates WHERE package_id = _pkg AND tier = _pkg_tier AND level = 'silver';
  UPDATE public.agents SET level = 'silver' WHERE id = _a.id;
  _num := public.agent_commission_for(_pkg, _pkg_tier, _a.id);
  INSERT INTO public.agent_commission_rates SELECT (_rr).*;
  IF _num = 0 THEN _out := _out || E'PASS configured: a level without a rate row earns 0 on a configured package, not the flat amount\n';
  ELSE _out := _out || format(E'FAIL configured: a level without a rate row gets %s, expected 0\n', _num); END IF;
  UPDATE public.agents SET level = 'silver' WHERE id = _a.id;

  _num := public.agent_commission_for(_pkg, 'zz-unknown-tier', _a.id);
  _bal0 := public.agent_commission_for(_pkg, NULL, _a.id);
  _bal1 := public.agent_commission_for(_pkg, _pkg_tier, gen_random_uuid());
  IF _num = 0 AND _bal0 = 0 AND _bal1 = 0 THEN
    _out := _out || E'PASS configured: an unknown tier, a NULL tier and an unknown agent all give 0 on a configured package\n';
  ELSE
    _out := _out || format(E'FAIL configured: unknown tier=%s, NULL tier=%s, unknown agent=%s (expected 0 / 0 / 0)\n', _num, _bal0, _bal1);
  END IF;

  -- registration_commission_tier: single tier -> that tier
  _txt := public.registration_commission_tier(_pkg, 'quad', 30000000);
  IF _txt = _pkg_tier THEN _out := _out || format(E'PASS tier: a single-tier package resolves to its tier (%s) whatever the room type and price\n', _txt);
  ELSE _out := _out || format(E'FAIL tier: single-tier package resolved to %s, expected %s\n', _txt, _pkg_tier); END IF;

  -- several tiers: the tier whose price for the room type equals the list price; a tie or no match is NULL, never a guess
  BEGIN
    UPDATE public.packages
       SET available_tiers = ARRAY['nyaman', 'hemat'],
           package_price = '{"quad": 31111111, "triple": 0, "double": 0}'::jsonb,
           hemat_package_price = '{"quad": 22222222, "triple": 0, "double": 0}'::jsonb
     WHERE id = _pkg;
    IF public.registration_commission_tier(_pkg, 'quad', 22222222) = 'hemat'
       AND public.registration_commission_tier(_pkg, 'quad', 31111111) = 'nyaman'
       AND public.registration_commission_tier(_pkg, 'quad', 12345) IS NULL
       AND public.registration_commission_tier(_pkg, 'triple', 0) IS NULL THEN
      _out := _out || E'PASS tier: with two tiers the registration''s list price picks the tier; an unmatched price is NULL (no guess)\n';
    ELSE
      _out := _out || E'FAIL tier: multi-tier resolution did not pick hemat / nyaman / NULL / NULL as expected\n';
    END IF;
    UPDATE public.packages SET hemat_package_price = package_price WHERE id = _pkg;
    IF public.registration_commission_tier(_pkg, 'quad', 31111111) IS NULL THEN
      _out := _out || E'PASS tier: two tiers with the same price for the list price is ambiguous and gives NULL\n';
    ELSE
      _out := _out || E'FAIL tier: an ambiguous multi-tier price should give NULL\n';
    END IF;
    RAISE EXCEPTION 'rollback multi-tier probe' USING ERRCODE = 'XX001';
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE <> 'XX001' THEN _out := _out || format(E'SKIP tier: could not probe multi-tier resolution (%s: %s)\n', SQLSTATE, SQLERRM); END IF;
  END;

  -- =============================================================================================
  -- 5. End to end through the real path (intake with the agent's code -> CS accepts -> DP -> lunas)
  -- =============================================================================================
  -- Rates on the test package: silver 1,500,000 / gold 2,200,000 / platinum 3,300,000.
  DECLARE
    _bal2 numeric; _sales0 bigint; _sales1 bigint; _tot0 numeric; _tot1 numeric;
    _last uuid;
  BEGIN
    UPDATE public.agents SET level = 'silver' WHERE id = _a.id;
    SELECT available_balance, total_sales, total_commission INTO _bal0, _sales0, _tot0 FROM public.agents WHERE id = _a.id;

    -- 5a. silver agent: waiting at the silver rate, DP credits nothing, lunas credits exactly the silver rate
    BEGIN
      _reg := pg_temp.plant_reg(_a.referral_code, _pkg, _staff, 30000000, 'Komisi Test Satu');
      PERFORM pg_temp.act_as(_a.user_id);
      SELECT commission_amount, commission_status INTO _s FROM public.list_my_agent_jamaah() WHERE registration_id = _reg;
      RESET ROLE;
      IF _s.commission_amount = c_silver AND _s.commission_status = 'waiting' THEN
        _out := _out || format(E'PASS e2e: before payment the silver agent sees the jamaah as waiting with commission %s (list_my_agent_jamaah follows the rates)\n', _s.commission_amount);
      ELSE
        _out := _out || format(E'FAIL e2e: silver agent list shows commission %s / %s, expected %s / waiting\n', _s.commission_amount, _s.commission_status, c_silver);
      END IF;

      _pay := pg_temp.pay(_reg, _staff, 5000000, 'verified');
      SELECT count(*) INTO _n FROM public.agent_sales WHERE registration_id = _reg;
      IF _n = 0 THEN _out := _out || E'PASS e2e: the Rp 5 jt DP credits nothing\n';
      ELSE _out := _out || format(E'FAIL e2e: %s sale rows after only the DP\n', _n); END IF;

      _pay := pg_temp.pay(_reg, _staff, 25000000, 'verified');
      SELECT * INTO _s FROM public.agent_sales WHERE registration_id = _reg;
      SELECT available_balance, total_sales, total_commission INTO _bal1, _sales1, _tot1 FROM public.agents WHERE id = _a.id;
      IF _s.status = 'confirmed' AND _s.commission_amount = c_silver AND _bal1 = _bal0 + c_silver
         AND _sales1 = _sales0 + 1 AND _tot1 = _tot0 + c_silver THEN
        _out := _out || format(E'PASS e2e: lunas credits the silver rate %s for this package and tier (%s); balance, total_sales and total_commission move with it\n', _s.commission_amount, _pkg_tier);
      ELSE
        _out := _out || format(E'FAIL e2e: silver sale status=%s commission=%s, balance %s -> %s (expected +%s), sales %s -> %s, total %s -> %s\n',
          _s.status, _s.commission_amount, _bal0, _bal1, c_silver, _sales0, _sales1, _tot0, _tot1);
      END IF;

      PERFORM pg_temp.act_as(_a.user_id);
      SELECT commission_amount, commission_status, pay_state INTO _s FROM public.list_my_agent_jamaah() WHERE registration_id = _reg;
      RESET ROLE;
      IF _s.commission_amount = c_silver AND _s.commission_status = 'earned' AND _s.pay_state = 'lunas' THEN
        _out := _out || E'PASS e2e: after lunas the agent sees lunas / earned with the credited amount\n';
      ELSE
        _out := _out || format(E'FAIL e2e: after lunas the list shows %s / %s / %s\n', _s.pay_state, _s.commission_status, _s.commission_amount);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      _out := _out || format(E'FAIL e2e: silver scenario raised %s (%s)\n', SQLSTATE, SQLERRM);
    END;

    -- 5b. level changes BEFORE lunas: registered as silver, DP paid, promoted to gold, then lunas -> gold rate
    BEGIN
      UPDATE public.agents SET level = 'silver' WHERE id = _a.id;
      _reg2 := pg_temp.plant_reg(_a.referral_code, _pkg, _staff, 30000000, 'Komisi Test Dua');
      _pay := pg_temp.pay(_reg2, _staff, 5000000, 'verified');
      UPDATE public.agents SET level = 'gold' WHERE id = _a.id;
      PERFORM pg_temp.act_as(_a.user_id);
      SELECT commission_amount, commission_status INTO _s FROM public.list_my_agent_jamaah() WHERE registration_id = _reg2;
      RESET ROLE;
      IF _s.commission_amount = c_gold AND _s.commission_status = 'waiting' THEN
        _out := _out || E'PASS e2e: after promotion to gold the waiting commission shown to the agent is the gold amount\n';
      ELSE
        _out := _out || format(E'FAIL e2e: after promotion the list shows %s / %s, expected %s / waiting\n', _s.commission_amount, _s.commission_status, c_gold);
      END IF;
      SELECT available_balance INTO _bal0 FROM public.agents WHERE id = _a.id;
      _last := pg_temp.pay(_reg2, _staff, 25000000, 'verified');
      SELECT * INTO _s FROM public.agent_sales WHERE registration_id = _reg2;
      SELECT available_balance INTO _bal1 FROM public.agents WHERE id = _a.id;
      IF _s.status = 'confirmed' AND _s.commission_amount = c_gold AND _bal1 = _bal0 + c_gold THEN
        _out := _out || format(E'PASS e2e: level changed from silver to gold before lunas -> credited at the gold rate %s (level at credit time)\n', _s.commission_amount);
      ELSE
        _out := _out || format(E'FAIL e2e: gold-at-lunas sale status=%s commission=%s, balance %s -> %s\n', _s.status, _s.commission_amount, _bal0, _bal1);
      END IF;

      -- 5c. level changes AFTER lunas: nothing is re-priced or reversed by itself
      UPDATE public.agents SET level = 'silver' WHERE id = _a.id;
      PERFORM public.sync_registration_commission(_reg2);
      SELECT * INTO _s FROM public.agent_sales WHERE registration_id = _reg2;
      SELECT available_balance INTO _bal2 FROM public.agents WHERE id = _a.id;
      IF _s.status = 'confirmed' AND _s.commission_amount = c_gold AND _bal2 = _bal1 THEN
        _out := _out || E'PASS e2e: demoting the agent to silver after lunas keeps the credited gold amount (no automatic reversal or re-pricing)\n';
      ELSE
        _out := _out || format(E'FAIL e2e: after demotion sale status=%s commission=%s, balance %s -> %s\n', _s.status, _s.commission_amount, _bal1, _bal2);
      END IF;

      -- 5d. rejecting the last payment reverses the credit; the next verified payment re-credits at the level of that moment
      UPDATE public.agents SET level = 'platinum' WHERE id = _a.id;
      SELECT total_sales INTO _sales0 FROM public.agents WHERE id = _a.id;
      PERFORM pg_temp.act_as(_staff);
      UPDATE public.jamaah_payments SET status = 'rejected', reject_reason = 'Test: bukti tidak sesuai' WHERE id = _last;
      RESET ROLE;
      SELECT * INTO _s FROM public.agent_sales WHERE registration_id = _reg2;
      SELECT available_balance, total_sales INTO _bal2, _sales1 FROM public.agents WHERE id = _a.id;
      IF _s.status = 'cancelled' AND _bal2 = _bal1 - c_gold AND _sales1 = _sales0 - 1 THEN
        _out := _out || E'PASS e2e: rejecting the last payment cancels the sale and takes exactly the credited gold amount back off the balance\n';
      ELSE
        _out := _out || format(E'FAIL e2e: after reject sale status=%s, balance %s (expected %s), total_sales %s (expected %s)\n', _s.status, _bal2, _bal1 - c_gold, _sales1, _sales0 - 1);
      END IF;

      _last := pg_temp.pay(_reg2, _staff, 25000000, 'verified');
      SELECT * INTO _s FROM public.agent_sales WHERE registration_id = _reg2;
      SELECT available_balance INTO _bal1 FROM public.agents WHERE id = _a.id;
      IF _s.status = 'confirmed' AND _s.commission_amount = c_plat AND _bal1 = _bal2 + c_plat THEN
        _out := _out || format(E'PASS e2e: paying again after the reject re-credits at the platinum rate %s (the level at that moment)\n', _s.commission_amount);
      ELSE
        _out := _out || format(E'FAIL e2e: re-credit sale status=%s commission=%s, balance %s -> %s (expected +%s)\n', _s.status, _s.commission_amount, _bal2, _bal1, c_plat);
      END IF;

      -- 5e. cancelling the registration (refund path) reverses it as well
      UPDATE public.jamaah_registrations SET status = 'cancelled', cancel_reason = 'Test: batal', refund_amount = 1000000 WHERE id = _reg2;
      SELECT * INTO _s FROM public.agent_sales WHERE registration_id = _reg2;
      SELECT available_balance INTO _bal2 FROM public.agents WHERE id = _a.id;
      IF _s.status = 'cancelled' AND _bal2 = _bal1 - c_plat THEN
        _out := _out || E'PASS e2e: cancelling the registration reverses the platinum credit and restores the balance\n';
      ELSE
        _out := _out || format(E'FAIL e2e: after cancellation sale status=%s, balance %s -> %s (expected -%s)\n', _s.status, _bal1, _bal2, c_plat);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      _out := _out || format(E'FAIL e2e: level-change / reversal scenario raised %s (%s)\n', SQLSTATE, SQLERRM);
    END;

    -- 5f. level without a rate row on a configured package: fully paid, nothing credited, the agent sees 0 / none
    BEGIN
      SELECT * INTO _rr FROM public.agent_commission_rates WHERE package_id = _pkg AND tier = _pkg_tier AND level = 'silver';
      DELETE FROM public.agent_commission_rates WHERE package_id = _pkg AND tier = _pkg_tier AND level = 'silver';
      UPDATE public.agents SET level = 'silver' WHERE id = _a.id;
      SELECT available_balance, total_sales INTO _bal0, _sales0 FROM public.agents WHERE id = _a.id;
      _reg3 := pg_temp.plant_reg(_a.referral_code, _pkg, _staff, 30000000, 'Komisi Test Tiga');
      _pay := pg_temp.pay(_reg3, _staff, 30000000, 'verified');
      SELECT count(*) INTO _n FROM public.agent_sales WHERE registration_id = _reg3;
      SELECT available_balance, total_sales INTO _bal1, _sales1 FROM public.agents WHERE id = _a.id;
      PERFORM pg_temp.act_as(_a.user_id);
      SELECT commission_amount, commission_status, pay_state INTO _s FROM public.list_my_agent_jamaah() WHERE registration_id = _reg3;
      RESET ROLE;
      IF _n = 0 AND _bal1 = _bal0 AND _sales1 = _sales0 AND _s.pay_state = 'lunas' AND _s.commission_amount = 0 AND _s.commission_status = 'none' THEN
        _out := _out || E'PASS e2e: an agent whose level has no rate row yet credits nothing on lunas and sees commission 0 / none\n';
      ELSE
        _out := _out || format(E'FAIL e2e: no-rate sale rows=%s, balance %s -> %s, list shows %s / %s / %s\n', _n, _bal0, _bal1, _s.pay_state, _s.commission_amount, _s.commission_status);
      END IF;

      -- once the owner fills in the missing amount, the next sync credits it (set by staff through the RPC)
      PERFORM pg_temp.act_as(_staff);
      PERFORM public.set_commission_rate(_pkg, _pkg_tier, 'silver', 900000, 'silver test');
      RESET ROLE;
      PERFORM public.sync_registration_commission(_reg3);
      SELECT * INTO _s FROM public.agent_sales WHERE registration_id = _reg3;
      SELECT available_balance INTO _bal2 FROM public.agents WHERE id = _a.id;
      IF _s.status = 'confirmed' AND _s.commission_amount = 900000 AND _bal2 = _bal1 + 900000 THEN
        _out := _out || E'PASS e2e: after staff sets the missing silver rate of 900,000 the next sync credits it\n';
      ELSE
        _out := _out || format(E'FAIL e2e: after the silver rate sale status=%s commission=%s, balance %s -> %s\n', _s.status, _s.commission_amount, _bal1, _bal2);
      END IF;
      DELETE FROM public.agent_commission_rates WHERE package_id = _pkg AND tier = _pkg_tier AND level = 'silver';
      INSERT INTO public.agent_commission_rates SELECT (_rr).*;
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      _out := _out || format(E'FAIL e2e: no-rate scenario raised %s (%s)\n', SQLSTATE, SQLERRM);
    END;

    -- 5g. unconfigured package keeps the flat amount end to end
    IF _other_pkg IS NULL THEN
      _out := _out || E'SKIP e2e: no unconfigured package for the flat-amount end to end\n';
    ELSE
      BEGIN
        UPDATE public.agents SET level = 'silver' WHERE id = _a.id;
        SELECT coalesce(agent_commission_amount, 0) INTO _num FROM public.packages WHERE id = _other_pkg;
        SELECT available_balance INTO _bal0 FROM public.agents WHERE id = _a.id;
        _reg := pg_temp.plant_reg(_a.referral_code, _other_pkg, _staff, 30000000, 'Komisi Test Flat');
        _pay := pg_temp.pay(_reg, _staff, 30000000, 'verified');
        SELECT * INTO _s FROM public.agent_sales WHERE registration_id = _reg;
        SELECT available_balance INTO _bal1 FROM public.agents WHERE id = _a.id;
        IF _s.status = 'confirmed' AND _s.commission_amount = _num AND _bal1 = _bal0 + _num AND _num > 0 THEN
          _out := _out || format(E'PASS e2e: a package with no rate rows still credits the flat packages.agent_commission_amount (%s)\n', _num);
        ELSE
          _out := _out || format(E'FAIL e2e: unconfigured package sale status=%s commission=%s (flat %s), balance %s -> %s\n', _s.status, _s.commission_amount, _num, _bal0, _bal1);
        END IF;
      EXCEPTION WHEN OTHERS THEN
        RESET ROLE;
        _out := _out || format(E'FAIL e2e: unconfigured package scenario raised %s (%s)\n', SQLSTATE, SQLERRM);
      END;
    END IF;
  END;

  -- =============================================================================================
  -- 6. The letter seed (only meaningful when the seeded packages exist in the data; rows are checked against the letters)
  -- =============================================================================================
  SELECT count(*) INTO _n FROM public.agent_commission_rates r JOIN public.packages p ON p.id = r.package_id
   WHERE r.note = 'Surat 035/036/037/MSFR/IX/2026';
  IF _n = 0 THEN
    _out := _out || E'SKIP seed: no letter rows present\n';
  ELSE
    SELECT count(*) INTO _m FROM public.agent_commission_rates r JOIN public.packages p ON p.id = r.package_id
     WHERE r.note = 'Surat 035/036/037/MSFR/IX/2026' AND r.package_id <> _pkg
       AND ((p.departure_date = DATE '2027-01-04' AND p.flight = 'Saudia' AND r.tier = 'nyaman'
             AND r.amount IS DISTINCT FROM CASE r.level WHEN 'silver' THEN 1500000 WHEN 'gold' THEN 2500000 WHEN 'platinum' THEN 3500000 END)
         OR (p.departure_date = DATE '2027-01-06' AND p.flight = 'Saudia' AND r.tier = 'pelataran-hemat'
             AND r.amount IS DISTINCT FROM CASE r.level WHEN 'silver' THEN 1500000 WHEN 'gold' THEN 3000000 WHEN 'platinum' THEN 3500000 END)
         OR (p.departure_date = DATE '2027-01-23' AND p.flight = 'Saudia' AND r.tier = 'nyaman'
             AND r.amount IS DISTINCT FROM CASE r.level WHEN 'silver' THEN 1500000 WHEN 'gold' THEN 2000000 WHEN 'platinum' THEN 2500000 END));
    SELECT count(*) INTO _rc_dummy FROM public.agent_commission_rates r WHERE r.note = 'Surat 035/036/037/MSFR/IX/2026' AND r.level = 'duta';
    IF _m = 0 AND _rc_dummy = 0 THEN
      _out := _out || format(E'PASS seed: %s letter rows spot-checked (4 Jan Nyaman, 6 Jan Pelataran, 23 Jan Nyaman) match the letters and no duta amount was invented\n', _n);
    ELSE
      _out := _out || format(E'FAIL seed: %s letter rows differ from the letters, %s duta rows exist\n', _m, _rc_dummy);
    END IF;
  END IF;

  SELECT count(*) INTO _n FROM public.agent_commission_rates r JOIN public.packages p ON p.id = r.package_id
   WHERE p.departure_date IN (DATE '2026-11-04', DATE '2026-11-25') AND r.note = 'Surat 035/036/037/MSFR/IX/2026';
  IF _n = 0 THEN _out := _out || E'PASS seed: the SOLD OUT lines (4 Nov Pelataran SV, 25 Nov By Jodan GA) got no rates\n';
  ELSE _out := _out || format(E'FAIL seed: %s letter rows were written for the sold-out departures\n', _n); END IF;

  RAISE EXCEPTION E'RESULTS\n%', _out;
END
$$;
