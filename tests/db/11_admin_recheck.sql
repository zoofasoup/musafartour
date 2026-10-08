-- Admin re-audit (docs/audit/06-admin.md): the role matrix of the admin area against the LIVE database.
--
-- Runs against the live linked project, but only inside a transaction that always aborts (the final
-- RAISE EXCEPTION), so nothing is stored. Run with: ./scripts/run-db-tests.sh tests/db/11_admin_recheck.sql
--
-- Report lines start with PASS, FAIL, SKIP (prerequisite data missing) or KNOWN (a documented gap, finding ID in the
-- line). A KNOWN line turns into PASS the day the gap is closed; turn it into a plain assertion then.
--
-- Users for all ten roles (superadmin, admin, product_admin, product_contributor, content_admin, agent_admin,
-- advertiser, sales, cs_admin, none) are planted inside the transaction; production only has superadmin and
-- product_admin. Empty tables get one planted row so that update/delete/insert can be tried on them.
--
-- Sections
--   1. Table matrix: every public table x ten roles. Code per cell = Select Update Insert Delete.
--        S: r some/all rows visible, 0 none visible, X refused, - table empty   U/I/D: U I D allowed, 0 no row affected,
--        X refused (42501), u i d allowed but stopped by a constraint, E other error, ? could not be tried.
--      The snapshot is the CURRENT behaviour; any change is a FAIL until a human re-reads the policy and updates it.
--      agents: Insert and Delete show E since ADM-103: the harness deletes the sample row first, and an agent with commission history cannot be deleted (trigger, friendly P0001); 14_admin_hardening.sql tests the delete and insert rules.
--      '*' in the snapshot = depends on the row picked (payment status), not asserted.
--   2. Menu promises: what the menu shows each role against what the database lets that role do.
--   3. RPC gating: who may call each admin function (B = refused by the function, A = passes the gate).
--   4. Function inventory: every non-trigger function the API can reach. A new authenticated function = KNOWN ADM-117 (not reviewed
--      yet: read its role gate, then add it to the list here); a new anon function or a missing one = FAIL.
--   5. Anonymous reads. 6. Business rules of payments and registrations. 7. Storage policy signature.

BEGIN;

CREATE FUNCTION pg_temp.try_as(_uid uuid, _stmt text) RETURNS text LANGUAGE plpgsql AS $f$
DECLARE _rc integer; _res text;
BEGIN
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', _uid, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    EXECUTE _stmt;
    GET DIAGNOSTICS _rc = ROW_COUNT;
    RESET ROLE;
    _res := CASE WHEN _rc >= 1 THEN 'rows' ELSE 'norows' END;
    RAISE EXCEPTION 'done' USING ERRCODE = 'XX001';
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    IF SQLSTATE = '42501' THEN _res := 'refused';
    ELSIF SQLSTATE <> 'XX001' THEN _res := format('error %s', SQLSTATE);
    END IF;
  END;
  RETURN _res;
END $f$;

-- B = the function itself refused the caller (42501 or one of its own "not allowed" messages), A = the gate let the call through
-- (whatever happened after that, e.g. "not found" for a made-up id, does not matter).
CREATE FUNCTION pg_temp.gate(_uid uuid, _stmt text) RETURNS text LANGUAGE plpgsql AS $f$
DECLARE _res text := 'A';
BEGIN
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', _uid, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    EXECUTE _stmt;
    RESET ROLE;
    RAISE EXCEPTION 'done' USING ERRCODE = 'XX001';
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    IF SQLSTATE = 'XX001' THEN NULL;
    ELSIF SQLSTATE = '42501' OR SQLERRM ~* '^(not authorized|akun agen belum aktif|tidak berwenang|hanya tim|tidak punya akses)' THEN _res := 'B';
    END IF;
  END;
  RETURN _res;
END $f$;

-- Compares a function list with the reviewed one: missing = FAIL, extra = KNOWN ADM-117, same = PASS.
CREATE FUNCTION pg_temp.inv_line(_what text, _now text, _reviewed text) RETURNS text LANGUAGE plpgsql AS $f$
DECLARE _extra text; _gone text;
BEGIN
  SELECT string_agg(x, ',' ORDER BY x) INTO _extra FROM unnest(string_to_array(coalesce(_now, ''), ',')) x WHERE x <> '' AND x <> ALL (string_to_array(_reviewed, ','));
  SELECT string_agg(x, ',' ORDER BY x) INTO _gone FROM unnest(string_to_array(_reviewed, ',')) x WHERE x <> ALL (string_to_array(coalesce(_now, ''), ','));
  IF _gone IS NOT NULL THEN RETURN format(E'FAIL inventory: %s lost [%s]\n', _what, _gone); END IF;
  IF _extra IS NOT NULL THEN RETURN format(E'KNOWN ADM-117 inventory: %s: added since this review and not reviewed yet [%s]; check their role gates, then add them to the list in this test\n', _what, _extra); END IF;
  RETURN format(E'PASS inventory: %s are the reviewed ones\n', _what);
END $f$;

-- One cell of the matrix: Select, Update, Insert, Delete tried on one real row of the table.
CREATE FUNCTION pg_temp.mx_cell(_uid uuid, _tbl text, _total bigint, _ctid tid, _col text, _cols text) RETURNS text LANGUAGE plpgsql AS $f$
DECLARE _s text := '?'; _u text := '?'; _i text := '?'; _d text := '?'; _n bigint; _rc int;
BEGIN
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', _uid, 'role','authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    EXECUTE format('SELECT count(*) FROM public.%I', _tbl) INTO _n;
    RESET ROLE;
    _s := CASE WHEN _total = 0 THEN '-' WHEN _n > 0 THEN 'r' ELSE '0' END;
  EXCEPTION WHEN OTHERS THEN RESET ROLE; _s := CASE WHEN SQLSTATE = '42501' THEN 'X' ELSE 'E' END;
  END;
  IF _ctid IS NOT NULL AND _col IS NOT NULL THEN
    BEGIN
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _uid, 'role','authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      EXECUTE format('UPDATE public.%I SET %I = %I WHERE ctid = %L', _tbl, _col, _col, _ctid);
      GET DIAGNOSTICS _rc = ROW_COUNT;
      RESET ROLE;
      _u := CASE WHEN _rc >= 1 THEN 'U' ELSE '0' END;
      RAISE EXCEPTION 'done' USING ERRCODE = 'XX001';
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      IF SQLSTATE = 'XX001' THEN NULL; ELSIF SQLSTATE = '42501' THEN _u := 'X'; ELSIF SQLSTATE LIKE '23%' THEN _u := 'u'; ELSE _u := 'E'; END IF;
    END;
  END IF;
  IF _ctid IS NOT NULL THEN
    BEGIN
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _uid, 'role','authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      EXECUTE format('DELETE FROM public.%I WHERE ctid = %L', _tbl, _ctid);
      GET DIAGNOSTICS _rc = ROW_COUNT;
      RESET ROLE;
      _d := CASE WHEN _rc >= 1 THEN 'D' ELSE '0' END;
      RAISE EXCEPTION 'done' USING ERRCODE = 'XX001';
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      IF SQLSTATE = 'XX001' THEN NULL; ELSIF SQLSTATE = '42501' THEN _d := 'X'; ELSIF SQLSTATE LIKE '23%' THEN _d := 'd'; ELSE _d := 'E'; END IF;
    END;
  END IF;
  -- Insert: copy the row aside, delete the original as the owner of the transaction, put the copy back as the role.
  IF _ctid IS NOT NULL AND _cols IS NOT NULL THEN
    BEGIN
      EXECUTE format('CREATE TEMP TABLE _mxrow ON COMMIT DROP AS SELECT %s FROM public.%I WHERE ctid = %L', _cols, _tbl, _ctid);
      GRANT SELECT ON _mxrow TO authenticated;
      EXECUTE format('DELETE FROM public.%I WHERE ctid = %L', _tbl, _ctid);
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _uid, 'role','authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      EXECUTE format('INSERT INTO public.%I (%s) SELECT %s FROM _mxrow', _tbl, _cols, _cols);
      GET DIAGNOSTICS _rc = ROW_COUNT;
      RESET ROLE;
      _i := CASE WHEN _rc >= 1 THEN 'I' ELSE '0' END;
      RAISE EXCEPTION 'done' USING ERRCODE = 'XX001';
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      IF SQLSTATE = 'XX001' THEN NULL; ELSIF SQLSTATE = '42501' THEN _i := 'X'; ELSIF SQLSTATE LIKE '23%' THEN _i := 'i'; ELSE _i := 'E'; END IF;
    END;
    BEGIN EXECUTE 'DROP TABLE IF EXISTS pg_temp._mxrow'; EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
  RETURN _s || _u || _i || _d;
END $f$;

-- Plants one row into an empty table from the NOT NULL columns without a default (constraints may still refuse: then false).
CREATE FUNCTION pg_temp.plant_generic(_tbl text) RETURNS boolean LANGUAGE plpgsql AS $f$
DECLARE _cols text; _vals text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ',' ORDER BY ordinal_position),
         string_agg(CASE
           WHEN udt_name IN ('text','varchar','bpchar') THEN quote_literal('mx')
           WHEN udt_name IN ('int2','int4','int8','numeric','float4','float8') THEN '1'
           WHEN udt_name = 'uuid' THEN 'gen_random_uuid()'
           WHEN udt_name = 'date' THEN 'current_date'
           WHEN udt_name IN ('timestamptz','timestamp') THEN 'now()'
           WHEN udt_name = 'bool' THEN 'false'
           WHEN udt_name IN ('jsonb','json') THEN quote_literal('{}')
           ELSE 'NULL' END, ',' ORDER BY ordinal_position)
    INTO _cols, _vals
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = _tbl AND is_nullable = 'NO' AND column_default IS NULL
     AND is_generated = 'NEVER' AND identity_generation IS NULL;
  IF _cols IS NULL THEN EXECUTE format('INSERT INTO public.%I DEFAULT VALUES', _tbl);
  ELSE EXECUTE format('INSERT INTO public.%I (%s) VALUES (%s)', _tbl, _cols, _vals); END IF;
  RETURN true;
EXCEPTION WHEN OTHERS THEN RETURN false;
END $f$;

DO $$
DECLARE
  _out text := '';
  _roles text[] := ARRAY['superadmin','admin','product_admin','product_contributor','content_admin','agent_admin','advertiser','sales','cs_admin','none'];
  _abbr  text[] := ARRAY['SA','AD','PA','PC','CA','AG','AV','SL','CS','NO'];
  _uids uuid[] := ARRAY[]::uuid[];
  _SA uuid; _AD uuid; _PA uuid; _PC uuid; _CA uuid; _AG uuid; _AV uuid; _SL uuid; _CS uuid; _NO uuid;
  _r text; _u uuid; _i int; _t record; _tbl text; _tbls text[];
  _total bigint; _ctid tid; _col text; _cols text; _cell text; _line text; _expline text; _bad text;
  _exp jsonb := '{"admin_notifications": "SA=rUX0 AD=rUX0 PA=00X0 PC=00X0 CA=00X0 AG=rUX0 AV=00X0 SL=00X0 CS=rUX0 NO=00X0", "agent_badges": "SA=rUID AD=rUID PA=r0X0 PC=r0X0 CA=r0X0 AG=rUID AV=r0X0 SL=r0X0 CS=r0X0 NO=r0X0", "agent_challenge_progress": "SA=ruiD AD=ruiD PA=00X0 PC=00X0 CA=00X0 AG=ruiD AV=00X0 SL=00X0 CS=00X0 NO=00X0", "agent_challenges": "SA=rUID AD=rUID PA=r0X0 PC=r0X0 CA=r0X0 AG=rUID AV=r0X0 SL=r0X0 CS=r0X0 NO=r0X0", "agent_commission_rates": "SA=rXXX AD=rXXX PA=0XXX PC=0XXX CA=0XXX AG=rXXX AV=0XXX SL=0XXX CS=rXXX NO=0XXX", "agent_earned_badges": "SA=ruiD AD=ruiD PA=00X0 PC=00X0 CA=00X0 AG=ruiD AV=00X0 SL=00X0 CS=00X0 NO=00X0", "agent_leads": "SA=rXXX AD=rXXX PA=0XXX PC=0XXX CA=0XXX AG=rXXX AV=0XXX SL=0XXX CS=rXXX NO=0XXX", "agent_levels": "SA=rUID AD=rUID PA=r0X0 PC=r0X0 CA=r0X0 AG=rUID AV=r0X0 SL=r0X0 CS=r0X0 NO=r0X0", "agent_points": "SA=ruiD AD=ruiD PA=00X0 PC=00X0 CA=00X0 AG=ruiD AV=00X0 SL=00X0 CS=00X0 NO=00X0", "agent_rewards": "SA=rUID AD=rUID PA=r0X0 PC=r0X0 CA=r0X0 AG=rUID AV=r0X0 SL=r0X0 CS=r0X0 NO=r0X0", "agent_sales": "SA=rUID AD=rUID PA=00X0 PC=00X0 CA=00X0 AG=rUID AV=00X0 SL=00X0 CS=00X0 NO=00X0", "agent_short_links": "SA=r0X0 AD=r0X0 PA=00X0 PC=00X0 CA=00X0 AG=ruiD AV=00X0 SL=00X0 CS=00X0 NO=00X0", "agent_withdrawals": "SA=rUID AD=rUID PA=00E0 PC=00E0 CA=00E0 AG=rUID AV=00E0 SL=00E0 CS=00E0 NO=00E0", "agents": "SA=rUEE AD=rUEE PA=00E0 PC=00E0 CA=00E0 AG=rUEE AV=00E0 SL=00E0 CS=00E0 NO=00E0", "article_pipeline_runs": "SA=r0X0 AD=r0X0 PA=00X0 PC=00X0 CA=r0X0 AG=00X0 AV=00X0 SL=00X0 CS=00X0 NO=00X0", "article_pipeline_topics": "SA=rUID AD=rUID PA=00X0 PC=00X0 CA=r0X0 AG=00X0 AV=00X0 SL=00X0 CS=00X0 NO=00X0", "articles": "SA=rUID AD=rUID PA=r0X0 PC=r0X0 CA=rUID AG=r0X0 AV=r0X0 SL=r0X0 CS=r0X0 NO=r0X0", "booking_payments": "SA=rUID AD=rUID PA=00X0 PC=00X0 CA=00X0 AG=00X0 AV=00X0 SL=00X0 CS=00X0 NO=00X0", "booking_travelers": "SA=rUID AD=rUID PA=00X0 PC=00X0 CA=00X0 AG=00X0 AV=00X0 SL=00X0 CS=00X0 NO=00X0", "bookings": "SA=rUID AD=rUID PA=00X0 PC=00X0 CA=00X0 AG=00X0 AV=00X0 SL=00X0 CS=00X0 NO=00X0", "campaign_spend": "SA=rUID AD=rUID PA=00X0 PC=00X0 CA=00X0 AG=00X0 AV=rUID SL=00X0 CS=00X0 NO=00X0", "cogs_defaults": "SA=rUID AD=rUID PA=rUID PC=00X0 CA=00X0 AG=00X0 AV=00X0 SL=00X0 CS=00X0 NO=00X0", "departure_schedules": "SA=rUID AD=rUID PA=rUID PC=r0X0 CA=r0X0 AG=r0X0 AV=r0X0 SL=r0X0 CS=r0X0 NO=r0X0", "equipment_items": "SA=rUID AD=rUID PA=rUID PC=r0X0 CA=r0X0 AG=r0X0 AV=r0X0 SL=r0X0 CS=r0X0 NO=r0X0", "faq_items": "SA=rUID AD=rUID PA=r0X0 PC=r0X0 CA=rUID AG=r0X0 AV=r0X0 SL=r0X0 CS=r0X0 NO=r0X0", "gallery_images": "SA=rUID AD=rUID PA=r0X0 PC=r0X0 CA=rUID AG=r0X0 AV=r0X0 SL=r0X0 CS=r0X0 NO=r0X0", "hero_section": "SA=rUID AD=rUID PA=r0X0 PC=r0X0 CA=rUID AG=r0X0 AV=r0X0 SL=r0X0 CS=r0X0 NO=r0X0", "hotels": "SA=rUID AD=rUID PA=rUID PC=r0X0 CA=r0X0 AG=r0X0 AV=r0X0 SL=r0X0 CS=r0X0 NO=r0X0", "intake_status_attempts": "SA=XXXX AD=XXXX PA=XXXX PC=XXXX CA=XXXX AG=XXXX AV=XXXX SL=XXXX CS=XXXX NO=XXXX", "jamaah_audit_log": "SA=r0X0 AD=r0X0 PA=00X0 PC=00X0 CA=00X0 AG=00X0 AV=00X0 SL=00X0 CS=r0X0 NO=00X0", "jamaah_groups": "SA=rUID AD=rUID PA=00X0 PC=00X0 CA=00X0 AG=00X0 AV=00X0 SL=00X0 CS=rUI0 NO=00X0", "jamaah_intakes": "SA=rUXD AD=rUXD PA=00X0 PC=00X0 CA=00X0 AG=00X0 AV=00X0 SL=00X0 CS=rUX0 NO=00X0", "jamaah_payments": "SA=r*I* AD=r*I* PA=0*X* PC=0*X* CA=0*X* AG=0*X* AV=0*X* SL=0*X* CS=r*I* NO=0*X*", "jamaah_registrations": "SA=rU*d AD=rU*d PA=00*0 PC=00*0 CA=00*0 AG=00*0 AV=00*0 SL=00*0 CS=rU*0 NO=00*0", "marketing_materials": "SA=rUID AD=rUID PA=r0X0 PC=r0X0 CA=r0X0 AG=r0X0 AV=r0X0 SL=r0X0 CS=r0X0 NO=r0X0", "marketing_settings": "SA=rUID AD=rUID PA=00X0 PC=00X0 CA=00X0 AG=00X0 AV=rUID SL=00X0 CS=00X0 NO=00X0", "package_change_log": "SA=r0X0 AD=r0X0 PA=r0X0 PC=r0X0 CA=00X0 AG=00X0 AV=00X0 SL=00X0 CS=00X0 NO=00X0", "package_items": "SA=rUID AD=rUID PA=rUID PC=r0X0 CA=r0X0 AG=r0X0 AV=r0X0 SL=r0X0 CS=r0X0 NO=r0X0", "packages": "SA=rUID AD=rUID PA=rUID PC=r0X0 CA=r0X0 AG=r0X0 AV=r0X0 SL=r0X0 CS=r0X0 NO=r0X0", "page_seo": "SA=rUID AD=rUID PA=r0X0 PC=r0X0 CA=rUID AG=r0X0 AV=r0X0 SL=r0X0 CS=r0X0 NO=r0X0", "redirects": "SA=rUID AD=rUID PA=r0X0 PC=r0X0 CA=rUID AG=r0X0 AV=r0X0 SL=r0X0 CS=r0X0 NO=r0X0", "selling_points": "SA=rUID AD=rUID PA=r0X0 PC=r0X0 CA=rUID AG=r0X0 AV=r0X0 SL=r0X0 CS=r0X0 NO=r0X0", "seo_settings": "SA=rUID AD=rUID PA=r0X0 PC=r0X0 CA=rUID AG=r0X0 AV=r0X0 SL=r0X0 CS=r0X0 NO=r0X0", "short_link_clicks": "SA=r0i0 AD=r0i0 PA=00i0 PC=00i0 CA=00i0 AG=00i0 AV=r0i0 SL=00i0 CS=00i0 NO=00i0", "short_links": "SA=rUID AD=rUID PA=r0X0 PC=r0X0 CA=r0X0 AG=r0X0 AV=rUID SL=r0X0 CS=r0X0 NO=r0X0", "site_events": "SA=XXIX AD=XXIX PA=XXIX PC=XXIX CA=XXIX AG=XXIX AV=XXIX SL=XXIX CS=XXIX NO=XXIX", "testimonials": "SA=rUID AD=rUID PA=r0X0 PC=r0X0 CA=rUID AG=r0X0 AV=r0X0 SL=r0X0 CS=r0X0 NO=r0X0", "umroh_calculator_leads": "SA=rUID AD=rUID PA=00I0 PC=00I0 CA=00I0 AG=00I0 AV=00I0 SL=rUID CS=00I0 NO=00I0", "user_roles": "SA=rU*D AD=rU*D PA=r0*0 PC=r0*0 CA=r0*0 AG=r0*0 AV=r0*0 SL=r0*0 CS=r0*0 NO=00*0", "website_settings": "SA=rUID AD=rUID PA=r0X0 PC=r0X0 CA=r0X0 AG=r0X0 AV=r0X0 SL=r0X0 CS=r0X0 NO=r0X0", "whatsapp_clicks": "SA=r0ID AD=r0ID PA=00I0 PC=00I0 CA=00I0 AG=00I0 AV=r0I0 SL=rUI0 CS=00I0 NO=00I0", "whatsapp_conversions": "SA=rUID AD=rUID PA=00X0 PC=00X0 CA=00X0 AG=00X0 AV=r0X0 SL=r0I0 CS=00X0 NO=00X0", "whatsapp_cs": "SA=rUID AD=rUID PA=r0X0 PC=r0X0 CA=r0X0 AG=r0X0 AV=rUID SL=r0X0 CS=r0X0 NO=r0X0", "wisata_halal": "SA=rUID AD=rUID PA=r0X0 PC=r0X0 CA=r0X0 AG=r0X0 AV=r0X0 SL=r0X0 CS=r0X0 NO=r0X0"}'::jsonb;
  _dump boolean := coalesce(current_setting('mx.dump', true), '') = 'on';
  _res text; _n bigint; _m bigint; _pending uuid; _verified uuid; _rejected uuid; _reg uuid;
  _agent uuid; _pkg uuid; _bogus uuid := gen_random_uuid(); _sig text; _want text;
  _dump_json text := '';
BEGIN
  -- ===== users, one per role =====
  FOREACH _r IN ARRAY _roles LOOP
    _u := gen_random_uuid();
    INSERT INTO auth.users (id, email, instance_id, aud, role)
    VALUES (_u, 'adm11-' || _u || '@example.invalid', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');
    IF _r <> 'none' THEN INSERT INTO public.user_roles (user_id, role) VALUES (_u, _r::public.app_role); END IF;
    _uids := _uids || _u;
  END LOOP;
  _SA := _uids[1]; _AD := _uids[2]; _PA := _uids[3]; _PC := _uids[4]; _CA := _uids[5];
  _AG := _uids[6]; _AV := _uids[7]; _SL := _uids[8]; _CS := _uids[9]; _NO := _uids[10];

  SELECT id INTO _agent FROM public.agents LIMIT 1;
  SELECT id INTO _pkg FROM public.packages LIMIT 1;
  SELECT id INTO _reg FROM public.jamaah_registrations LIMIT 1;

  -- ===== plant rows into empty tables =====
  BEGIN INSERT INTO public.umroh_calculator_leads (name, whatsapp, monthly_saving) VALUES ('mx', '628111', 1000000); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN INSERT INTO public.redirects (from_path, to_path) VALUES ('/mx-from', '/mx-to'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN INSERT INTO public.agent_withdrawals (agent_id, amount, bank_name, bank_account, account_name) VALUES (_agent, 1000, 'b', '1', 'n'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN INSERT INTO public.agent_sales (agent_id, customer_name, customer_phone, package_name) VALUES (_agent, 'c', '1', 'p'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN INSERT INTO public.campaign_spend (campaign_name, amount, period_start, period_end) VALUES ('mx', 1000, current_date, current_date); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN INSERT INTO public.short_links (short_code, original_url) VALUES ('mxcode', 'https://example.com'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN INSERT INTO public.agent_leads (agent_id, name, whatsapp) VALUES (_agent, 'mx', '6281234567890'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN INSERT INTO public.departure_schedules (departure_date, return_date) VALUES (current_date, current_date); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN INSERT INTO public.whatsapp_conversions DEFAULT VALUES; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN INSERT INTO public.jamaah_intakes (code, package_id, contact_name, contact_phone, consent_at, consent_version) VALUES ('MXTEST', _pkg, 'mx', '6281234567891', now(), 'v1'); EXCEPTION WHEN OTHERS THEN NULL; END;
  -- everything still empty: generic planter, foreign keys and triggers off while planting
  SET LOCAL session_replication_role = replica;
  FOR _t IN SELECT c.relname FROM pg_class c WHERE c.relnamespace = 'public'::regnamespace AND c.relkind = 'r' ORDER BY 1 LOOP
    EXECUTE format('SELECT count(*) FROM public.%I', _t.relname) INTO _total;
    IF _total = 0 THEN PERFORM pg_temp.plant_generic(_t.relname); END IF;
  END LOOP;
  SET LOCAL session_replication_role = origin;

  -- ===================================================================================================================
  -- 1. TABLE MATRIX
  -- ===================================================================================================================
  SELECT array_agg(c.relname ORDER BY c.relname) INTO _tbls FROM pg_class c WHERE c.relnamespace = 'public'::regnamespace AND c.relkind = 'r';
  FOREACH _tbl IN ARRAY _tbls LOOP
    EXECUTE format('SELECT count(*) FROM public.%I', _tbl) INTO _total;
    _ctid := NULL; _col := NULL; _cols := NULL;
    BEGIN EXECUTE format('SELECT ctid FROM public.%I LIMIT 1', _tbl) INTO _ctid; EXCEPTION WHEN OTHERS THEN _ctid := NULL; END;
    SELECT column_name INTO _col FROM information_schema.columns WHERE table_schema = 'public' AND table_name = _tbl
       AND is_generated = 'NEVER' AND identity_generation IS DISTINCT FROM 'ALWAYS' ORDER BY ordinal_position LIMIT 1;
    SELECT string_agg(quote_ident(column_name), ',' ORDER BY ordinal_position) INTO _cols FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = _tbl AND is_generated = 'NEVER' AND identity_generation IS DISTINCT FROM 'ALWAYS';
    _line := '';
    FOR _i IN 1..10 LOOP
      _line := _line || CASE WHEN _i > 1 THEN ' ' ELSE '' END || _abbr[_i] || '=' || pg_temp.mx_cell(_uids[_i], _tbl, _total, _ctid, _col, _cols);
    END LOOP;
    IF _dump THEN
      _dump_json := _dump_json || format('%s:%s', _tbl, _line) || E'\n';
    ELSIF _total = 0 THEN
      _out := _out || format(E'SKIP matrix %s: table is empty and no row could be planted\n', _tbl);
    ELSIF NOT (_exp ? _tbl) THEN
      _out := _out || format(E'SKIP matrix %s: no snapshot yet (%s)\n', _tbl, _line);
    ELSE
      _want := _exp ->> _tbl;
      -- compare cell by cell; '*' in the snapshot matches anything
      _bad := '';
      FOR _i IN 1..10 LOOP
        DECLARE _a text := split_part(_line, ' ', _i); _e text := split_part(_want, ' ', _i);
        BEGIN
          IF length(_a) <> length(_e) OR EXISTS (
            SELECT 1 FROM generate_series(1, length(_e)) k WHERE substr(_e, k, 1) <> '*' AND substr(_e, k, 1) <> substr(_a, k, 1)
          ) THEN _bad := _bad || format(' [%s expected %s]', _a, _e); END IF;
        END;
      END LOOP;
      IF _bad = '' THEN _out := _out || format(E'PASS matrix %s\n', _tbl);
      ELSE _out := _out || format(E'FAIL matrix %s changed:%s\n', _tbl, _bad); END IF;
    END IF;
  END LOOP;
  IF _dump THEN RAISE EXCEPTION E'RESULTS\n%', _dump_json; END IF;

  -- ===================================================================================================================
  -- 2. MENU PROMISES (desired behaviour; KNOWN = gap in the database)
  -- ===================================================================================================================
  FOR _t IN SELECT * FROM (VALUES
    -- ADM-031 decided: calculator leads hold names and WhatsApp numbers, so product_admin gets NO access and the menu item is removed for that role
    ('Prospek Kalkulator: product_admin (menu item removed, decision ADM-031) reads no leads', _PA, 'SELECT 1 FROM public.umroh_calculator_leads', 'norows', NULL),
    ('Prospek Kalkulator: sales can read the leads', _SL, 'SELECT 1 FROM public.umroh_calculator_leads', 'rows', NULL),
    -- ADM-033 decided: the advertiser gets closed-lead COUNTS through ad_spend_closed_calculator_counts(), never the rows
    ('Biaya Iklan: advertiser reads no calculator lead rows (counts come from ad_spend_closed_calculator_counts)', _AV, 'SELECT 1 FROM public.umroh_calculator_leads', 'norows', NULL),
    ('Biaya Iklan: advertiser gets the closed-lead counts per campaign (an aggregate query always returns a row)', _AV, 'SELECT count(*) FROM public.ad_spend_closed_calculator_counts()', 'rows', NULL),
    ('Biaya Iklan: advertiser reads WhatsApp conversions', _AV, 'SELECT 1 FROM public.whatsapp_conversions', 'rows', NULL),
    ('Biaya Iklan: advertiser records spend', _AV, 'UPDATE public.campaign_spend SET amount = amount', 'rows', NULL),
    ('SEO: content_admin writes page_seo', _CA, 'UPDATE public.page_seo SET page_path = page_path', 'rows', NULL),
    ('SEO: content_admin writes redirects (SEO page has a Redirect tab)', _CA, $q$INSERT INTO public.redirects (from_path, to_path) VALUES ('/mx2-from', '/mx2-to')$q$, 'rows', NULL),
    ('Kelola Agen: agent_admin must not write money columns of an agent directly (balance moves only through the commission and withdrawal functions)', _AG, 'UPDATE public.agents SET available_balance = available_balance + 1', 'refused', NULL),
    ('Kelola Agen: owner must not write the balance of an agent directly either', _SA, 'UPDATE public.agents SET available_balance = available_balance + 1', 'refused', NULL),
    ('Master COGS: product_admin saves cogs_defaults', _PA, 'UPDATE public.cogs_defaults SET data = data', 'rows', NULL),
    ('Master COGS: sales must not read the cost basis', _SL, 'SELECT 1 FROM public.cogs_defaults', 'norows', NULL),
    ('Master COGS: cs_admin must not read the cost basis', _CS, 'SELECT 1 FROM public.cogs_defaults', 'norows', NULL),
    ('Master COGS: advertiser must not read the cost basis', _AV, 'SELECT 1 FROM public.cogs_defaults', 'norows', NULL),
    ('Master COGS: agent_admin must not read the cost basis', _AG, 'SELECT 1 FROM public.cogs_defaults', 'norows', NULL),
    ('Master COGS: content_admin must not read the cost basis', _CA, 'SELECT 1 FROM public.cogs_defaults', 'norows', NULL),
    ('Rotasi Chat: advertiser manages whatsapp_cs', _AV, 'UPDATE public.whatsapp_cs SET name = name', 'rows', NULL),
    ('Kelola Agen: agent_admin edits agents', _AG, 'UPDATE public.agents SET name = name', 'rows', NULL),
    ('Data Jamaah: cs_admin reads registrations', _CS, 'SELECT 1 FROM public.jamaah_registrations', 'rows', NULL),
    ('Data Jamaah: cs_admin edits registrations', _CS, 'UPDATE public.jamaah_registrations SET notes = notes', 'rows', NULL),
    ('Data Jamaah: cs_admin reads the audit log', _CS, 'SELECT 1 FROM public.jamaah_audit_log', 'rows', NULL),
    ('Data Jamaah: cs_admin reads intakes', _CS, 'SELECT 1 FROM public.jamaah_intakes', 'rows', NULL),
    ('Data Jamaah: cs_admin updates intakes (accept/reject)', _CS, 'UPDATE public.jamaah_intakes SET contact_name = contact_name', 'rows', NULL),
    ('Lead Agen: cs_admin reads agent_leads directly', _CS, 'SELECT 1 FROM public.agent_leads', 'rows', NULL),
    ('Pengaturan Situs: content_admin must not write website_settings', _CA, 'UPDATE public.website_settings SET id = id', 'norows', NULL),
    ('Tim: nobody below owner can grant a role (cs_admin inserts superadmin for itself)', _CS, format('INSERT INTO public.user_roles (user_id, role) VALUES (%L, %L)', _CS, 'superadmin'), 'refused', NULL),
    ('Tim: product_admin cannot change roles', _PA, 'UPDATE public.user_roles SET role = role', 'norows', NULL)
  ) AS x(label, uid, stmt, expect, known)
  LOOP
    IF _t.uid IS NULL THEN _out := _out || format(E'SKIP %s: role user missing\n', _t.label); CONTINUE; END IF;
    _res := pg_temp.try_as(_t.uid, _t.stmt);
    IF _res = _t.expect THEN _out := _out || format(E'PASS menu: %s (%s)\n', _t.label, _res);
    ELSIF _t.known IS NOT NULL THEN _out := _out || format(E'KNOWN %s menu: %s: wanted %s, got %s\n', _t.known, _t.label, _t.expect, _res);
    ELSE _out := _out || format(E'FAIL menu: %s: expected %s, got %s\n', _t.label, _t.expect, _res); END IF;
  END LOOP;

  -- cost columns on packages: readable by every signed-in user (agents too) as column privileges
  IF has_column_privilege('authenticated', 'public.packages', 'cogs_data', 'SELECT') THEN
    _out := _out || E'KNOWN ADM-036 menu: authenticated can SELECT packages.cogs_data (and cogs_status, agent_commission_amount); every signed-in user, agents included, can read them on published packages. cogs_data is empty today. Fix skipped on purpose: revoking the column privilege breaks select("*") on packages in 9+ admin/agent files; needs a staff_package_internals() read function and a call-site pass\n';
  ELSE _out := _out || E'PASS menu: authenticated cannot SELECT packages.cogs_data\n'; END IF;
  IF has_column_privilege('anon', 'public.packages', 'cogs_data', 'SELECT') OR has_column_privilege('anon', 'public.packages', 'agent_commission_amount', 'SELECT') THEN
    _out := _out || E'FAIL menu: anon can SELECT a cost column of packages\n'; ELSE _out := _out || E'PASS menu: anon cannot SELECT cogs_data or agent_commission_amount\n'; END IF;

  -- deleting an agent: money history must survive (FK to agents must not cascade; the delete itself is blocked by trigger, see 14_admin_hardening.sql)
  SELECT count(*) INTO _n FROM pg_constraint WHERE confrelid = 'public.agents'::regclass AND contype = 'f' AND confdeltype = 'c'
     AND conrelid IN ('public.agent_sales'::regclass, 'public.agent_withdrawals'::regclass, 'public.agent_commission_adjustments'::regclass);
  IF _n = 0 THEN _out := _out || E'PASS agents: deleting an agent keeps agent_sales, agent_withdrawals and agent_commission_adjustments (ADM-103)\n';
  ELSE _out := _out || format(E'FAIL ADM-103 agents: deleting an agent still cascades to %s money history tables\n', _n); END IF;

  -- draft packages: staff with a packages page see them, everybody else only published ones
  SELECT count(*) INTO _n FROM public.packages;
  SELECT count(*) INTO _m FROM public.packages WHERE status = 'published';
  IF _n = _m THEN _out := _out || E'SKIP packages draft visibility: no draft package exists\n';
  ELSE
    FOR _t IN SELECT * FROM (VALUES ('product_admin', _PA, true), ('cs_admin', _CS, true), ('superadmin', _SA, true), ('content_admin', _CA, false), ('agent_admin', _AG, false), ('sales', _SL, false), ('advertiser', _AV, false), ('none', _NO, false)) AS x(role, uid, sees_all)
    LOOP
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _t.uid, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      SELECT count(*) INTO _res FROM public.packages;
      RESET ROLE;
      IF (_res::bigint = _n) = _t.sees_all THEN _out := _out || format(E'PASS packages: %s sees %s of %s (%s)\n', _t.role, _res, _n, CASE WHEN _t.sees_all THEN 'drafts included' ELSE 'published only' END);
      ELSE _out := _out || format(E'FAIL packages: %s sees %s of %s\n', _t.role, _res, _n); END IF;
    END LOOP;
  END IF;

  -- ===================================================================================================================
  -- 3. RPC GATING (B = refused by the function itself, A = passes the gate)
  -- ===================================================================================================================
  FOR _t IN SELECT * FROM (VALUES
    ('admin_agent_leads', 'SELECT public.admin_agent_leads()', 'AABBBABBAB'),
    ('admin_list_commission_rates', 'SELECT public.admin_list_commission_rates()', 'AABBBABBAB'),
    ('set_commission_rate', format('SELECT public.set_commission_rate(%L::uuid, %L, %L, 1000, %L)', _pkg, 'standar', 'bronze', 'x'), 'AABBBABBBB'),
    ('clear_commission_rate', format('SELECT public.clear_commission_rate(%L::uuid, %L, %L)', _pkg, 'standar', 'bronze'), 'AABBBABBBB'),
    ('process_agent_withdrawal', format('SELECT public.process_agent_withdrawal(%L::uuid, %L, %L)', _bogus, 'zzz', 'x'), 'AABBBABBBB'),
    ('log_agent_sale', format('SELECT public.log_agent_sale(%L::uuid, %L, %L, %L::uuid, %L, 1000, 100, current_date, %L, %L)', _agent, 'x', '08', _pkg, 'x', 'pending', 'x'), 'AABBBABBBB'),
    ('get_analytics_summary', 'SELECT public.get_analytics_summary(now() - interval ''7 days'', now())', 'AABBBBABBB'),
    ('cancel_booking (online booking is off)', format('SELECT public.cancel_booking(%L::uuid, %L)', _bogus, 'x'), 'AABBBBBBBB'),
    ('mark_refund_sent', format('SELECT public.mark_refund_sent(%L::uuid)', _bogus), 'AABBBBBBBB'),
    ('admin_mark_payment_settled', 'SELECT public.admin_mark_payment_settled(''x'', ''x'')', 'AABBBBBBBB'),
    ('list_my_agent_leads (agent only)', 'SELECT public.list_my_agent_leads()', 'BBBBBBBBBB'),
    ('create_agent_lead (agent only)', format('SELECT public.create_agent_lead(%L, %L, %L::uuid, %L)', 'x', '081234567890', _pkg, 'x'), 'BBBBBBBBBB')
  ) AS x(label, stmt, want)
  LOOP
    _line := '';
    FOR _i IN 1..10 LOOP
      _line := _line || pg_temp.gate(_uids[_i], _t.stmt);
    END LOOP;
    IF _line = _t.want THEN _out := _out || format(E'PASS rpc %s: SA AD PA PC CA AG AV SL CS NO = %s
', _t.label, _line);
    ELSE _out := _out || format(E'FAIL rpc %s: expected %s got %s (order SA AD PA PC CA AG AV SL CS NO)
', _t.label, _t.want, _line); END IF;
  END LOOP;

  -- set-returning functions that filter instead of raising: rows per role
  FOR _t IN SELECT * FROM (VALUES
    ('list_agent_options', 'SELECT count(*) FROM public.list_agent_options()'),
    ('get_agent_leaderboard', 'SELECT count(*) FROM public.get_agent_leaderboard()')
  ) AS x(label, stmt)
  LOOP
    _line := '';
    FOR _i IN 1..10 LOOP
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _uids[_i], 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      EXECUTE _t.stmt INTO _n;
      RESET ROLE;
      _line := _line || CASE WHEN _n > 0 THEN 'R' ELSE '0' END;
    END LOOP;
    IF _t.label = 'list_agent_options' THEN
      IF _line = 'RR000000R0' THEN _out := _out || format(E'PASS rpc list_agent_options returns rows only to owners and cs_admin: %s\n', _line);
      ELSE _out := _out || format(E'FAIL rpc list_agent_options rows per role %s (expected RR000000R0)\n', _line); END IF;
    ELSE
      IF _line = 'RR000R0000' THEN _out := _out || format(E'PASS rpc get_agent_leaderboard returns rows only to owners and agent_admin (not to other staff or to users without a role): %s\n', _line);
      ELSE _out := _out || format(E'FAIL rpc get_agent_leaderboard rows per role %s (expected RR000R0000)\n', _line); END IF;
    END IF;
  END LOOP;

  -- ===================================================================================================================
  -- 4. FUNCTION INVENTORY: what the API can call
  -- ===================================================================================================================
  -- Trigger functions are left out: they cannot be called through the API even when EXECUTE is granted.
  -- A function missing from a list = FAIL. A function not in the list = KNOWN ADM-117 (added since this review, not reviewed yet).
  SELECT string_agg(proname, ',' ORDER BY proname) INTO _sig FROM pg_proc p
   WHERE p.pronamespace = 'public'::regnamespace AND p.prokind = 'f' AND p.prosecdef AND p.prorettype <> 'trigger'::regtype AND has_function_privilege('authenticated', p.oid, 'EXECUTE');
  -- Reviewed since: the commission lifecycle functions (13_commission_lifecycle.sql tests their gates) and the ADM-117 list in 14_admin_hardening.sql section 11.
  _want := 'accept_agent_sop,ad_spend_closed_calculator_counts,add_lead_followup,admin_agent_leads,admin_commission_rate_history,admin_list_commission_adjustments,admin_list_commission_rates,admin_list_commissions,admin_list_lead_disputes,admin_mark_payment_settled,admin_work_counts,approve_commissions,cancel_booking,clear_commission_rate,commission_is_finance,commission_is_management,commission_is_staff,create_agent_lead,get_agent_leaderboard,get_analytics_summary,get_calculator_lead_by_token,get_my_commission_rates,has_role,list_agent_options,list_my_agent_intakes,list_my_agent_jamaah,list_my_agent_leads,list_my_commission_adjustments,list_my_commissions,log_agent_sale,mark_agent_commissions_paid,mark_intake_info_sent,mark_refund_sent,process_agent_withdrawal,redirect_agent_short_link,register_agent_profile,resolve_lead_dispute,set_agent_referrer,set_commission_rate,set_lead_helper,set_lead_status';
  _out := _out || pg_temp.inv_line('SECURITY DEFINER functions the API can call', _sig, _want);

  SELECT string_agg(proname, ',' ORDER BY proname) INTO _sig FROM pg_proc p
   WHERE p.pronamespace = 'public'::regnamespace AND p.prokind = 'f' AND NOT p.prosecdef AND p.prorettype <> 'trigger'::regtype AND has_function_privilege('authenticated', p.oid, 'EXECUTE');
  _out := _out || pg_temp.inv_line('SECURITY INVOKER functions the API can call (they lean on table policies)', _sig, 'accept_jamaah_intake,commission_net,commission_nik_ok,commission_today,delete_jamaah_registration,import_jamaah_rows,normalize_wa_phone,reject_jamaah_intake');

  SELECT string_agg(proname, ',' ORDER BY proname) INTO _sig FROM pg_proc p
   WHERE p.pronamespace = 'public'::regnamespace AND p.prokind = 'f' AND p.prorettype <> 'trigger'::regtype AND has_function_privilege('anon', p.oid, 'EXECUTE');
  IF _sig = 'get_calculator_lead_by_token,has_role,redirect_agent_short_link' THEN
    _out := _out || E'PASS inventory: anon can call only get_calculator_lead_by_token, has_role, redirect_agent_short_link\n';
  ELSE _out := _out || format(E'FAIL inventory: functions callable by anon changed: now [%s]\n', _sig); END IF;
  -- ADM-109 closed as "keep": policies TO public call has_role(auth.uid(), ...) while anon reads hotels, packages and more,
  -- so anon needs EXECUTE. The function says false for a null or unknown uuid.
  IF has_function_privilege('anon', 'public.has_role(uuid, public.app_role)', 'EXECUTE') THEN
    _out := _out || E'PASS inventory: has_role stays executable by anon on purpose (ADM-109: RLS policies TO public evaluate it for visitors)\n';
  ELSE _out := _out || E'FAIL inventory: has_role was revoked from anon: every anonymous read of a table with a has_role policy TO public breaks\n'; END IF;

  -- ===================================================================================================================
  -- 5. ANONYMOUS READS
  -- ===================================================================================================================
  _line := '';
  FOR _t IN SELECT c.relname FROM pg_class c WHERE c.relnamespace = 'public'::regnamespace AND c.relkind IN ('r', 'v') ORDER BY 1 LOOP
    BEGIN
      PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
      SET LOCAL ROLE anon;
      EXECUTE format('SELECT count(*) FROM public.%I', _t.relname) INTO _n;
      RESET ROLE;
      IF _n > 0 THEN _line := _line || CASE WHEN _line = '' THEN '' ELSE ',' END || _t.relname; END IF;
    EXCEPTION WHEN OTHERS THEN RESET ROLE; END;
  END LOOP;
  _want := 'agent_badges,agent_levels,articles,equipment_items,faq_items,gallery_images,hero_section,hotels,package_items,packages,page_seo,redirects,selling_points,seo_settings,short_links,testimonials,website_settings,whatsapp_cs';
  -- redirects, short_links, departure_schedules, wisata_halal are planted by this test, so allow them to show up
  IF _line = _want OR replace(replace(replace(_line, 'departure_schedules,', ''), 'wisata_halal,', ''), ',wisata_halal', '') = _want THEN
    _out := _out || E'PASS anon reads: only public site content is readable without signing in\n';
  ELSE _out := _out || format(E'FAIL anon reads: tables an anonymous visitor can read are now [%s]\n', _line); END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'agent_levels' AND column_name IN ('commission_rate_min', 'commission_rate_max')) THEN
    _out := _out || E'FAIL anon reads: agent_levels is public and still holds the old commission_rate_min/max percentages (ADM-110)\n';
  ELSE _out := _out || E'PASS anon reads: agent_levels carries no stale commission percentages\n'; END IF;

  -- ===================================================================================================================
  -- 6. BUSINESS RULES: payments and registrations
  -- ===================================================================================================================
  IF _reg IS NULL THEN
    _out := _out || E'SKIP payments: no jamaah registration to attach test payments to\n';
  ELSE
    -- the guard trigger forces every payment inserted by a non-owner to 'pending', so plant the three states with triggers off
    SET LOCAL session_replication_role = replica;
    INSERT INTO public.jamaah_payments (registration_id, amount, paid_on, bank_account, status, recorded_by)
      VALUES (_reg, 1000000, current_date, 'BCA', 'pending', _CS) RETURNING id INTO _pending;
    INSERT INTO public.jamaah_payments (registration_id, amount, paid_on, bank_account, status, recorded_by, verified_by, verified_at)
      VALUES (_reg, 1000000, current_date, 'BCA', 'verified', _CS, _SA, now()) RETURNING id INTO _verified;
    INSERT INTO public.jamaah_payments (registration_id, amount, paid_on, bank_account, status, recorded_by, reject_reason)
      VALUES (_reg, 1000000, current_date, 'BCA', 'rejected', _CS, 'x') RETURNING id INTO _rejected;
    SET LOCAL session_replication_role = origin;
    FOR _t IN SELECT * FROM (VALUES
      ('cs_admin edits a pending payment', _CS, format('UPDATE public.jamaah_payments SET amount = 2000000 WHERE id = %L', _pending), 'rows'),
      ('cs_admin cannot verify a payment', _CS, format('UPDATE public.jamaah_payments SET status = %L WHERE id = %L', 'verified', _pending), 'refused'),
      ('cs_admin cannot edit a verified payment', _CS, format('UPDATE public.jamaah_payments SET amount = 1 WHERE id = %L', _verified), 'norows'),
      ('cs_admin cannot delete a verified payment', _CS, format('DELETE FROM public.jamaah_payments WHERE id = %L', _verified), 'norows'),
      ('cs_admin can delete the pending payment they recorded', _CS, format('DELETE FROM public.jamaah_payments WHERE id = %L', _pending), 'rows'),
      ('owner (admin) verifies a pending payment', _AD, format('UPDATE public.jamaah_payments SET status = %L, verified_by = %L, verified_at = now() WHERE id = %L', 'verified', _AD, _pending), 'rows'),
      ('owner (superadmin) verifies a pending payment', _SA, format('UPDATE public.jamaah_payments SET status = %L WHERE id = %L', 'verified', _pending), 'rows'),
      ('owner cannot change the amount of a verified payment', _AD, format('UPDATE public.jamaah_payments SET amount = 1 WHERE id = %L', _verified), 'refused'),
      ('cs_admin cannot reject a payment', _CS, format('UPDATE public.jamaah_payments SET status = %L, reject_reason = %L WHERE id = %L', 'rejected', 'x', _pending), 'refused'),
      ('owner cannot delete a verified payment', _AD, format('DELETE FROM public.jamaah_payments WHERE id = %L', _verified), 'norows'),
      ('owner can delete a rejected payment', _AD, format('DELETE FROM public.jamaah_payments WHERE id = %L', _rejected), 'rows'),
      ('agent_admin cannot read payments', _AG, 'SELECT 1 FROM public.jamaah_payments', 'norows'),
      ('sales cannot read payments', _SL, 'SELECT 1 FROM public.jamaah_payments', 'norows'),
      ('content_admin cannot record a payment', _CA, format('INSERT INTO public.jamaah_payments (registration_id, amount, paid_on, bank_account) VALUES (%L, 1, current_date, %L)', _reg, 'BCA'), 'refused'),
      ('product_admin cannot record a payment', _PA, format('INSERT INTO public.jamaah_payments (registration_id, amount, paid_on, bank_account) VALUES (%L, 1, current_date, %L)', _reg, 'BCA'), 'refused'),
      ('cs_admin records a payment', _CS, format('INSERT INTO public.jamaah_payments (registration_id, amount, paid_on, bank_account, recorded_by) VALUES (%L, 1, current_date, %L, %L)', _reg, 'BCA', _CS), 'rows'),
      ('cs_admin cannot delete a registration (owner only)', _CS, format('DELETE FROM public.jamaah_registrations WHERE id = %L', _reg), 'norows'),
      ('cs_admin adds a registration', _CS, format('INSERT INTO public.jamaah_registrations (package_id, full_name, room_type, list_price) VALUES (%L, %L, %L, 30000000)', _pkg, 'mx reg test', 'quad'), 'rows'),
      ('owner adds a registration', _SA, format('INSERT INTO public.jamaah_registrations (package_id, full_name, room_type, list_price) VALUES (%L, %L, %L, 30000000)', _pkg, 'mx reg test', 'quad'), 'rows'),
      ('product_admin cannot add a registration', _PA, format('INSERT INTO public.jamaah_registrations (package_id, full_name, room_type, list_price) VALUES (%L, %L, %L, 30000000)', _pkg, 'mx reg test', 'quad'), 'refused'),
      ('agent_admin cannot add a registration', _AG, format('INSERT INTO public.jamaah_registrations (package_id, full_name, room_type, list_price) VALUES (%L, %L, %L, 30000000)', _pkg, 'mx reg test', 'quad'), 'refused'),
      ('sales cannot add a registration', _SL, format('INSERT INTO public.jamaah_registrations (package_id, full_name, room_type, list_price) VALUES (%L, %L, %L, 30000000)', _pkg, 'mx reg test', 'quad'), 'refused'),
      ('user without a role cannot add a registration', _NO, format('INSERT INTO public.jamaah_registrations (package_id, full_name, room_type, list_price) VALUES (%L, %L, %L, 30000000)', _pkg, 'mx reg test', 'quad'), 'refused'),
      ('sales cannot read registrations', _SL, 'SELECT 1 FROM public.jamaah_registrations', 'norows'),
      ('product_admin cannot read registrations', _PA, 'SELECT 1 FROM public.jamaah_registrations', 'norows'),
      ('agent_admin cannot read registrations', _AG, 'SELECT 1 FROM public.jamaah_registrations', 'norows'),
      ('cs_admin cannot read agents (bank, KTP)', _CS, 'SELECT 1 FROM public.agents', 'norows'),
      ('cs_admin cannot read agent withdrawals', _CS, 'SELECT 1 FROM public.agent_withdrawals', 'norows'),
      ('sales cannot read the jamaah audit log', _SL, 'SELECT 1 FROM public.jamaah_audit_log', 'norows'),
      ('nobody can delete audit log rows (not even the owner)', _SA, 'DELETE FROM public.jamaah_audit_log', 'norows'),
      ('nobody can edit audit log rows (not even the owner)', _SA, 'UPDATE public.jamaah_audit_log SET action = action', 'norows')
    ) AS x(label, uid, stmt, expect)
    LOOP
      _res := pg_temp.try_as(_t.uid, _t.stmt);
      IF _res = _t.expect THEN _out := _out || format(E'PASS rule: %s (%s)\n', _t.label, _res);
      ELSE _out := _out || format(E'FAIL rule: %s: expected %s, got %s\n', _t.label, _t.expect, _res); END IF;
    END LOOP;
  END IF;

  -- verified_by is stored by the database for every verified payment
  SELECT count(*) INTO _n FROM public.jamaah_payments WHERE status = 'verified' AND (verified_by IS NULL OR verified_at IS NULL) AND recorded_by IS DISTINCT FROM _CS;
  _out := _out || format(E'%s every verified payment carries verified_by and verified_at (violations: %s)\n', CASE WHEN _n = 0 THEN 'PASS' ELSE 'FAIL' END, _n);

  -- ===================================================================================================================
  -- 7. STORAGE POLICY SIGNATURE (bucket, command, roles named in the policy)
  -- ===================================================================================================================
  SELECT string_agg(sig, ';' ORDER BY sig) INTO _sig FROM (
    SELECT coalesce((regexp_match(coalesce(qual, '') || ' ' || coalesce(with_check, ''), 'bucket_id = ''([a-z-]+)'''))[1], '-') || '/' || cmd || '/' ||
           coalesce((SELECT string_agg(DISTINCT m[1], '+' ORDER BY m[1]) FROM regexp_matches(coalesce(qual, '') || ' ' || coalesce(with_check, ''), '''([a-z_]+)''::(public\.)?app_role', 'g') m), 'none') AS sig
      FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects') s;
  _want := 'agent-documents/INSERT/none;agent-documents/SELECT/admin;agent-documents/SELECT/admin+agent_admin;article-images/ALL/content_admin;article-images/DELETE/admin;article-images/INSERT/admin;article-images/SELECT/admin;article-images/UPDATE/admin;commission-proofs/INSERT/admin;commission-proofs/SELECT/none;commission-proofs/SELECT/none;design-request-attachments/SELECT/none;jamaah-docs/DELETE/admin;jamaah-docs/INSERT/admin+cs_admin;jamaah-docs/SELECT/admin+cs_admin;jamaah-docs/UPDATE/admin+cs_admin;marketing-materials/DELETE/admin;marketing-materials/INSERT/admin;marketing-materials/SELECT/admin;marketing-materials/UPDATE/admin;package-images/ALL/product_admin;package-images/DELETE/admin;package-images/INSERT/admin;package-images/INSERT/content_admin;package-images/SELECT/admin;package-images/UPDATE/admin;wisata-images/ALL/content_admin;wisata-images/DELETE/admin;wisata-images/INSERT/admin;wisata-images/SELECT/admin;wisata-images/UPDATE/admin';
  IF _sig = _want THEN _out := _out || E'PASS storage: bucket policies match the reviewed set\n';
  ELSE _out := _out || format(E'FAIL storage: bucket policies changed: now [%s]\n', _sig); END IF;

  RAISE EXCEPTION E'RESULTS\n%', _out;
END
$$;
