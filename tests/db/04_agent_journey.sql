-- Agent journey regression tests: what 01, 02 and 03 do not cover. Written for the agent-portal audit (docs/audit/02-agent.md).
--
-- Runs against the live linked project, but only inside a transaction that always aborts (the final
-- RAISE EXCEPTION), so nothing is stored. Run with: ./scripts/run-db-tests.sh tests/db/04_agent_journey.sql
--
-- Report lines start with PASS, FAIL, SKIP (prerequisite data missing) or KNOWN (a documented gap that
-- should become a real assertion once it is fixed). Each KNOWN names the audit finding (AGT-nnn).
--
-- Needs two plain active agents (active, with a login, no staff role) to prove isolation between agents.
-- Everything else is planted inside the transaction.
--
-- Sections:
--   1. Agent A never sees agent B's jamaah or intakes, and the reverse (both RPCs).
--   2. Agents read nothing from any jamaah* table or view directly; sensitive columns return nothing.
--   3. No RPC an agent can call returns passport / NIK / KTP / manifest-link data (planted markers must not show up).
--   4. Referral end to end: intake with ref_code -> accepted -> registration.agent_id -> DP -> lunas -> commission from packages
--      -> the agent sees it, the other agent does not.
--   5. Withdrawal lifecycle as the portal drives it (pending does not move the balance, paid does) and its DB-level gaps.
--   6. Suspended agent: the Function login check refuses, the intake is not attributed; gaps that remain.
--   7. Pending agent: cannot approve self, cannot withdraw, sees nothing of other agents; admin awareness gap.
--   8. register_agent_profile(): idempotent, pending/bronze/0, referral resolved among active agents, placeholder phone.
--   9. Outsiders (signed in, no agent row) and the data an agent can read that contradicts the product rules.

BEGIN;

DO $$
DECLARE
  _out text := '';
  _a record;
  _b record;
  _p record;
  _staff uuid;
  _pkg uuid;
  _pkg_commission numeric;
  _pkg_default text;
  _phone_a text := '62' || lpad(floor(random() * 1e10)::bigint::text, 10, '0');
  _phone_b text := '62' || lpad(floor(random() * 1e10)::bigint::text, 10, '0');
  _base jsonb;
  _res jsonb;
  _intake_a uuid; _code_a text;
  _intake_b uuid; _code_b text;
  _reg_a uuid;    -- planted directly, carries the privacy markers
  _reg_b uuid;
  _reg_ref uuid;  -- created through the real path: intake -> accept
  _people jsonb;
  _ids jsonb;
  _pay uuid;
  _w uuid;
  _n bigint;
  _m bigint;
  _rc integer;
  _t text;
  _c record;
  _s record;
  _col record;
  _bal0 numeric;
  _bal1 numeric;
  _txt text;
  _uid_new uuid := gen_random_uuid();
  _uid_out uuid := gen_random_uuid();
  _sens text[] := ARRAY['passport_number', 'nik', 'ktp_path', 'passport_path', 'photo_path', 'passport_expiry'];
  _marker_pass constant text := 'ZZPASS9988';
  _marker_nik constant text := '3399887766554433';
  _marker_ktp constant text := 'zzktp/agent-test-ktp.jpg';
  _marker_token text;
BEGIN
  -- Two plain active agents (the owner's own staff accounts are also agents, so exclude them)
  SELECT id, user_id, referral_code, name INTO _a FROM public.agents
   WHERE status = 'active' AND user_id IS NOT NULL AND user_id NOT IN (SELECT user_id FROM public.user_roles) ORDER BY created_at LIMIT 1;
  SELECT id, user_id, referral_code, name INTO _b FROM public.agents
   WHERE status = 'active' AND user_id IS NOT NULL AND user_id NOT IN (SELECT user_id FROM public.user_roles) AND id <> _a.id ORDER BY created_at LIMIT 1;
  SELECT id, user_id, referral_code, name INTO _p FROM public.agents
   WHERE status = 'pending' AND user_id IS NOT NULL AND user_id NOT IN (SELECT user_id FROM public.user_roles) ORDER BY created_at LIMIT 1;
  SELECT user_id INTO _staff FROM public.user_roles WHERE role IN ('superadmin', 'admin') ORDER BY role LIMIT 1;
  SELECT id, agent_commission_amount INTO _pkg, _pkg_commission FROM public.packages
   WHERE status = 'published' AND departure_date::date >= current_date ORDER BY departure_date LIMIT 1;

  IF _a.id IS NULL OR _b.id IS NULL OR _pkg IS NULL THEN
    _out := format('SKIP agent journey: needs two plain active agents with a login and one upcoming published package (agents found: A=%s B=%s, package=%s)', _a.id, _b.id, _pkg);
    RAISE EXCEPTION E'RESULTS\n%', _out;
  END IF;

  -- =============================================================================================
  -- Planting (rolled back at the end)
  -- =============================================================================================
  _people := jsonb_build_array(
    jsonb_build_object('full_name', 'Journey Test Satu', 'gender', 'L', 'category', 'adult', 'room_type', 'quad'),
    jsonb_build_object('full_name', 'Journey Test Dua', 'gender', 'P', 'category', 'adult', 'room_type', 'quad'));
  _base := jsonb_build_object('package_id', _pkg, 'contact_name', 'Journey Test Kontak', 'consent', true, 'consent_version', 'test',
                              'source', 'agent', 'people', _people);

  SET LOCAL ROLE service_role;
  _res := public.create_jamaah_intake(_base || jsonb_build_object('ref_code', _a.referral_code, 'contact_phone', _phone_a));
  _intake_a := (_res ->> 'id')::uuid; _code_a := _res ->> 'code';
  _res := public.create_jamaah_intake(_base || jsonb_build_object('ref_code', _b.referral_code, 'contact_phone', _phone_b, 'contact_name', 'Journey Test Kontak B'));
  _intake_b := (_res ->> 'id')::uuid; _code_b := _res ->> 'code';
  RESET ROLE;
  SELECT manifest_token INTO _marker_token FROM public.jamaah_intakes WHERE id = _intake_a;

  -- Registrations carrying the privacy markers (passport, NIK, KTP path)
  INSERT INTO public.jamaah_registrations (package_id, full_name, room_type, list_price, agent_id, passport_number, nik, ktp_path, passport_path)
  VALUES (_pkg, 'Journey Jamaah A', 'quad', 30000000, _a.id, _marker_pass, _marker_nik, _marker_ktp, 'zzpassport/agent-test.jpg') RETURNING id INTO _reg_a;
  INSERT INTO public.jamaah_registrations (package_id, full_name, room_type, list_price, agent_id, passport_number, nik, ktp_path)
  VALUES (_pkg, 'Journey Jamaah B', 'quad', 30000000, _b.id, _marker_pass, _marker_nik, _marker_ktp) RETURNING id INTO _reg_b;
  BEGIN
    INSERT INTO public.jamaah_payments (registration_id, amount, paid_on, bank_account, status)
    VALUES (_reg_b, 1000000, current_date, 'BCA', 'pending');
  EXCEPTION WHEN OTHERS THEN
    _out := _out || format(E'SKIP planting: could not plant a payment as the migration role (%s), the payments sweep below sees an empty table\n', SQLERRM);
  END;

  -- =============================================================================================
  -- 1. Isolation between two agents
  -- =============================================================================================
  FOR _c IN SELECT * FROM (VALUES ('A', _a.user_id, _reg_a, _reg_b, _code_a, _code_b), ('B', _b.user_id, _reg_b, _reg_a, _code_b, _code_a)) AS t(who, uid, own_reg, other_reg, own_code, other_code)
  LOOP
    BEGIN
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _c.uid, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      SELECT count(*) INTO _n FROM public.list_my_agent_jamaah() WHERE registration_id = _c.own_reg;
      SELECT count(*) INTO _m FROM public.list_my_agent_jamaah() WHERE registration_id = _c.other_reg;
      SELECT count(*) INTO _rc FROM public.list_my_agent_intakes() WHERE code = _c.own_code;
      SELECT count(*) INTO _t FROM public.list_my_agent_intakes() WHERE code = _c.other_code;
      RESET ROLE;
      IF _n = 1 AND _m = 0 AND _rc = 1 AND _t::int = 0 THEN
        _out := _out || format(E'PASS isolation: agent %s sees own jamaah and intake and none of the other agent''s (both RPCs)\n', _c.who);
      ELSE
        _out := _out || format(E'FAIL isolation: agent %s own jamaah=%s other jamaah=%s own intake=%s other intake=%s\n', _c.who, _n, _m, _rc, _t);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      _out := _out || format(E'FAIL isolation: agent %s lists raised %s (%s)\n', _c.who, SQLSTATE, SQLERRM);
    END;
  END LOOP;

  -- The rows an agent gets back are exactly the rows attributed to them, nothing borrowed through the LEFT JOIN on agent_sales
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', _a.user_id, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    SELECT count(*), count(DISTINCT registration_id) INTO _n, _m FROM public.list_my_agent_jamaah();
    RESET ROLE;
    SELECT count(*) INTO _rc FROM public.jamaah_registrations WHERE agent_id = _a.id;
    IF _n = _m AND _n = least(_rc, 500) THEN
      _out := _out || format(E'PASS isolation: agent A gets %s rows from list_my_agent_jamaah, no duplicates, equal to the registrations attributed to A\n', _n);
    ELSE
      _out := _out || format(E'FAIL isolation: list_my_agent_jamaah returned %s rows (%s distinct) for %s attributed registrations\n', _n, _m, _rc);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'FAIL isolation: duplicate check raised %s (%s)\n', SQLSTATE, SQLERRM);
  END;

  -- =============================================================================================
  -- 2. No direct reads of any jamaah table or view, and sensitive columns stay empty
  -- =============================================================================================
  FOR _c IN SELECT c.relname AS rel FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname = 'public' AND c.relkind IN ('r', 'v', 'm') AND c.relname LIKE 'jamaah%' ORDER BY c.relname
  LOOP
    BEGIN
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _a.user_id, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      EXECUTE format('SELECT count(*) FROM public.%I', _c.rel) INTO _n;
      RESET ROLE;
      IF _n = 0 THEN _out := _out || format(E'PASS direct read: agent sees 0 rows of %s\n', _c.rel);
      ELSE _out := _out || format(E'FAIL direct read: agent sees %s rows of %s\n', _n, _c.rel); END IF;
    EXCEPTION WHEN insufficient_privilege THEN
      RESET ROLE;
      _out := _out || format(E'PASS direct read: agent has no access to %s (42501)\n', _c.rel);
    WHEN OTHERS THEN
      RESET ROLE;
      _out := _out || format(E'FAIL direct read: %s raised %s (%s)\n', _c.rel, SQLSTATE, SQLERRM);
    END;
  END LOOP;

  FOR _col IN SELECT table_name AS tbl, column_name AS col FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name IN ('jamaah_registrations', 'jamaah_intakes', 'jamaah_payments')
                 AND (column_name = ANY (_sens) OR column_name IN ('manifest_token', 'proof_path'))
               ORDER BY table_name, column_name
  LOOP
    BEGIN
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _a.user_id, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      EXECUTE format('SELECT count(%I) FROM public.%I', _col.col, _col.tbl) INTO _n;
      RESET ROLE;
      IF _n = 0 THEN _out := _out || format(E'PASS sensitive column: agent reads no value of %s.%s\n', _col.tbl, _col.col);
      ELSE _out := _out || format(E'FAIL sensitive column: agent reads %s values of %s.%s\n', _n, _col.tbl, _col.col); END IF;
    EXCEPTION WHEN insufficient_privilege THEN
      RESET ROLE;
      _out := _out || format(E'PASS sensitive column: %s.%s is not readable by an agent (42501)\n', _col.tbl, _col.col);
    WHEN OTHERS THEN
      RESET ROLE;
      _out := _out || format(E'FAIL sensitive column: %s.%s raised %s (%s)\n', _col.tbl, _col.col, SQLSTATE, SQLERRM);
    END;
  END LOOP;

  -- =============================================================================================
  -- 3. RPC output never carries the markers or sensitive column names
  -- =============================================================================================
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', _a.user_id, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    SELECT coalesce(string_agg(to_jsonb(x)::text, ' '), '') INTO _txt FROM public.list_my_agent_jamaah() x;
    SELECT _txt || ' ' || coalesce(string_agg(to_jsonb(y)::text, ' '), '') INTO _txt FROM public.list_my_agent_intakes() y;
    RESET ROLE;
    IF position(_marker_pass IN _txt) = 0 AND position(_marker_nik IN _txt) = 0 AND position(_marker_ktp IN _txt) = 0
       AND position(_marker_token IN _txt) = 0 AND _txt !~* 'passport|paspor|ktp|nik|manifest|token|proof' THEN
      _out := _out || E'PASS rpc privacy: list_my_agent_jamaah + list_my_agent_intakes output holds no passport number, NIK, KTP/passport path, manifest token or proof path (planted markers absent)\n';
    ELSE
      _out := _out || E'FAIL rpc privacy: a sensitive marker or column name appears in the output of the agent RPCs\n';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'FAIL rpc privacy: raised %s (%s)\n', SQLSTATE, SQLERRM);
  END;

  -- Any function an agent may call that reads jamaah data must be one we know about
  SELECT string_agg(p.proname, ', ' ORDER BY p.proname) INTO _t
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.prosecdef AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
     AND p.prosrc ~* 'jamaah_registrations|jamaah_payments|jamaah_intakes|jamaah_intake_people'
     AND p.proname NOT IN ('list_my_agent_jamaah', 'list_my_agent_intakes');
  IF _t IS NULL THEN
    _out := _out || E'PASS rpc privacy: the only SECURITY DEFINER functions callable by authenticated that read jamaah tables are list_my_agent_jamaah and list_my_agent_intakes\n';
  ELSE
    _out := _out || format(E'FAIL rpc privacy: new SECURITY DEFINER function(s) callable by authenticated read jamaah tables: %s (check they are staff-only or scoped to the caller)\n', _t);
  END IF;

  -- =============================================================================================
  -- 4. Referral end to end through the real path
  -- =============================================================================================
  IF _staff IS NULL THEN
    _out := _out || E'SKIP referral: no superadmin/admin to accept the intake and verify payments\n';
  ELSE
    BEGIN
      -- 4a. the intake carries the agent
      SELECT agent_id, source, ref_code INTO _s FROM public.jamaah_intakes WHERE id = _intake_a;
      IF _s.agent_id = _a.id AND _s.source = 'agent' AND _s.ref_code = _a.referral_code THEN
        _out := _out || E'PASS referral: intake sent with the agent''s code is linked to that agent (agent_id, source agent, ref_code)\n';
      ELSE
        _out := _out || format(E'FAIL referral: intake agent_id=%s source=%s ref_code=%s\n', _s.agent_id, _s.source, _s.ref_code);
      END IF;

      -- 4b. CS accepts both people as they came in; the registrations inherit the agent
      SELECT jsonb_agg(jsonb_build_object('id', id, 'full_name', full_name, 'room_type', room_type, 'list_price', 30000000, 'include', true) ORDER BY position)
        INTO _ids FROM public.jamaah_intake_people WHERE intake_id = _intake_a;
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _staff, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      _res := public.accept_jamaah_intake(_intake_a, _ids, true);
      RESET ROLE;
      SELECT count(*) INTO _n FROM public.jamaah_registrations WHERE intake_id = _intake_a AND agent_id = _a.id;
      IF _n = 2 THEN _out := _out || E'PASS referral: accepting the intake creates 2 registrations that carry the agent (agent_id of the intake)\n';
      ELSE _out := _out || format(E'FAIL referral: %s of 2 accepted registrations carry the agent\n', _n); END IF;
      SELECT id INTO _reg_ref FROM public.jamaah_registrations WHERE intake_id = _intake_a ORDER BY created_at LIMIT 1;

      -- 4c. after acceptance the agent sees the intake as accepted, and the jamaah as belum DP / waiting
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _a.user_id, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      SELECT status INTO _t FROM public.list_my_agent_intakes() WHERE code = _code_a;
      SELECT pay_state, commission_status, commission_amount INTO _s FROM public.list_my_agent_jamaah() WHERE registration_id = _reg_ref;
      RESET ROLE;
      IF _t = 'accepted' AND _s.pay_state = 'belum_dp' AND _s.commission_status = 'waiting' AND _s.commission_amount = _pkg_commission THEN
        _out := _out || format(E'PASS referral: the agent sees the intake as accepted and the jamaah as belum_dp with the commission waiting (%s)\n', _s.commission_amount);
      ELSE
        _out := _out || format(E'FAIL referral: intake status=%s, pay_state=%s, commission_status=%s, commission=%s\n', _t, _s.pay_state, _s.commission_status, _s.commission_amount);
      END IF;

      -- 4d. DP of Rp 5 jt verified: dp, commission still waiting, nothing credited
      SELECT available_balance INTO _bal0 FROM public.agents WHERE id = _a.id;
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _staff, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      INSERT INTO public.jamaah_payments (registration_id, amount, paid_on, bank_account, status) VALUES (_reg_ref, 5000000, current_date, 'BCA', 'verified');
      RESET ROLE;
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _a.user_id, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      SELECT pay_state, commission_status INTO _s FROM public.list_my_agent_jamaah() WHERE registration_id = _reg_ref;
      RESET ROLE;
      SELECT count(*) INTO _n FROM public.agent_sales WHERE registration_id = _reg_ref;
      IF _s.pay_state = 'dp' AND _s.commission_status = 'waiting' AND _n = 0 THEN
        _out := _out || E'PASS referral: after the Rp 5 jt DP the jamaah is dp and the commission is still only waiting (nothing credited)\n';
      ELSE
        _out := _out || format(E'FAIL referral: after DP pay_state=%s commission_status=%s sales rows=%s\n', _s.pay_state, _s.commission_status, _n);
      END IF;

      -- 4e. the rest verified: lunas, commission credited from packages.agent_commission_amount (live value, not overridden)
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _staff, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      INSERT INTO public.jamaah_payments (registration_id, amount, paid_on, bank_account, status) VALUES (_reg_ref, 25000000, current_date, 'BCA', 'verified');
      RESET ROLE;
      SELECT * INTO _s FROM public.agent_sales WHERE registration_id = _reg_ref;
      SELECT available_balance INTO _bal1 FROM public.agents WHERE id = _a.id;
      IF _s.id IS NOT NULL AND _s.status = 'confirmed' AND _s.agent_id = _a.id AND _s.commission_amount = _pkg_commission
         AND _pkg_commission = 1500000 AND _bal1 = _bal0 + 1500000 THEN
        _out := _out || E'PASS referral: lunas credits exactly 1,500,000 read from packages.agent_commission_amount (live value), balance +1,500,000\n';
      ELSE
        _out := _out || format(E'FAIL referral: sale status=%s commission=%s (package says %s), balance %s -> %s\n', _s.status, _s.commission_amount, _pkg_commission, _bal0, _bal1);
      END IF;

      -- 4f. agent A sees it as earned and can read the sale; agent B sees neither
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _a.user_id, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      SELECT pay_state, commission_status INTO _s FROM public.list_my_agent_jamaah() WHERE registration_id = _reg_ref;
      SELECT count(*) INTO _n FROM public.agent_sales WHERE registration_id = _reg_ref;
      RESET ROLE;
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _b.user_id, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      SELECT count(*) INTO _m FROM public.agent_sales WHERE registration_id = _reg_ref;
      SELECT count(*) INTO _rc FROM public.list_my_agent_jamaah() WHERE registration_id = _reg_ref;
      RESET ROLE;
      IF _s.pay_state = 'lunas' AND _s.commission_status = 'earned' AND _n = 1 AND _m = 0 AND _rc = 0 THEN
        _out := _out || E'PASS referral: agent A sees lunas / earned and the sale row; agent B sees neither\n';
      ELSE
        _out := _out || format(E'FAIL referral: A pay_state=%s commission_status=%s sale rows A=%s B=%s, B list rows=%s\n', _s.pay_state, _s.commission_status, _n, _m, _rc);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      _out := _out || format(E'FAIL referral: end-to-end path raised %s (%s)\n', SQLSTATE, SQLERRM);
    END;

    -- =============================================================================================
    -- 5. Withdrawal lifecycle as the portal drives it
    -- =============================================================================================
    BEGIN
      SELECT available_balance INTO _bal0 FROM public.agents WHERE id = _a.id;   -- now holds the 1,500,000 just credited
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _a.user_id, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      INSERT INTO public.agent_withdrawals (agent_id, amount, bank_name, bank_account, account_name, status)
      VALUES (_a.id, 1000000, 'Bank BCA', '1234567890', 'Journey Test', 'pending') RETURNING id INTO _w;
      RESET ROLE;
      SELECT available_balance INTO _bal1 FROM public.agents WHERE id = _a.id;
      IF _bal1 = _bal0 THEN
        _out := _out || E'PASS withdrawal: a pending request does not move agents.available_balance (the portal must subtract pending itself, see AGT-012)\n';
      ELSE
        _out := _out || format(E'FAIL withdrawal: pending request changed the balance %s -> %s\n', _bal0, _bal1);
      END IF;

      -- a second request that exceeds balance minus pending is refused by the guard
      BEGIN
        PERFORM set_config('request.jwt.claims', json_build_object('sub', _a.user_id, 'role', 'authenticated')::text, true);
        SET LOCAL ROLE authenticated;
        INSERT INTO public.agent_withdrawals (agent_id, amount, bank_name, bank_account, account_name, status)
        VALUES (_a.id, _bal0 - 1000000 + 1, 'Bank BCA', '1234567890', 'Journey Test', 'pending');
        RAISE EXCEPTION 'applied' USING ERRCODE = 'XX001';
      EXCEPTION WHEN OTHERS THEN
        RESET ROLE;
        IF SQLSTATE = '22023' THEN _out := _out || E'PASS withdrawal: a second request above balance minus pending is refused (22023), but the portal shows that as a raw toast (AGT-012)\n';
        ELSE _out := _out || format(E'FAIL withdrawal: second request gave SQLSTATE %s (%s), expected 22023\n', SQLSTATE, SQLERRM); END IF;
      END;

      -- staff rejects with a reason: balance stays, the agent can read the reason
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _staff, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      PERFORM public.process_agent_withdrawal(_w, 'rejected', 'Test: nomor rekening tidak cocok');
      RESET ROLE;
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _a.user_id, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      SELECT status, admin_notes INTO _s FROM public.agent_withdrawals WHERE id = _w;
      RESET ROLE;
      SELECT available_balance INTO _bal1 FROM public.agents WHERE id = _a.id;
      IF _s.status = 'rejected' AND _s.admin_notes LIKE 'Test:%' AND _bal1 = _bal0 THEN
        _out := _out || E'PASS withdrawal: a rejected request keeps the balance and the agent can read the admin note\n';
      ELSE
        _out := _out || format(E'FAIL withdrawal: after reject status=%s notes=%s balance %s -> %s\n', _s.status, _s.admin_notes, _bal0, _bal1);
      END IF;

      -- paid deducts the balance
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _a.user_id, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      INSERT INTO public.agent_withdrawals (agent_id, amount, bank_name, bank_account, account_name, status)
      VALUES (_a.id, 500000, 'Bank BCA', '1234567890', 'Journey Test', 'pending') RETURNING id INTO _w;
      RESET ROLE;
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _staff, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      PERFORM public.process_agent_withdrawal(_w, 'paid', NULL);
      RESET ROLE;
      SELECT available_balance INTO _bal1 FROM public.agents WHERE id = _a.id;
      IF _bal1 = _bal0 - 500000 THEN _out := _out || E'PASS withdrawal: marking paid deducts the amount from the balance\n';
      ELSE _out := _out || format(E'FAIL withdrawal: after paid the balance is %s, expected %s\n', _bal1, _bal0 - 500000); END IF;
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      _out := _out || format(E'FAIL withdrawal: lifecycle raised %s (%s)\n', SQLSTATE, SQLERRM);
    END;
  END IF;

  -- Minimum Rp 100.000 lives only in the browser (AgentCommission.tsx handleWithdraw). The database accepts any positive amount.
  BEGIN
    UPDATE public.agents SET available_balance = 1000000 WHERE id = _b.id;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', _b.user_id, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    INSERT INTO public.agent_withdrawals (agent_id, amount, bank_name, bank_account, account_name, status)
    VALUES (_b.id, 1000, 'Bank BCA', '1234567890', 'Journey Test', 'pending');
    RESET ROLE;
    _out := _out || E'KNOWN withdrawal: the Rp 100.000 minimum is enforced only in the browser; a request for Rp 1.000 is accepted by the database (AGT-024)\n';
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    IF SQLSTATE IN ('22023', '23514') THEN _out := _out || E'PASS withdrawal: the database enforces the Rp 100.000 minimum\n';
    ELSE _out := _out || format(E'FAIL withdrawal: minimum check raised %s (%s)\n', SQLSTATE, SQLERRM); END IF;
  END;

  -- =============================================================================================
  -- 6. Suspended agent
  -- =============================================================================================
  UPDATE public.agents SET status = 'suspended', available_balance = 1000000 WHERE id = _b.id;

  -- The Function (functions/api/daftar.ts agentFromLogin) asks for the agent behind a login with status=eq.active
  BEGIN
    SET LOCAL ROLE service_role;
    SELECT count(*) INTO _n FROM public.agents WHERE user_id = _b.user_id AND status = 'active';
    RESET ROLE;
    IF _n = 0 THEN _out := _out || E'PASS suspended: the Function''s login check (agents WHERE user_id AND status = active) finds nothing, so /api/daftar answers 401 for a suspended agent\n';
    ELSE _out := _out || E'FAIL suspended: the active-agent lookup used by /api/daftar still finds the suspended agent\n'; END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'FAIL suspended: lookup raised %s (%s)\n', SQLSTATE, SQLERRM);
  END;

  -- A referral code of a suspended agent no longer attributes new registrations
  BEGIN
    SET LOCAL ROLE service_role;
    _res := public.create_jamaah_intake(_base || jsonb_build_object('ref_code', _b.referral_code, 'contact_phone', '62' || lpad(floor(random() * 1e10)::bigint::text, 10, '0')));
    RESET ROLE;
    SELECT agent_id INTO _s FROM public.jamaah_intakes WHERE id = (_res ->> 'id')::uuid;
    IF _s.agent_id IS NULL THEN _out := _out || E'PASS suspended: a new registration with the suspended agent''s code is accepted but no longer attributed (the link /r/CODE silently stops paying)\n';
    ELSE _out := _out || E'FAIL suspended: a new registration was still attributed to the suspended agent\n'; END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'FAIL suspended: attribution check raised %s (%s)\n', SQLSTATE, SQLERRM);
  END;

  -- Gap: the database does not look at status for the agent's own reads and money movements. The UI hides the portal
  -- (AgentProtectedRoute), but the API still answers.
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', _b.user_id, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    SELECT count(*) INTO _n FROM public.list_my_agent_jamaah();
    RESET ROLE;
    IF _n = 0 THEN _out := _out || E'PASS suspended: list_my_agent_jamaah returns nothing to a suspended agent\n';
    ELSE _out := _out || format(E'KNOWN suspended: list_my_agent_jamaah still returns %s jamaah (names, phones, payment state) to a suspended agent through the API (AGT-007)\n', _n); END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'FAIL suspended: list_my_agent_jamaah raised %s (%s)\n', SQLSTATE, SQLERRM);
  END;

  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', _b.user_id, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    INSERT INTO public.agent_withdrawals (agent_id, amount, bank_name, bank_account, account_name, status)
    VALUES (_b.id, 200000, 'Bank BCA', '1234567890', 'Journey Test', 'pending');
    RESET ROLE;
    _out := _out || E'KNOWN suspended: a suspended agent with a balance can still create a withdrawal request through the API (guard_agent_withdrawal ignores agents.status) (AGT-007)\n';
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    IF SQLSTATE IN ('42501', '22023') THEN _out := _out || E'PASS suspended: a suspended agent cannot create a withdrawal request\n';
    ELSE _out := _out || format(E'FAIL suspended: withdrawal attempt raised %s (%s)\n', SQLSTATE, SQLERRM); END IF;
  END;

  -- =============================================================================================
  -- 7. Pending agent (signed up, onboarding not approved yet)
  -- =============================================================================================
  IF _p.id IS NULL THEN
    _out := _out || E'SKIP pending: no pending agent with a login in the database\n';
  ELSE
    BEGIN
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _p.user_id, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      UPDATE public.agents SET status = 'active' WHERE id = _p.id;
      RAISE EXCEPTION 'applied' USING ERRCODE = 'XX001';
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      IF SQLSTATE = '42501' THEN _out := _out || E'PASS pending: a pending agent cannot approve themselves (42501)\n';
      ELSE _out := _out || format(E'FAIL pending: self-approval gave SQLSTATE %s (%s), expected 42501\n', SQLSTATE, SQLERRM); END IF;
    END;

    BEGIN
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _p.user_id, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      SELECT count(*) INTO _n FROM public.agents;
      SELECT count(*) INTO _m FROM public.list_my_agent_jamaah();
      SELECT count(*) INTO _rc FROM public.agent_sales;
      RESET ROLE;
      IF _n = 1 AND _m = 0 AND _rc = 0 THEN _out := _out || E'PASS pending: a pending agent sees only their own agents row and no jamaah or sales\n';
      ELSE _out := _out || format(E'FAIL pending: agents rows=%s, jamaah rows=%s, sales rows=%s\n', _n, _m, _rc); END IF;
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      _out := _out || format(E'FAIL pending: reads raised %s (%s)\n', SQLSTATE, SQLERRM);
    END;

    BEGIN
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _p.user_id, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      INSERT INTO public.agent_withdrawals (agent_id, amount, bank_name, bank_account, account_name, status)
      VALUES (_p.id, 100000, 'Bank BCA', '1234567890', 'Journey Test', 'pending');
      RAISE EXCEPTION 'applied' USING ERRCODE = 'XX001';
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      IF SQLSTATE = '22023' THEN _out := _out || E'PASS pending: a pending agent (balance 0) cannot create a withdrawal (22023)\n';
      ELSE _out := _out || format(E'FAIL pending: withdrawal gave SQLSTATE %s (%s), expected 22023\n', SQLSTATE, SQLERRM); END IF;
    END;

    -- Onboarding itself must work as the portal sends it (AgentOnboarding.tsx updateAgentProfile), including the
    -- unique KTP and phone numbers the page translates into messages
    BEGIN
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _p.user_id, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      UPDATE public.agents SET ktp_number = '3300000000000099', address = 'Jl. Uji 1', city = 'Semarang', province = 'Jawa Tengah',
             ktp_image_url = 'https://example.invalid/agent-documents/test.jpg', experience_level = 'pemula',
             social_links = '{"instagram":"","facebook":""}'::jsonb
       WHERE id = _p.id;
      GET DIAGNOSTICS _rc = ROW_COUNT;
      RESET ROLE;
      IF _rc = 1 THEN _out := _out || E'PASS pending: the onboarding update (KTP, address, region, experience, social links) is accepted for the owner\n';
      ELSE _out := _out || format(E'FAIL pending: onboarding update changed %s rows\n', _rc); END IF;
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      _out := _out || format(E'FAIL pending: onboarding update raised %s (%s)\n', SQLSTATE, SQLERRM);
    END;

    BEGIN
      SELECT ktp_number INTO _t FROM public.agents WHERE ktp_number IS NOT NULL AND id <> _p.id LIMIT 1;
      IF _t IS NULL THEN
        _out := _out || E'SKIP pending: no other agent has a KTP number, duplicate-KTP message not exercised\n';
      ELSE
        PERFORM set_config('request.jwt.claims', json_build_object('sub', _p.user_id, 'role', 'authenticated')::text, true);
        SET LOCAL ROLE authenticated;
        UPDATE public.agents SET ktp_number = _t WHERE id = _p.id;
        RAISE EXCEPTION 'applied' USING ERRCODE = 'XX001';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      IF _t IS NOT NULL THEN
        IF SQLSTATE = '23505' AND SQLERRM LIKE '%agents_ktp_number_key%' THEN _out := _out || E'PASS pending: a KTP number already used by another agent is refused with agents_ktp_number_key (the page maps it to a message)\n';
        ELSE _out := _out || format(E'FAIL pending: duplicate KTP gave SQLSTATE %s (%s)\n', SQLSTATE, SQLERRM); END IF;
      END IF;
    END;

    -- Admin awareness: the bell is told when an agent signs up, not when the pending agent finishes onboarding
    SELECT count(*) INTO _n FROM public.admin_notifications WHERE type = 'agent_registration' AND (meta ->> 'agent_id') = _p.id::text AND created_at > now() - interval '1 minute';
    IF _n = 0 THEN
      _out := _out || E'KNOWN pending: submitting the KTP and address (the onboarding update) creates no admin notification, so CS only learns an agent is ready by opening Kelola Agent (AGT-025)\n';
    ELSE
      _out := _out || E'PASS pending: submitting onboarding data notifies admin\n';
    END IF;
  END IF;

  -- =============================================================================================
  -- 8. register_agent_profile() with a planted auth user
  -- =============================================================================================
  BEGIN
    INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
    VALUES (_uid_new, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'journey-' || substr(md5(random()::text), 1, 10) || '@example.invalid',
            jsonb_build_object('full_name', 'Journey Daftar', 'phone', '0812' || lpad(floor(random() * 1e8)::bigint::text, 8, '0'),
                               'wa_number', '0812' || lpad(floor(random() * 1e8)::bigint::text, 8, '0'), 'referral_code', lower(_a.referral_code), 'agent_signup', true),
            now(), now());
  EXCEPTION WHEN OTHERS THEN
    _uid_new := NULL;
    _out := _out || format(E'SKIP register_agent_profile: could not plant an auth user (%s)\n', SQLERRM);
  END;

  IF _uid_new IS NOT NULL THEN
    BEGIN
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _uid_new, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      SELECT * INTO _s FROM public.register_agent_profile();
      RESET ROLE;
      SELECT count(*) INTO _n FROM public.agents WHERE user_id = _uid_new;
      IF _s.status = 'pending' AND _s.level = 'bronze' AND _s.total_sales = 0 AND _s.available_balance = 0 AND _s.approved_at IS NULL
         AND _s.referred_by_id = _a.id AND _s.name = 'Journey Daftar' AND _s.referral_code IS NOT NULL AND _n = 1 THEN
        _out := _out || E'PASS register_agent_profile: new row is pending / bronze / 0 sales / balance 0, name and referrer (lower-case code of an active agent) taken from the signup metadata\n';
      ELSE
        _out := _out || format(E'FAIL register_agent_profile: status=%s level=%s sales=%s balance=%s referred_by=%s (expected %s) name=%s rows=%s\n',
                               _s.status, _s.level, _s.total_sales, _s.available_balance, _s.referred_by_id, _a.id, _s.name, _n);
      END IF;
      -- admin hears about the signup
      SELECT count(*) INTO _m FROM public.admin_notifications WHERE type = 'agent_registration' AND (meta ->> 'agent_id') = _s.id::text;
      IF _m = 1 THEN _out := _out || E'PASS register_agent_profile: one "Pendaftaran Agen Baru" notification for admin\n';
      ELSE _out := _out || format(E'FAIL register_agent_profile: %s admin notifications for the new agent, expected 1\n', _m); END IF;
      -- idempotent
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _uid_new, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      SELECT id INTO _t FROM public.register_agent_profile();
      RESET ROLE;
      SELECT count(*) INTO _n FROM public.agents WHERE user_id = _uid_new;
      IF _n = 1 AND _t = _s.id::text THEN _out := _out || E'PASS register_agent_profile: calling it again returns the same row (idempotent, one row per user)\n';
      ELSE _out := _out || format(E'FAIL register_agent_profile: second call gave %s rows, id %s vs %s\n', _n, _t, _s.id); END IF;
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      _out := _out || format(E'FAIL register_agent_profile: raised %s (%s)\n', SQLSTATE, SQLERRM);
    END;

    -- the same RPC cannot be used with a forged status: the row is built server-side and the arguments are none
    SELECT count(*) INTO _n FROM pg_proc WHERE oid = 'public.register_agent_profile()'::regprocedure AND pronargs = 0;
    IF _n = 1 THEN _out := _out || E'PASS register_agent_profile: takes no arguments, so a client cannot choose status, level or referrer\n';
    ELSE _out := _out || E'FAIL register_agent_profile: has arguments\n'; END IF;

    -- anon cannot call it
    BEGIN
      PERFORM set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
      SET LOCAL ROLE anon;
      PERFORM public.register_agent_profile();
      RAISE EXCEPTION 'applied' USING ERRCODE = 'XX001';
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      IF SQLSTATE = '42501' THEN _out := _out || E'PASS register_agent_profile: anon cannot call it (42501)\n';
      ELSE _out := _out || format(E'FAIL register_agent_profile: anon call gave SQLSTATE %s (%s)\n', SQLSTATE, SQLERRM); END IF;
    END;
  END IF;

  -- =============================================================================================
  -- 9. Outsiders and data that contradicts the product rules
  -- =============================================================================================
  UPDATE public.agents SET status = 'active' WHERE id = _b.id;   -- undo section 6 so the counts below are the real ones

  -- Anyone can sign up (the agent form uses the open Supabase signup). A signed-in user with no agent row:
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', _uid_out, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    SELECT count(*) INTO _n FROM public.agent_leaderboard;
    SELECT count(*) INTO _m FROM public.packages WHERE status = 'published' AND agent_commission_amount IS NOT NULL;
    RESET ROLE;
    IF _n = 0 THEN _out := _out || E'PASS outsider: a signed-in user without an agent row cannot read agent_leaderboard\n';
    ELSE _out := _out || format(E'KNOWN outsider: a signed-in user WITHOUT an agent row reads agent_leaderboard (%s agents with name, total_sales, total_commission) (AGT-008)\n', _n); END IF;
    IF _m = 0 THEN _out := _out || E'PASS outsider: a signed-in user without an agent row cannot read packages.agent_commission_amount\n';
    ELSE _out := _out || format(E'KNOWN outsider: a signed-in user WITHOUT an agent row reads agent_commission_amount on %s published packages (AGT-008)\n', _m); END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'FAIL outsider: reads raised %s (%s)\n', SQLSTATE, SQLERRM);
  END;

  -- Every package pays the same flat commission and new packages inherit it
  SELECT pg_get_expr(d.adbin, d.adrelid) INTO _pkg_default FROM pg_attrdef d JOIN pg_attribute a ON a.attrelid = d.adrelid AND a.attnum = d.adnum
   WHERE d.adrelid = 'public.packages'::regclass AND a.attname = 'agent_commission_amount';
  SELECT count(DISTINCT agent_commission_amount), min(agent_commission_amount) INTO _n, _bal0 FROM public.packages WHERE status = 'published';
  IF _n = 1 AND _bal0 = 1500000 AND _pkg_default = '1500000' THEN
    _out := _out || E'PASS commission: every published package pays 1,500,000 and the column default is 1,500000 (new packages inherit it)\n';
  ELSE
    _out := _out || format(E'FAIL commission: %s distinct commission values on published packages (min %s), column default %s\n', _n, _bal0, _pkg_default);
  END IF;

  -- The leaderboard page prints "Komisi: x% - y%" per level from agent_levels (AgentLeaderboard.tsx), but the commission is flat
  SELECT count(*) INTO _n FROM public.agent_levels WHERE commission_rate_max > 0;
  IF _n = 0 THEN _out := _out || E'PASS levels: agent_levels no longer advertises percentage commissions\n';
  ELSE _out := _out || format(E'KNOWN levels: %s rows of agent_levels still advertise a percentage commission (4.5-6 percent) and benefits such as account manager and annual trip, shown to every agent, while the commission is a flat Rp 1.500.000 (AGT-003)\n', _n); END IF;

  -- The dashboard computes the rank from public.agents, which an agent can only read for themselves
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', _a.user_id, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    SELECT count(*) INTO _n FROM public.agents WHERE status = 'active';
    RESET ROLE;
    SELECT count(*) INTO _m FROM public.agents WHERE status = 'active';
    IF _m <= 1 OR _n = _m THEN _out := _out || E'PASS dashboard rank: the agent can read all active agents, so the rank is real\n';
    ELSE _out := _out || format(E'KNOWN dashboard rank: AgentDashboard ranks among the %s active agents the agent can read, but there are %s, so it always shows "Peringkat #1 dari 1 agen" (AGT-009)\n', _n, _m); END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'FAIL dashboard rank: raised %s (%s)\n', SQLSTATE, SQLERRM);
  END;

  -- Profile photo upload goes to the public marketing-materials bucket, whose write policies are admin only
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', _a.user_id, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('marketing-materials', _a.id || '/avatar.png', _a.user_id);
    RESET ROLE;
    _out := _out || E'PASS profile photo: an agent can upload to marketing-materials/<agent id>/avatar.*\n';
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    IF SQLSTATE = '42501' THEN _out := _out || E'KNOWN profile photo: AgentProfile uploads the avatar to marketing-materials/<agent id>/avatar.*, which only admins may write (42501), so the upload always fails; the URL is also never saved (AGT-022)\n';
    ELSE _out := _out || format(E'FAIL profile photo: raised %s (%s)\n', SQLSTATE, SQLERRM); END IF;
  END;

  -- Status vocabulary and what an agent can learn about a rejected registration
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.agents'::regclass AND conname = 'agents_status_check' AND pg_get_constraintdef(oid) LIKE '%rejected%') THEN
    _out := _out || E'PASS agent status: agents.status has a rejected state\n';
  ELSE
    _out := _out || E'KNOWN agent status: agents.status allows only pending, active, suspended; an application cannot be rejected with a reason, and the admin dialog has only Setujui (AGT-014)\n';
  END IF;

  IF (SELECT 'reject_reason' = ANY (proargnames) FROM pg_proc WHERE oid = 'public.list_my_agent_intakes()'::regprocedure) THEN
    _out := _out || E'PASS intakes: list_my_agent_intakes returns the rejection reason\n';
  ELSE
    _out := _out || E'KNOWN intakes: list_my_agent_intakes does not return reject_reason, so the agent sees "Ditolak" without knowing why or what to fix (AGT-023)\n';
  END IF;

  IF to_regclass('public.agent_notifications') IS NOT NULL THEN
    _out := _out || E'PASS notifications: an agent notification table exists\n';
  ELSE
    _out := _out || E'KNOWN notifications: there is no agent-facing notification store; approval, accepted intake, verified payment, credited commission and paid withdrawal tell the agent nothing in the portal (AGT-013)\n';
  END IF;

  RAISE EXCEPTION E'RESULTS\n%', _out;
END
$$;
