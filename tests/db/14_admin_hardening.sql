-- Admin hardening (migration 20261009100000_admin_hardening.sql, docs/audit/06-admin.md re-audit fixes).
--
-- Runs against the live linked project, but only inside a transaction that always aborts (the final
-- RAISE EXCEPTION), so nothing is stored. Run with: ./scripts/run-db-tests.sh tests/db/14_admin_hardening.sql
-- Report lines start with PASS, FAIL, SKIP (prerequisite data missing) or KNOWN.
--
-- Sections: 1 agent money columns (ADM-102), 2 agent delete (ADM-103), 3 has_role and agent_levels (ADM-109/110),
-- 4 cogs_defaults (ADM-105), 5 notifications by type (ADM-115), 6 menu promises (ADM-031/032/033),
-- 7 intake message sent (ADM-014), 8 queue counts and dashboard (ADM-021/011), 9 commission rate log (ADM-106),
-- 10 package cost columns (ADM-036), 11 function gates (ADM-117).

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

-- Rows touched by _sql (UPDATE/DELETE/INSERT) for the user; -1 when refused or failed.
CREATE FUNCTION pg_temp.touch_as(_uid uuid, _sql text) RETURNS bigint LANGUAGE plpgsql AS $f$
DECLARE _n bigint;
BEGIN
  IF _uid IS NULL THEN
    PERFORM set_config('request.jwt.claims', '', true);
    SET LOCAL ROLE anon;
  ELSE
    PERFORM pg_temp.act_as(_uid);
  END IF;
  EXECUTE _sql;
  GET DIAGNOSTICS _n = ROW_COUNT;
  RESET ROLE;
  RETURN _n;
EXCEPTION WHEN OTHERS THEN
  RESET ROLE;
  RETURN -1;
END $f$;

-- Number of rows a SELECT returns for the user (NULL = anon); -1 when refused.
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

CREATE FUNCTION pg_temp.mkuser(_role text) RETURNS uuid LANGUAGE plpgsql AS $f$
DECLARE _u uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (id, email, instance_id, aud, role)
  VALUES (_u, 'adm14-' || _u || '@example.invalid', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');
  IF _role <> 'none' THEN INSERT INTO public.user_roles (user_id, role) VALUES (_u, _role::public.app_role); END IF;
  RETURN _u;
END $f$;

-- An active agent with its own login, planted by the transaction owner (the guard trigger lets that through).
CREATE FUNCTION pg_temp.mkagent(_name text) RETURNS uuid LANGUAGE plpgsql AS $f$
DECLARE _u uuid := gen_random_uuid(); _id uuid;
BEGIN
  INSERT INTO auth.users (id, email, instance_id, aud, role)
  VALUES (_u, 'adm14a-' || _u || '@example.invalid', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');
  INSERT INTO public.agents (user_id, name, email, phone, status, level, referral_code)
  VALUES (_u, _name, 'adm14a-' || _u || '@example.invalid', '62812' || lpad(floor(random() * 1e8)::bigint::text, 8, '0'), 'active', 'silver', 'T' || substr(replace(_u::text, '-', ''), 1, 8))
  RETURNING id INTO _id;
  RETURN _id;
END $f$;

DO $$
DECLARE
  _out text := '';
  _SA uuid; _AD uuid; _PA uuid; _CA uuid; _AG uuid; _AV uuid; _SL uuid; _CS uuid; _NO uuid;
  _ag1 uuid; _ag2 uuid; _ag3 uuid; _agu uuid;
  _r text; _n bigint; _m bigint; _bal numeric; _t record; _pass text; _pkg uuid; _int_ok uuid; _int_new uuid; _f record; _bad text; _res text; _u uuid;
BEGIN
  _SA := pg_temp.mkuser('superadmin'); _AD := pg_temp.mkuser('admin'); _PA := pg_temp.mkuser('product_admin');
  _CA := pg_temp.mkuser('content_admin'); _AG := pg_temp.mkuser('agent_admin'); _AV := pg_temp.mkuser('advertiser');
  _SL := pg_temp.mkuser('sales'); _CS := pg_temp.mkuser('cs_admin'); _NO := pg_temp.mkuser('none');
  _ag1 := pg_temp.mkagent('Agen Satu');
  _ag2 := pg_temp.mkagent('Agen Dua');
  _ag3 := pg_temp.mkagent('Agen Tiga');
  SELECT user_id INTO _agu FROM public.agents WHERE id = _ag1;

  -- ===================================================================================================================
  -- 1. ADM-102: money columns of agents
  -- ===================================================================================================================
  FOR _r IN SELECT unnest(ARRAY['available_balance', 'total_commission', 'total_sales']) LOOP
    -- agent_admin and the owner are refused, in all three columns
    IF pg_temp.run_as(_AG, format('UPDATE public.agents SET %I = %I + 1 WHERE id = %L', _r, _r, _ag1)) LIKE '42501%' THEN
      _out := _out || format(E'PASS ADM-102: agent_admin cannot write agents.%s through the API\n', _r);
    ELSE _out := _out || format(E'FAIL ADM-102: agent_admin could write agents.%s\n', _r); END IF;
    IF pg_temp.run_as(_SA, format('UPDATE public.agents SET %I = %I + 1 WHERE id = %L', _r, _r, _ag1)) LIKE '42501%' THEN
      _out := _out || format(E'PASS ADM-102: owner cannot write agents.%s through the API\n', _r);
    ELSE _out := _out || format(E'FAIL ADM-102: owner could write agents.%s\n', _r); END IF;
    IF pg_temp.run_as(_agu, format('UPDATE public.agents SET %I = %I + 1 WHERE id = %L', _r, _r, _ag1)) LIKE '42501%' THEN
      _out := _out || format(E'PASS ADM-102: an agent cannot write its own agents.%s\n', _r);
    ELSE _out := _out || format(E'FAIL ADM-102: an agent could write its own agents.%s\n', _r); END IF;
  END LOOP;
  -- the same value (no change) is fine: a form that sends the whole row back must not break
  IF pg_temp.touch_as(_AG, format('UPDATE public.agents SET available_balance = available_balance, name = name WHERE id = %L', _ag1)) = 1 THEN
    _out := _out || E'PASS ADM-102: agent_admin can send an unchanged balance together with other fields\n';
  ELSE _out := _out || E'FAIL ADM-102: an unchanged balance in an UPDATE is refused\n'; END IF;
  -- INSERT with money by staff is refused; a plain insert still works
  IF pg_temp.run_as(_AG, format('INSERT INTO public.agents (user_id, name, email, phone, available_balance) VALUES (%L, ''X'', ''x@example.invalid'', ''6281200000001'', 5000)', _AG)) LIKE '42501%' THEN
    _out := _out || E'PASS ADM-102: agent_admin cannot insert an agent with a balance\n';
  ELSE _out := _out || E'FAIL ADM-102: agent_admin inserted an agent with a balance\n'; END IF;
  -- the other direction: staff keep status, level and profile fields
  IF pg_temp.touch_as(_AG, format('UPDATE public.agents SET status = ''suspended'' WHERE id = %L', _ag1)) = 1
     AND pg_temp.touch_as(_AG, format('UPDATE public.agents SET status = ''active'' WHERE id = %L', _ag1)) = 1 THEN
    _out := _out || E'PASS ADM-102: agent_admin still approves and suspends (status)\n';
  ELSE _out := _out || E'FAIL ADM-102: agent_admin lost the status change\n'; END IF;
  IF pg_temp.touch_as(_AG, format('UPDATE public.agents SET level = ''gold'' WHERE id = %L', _ag1)) = 1
     AND pg_temp.touch_as(_SA, format('UPDATE public.agents SET level = ''platinum'', name = ''Agen Satu B'' WHERE id = %L', _ag1)) = 1 THEN
    _out := _out || E'PASS ADM-102: staff still change level and profile fields\n';
  ELSE _out := _out || E'FAIL ADM-102: staff lost level or profile edits\n'; END IF;
  IF pg_temp.run_as(_agu, format('UPDATE public.agents SET level = ''gold'' WHERE id = %L', _ag1)) LIKE '42501%' THEN
    _out := _out || E'PASS ADM-102: an agent still cannot change its own status or level\n';
  ELSE _out := _out || E'FAIL ADM-102: an agent changed its own status or level\n'; END IF;
  -- the functions that DO move money still work (they run as the function owner)
  PERFORM pg_temp.act_as(_SA);
  BEGIN
    PERFORM public.log_agent_sale(_ag2, 'Budi', '6281200000002', NULL, 'Paket Uji', 30000000, 1500000, NULL, 'confirmed', 'adm14');
    RESET ROLE;
    SELECT available_balance, total_commission, total_sales INTO _bal, _n, _m FROM public.agents WHERE id = _ag2;
    IF _bal = 1500000 AND _n = 1500000 AND _m = 1 THEN
      _out := _out || E'PASS ADM-102: log_agent_sale still moves balance, total commission and total sales\n';
    ELSE _out := _out || format(E'FAIL ADM-102: log_agent_sale left balance=%s commission=%s sales=%s (expected 1500000, 1500000, 1)\n', _bal, _n, _m); END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'FAIL ADM-102: log_agent_sale failed: %s\n', SQLERRM);
  END;
  RESET ROLE;
  -- the owner of the transaction (function owner / migrations) still writes the columns: SECURITY DEFINER paths rely on it
  UPDATE public.agents SET available_balance = 123 WHERE id = _ag3;
  SELECT available_balance INTO _bal FROM public.agents WHERE id = _ag3;
  IF _bal = 123 THEN _out := _out || E'PASS ADM-102: the function owner (not anon/authenticated) can still write the balance\n';
  ELSE _out := _out || E'FAIL ADM-102: the function owner cannot write the balance\n'; END IF;

  -- ===================================================================================================================
  -- 2. ADM-103: agents with history cannot be deleted
  -- ===================================================================================================================
  -- _ag2 has a sale (log_agent_sale above)
  _r := pg_temp.run_as(_AG, format('DELETE FROM public.agents WHERE id = %L', _ag2));
  IF _r LIKE '%riwayat komisi atau lead%' THEN _out := _out || E'PASS ADM-103: deleting an agent with a sale is blocked with the friendly message (agent_admin)\n';
  ELSE _out := _out || format(E'FAIL ADM-103: delete of an agent with a sale gave [%s]\n', _r); END IF;
  _r := pg_temp.run_as(_SA, format('DELETE FROM public.agents WHERE id = %L', _ag2));
  IF _r LIKE '%riwayat komisi atau lead%' THEN _out := _out || E'PASS ADM-103: ... and for the owner\n';
  ELSE _out := _out || format(E'FAIL ADM-103: owner delete of an agent with a sale gave [%s]\n', _r); END IF;
  SELECT count(*) INTO _n FROM public.agent_sales WHERE agent_id = _ag2;
  IF _n = 1 THEN _out := _out || E'PASS ADM-103: the sale history is still there\n'; ELSE _out := _out || E'FAIL ADM-103: sale history lost\n'; END IF;
  -- other history kinds
  INSERT INTO public.agent_withdrawals (agent_id, amount, bank_name, bank_account, account_name) VALUES (_ag3, 1000, 'b', '1', 'n');
  _r := pg_temp.run_as(_SA, format('DELETE FROM public.agents WHERE id = %L', _ag3));
  IF _r LIKE '%riwayat komisi atau lead%' THEN _out := _out || E'PASS ADM-103: a withdrawal blocks the delete too\n';
  ELSE _out := _out || format(E'FAIL ADM-103: delete with a withdrawal gave [%s]\n', _r); END IF;
  DELETE FROM public.agent_withdrawals WHERE agent_id = _ag3;
  BEGIN
    INSERT INTO public.agent_leads (agent_id, name, whatsapp) VALUES (_ag3, 'Lead Uji', '6281234500001');
    _r := pg_temp.run_as(_SA, format('DELETE FROM public.agents WHERE id = %L', _ag3));
    IF _r LIKE '%riwayat komisi atau lead%' THEN _out := _out || E'PASS ADM-103: a lead blocks the delete too\n';
    ELSE _out := _out || format(E'FAIL ADM-103: delete with a lead gave [%s]\n', _r); END IF;
    DELETE FROM public.agent_leads WHERE agent_id = _ag3;
  EXCEPTION WHEN OTHERS THEN _out := _out || format(E'SKIP ADM-103: could not plant a lead (%s)\n', SQLERRM); END;
  BEGIN
    INSERT INTO public.agent_commission_adjustments (agent_id, amount, reason) VALUES (_ag3, 1000, 'uji');
    _r := pg_temp.run_as(_SA, format('DELETE FROM public.agents WHERE id = %L', _ag3));
    IF _r LIKE '%riwayat komisi atau lead%' THEN _out := _out || E'PASS ADM-103: an adjustment blocks the delete too\n';
    ELSE _out := _out || format(E'FAIL ADM-103: delete with an adjustment gave [%s]\n', _r); END IF;
    DELETE FROM public.agent_commission_adjustments WHERE agent_id = _ag3;
  EXCEPTION WHEN OTHERS THEN _out := _out || format(E'SKIP ADM-103: could not plant an adjustment (%s)\n', SQLERRM); END;
  -- an agent without history can still be deleted
  IF pg_temp.touch_as(_SA, format('DELETE FROM public.agents WHERE id = %L', _ag3)) = 1 THEN
    _out := _out || E'PASS ADM-103: an agent without any history can still be deleted\n';
  ELSE _out := _out || E'FAIL ADM-103: an agent without history could not be deleted\n'; END IF;
  -- foreign keys of the money history tables no longer cascade
  SELECT count(*) INTO _n FROM pg_constraint WHERE confrelid = 'public.agents'::regclass AND contype = 'f' AND confdeltype = 'c'
     AND conrelid IN ('public.agent_sales'::regclass, 'public.agent_withdrawals'::regclass, 'public.agent_commission_adjustments'::regclass, 'public.commission_payouts'::regclass);
  IF _n = 0 THEN _out := _out || E'PASS ADM-103: agent_sales, agent_withdrawals, agent_commission_adjustments and commission_payouts do not cascade from agents\n';
  ELSE _out := _out || format(E'FAIL ADM-103: %s money history foreign keys still cascade\n', _n); END IF;


  -- ===================================================================================================================
  -- 3. ADM-109 has_role (stays executable by anon, on purpose) and ADM-110 agent_levels
  -- ===================================================================================================================
  IF has_function_privilege('anon', 'public.has_role(uuid, public.app_role)', 'EXECUTE') THEN
    _out := _out || E'PASS ADM-109: has_role stays executable by anon (policies TO public call it while anon reads)\n';
  ELSE _out := _out || E'FAIL ADM-109: has_role was revoked from anon, which breaks anonymous reads of every table whose policy TO public calls it\n'; END IF;
  IF pg_temp.rows_as(NULL, 'SELECT id FROM public.packages') >= 0 AND pg_temp.rows_as(NULL, 'SELECT id FROM public.hotels') >= 0 THEN
    _out := _out || E'PASS ADM-109: anon can still read packages and hotels (policies that call has_role evaluate for anon)\n';
  ELSE _out := _out || E'FAIL ADM-109: anon reads of packages or hotels are refused\n'; END IF;
  IF NOT public.has_role(NULL, 'admin'::app_role) AND NOT public.has_role(gen_random_uuid(), 'superadmin'::app_role) THEN
    _out := _out || E'PASS ADM-109: has_role is false for a null or unknown user\n';
  ELSE _out := _out || E'FAIL ADM-109: has_role is true for a null or unknown user\n'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'agent_levels' AND column_name IN ('commission_rate_min', 'commission_rate_max')) THEN
    _out := _out || E'PASS ADM-110: agent_levels no longer carries the old percentage commission columns\n';
  ELSE _out := _out || E'FAIL ADM-110: agent_levels still has commission_rate_min/max\n'; END IF;
  IF pg_temp.rows_as(NULL, 'SELECT * FROM public.agent_levels') > 0 THEN _out := _out || E'PASS ADM-110: agent_levels stays readable by anon (levels and thresholds are public)\n';
  ELSE _out := _out || E'FAIL ADM-110: agent_levels is not readable by anon\n'; END IF;

  -- ===================================================================================================================
  -- 4. ADM-105 cogs_defaults
  -- ===================================================================================================================
  IF NOT EXISTS (SELECT 1 FROM public.cogs_defaults) THEN
    BEGIN INSERT INTO public.cogs_defaults DEFAULT VALUES; EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.cogs_defaults) THEN _out := _out || E'SKIP ADM-105: cogs_defaults is empty and could not be planted\n';
  ELSE
    _pass := '';
    FOR _t IN SELECT * FROM (VALUES ('product_admin', _PA, true), ('superadmin', _SA, true), ('admin', _AD, true), ('content_admin', _CA, false), ('agent_admin', _AG, false),
                                    ('advertiser', _AV, false), ('sales', _SL, false), ('cs_admin', _CS, false), ('none', _NO, false), ('agent', _agu, false)) AS x(label, uid, can) LOOP
      _n := pg_temp.rows_as(_t.uid, 'SELECT * FROM public.cogs_defaults');
      IF (_t.can AND _n >= 1) OR (NOT _t.can AND _n = 0) THEN _out := _out || format(E'PASS ADM-105: cogs_defaults read by %s -> %s rows (%s)\n', _t.label, _n, CASE WHEN _t.can THEN 'allowed' ELSE 'hidden' END);
      ELSE _out := _out || format(E'FAIL ADM-105: cogs_defaults read by %s -> %s rows (should be %s)\n', _t.label, _n, CASE WHEN _t.can THEN 'visible' ELSE 'hidden' END); END IF;
    END LOOP;
    IF pg_temp.touch_as(_PA, 'UPDATE public.cogs_defaults SET data = data') >= 1 THEN _out := _out || E'PASS ADM-105: product_admin still saves cogs_defaults\n';
    ELSE _out := _out || E'FAIL ADM-105: product_admin cannot save cogs_defaults\n'; END IF;
  END IF;

  -- ===================================================================================================================
  -- 5. ADM-115 notifications by type for agent_admin
  -- ===================================================================================================================
  INSERT INTO public.admin_notifications (title, message, type) VALUES
    ('adm14 jamaah', 'Nama Jamaah Rahasia', 'jamaah_intake'),
    ('adm14 agen', 'Agen baru', 'agent_registration'),
    ('adm14 tarik', 'Penarikan', 'agent_withdrawal'),
    ('adm14 komisi', 'Komisi layak', 'commission_eligible'),
    ('adm14 sengketa', 'Sengketa', 'lead_conflict');
  _n := pg_temp.rows_as(_AG, $q$SELECT 1 FROM public.admin_notifications WHERE title LIKE 'adm14 %'$q$);
  IF _n = 4 AND pg_temp.rows_as(_AG, $q$SELECT 1 FROM public.admin_notifications WHERE title = 'adm14 jamaah'$q$) = 0 THEN
    _out := _out || E'PASS ADM-115: agent_admin sees the 4 agent/commission notifications and not the jamaah_intake one\n';
  ELSE _out := _out || format(E'FAIL ADM-115: agent_admin sees %s of the 4 agent notifications (jamaah one hidden: %s)\n', _n, pg_temp.rows_as(_AG, $q$SELECT 1 FROM public.admin_notifications WHERE title = 'adm14 jamaah'$q$) = 0); END IF;
  IF pg_temp.touch_as(_AG, $q$UPDATE public.admin_notifications SET is_read = true WHERE title = 'adm14 jamaah'$q$) <= 0
     AND pg_temp.touch_as(_AG, $q$UPDATE public.admin_notifications SET is_read = true WHERE title = 'adm14 agen'$q$) = 1 THEN
    _out := _out || E'PASS ADM-115: agent_admin can mark agent notifications read but not the jamaah one\n';
  ELSE _out := _out || E'FAIL ADM-115: agent_admin update rights on notifications are wrong\n'; END IF;
  IF pg_temp.rows_as(_CS, $q$SELECT 1 FROM public.admin_notifications WHERE title LIKE 'adm14 %'$q$) = 5
     AND pg_temp.rows_as(_AD, $q$SELECT 1 FROM public.admin_notifications WHERE title LIKE 'adm14 %'$q$) = 5 THEN
    _out := _out || E'PASS ADM-115: cs_admin and owner still see all 5 notifications\n';
  ELSE _out := _out || E'FAIL ADM-115: cs_admin or owner lost notifications\n'; END IF;
  IF pg_temp.rows_as(_PA, $q$SELECT 1 FROM public.admin_notifications WHERE title LIKE 'adm14 %'$q$) = 0 AND pg_temp.rows_as(_SL, $q$SELECT 1 FROM public.admin_notifications WHERE title LIKE 'adm14 %'$q$) = 0 THEN
    _out := _out || E'PASS ADM-115: product_admin and sales see no admin notifications\n';
  ELSE _out := _out || E'FAIL ADM-115: product_admin or sales can read admin notifications\n'; END IF;

  -- ===================================================================================================================
  -- 6. ADM-031/032/033 menu promises
  -- ===================================================================================================================
  BEGIN INSERT INTO public.umroh_calculator_leads (name, whatsapp, monthly_saving, status, utm_campaign) VALUES ('Lead Uji', '628111222333', 1000000, 'CLOSED', 'adm14-camp'); EXCEPTION WHEN OTHERS THEN _out := _out || format(E'SKIP ADM-033: could not plant a calculator lead (%s)\n', SQLERRM); END;
  IF pg_temp.rows_as(_PA, 'SELECT 1 FROM public.umroh_calculator_leads') = 0 THEN _out := _out || E'PASS ADM-031: product_admin reads no calculator leads (decision: menu item removed for that role)\n';
  ELSE _out := _out || E'FAIL ADM-031: product_admin can read calculator leads\n'; END IF;
  IF pg_temp.rows_as(_SL, 'SELECT 1 FROM public.umroh_calculator_leads') >= 1 THEN _out := _out || E'PASS ADM-031: sales still reads calculator leads\n';
  ELSE _out := _out || E'FAIL ADM-031: sales lost the calculator leads\n'; END IF;
  IF pg_temp.rows_as(_AV, 'SELECT 1 FROM public.umroh_calculator_leads') = 0 THEN _out := _out || E'PASS ADM-033: advertiser still cannot read calculator lead rows (names, numbers)\n';
  ELSE _out := _out || E'FAIL ADM-033: advertiser can read calculator lead rows\n'; END IF;
  IF pg_temp.rows_as(_AV, $q$SELECT * FROM public.ad_spend_closed_calculator_counts() WHERE utm_campaign = 'adm14-camp' AND closed_count = 1$q$) = 1
     AND pg_temp.rows_as(_AD, 'SELECT * FROM public.ad_spend_closed_calculator_counts()') >= 1 THEN
    _out := _out || E'PASS ADM-033: advertiser and owner get closed lead counts per campaign (counts only)\n';
  ELSE _out := _out || E'FAIL ADM-033: ad_spend_closed_calculator_counts does not give the counts to advertiser and owner\n'; END IF;
  FOR _t IN SELECT * FROM (VALUES ('product_admin', _PA), ('sales', _SL), ('cs_admin', _CS), ('content_admin', _CA), ('agent_admin', _AG), ('none', _NO), ('anon', NULL::uuid)) AS x(label, uid) LOOP
    IF pg_temp.run_as(_t.uid, 'SELECT * FROM public.ad_spend_closed_calculator_counts()') LIKE ANY (ARRAY['42501%', '42883%']) THEN _out := _out || format(E'PASS ADM-033: ad_spend_closed_calculator_counts refused to %s\n', _t.label);
    ELSE _out := _out || format(E'FAIL ADM-033: ad_spend_closed_calculator_counts callable by %s\n', _t.label); END IF;
  END LOOP;
  IF pg_temp.touch_as(_CA, $q$INSERT INTO public.redirects (from_path, to_path) VALUES ('/adm14-a', '/adm14-b')$q$) = 1
     AND pg_temp.touch_as(_CA, $q$UPDATE public.redirects SET to_path = '/adm14-c' WHERE from_path = '/adm14-a'$q$) = 1
     AND pg_temp.touch_as(_CA, $q$DELETE FROM public.redirects WHERE from_path = '/adm14-a'$q$) = 1 THEN
    _out := _out || E'PASS ADM-032: content_admin creates, edits and deletes redirects (SEO page Redirect tab)\n';
  ELSE _out := _out || E'FAIL ADM-032: content_admin cannot manage redirects\n'; END IF;
  FOR _t IN SELECT * FROM (VALUES ('product_admin', _PA), ('sales', _SL), ('agent_admin', _AG), ('advertiser', _AV), ('cs_admin', _CS), ('none', _NO)) AS x(label, uid) LOOP
    IF pg_temp.touch_as(_t.uid, $q$INSERT INTO public.redirects (from_path, to_path) VALUES ('/adm14-x', '/adm14-y')$q$) = -1 THEN _out := _out || format(E'PASS ADM-032: %s cannot write redirects\n', _t.label);
    ELSE _out := _out || format(E'FAIL ADM-032: %s can write redirects\n', _t.label); END IF;
  END LOOP;

  -- ===================================================================================================================
  -- 7. ADM-014 intake: "DP and manifest message sent"
  -- ===================================================================================================================
  SELECT id INTO _pkg FROM public.packages LIMIT 1;
  IF _pkg IS NULL THEN _out := _out || E'SKIP ADM-014: no package to plant an intake on\n';
  ELSE
    INSERT INTO public.jamaah_intakes (code, package_id, contact_name, contact_phone, consent_at, consent_version, status)
    VALUES ('ADM14A', _pkg, 'Pendaftar Uji', '6281200099001', now(), 'v1', 'accepted') RETURNING id INTO _int_ok;
    INSERT INTO public.jamaah_intakes (code, package_id, contact_name, contact_phone, consent_at, consent_version, status)
    VALUES ('ADM14B', _pkg, 'Pendaftar Baru', '6281200099002', now(), 'v1', 'new') RETURNING id INTO _int_new;
    IF (SELECT info_sent_at FROM public.jamaah_intakes WHERE id = _int_ok) IS NULL THEN _out := _out || E'PASS ADM-014: a fresh accepted intake has no sent record\n';
    ELSE _out := _out || E'FAIL ADM-014: a fresh intake already has info_sent_at\n'; END IF;
    _r := pg_temp.run_as(_CS, format('SELECT public.mark_intake_info_sent(%L)', _int_ok));
    IF _r = 'OK' AND (SELECT info_sent_by FROM public.jamaah_intakes WHERE id = _int_ok) = _CS
       AND (SELECT info_sent_at FROM public.jamaah_intakes WHERE id = _int_ok) IS NOT NULL THEN
      _out := _out || E'PASS ADM-014: cs_admin marks the message as sent (time and person stored)\n';
    ELSE _out := _out || format(E'FAIL ADM-014: cs_admin could not mark the message as sent: %s\n', _r); END IF;
    _r := pg_temp.run_as(_SA, format('SELECT public.mark_intake_info_sent(%L)', _int_ok));
    IF _r = 'OK' AND (SELECT info_sent_by FROM public.jamaah_intakes WHERE id = _int_ok) = _SA THEN
      _out := _out || E'PASS ADM-014: the owner can resend (record moves to the owner)\n';
    ELSE _out := _out || format(E'FAIL ADM-014: resend by the owner failed: %s\n', _r); END IF;
    IF pg_temp.run_as(_CS, format('SELECT public.mark_intake_info_sent(%L)', _int_new)) LIKE '%belum diterima%' THEN _out := _out || E'PASS ADM-014: an intake that is not accepted cannot be marked\n';
    ELSE _out := _out || E'FAIL ADM-014: a new intake could be marked as sent\n'; END IF;
    FOR _t IN SELECT * FROM (VALUES ('product_admin', _PA), ('sales', _SL), ('agent_admin', _AG), ('advertiser', _AV), ('none', _NO), ('agent', _agu), ('anon', NULL::uuid)) AS x(label, uid) LOOP
      IF pg_temp.run_as(_t.uid, format('SELECT public.mark_intake_info_sent(%L)', _int_ok)) LIKE ANY (ARRAY['42501%', '42883%']) THEN _out := _out || format(E'PASS ADM-014: %s cannot mark the message as sent\n', _t.label);
      ELSE _out := _out || format(E'FAIL ADM-014: %s can call mark_intake_info_sent\n', _t.label); END IF;
    END LOOP;
    IF pg_temp.run_as(_CS, format('UPDATE public.jamaah_intakes SET info_sent_at = now() WHERE id = %L', _int_new)) LIKE '42501%'
       AND pg_temp.run_as(_SA, format('UPDATE public.jamaah_intakes SET info_sent_by = %L WHERE id = %L', _CS, _int_ok)) LIKE '42501%' THEN
      _out := _out || E'PASS ADM-014: the sent record cannot be written directly through the API (only via the button)\n';
    ELSE _out := _out || E'FAIL ADM-014: info_sent_at/by writable directly through the API\n'; END IF;
    IF pg_temp.touch_as(_CS, format('UPDATE public.jamaah_intakes SET notes = ''x'' WHERE id = %L', _int_ok)) = 1 THEN _out := _out || E'PASS ADM-014: other intake updates by cs_admin still work\n';
    ELSE _out := _out || E'FAIL ADM-014: cs_admin lost intake updates\n'; END IF;
  END IF;


  -- ===================================================================================================================
  -- 8. ADM-021 / ADM-011: admin_work_counts
  -- ===================================================================================================================
  UPDATE public.agents SET status = 'pending' WHERE id = _ag1;
  DECLARE _j jsonb; _fin uuid;
  BEGIN
    BEGIN _fin := pg_temp.mkuser('finance'); EXCEPTION WHEN OTHERS THEN _fin := NULL; END;
    PERFORM pg_temp.act_as(_SA);
    _j := public.admin_work_counts();
    RESET ROLE;
    IF (_j ->> 'intakes_new')::bigint = (SELECT count(*) FROM public.jamaah_intakes WHERE status = 'new') AND (_j ->> 'intakes_new')::bigint >= 1
       AND (_j -> 'payments_pending' ->> 'count')::bigint = (SELECT count(*) FROM public.jamaah_payments WHERE status = 'pending')
       AND (_j ->> 'agents_pending')::bigint = (SELECT count(*) FROM public.agents WHERE status = 'pending') AND (_j ->> 'agents_pending')::bigint >= 1
       AND (_j ->> 'commission_eligible')::bigint = (SELECT count(*) FROM public.agent_sales WHERE status = 'confirmed' AND commission_state = 'eligible')
       AND (_j ->> 'disputes_open')::bigint = (SELECT count(*) FROM public.lead_disputes WHERE status = 'open') THEN
      _out := _out || E'PASS ADM-021: the owner counts match the tables (new intakes, pending payments, pending agents, eligible commissions, open disputes)\n';
    ELSE _out := _out || format(E'FAIL ADM-021: owner counts differ from the tables: %s\n', _j); END IF;
    IF _j ? 'belum_dp' AND _j ? 'lunas_due' AND _j ? 'lunas_overdue' AND _j ? 'seats_low' AND (_j -> 'lunas_due') ? 'amount' THEN
      _out := _out || E'PASS ADM-011: the owner also gets belum_dp, lunas_due (count + amount), lunas_overdue and seats_low\n';
    ELSE _out := _out || format(E'FAIL ADM-011: owner counts miss a dashboard key: %s\n', _j); END IF;
    -- seats_low equals an independent count
    SELECT count(*) INTO _n FROM public.packages pk
     WHERE pk.status = 'published' AND pk.departure_date >= (now() AT TIME ZONE 'Asia/Jakarta')::date AND pk.slots_total IS NOT NULL
       AND pk.slots_total - CASE WHEN pk.seat_source = 'website' THEN coalesce(pk.slots_registered, 0) ELSE coalesce(pk.slots_filled, 0) END BETWEEN 0 AND 3;
    IF (_j ->> 'seats_low')::bigint = _n THEN _out := _out || format(E'PASS ADM-011: seats_low = %s published departures with 0 to 3 seats left\n', _n);
    ELSE _out := _out || format(E'FAIL ADM-011: seats_low %s vs %s\n', _j ->> 'seats_low', _n); END IF;

    PERFORM pg_temp.act_as(_CS); _j := public.admin_work_counts(); RESET ROLE;
    IF _j ? 'intakes_new' AND _j ? 'payments_pending' AND _j ? 'belum_dp' AND _j ? 'disputes_open' AND NOT (_j ? 'commission_eligible') AND NOT (_j ? 'agents_pending') AND NOT (_j ? 'seats_low') THEN
      _out := _out || E'PASS ADM-021: cs_admin gets the jamaah and payment queues, not commissions, agents or seats\n';
    ELSE _out := _out || format(E'FAIL ADM-021: cs_admin keys wrong: %s\n', _j); END IF;
    PERFORM pg_temp.act_as(_AG); _j := public.admin_work_counts(); RESET ROLE;
    IF _j ? 'commission_eligible' AND _j ? 'agents_pending' AND _j ? 'disputes_open' AND NOT (_j ? 'payments_pending') AND NOT (_j ? 'intakes_new') AND NOT (_j ? 'belum_dp') THEN
      _out := _out || E'PASS ADM-021: agent_admin gets commissions, agents and disputes only (no jamaah numbers)\n';
    ELSE _out := _out || format(E'FAIL ADM-021: agent_admin keys wrong: %s\n', _j); END IF;
    PERFORM pg_temp.act_as(_PA); _j := public.admin_work_counts(); RESET ROLE;
    IF _j ? 'seats_low' AND (SELECT count(*) FROM jsonb_object_keys(_j)) = 1 THEN _out := _out || E'PASS ADM-021: product_admin gets only seats_low\n';
    ELSE _out := _out || format(E'FAIL ADM-021: product_admin keys wrong: %s\n', _j); END IF;
    IF _fin IS NULL THEN _out := _out || E'SKIP ADM-021: no finance role user could be planted\n';
    ELSE
      PERFORM pg_temp.act_as(_fin); _j := public.admin_work_counts(); RESET ROLE;
      IF _j ? 'payments_pending' AND _j ? 'commission_eligible' AND NOT (_j ? 'intakes_new') AND NOT (_j ? 'agents_pending') THEN _out := _out || E'PASS ADM-021: finance gets payments and commissions only\n';
      ELSE _out := _out || format(E'FAIL ADM-021: finance keys wrong: %s\n', _j); END IF;
    END IF;
  END;
  FOR _t IN SELECT * FROM (VALUES ('sales', _SL), ('advertiser', _AV), ('content_admin', _CA), ('none', _NO), ('agent', _agu), ('anon', NULL::uuid)) AS x(label, uid) LOOP
    IF pg_temp.run_as(_t.uid, 'SELECT public.admin_work_counts()') LIKE ANY (ARRAY['42501%', '42883%']) THEN _out := _out || format(E'PASS ADM-021: admin_work_counts refused to %s\n', _t.label);
    ELSE _out := _out || format(E'FAIL ADM-021: admin_work_counts callable by %s\n', _t.label); END IF;
  END LOOP;


  -- ===================================================================================================================
  -- 9. ADM-106: commission rate history
  -- ===================================================================================================================
  SELECT id INTO _pkg FROM public.packages LIMIT 1;
  IF _pkg IS NULL THEN _out := _out || E'SKIP ADM-106: no package\n';
  ELSE
    _r := pg_temp.run_as(_AG, format('SELECT public.set_commission_rate(%L, ''adm14tier'', ''silver'', 3000000)', _pkg));
    IF _r = 'OK' AND (SELECT count(*) FROM public.agent_commission_rate_log WHERE package_id = _pkg AND tier = 'adm14tier' AND old_amount IS NULL AND new_amount = 3000000 AND changed_by = _AG) = 1 THEN
      _out := _out || E'PASS ADM-106: first rate is logged (old empty, new 3.000.000, by agent_admin)\n';
    ELSE _out := _out || format(E'FAIL ADM-106: first rate not logged: %s\n', _r); END IF;
    PERFORM pg_temp.run_as(_SA, format('SELECT public.set_commission_rate(%L, ''adm14tier'', ''silver'', 4000000)', _pkg));
    IF (SELECT count(*) FROM public.agent_commission_rate_log WHERE package_id = _pkg AND tier = 'adm14tier' AND old_amount = 3000000 AND new_amount = 4000000 AND changed_by = _SA) = 1 THEN
      _out := _out || E'PASS ADM-106: a change is logged with old and new amount and the owner as author\n';
    ELSE _out := _out || E'FAIL ADM-106: change not logged\n'; END IF;
    PERFORM pg_temp.run_as(_SA, format('SELECT public.set_commission_rate(%L, ''adm14tier'', ''silver'', 4000000)', _pkg));
    IF (SELECT count(*) FROM public.agent_commission_rate_log WHERE package_id = _pkg AND tier = 'adm14tier') = 2 THEN _out := _out || E'PASS ADM-106: saving the same amount again adds no log row\n';
    ELSE _out := _out || E'FAIL ADM-106: unchanged save was logged\n'; END IF;
    PERFORM pg_temp.run_as(_AG, format('SELECT public.clear_commission_rate(%L, ''adm14tier'', ''silver'')', _pkg));
    IF (SELECT count(*) FROM public.agent_commission_rate_log WHERE package_id = _pkg AND tier = 'adm14tier' AND old_amount = 4000000 AND new_amount IS NULL) = 1
       AND NOT EXISTS (SELECT 1 FROM public.agent_commission_rates WHERE package_id = _pkg AND tier = 'adm14tier') THEN
      _out := _out || E'PASS ADM-106: clearing a rate is logged (new amount empty) and the rate is gone\n';
    ELSE _out := _out || E'FAIL ADM-106: clear not logged\n'; END IF;
    PERFORM pg_temp.run_as(_AG, format('SELECT public.clear_commission_rate(%L, ''adm14tier'', ''gold'')', _pkg));
    IF (SELECT count(*) FROM public.agent_commission_rate_log WHERE package_id = _pkg AND tier = 'adm14tier') = 3 THEN _out := _out || E'PASS ADM-106: clearing a cell that was empty adds no log row\n';
    ELSE _out := _out || E'FAIL ADM-106: clearing an empty cell was logged\n'; END IF;
    IF pg_temp.rows_as(_AG, format('SELECT * FROM public.admin_commission_rate_history(%L)', _pkg)) = 3
       AND pg_temp.rows_as(_SA, format('SELECT * FROM public.admin_commission_rate_history(%L)', _pkg)) = 3
       AND pg_temp.rows_as(_CS, format('SELECT * FROM public.admin_commission_rate_history(%L)', _pkg)) = 3 THEN
      _out := _out || E'PASS ADM-106: agent_admin, owner and cs_admin read the history (3 rows)\n';
    ELSE _out := _out || E'FAIL ADM-106: history not readable by agent_admin, owner or cs_admin\n'; END IF;
    FOR _t IN SELECT * FROM (VALUES ('product_admin', _PA), ('sales', _SL), ('advertiser', _AV), ('none', _NO), ('agent', _agu), ('anon', NULL::uuid)) AS x(label, uid) LOOP
      IF pg_temp.run_as(_t.uid, format('SELECT * FROM public.admin_commission_rate_history(%L)', _pkg)) LIKE ANY (ARRAY['42501%', '42883%'])
         AND pg_temp.rows_as(_t.uid, 'SELECT * FROM public.agent_commission_rate_log') <= 0 THEN
        _out := _out || format(E'PASS ADM-106: %s cannot read the rate history\n', _t.label);
      ELSE _out := _out || format(E'FAIL ADM-106: %s can read the rate history\n', _t.label); END IF;
    END LOOP;
    IF pg_temp.run_as(_AG, format('INSERT INTO public.agent_commission_rate_log (package_id, tier, level, new_amount) VALUES (%L, ''x'', ''silver'', 1)', _pkg)) LIKE '42501%'
       AND pg_temp.run_as(_SA, 'DELETE FROM public.agent_commission_rate_log') LIKE '42501%'
       AND pg_temp.run_as(_SA, 'UPDATE public.agent_commission_rate_log SET new_amount = 1') LIKE '42501%' THEN
      _out := _out || E'PASS ADM-106: the rate log cannot be written, edited or deleted through the API (append-only from the functions)\n';
    ELSE _out := _out || E'FAIL ADM-106: the rate log is writable through the API\n'; END IF;
    IF pg_temp.run_as(_PA, format('SELECT public.set_commission_rate(%L, ''adm14tier'', ''silver'', 1)', _pkg)) LIKE '42501%' THEN _out := _out || E'PASS ADM-106: product_admin still cannot set a rate\n';
    ELSE _out := _out || E'FAIL ADM-106: product_admin can set a rate\n'; END IF;
  END IF;


  -- ===================================================================================================================
  -- 11. ADM-117: gates of the new authenticated-callable functions (who must be refused)
  -- ===================================================================================================================
  FOR _f IN SELECT * FROM (VALUES
      ('admin_work_counts', 'SELECT public.admin_work_counts()', 'sales,advertiser,content_admin,none,agent,anon'),
      ('mark_intake_info_sent', 'SELECT public.mark_intake_info_sent(gen_random_uuid())', 'product_admin,sales,advertiser,content_admin,agent_admin,none,agent,anon'),
      ('ad_spend_closed_calculator_counts', 'SELECT * FROM public.ad_spend_closed_calculator_counts()', 'product_admin,sales,cs_admin,content_admin,agent_admin,none,agent,anon'),
      ('admin_commission_rate_history', 'SELECT * FROM public.admin_commission_rate_history(gen_random_uuid())', 'product_admin,sales,advertiser,content_admin,none,agent,anon'),
      ('admin_list_commissions', 'SELECT * FROM public.admin_list_commissions()', 'product_admin,sales,advertiser,content_admin,cs_admin,none,agent,anon'),
      ('admin_list_commission_adjustments', 'SELECT * FROM public.admin_list_commission_adjustments()', 'product_admin,sales,advertiser,content_admin,cs_admin,none,agent,anon'),
      ('admin_list_lead_disputes', 'SELECT * FROM public.admin_list_lead_disputes()', 'product_admin,sales,advertiser,content_admin,none,agent,anon'),
      ('approve_commissions', $q$SELECT public.approve_commissions(ARRAY[gen_random_uuid()], 'manajemen')$q$, 'product_admin,sales,advertiser,content_admin,cs_admin,agent_admin,none,agent,anon'),
      ('mark_agent_commissions_paid', $q$SELECT public.mark_agent_commissions_paid(gen_random_uuid(), ARRAY[gen_random_uuid()], current_date, 'x', 'y', gen_random_uuid())$q$, 'product_admin,sales,advertiser,content_admin,cs_admin,none,agent,anon'),
      ('resolve_lead_dispute', 'SELECT public.resolve_lead_dispute(gen_random_uuid(), gen_random_uuid(), NULL, NULL)', 'product_admin,sales,advertiser,content_admin,cs_admin,none,agent,anon'),
      ('commission_is_staff', 'SELECT public.commission_is_staff(gen_random_uuid())', 'anon'),
      ('commission_is_finance', 'SELECT public.commission_is_finance(gen_random_uuid())', 'anon'),
      ('commission_is_management', 'SELECT public.commission_is_management(gen_random_uuid())', 'anon'),
      ('commission_net', 'SELECT public.commission_net(1000000)', 'anon'),
      ('commission_nik_ok', $q$SELECT public.commission_nik_ok('1234567890123456')$q$, 'anon'),
      ('commission_today', 'SELECT public.commission_today()', 'anon')
    ) AS x(fn, stmt, refused) LOOP
    _bad := '';
    FOREACH _r IN ARRAY string_to_array(_f.refused, ',') LOOP
      _u := CASE _r WHEN 'product_admin' THEN _PA WHEN 'sales' THEN _SL WHEN 'advertiser' THEN _AV WHEN 'content_admin' THEN _CA WHEN 'cs_admin' THEN _CS
                    WHEN 'agent_admin' THEN _AG WHEN 'none' THEN _NO WHEN 'agent' THEN _agu ELSE NULL END;
      _res := pg_temp.run_as(_u, _f.stmt);
      -- refused = 42501/42883 or a permission message; the agent-only list functions simply return no rows for others
      IF NOT (_res LIKE '42501%' OR _res LIKE '42883%') THEN
        IF _f.fn IN ('list_my_commissions', 'list_my_commission_adjustments') AND _res = 'OK' THEN CONTINUE; END IF;
        _bad := _bad || _r || '[' || left(_res, 60) || '] ';
      END IF;
    END LOOP;
    IF _bad = '' THEN _out := _out || format(E'PASS ADM-117: %s refuses %s\n', _f.fn, _f.refused);
    ELSE _out := _out || format(E'FAIL ADM-117: %s let through: %s\n', _f.fn, _bad); END IF;
  END LOOP;
  -- the agent-only functions: an agent gets only their own (none planted -> zero rows); staff without an agent row get zero
  IF pg_temp.rows_as(_agu, 'SELECT * FROM public.list_my_commissions()') = 0 AND pg_temp.rows_as(_PA, 'SELECT * FROM public.list_my_commissions()') <= 0
     AND pg_temp.run_as(NULL, 'SELECT * FROM public.list_my_commissions()') LIKE ANY (ARRAY['42501%', '42883%']) THEN
    _out := _out || E'PASS ADM-117: list_my_commissions gives an agent only their own rows and is refused to anon\n';
  ELSE _out := _out || E'FAIL ADM-117: list_my_commissions gate is wrong\n'; END IF;
  IF pg_temp.run_as(NULL, 'SELECT * FROM public.list_my_commission_adjustments()') LIKE ANY (ARRAY['42501%', '42883%']) THEN _out := _out || E'PASS ADM-117: list_my_commission_adjustments is refused to anon\n';
  ELSE _out := _out || E'FAIL ADM-117: list_my_commission_adjustments callable by anon\n'; END IF;
  -- every function of this migration has a "who may call" comment
  SELECT string_agg(p.proname, ',') INTO _r FROM pg_proc p
   WHERE p.pronamespace = 'public'::regnamespace AND p.proname IN ('admin_work_counts', 'mark_intake_info_sent', 'ad_spend_closed_calculator_counts', 'admin_commission_rate_history',
     'admin_list_commissions', 'admin_list_commission_adjustments', 'admin_list_lead_disputes', 'approve_commissions', 'mark_agent_commissions_paid', 'resolve_lead_dispute',
     'list_my_commissions', 'list_my_commission_adjustments', 'commission_is_staff', 'commission_is_finance', 'commission_is_management', 'commission_net', 'commission_nik_ok', 'commission_today')
     AND obj_description(p.oid, 'pg_proc') IS NULL;
  IF _r IS NULL THEN _out := _out || E'PASS ADM-117: all 18 reviewed functions carry a "who may call" comment\n';
  ELSE _out := _out || format(E'FAIL ADM-117: functions without a comment: %s\n', _r); END IF;
  -- anon can still call only the three reviewed functions
  SELECT string_agg(proname, ',' ORDER BY proname) INTO _r FROM pg_proc p
   WHERE p.pronamespace = 'public'::regnamespace AND p.prokind = 'f' AND p.prorettype <> 'trigger'::regtype AND has_function_privilege('anon', p.oid, 'EXECUTE');
  IF _r = 'get_calculator_lead_by_token,has_role,redirect_agent_short_link' THEN _out := _out || E'PASS ADM-117: anon can still call only get_calculator_lead_by_token, has_role, redirect_agent_short_link\n';
  ELSE _out := _out || format(E'FAIL ADM-117: anon-callable functions changed: [%s]\n', _r); END IF;

  --RESULTS-MARKER-SECTION-1--
  RAISE EXCEPTION E'RESULTS\n%', _out;
END $$;
