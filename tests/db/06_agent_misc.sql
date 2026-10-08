-- Tests for supabase/migrations/20261006170000_agent_misc.sql (AGT-008, AGT-009, AGT-011):
--   set_agent_referrer(code)   - referral for Google sign-ups, set once, only for an active other agent
--   get_agent_leaderboard()    - active agents and staff only, never a commission column
--
-- Runs against the live linked project, but only inside a transaction that always aborts (the final
-- RAISE EXCEPTION), so nothing is stored. Run with: ./scripts/run-db-tests.sh tests/db/06_agent_misc.sql
-- The migration is applied inside the transaction first by scripts/run-db-tests.sh while it is listed in
-- tests/db/pending-migrations.txt; after the push it is simply already there.
--
-- Report lines start with PASS, FAIL, SKIP or KNOWN. Needs two plain active agents (active, with a login, no staff
-- role); everything else is planted inside the transaction.

BEGIN;

DO $$
DECLARE
  _out text := '';
  _a record;
  _b record;
  _staff uuid;
  _x uuid := gen_random_uuid();   -- signed up with Google: auth user + agents row, no referrer
  _y uuid := gen_random_uuid();   -- a second one, to try its own code
  _out_uid uuid := gen_random_uuid();   -- signed in, no agents row at all
  _xrow record;
  _ref uuid;
  _n bigint;
  _m bigint;
  _rc integer;
BEGIN
  SELECT id, user_id, referral_code INTO _a FROM public.agents
   WHERE status = 'active' AND user_id IS NOT NULL AND user_id NOT IN (SELECT user_id FROM public.user_roles) ORDER BY created_at LIMIT 1;
  SELECT id, user_id, referral_code INTO _b FROM public.agents
   WHERE status = 'active' AND user_id IS NOT NULL AND user_id NOT IN (SELECT user_id FROM public.user_roles) AND id <> _a.id ORDER BY created_at LIMIT 1;
  SELECT user_id INTO _staff FROM public.user_roles WHERE role IN ('superadmin', 'admin') ORDER BY role LIMIT 1;

  IF _a.id IS NULL OR _b.id IS NULL THEN
    _out := 'SKIP agent misc: needs two plain active agents with a login';
    RAISE EXCEPTION E'RESULTS\n%', _out;
  END IF;

  -- Plant two Google-style sign-ups: an auth user with no referral code in the metadata, then register_agent_profile()
  FOREACH _ref IN ARRAY ARRAY[_x, _y] LOOP
    INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
    VALUES (_ref, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'misc-' || substr(md5(random()::text), 1, 10) || '@example.invalid',
            jsonb_build_object('name', 'Misc Google', 'agent_signup', true), now(), now());
    PERFORM set_config('request.jwt.claims', json_build_object('sub', _ref, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    PERFORM public.register_agent_profile();
    RESET ROLE;
  END LOOP;
  INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  VALUES (_out_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'misc-' || substr(md5(random()::text), 1, 10) || '@example.invalid', '{}'::jsonb, now(), now());

  -- ============================ set_agent_referrer ============================
  -- anon cannot call it
  BEGIN
    PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
    SET LOCAL ROLE anon;
    PERFORM public.set_agent_referrer(_a.referral_code);
    RESET ROLE;
    _out := _out || E'FAIL set_agent_referrer: anon could call it\n';
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    IF SQLSTATE = '42501' THEN _out := _out || E'PASS set_agent_referrer: anon cannot call it (42501)\n';
    ELSE _out := _out || format(E'FAIL set_agent_referrer: anon call raised %s (%s)\n', SQLSTATE, SQLERRM); END IF;
  END;

  -- junk and unknown codes are silent no-ops
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', _x, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    PERFORM public.set_agent_referrer(NULL);
    PERFORM public.set_agent_referrer('');
    PERFORM public.set_agent_referrer('MUS-DOESNOTEXIST');
    PERFORM public.set_agent_referrer('%''; DROP TABLE agents; --');
    RESET ROLE;
    SELECT referred_by_id INTO _ref FROM public.agents WHERE user_id = _x;
    IF _ref IS NULL THEN _out := _out || E'PASS set_agent_referrer: null, empty, unknown and junk codes do nothing and raise nothing\n';
    ELSE _out := _out || E'FAIL set_agent_referrer: a bad code changed the referrer\n'; END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'FAIL set_agent_referrer: bad codes raised %s (%s)\n', SQLSTATE, SQLERRM);
  END;

  -- a user without an agents row is a no-op (cannot create one, cannot raise)
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', _out_uid, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    PERFORM public.set_agent_referrer(_a.referral_code);
    RESET ROLE;
    SELECT count(*) INTO _n FROM public.agents WHERE user_id = _out_uid;
    IF _n = 0 THEN _out := _out || E'PASS set_agent_referrer: a signed-in user without an agents row is a silent no-op\n';
    ELSE _out := _out || E'FAIL set_agent_referrer: it created an agents row\n'; END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'FAIL set_agent_referrer: no-agent user raised %s (%s)\n', SQLSTATE, SQLERRM);
  END;

  -- own code: nothing
  BEGIN
    SELECT referral_code INTO _xrow FROM public.agents WHERE user_id = _x;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', _x, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    PERFORM public.set_agent_referrer(_xrow.referral_code);
    RESET ROLE;
    SELECT referred_by_id INTO _ref FROM public.agents WHERE user_id = _x;
    IF _ref IS NULL THEN _out := _out || E'PASS set_agent_referrer: your own code is ignored\n';
    ELSE _out := _out || E'FAIL set_agent_referrer: an agent became their own referrer\n'; END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'FAIL set_agent_referrer: own code raised %s (%s)\n', SQLSTATE, SQLERRM);
  END;

  -- a code of an agent who is not active (the new Google agent Y is still pending): nothing
  BEGIN
    SELECT referral_code INTO _xrow FROM public.agents WHERE user_id = _y;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', _x, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    PERFORM public.set_agent_referrer(_xrow.referral_code);
    RESET ROLE;
    SELECT referred_by_id INTO _ref FROM public.agents WHERE user_id = _x;
    IF _ref IS NULL THEN _out := _out || E'PASS set_agent_referrer: the code of a pending agent is ignored\n';
    ELSE _out := _out || E'FAIL set_agent_referrer: attributed to a pending agent\n'; END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'FAIL set_agent_referrer: pending code raised %s (%s)\n', SQLSTATE, SQLERRM);
  END;

  -- the real thing: lower-case, padded code of an active agent
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', _x, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    PERFORM public.set_agent_referrer('  ' || lower(_a.referral_code) || ' ');
    RESET ROLE;
    SELECT referred_by_id INTO _ref FROM public.agents WHERE user_id = _x;
    IF _ref = _a.id THEN _out := _out || E'PASS set_agent_referrer: the (case-insensitive, trimmed) code of an active agent sets the referrer on the caller''s own row\n';
    ELSE _out := _out || format(E'FAIL set_agent_referrer: referred_by_id is %s, expected %s\n', _ref, _a.id); END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'FAIL set_agent_referrer: valid code raised %s (%s)\n', SQLSTATE, SQLERRM);
  END;

  -- only once: a second code does not overwrite
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', _x, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    PERFORM public.set_agent_referrer(_b.referral_code);
    RESET ROLE;
    SELECT referred_by_id INTO _ref FROM public.agents WHERE user_id = _x;
    IF _ref = _a.id THEN _out := _out || E'PASS set_agent_referrer: a referrer that is already set is never replaced\n';
    ELSE _out := _out || format(E'FAIL set_agent_referrer: the referrer was replaced by %s\n', _ref); END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'FAIL set_agent_referrer: second call raised %s (%s)\n', SQLSTATE, SQLERRM);
  END;

  -- it touches nothing but referred_by_id (status stays pending, balances 0)
  SELECT status, level, available_balance, total_commission INTO _xrow FROM public.agents WHERE user_id = _x;
  IF _xrow.status = 'pending' AND _xrow.level = 'silver' AND _xrow.available_balance = 0 AND _xrow.total_commission = 0 THEN
    _out := _out || E'PASS set_agent_referrer: status, level and balances are untouched\n';
  ELSE _out := _out || E'FAIL set_agent_referrer: it changed more than the referrer\n'; END IF;

  -- no loop: A's referrer cannot become an agent that A refers (X is active and referred by A in this plant)
  BEGIN
    UPDATE public.agents SET status = 'active' WHERE user_id = _x;
    UPDATE public.agents SET referred_by_id = NULL WHERE id = _a.id;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', _a.user_id, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    PERFORM public.set_agent_referrer((SELECT referral_code FROM public.agents WHERE user_id = _x));
    RESET ROLE;
    SELECT referred_by_id INTO _ref FROM public.agents WHERE id = _a.id;
    IF _ref IS NULL THEN _out := _out || E'PASS set_agent_referrer: no two-agent loop (an agent cannot pick the agent they referred)\n';
    ELSE _out := _out || E'FAIL set_agent_referrer: created a referral loop\n'; END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'FAIL set_agent_referrer: loop check raised %s (%s)\n', SQLSTATE, SQLERRM);
  END;

  -- ============================ get_agent_leaderboard ============================
  SELECT count(*) INTO _rc FROM public.agents WHERE status = 'active';

  -- a user with no agents row: nothing
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', _out_uid, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    SELECT count(*) INTO _n FROM public.get_agent_leaderboard();
    RESET ROLE;
    IF _n = 0 THEN _out := _out || E'PASS get_agent_leaderboard: a signed-in account without an agents row gets no rows\n';
    ELSE _out := _out || format(E'FAIL get_agent_leaderboard: an account without an agents row got %s rows\n', _n); END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'FAIL get_agent_leaderboard: no-agent call raised %s (%s)\n', SQLSTATE, SQLERRM);
  END;

  -- a suspended agent: nothing (B is suspended inside this transaction only)
  BEGIN
    UPDATE public.agents SET status = 'suspended' WHERE id = _b.id;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', _b.user_id, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    SELECT count(*) INTO _n FROM public.get_agent_leaderboard();
    RESET ROLE;
    IF _n = 0 THEN _out := _out || E'PASS get_agent_leaderboard: a suspended agent gets no rows\n';
    ELSE _out := _out || format(E'FAIL get_agent_leaderboard: a suspended agent got %s rows\n', _n); END IF;
    UPDATE public.agents SET status = 'active' WHERE id = _b.id;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'FAIL get_agent_leaderboard: suspended call raised %s (%s)\n', SQLSTATE, SQLERRM);
  END;

  -- an active agent: every active agent, ordered by sales, no commission column
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', _a.user_id, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    SELECT count(*) INTO _n FROM public.get_agent_leaderboard();
    SELECT count(*) INTO _m FROM (SELECT total_sales, lag(total_sales) OVER (ORDER BY ord) AS prev
                                    FROM (SELECT total_sales, row_number() OVER () AS ord FROM public.get_agent_leaderboard()) s) t
     WHERE prev IS NOT NULL AND total_sales > prev;
    RESET ROLE;
    SELECT count(*) INTO _rc FROM public.agents WHERE status = 'active';
    IF _n = _rc AND _m = 0 THEN _out := _out || format(E'PASS get_agent_leaderboard: an active agent gets all %s active agents, highest sales first\n', _n);
    ELSE _out := _out || format(E'FAIL get_agent_leaderboard: active agent got %s of %s agents, %s out of order\n', _n, _rc, _m); END IF;
    IF pg_get_function_result('public.get_agent_leaderboard()'::regprocedure) !~* 'commission' THEN
      _out := _out || E'PASS get_agent_leaderboard: no commission column (id, name, total_sales, level only)\n';
    ELSE _out := _out || E'FAIL get_agent_leaderboard: the result has a commission column\n'; END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'FAIL get_agent_leaderboard: active call raised %s (%s)\n', SQLSTATE, SQLERRM);
  END;

  -- staff can read it too
  IF _staff IS NULL THEN
    _out := _out || E'SKIP get_agent_leaderboard: no superadmin/admin in user_roles to try\n';
  ELSE
    BEGIN
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _staff, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      SELECT count(*) INTO _n FROM public.get_agent_leaderboard();
      RESET ROLE;
      IF _n >= 1 THEN _out := _out || format(E'PASS get_agent_leaderboard: staff (admin/superadmin) reads the ranking (%s agents)\n', _n);
      ELSE _out := _out || E'FAIL get_agent_leaderboard: staff got no rows\n'; END IF;
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      _out := _out || format(E'FAIL get_agent_leaderboard: staff call raised %s (%s)\n', SQLSTATE, SQLERRM);
    END;
  END IF;

  -- the old view is gone, so nothing can read commission through it
  IF to_regclass('public.agent_leaderboard') IS NULL THEN _out := _out || E'PASS get_agent_leaderboard: the old agent_leaderboard view is dropped\n';
  ELSE _out := _out || E'FAIL get_agent_leaderboard: the old view still exists\n'; END IF;

  RAISE EXCEPTION E'RESULTS\n%', _out;
END
$$;
