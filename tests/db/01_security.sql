-- Security regression tests: the rules from supabase/migrations/20261005090000_security_hardening.sql.
--
-- Runs against the live linked project, but only inside a transaction that always aborts (the final
-- RAISE EXCEPTION), so nothing is stored. Run with: ./scripts/run-db-tests.sh tests/db/01_security.sql
--
-- Every report line starts with PASS, FAIL, SKIP or KNOWN. SKIP means prerequisite data is missing.
--
-- Pattern for "this must be refused": the statement runs inside its own sub-block as the simulated role;
-- if it succeeds we raise XX001 ourselves so its effects are rolled back and the check reports FAIL.

BEGIN;

DO $$
DECLARE
  _out text := '';
  _agent_uid uuid;      -- a plain active agent (no staff role)
  _agent_id uuid;
  _other_agent_id uuid; -- any other agent row
  _staff_uid uuid;      -- superadmin
  _pa_uid uuid;         -- product_admin
  _new_uid uuid;
  _c record;
  _r record;
  _n bigint;
  _m bigint;
  _rc integer;
  _bal numeric;
  _pend numeric;
  _wa text;
  _list text;
  _big jsonb;
  _fn text;
  _cols constant text :=
    -- Keep in sync with PUBLIC_PACKAGE_COLUMNS in src/hooks/usePackages.ts
    'id, slug, package_name, departure_date, duration_days, flight, flight_type, '
    'banner_image, package_price, five_star_package_price, hemat_package_price, '
    'pelataran_package_price, available_tiers, '
    'makkah_hotel_name, makkah_hotel_star, makkah_distance, makkah_duration_walk, '
    'madinah_hotel_name, madinah_hotel_star, madinah_distance, madinah_duration_walk, '
    'five_star_makkah_hotel_name, five_star_makkah_hotel_star, five_star_makkah_distance, five_star_makkah_duration_walk, '
    'five_star_madinah_hotel_name, five_star_madinah_hotel_star, five_star_madinah_distance, five_star_madinah_duration_walk, '
    'hemat_makkah_hotel_name, hemat_makkah_hotel_star, hemat_makkah_distance, hemat_makkah_duration_walk, '
    'hemat_madinah_hotel_name, hemat_madinah_hotel_star, hemat_madinah_distance, hemat_madinah_duration_walk, '
    'pelataran_makkah_hotel_name, pelataran_makkah_hotel_star, pelataran_makkah_distance, pelataran_makkah_duration_walk, '
    'pelataran_madinah_hotel_name, pelataran_madinah_hotel_star, pelataran_madinah_distance, pelataran_madinah_duration_walk, '
    'best_seller_transport, five_star_transport, hemat_transport, pelataran_transport, '
    'selling_points, included_items, excluded_items, equipment_list, catalog_link, '
    'itinerary_link, itinerary, gallery_images, '
    'start_airport, route, timeframe, slots_total, slots_filled, slots_booked_online, seat_source, slots_registered, '
    'nights_makkah, nights_madinah, nights_extra, hotel_extra, is_sold_out, sold_out_date, '
    'waitlist_count, meta_title, meta_description, og_image, canonical_url';
BEGIN
  -- ---------------------------------------------------------------------------------------------
  -- Test data
  -- ---------------------------------------------------------------------------------------------
  SELECT user_id, id INTO _agent_uid, _agent_id FROM public.agents
   WHERE status = 'active' AND user_id IS NOT NULL AND user_id NOT IN (SELECT user_id FROM public.user_roles) LIMIT 1;
  SELECT user_id INTO _staff_uid FROM public.user_roles WHERE role = 'superadmin' LIMIT 1;
  SELECT user_id INTO _pa_uid FROM public.user_roles WHERE role = 'product_admin' LIMIT 1;
  SELECT id INTO _other_agent_id FROM public.agents WHERE id IS DISTINCT FROM _agent_id LIMIT 1;

  IF _agent_uid IS NULL THEN _out := _out || E'SKIP agents: no plain active agent in the database\n'; END IF;
  IF _staff_uid IS NULL THEN _out := _out || E'SKIP staff: no superadmin in user_roles\n'; END IF;

  -- =============================================================================================
  -- 1a. agents: owners may not change the trust and money columns
  -- =============================================================================================
  IF _agent_uid IS NOT NULL THEN
    FOR _c IN SELECT * FROM (VALUES
      ('status',            quote_literal('suspended')),
      ('level',             'coalesce(level, '''') || ''x'''),
      ('total_sales',       'coalesce(total_sales, 0) + 1'),
      ('total_commission',  'coalesce(total_commission, 0) + 1000'),
      ('available_balance', 'coalesce(available_balance, 0) + 1000000'),
      ('approved_at',       'coalesce(approved_at, now()) + interval ''1 day'''),
      ('user_id',           quote_literal(gen_random_uuid()) || '::uuid'),
      ('referral_code',     quote_literal('HACK' || substr(md5(random()::text), 1, 6))),
      ('referred_by_id',    quote_literal(gen_random_uuid()) || '::uuid')
    ) AS t(col, expr)
    LOOP
      BEGIN
        PERFORM set_config('request.jwt.claims', json_build_object('sub', _agent_uid, 'role', 'authenticated')::text, true);
        SET LOCAL ROLE authenticated;
        EXECUTE format('UPDATE public.agents SET %I = %s WHERE id = %L', _c.col, _c.expr, _agent_id);
        RAISE EXCEPTION 'update applied' USING ERRCODE = 'XX001';
      EXCEPTION WHEN OTHERS THEN
        RESET ROLE;
        IF SQLSTATE = '42501' THEN
          _out := _out || format(E'PASS agents: owner cannot change %s (42501)\n', _c.col);
        ELSE
          _out := _out || format(E'FAIL agents: owner changing %s gave SQLSTATE %s (%s), expected 42501\n', _c.col, SQLSTATE, SQLERRM);
        END IF;
      END;
    END LOOP;

    -- Profile fields stay editable
    BEGIN
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _agent_uid, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      UPDATE public.agents
         SET name = name || ' ', bank_name = 'BCA', bank_account = '1234567890', account_name = 'Test Owner'
       WHERE id = _agent_id;
      GET DIAGNOSTICS _rc = ROW_COUNT;
      SELECT bank_name, bank_account, account_name INTO _r FROM public.agents WHERE id = _agent_id;
      RESET ROLE;
      IF _rc = 1 AND _r.bank_name = 'BCA' AND _r.bank_account = '1234567890' AND _r.account_name = 'Test Owner' THEN
        _out := _out || E'PASS agents: owner can edit name and bank fields\n';
      ELSE
        _out := _out || format(E'FAIL agents: owner profile edit affected %s rows, bank_name=%s\n', _rc, _r.bank_name);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      _out := _out || format(E'FAIL agents: owner profile edit raised %s (%s)\n', SQLSTATE, SQLERRM);
    END;
  END IF;

  -- Staff keep the ability to change those columns (admin tools depend on it)
  IF _agent_uid IS NOT NULL AND _staff_uid IS NOT NULL THEN
    BEGIN
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _staff_uid, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      UPDATE public.agents SET available_balance = coalesce(available_balance, 0) + 1 WHERE id = _agent_id;
      GET DIAGNOSTICS _rc = ROW_COUNT;
      RESET ROLE;
      IF _rc = 1 THEN
        _out := _out || E'PASS agents: staff (superadmin) can still change balance\n';
      ELSE
        _out := _out || format(E'FAIL agents: staff balance update affected %s rows\n', _rc);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      _out := _out || format(E'FAIL agents: staff balance update raised %s (%s)\n', SQLSTATE, SQLERRM);
    END;
  END IF;

  -- =============================================================================================
  -- 1a. agents: a self-registered row is forced to pending / 0 / bronze
  -- =============================================================================================
  _new_uid := gen_random_uuid();
  INSERT INTO auth.users (id, email, instance_id, aud, role)
  VALUES (_new_uid, 'sectest-' || _new_uid || '@example.invalid', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', _new_uid, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    INSERT INTO public.agents (user_id, email, phone, name, referral_code, status, level, total_sales, total_commission, available_balance, approved_at)
    VALUES (_new_uid, 'sectest@example.invalid', '0800000000', 'Security Test', 'SEC' || substr(md5(random()::text), 1, 6),
            'active', 'gold', 50, 9999999, 9999999, now())
    RETURNING status, level, total_sales, total_commission, available_balance, approved_at INTO _r;
    RESET ROLE;
    IF _r.status = 'pending' AND _r.level = 'bronze' AND _r.total_sales = 0 AND _r.total_commission = 0
       AND _r.available_balance = 0 AND _r.approved_at IS NULL THEN
      _out := _out || E'PASS agents: new row by non-staff forced to pending / bronze / balance 0 / no approved_at\n';
    ELSE
      _out := _out || format(E'FAIL agents: new row kept status=%s level=%s sales=%s commission=%s balance=%s approved_at=%s\n',
                             _r.status, _r.level, _r.total_sales, _r.total_commission, _r.available_balance, _r.approved_at);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'FAIL agents: self-registration insert raised %s (%s)\n', SQLSTATE, SQLERRM);
  END;

  -- =============================================================================================
  -- 1b. agent_withdrawals: pending, positive, within balance minus pending requests
  -- =============================================================================================
  IF _agent_uid IS NOT NULL THEN
    SELECT coalesce(sum(amount), 0) INTO _pend FROM public.agent_withdrawals WHERE agent_id = _agent_id AND status = 'pending';
    -- Give the agent a known spendable balance of exactly 1,000,000 (rolled back at the end).
    UPDATE public.agents SET available_balance = _pend + 1000000 WHERE id = _agent_id;

    -- Request with forged status / processed_at / admin_notes: stored as a clean pending request
    BEGIN
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _agent_uid, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      INSERT INTO public.agent_withdrawals (agent_id, amount, bank_name, bank_account, account_name, status, processed_at, admin_notes)
      VALUES (_agent_id, 100000, 'BCA', '1234567890', 'Test Owner', 'approved', now(), 'approved by me')
      RETURNING status, processed_at, admin_notes INTO _r;
      RESET ROLE;
      IF _r.status = 'pending' AND _r.processed_at IS NULL AND _r.admin_notes IS NULL THEN
        _out := _out || E'PASS withdrawals: forged status/processed_at/admin_notes forced to pending and empty\n';
      ELSE
        _out := _out || format(E'FAIL withdrawals: stored status=%s processed_at=%s admin_notes=%s\n', _r.status, _r.processed_at, _r.admin_notes);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      _out := _out || format(E'FAIL withdrawals: valid request raised %s (%s)\n', SQLSTATE, SQLERRM);
    END;

    -- Refused amounts: zero, negative, null, over balance minus pending (900,000 left now)
    FOR _c IN SELECT * FROM (VALUES
      ('amount 0', '0'), ('negative amount', '-5000'), ('null amount', 'NULL'),
      ('amount above balance minus pending by 1', '900001'), ('amount far above balance', '99999999')
    ) AS t(label, amt)
    LOOP
      BEGIN
        PERFORM set_config('request.jwt.claims', json_build_object('sub', _agent_uid, 'role', 'authenticated')::text, true);
        SET LOCAL ROLE authenticated;
        EXECUTE format('INSERT INTO public.agent_withdrawals (agent_id, amount, bank_name, bank_account, account_name) VALUES (%L, %s, ''BCA'', ''1'', ''X'')', _agent_id, _c.amt);
        RAISE EXCEPTION 'insert applied' USING ERRCODE = 'XX001';
      EXCEPTION WHEN OTHERS THEN
        RESET ROLE;
        IF SQLSTATE = '22023' THEN
          _out := _out || format(E'PASS withdrawals: %s refused (22023)\n', _c.label);
        ELSE
          _out := _out || format(E'FAIL withdrawals: %s gave SQLSTATE %s (%s), expected 22023\n', _c.label, SQLSTATE, SQLERRM);
        END IF;
      END;
    END LOOP;

    -- Exactly the remaining spendable amount is accepted
    BEGIN
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _agent_uid, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      INSERT INTO public.agent_withdrawals (agent_id, amount, bank_name, bank_account, account_name)
      VALUES (_agent_id, 900000, 'BCA', '1234567890', 'Test Owner');
      RESET ROLE;
      _out := _out || E'PASS withdrawals: amount equal to balance minus pending is accepted\n';
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      _out := _out || format(E'FAIL withdrawals: exact remaining balance raised %s (%s)\n', SQLSTATE, SQLERRM);
    END;

    -- Cannot request money on behalf of another agent
    IF _other_agent_id IS NULL THEN
      _out := _out || E'SKIP withdrawals: no second agent to test cross-agent request\n';
    ELSE
      BEGIN
        PERFORM set_config('request.jwt.claims', json_build_object('sub', _agent_uid, 'role', 'authenticated')::text, true);
        SET LOCAL ROLE authenticated;
        INSERT INTO public.agent_withdrawals (agent_id, amount, bank_name, bank_account, account_name)
        VALUES (_other_agent_id, 1000, 'BCA', '1', 'X');
        RAISE EXCEPTION 'insert applied' USING ERRCODE = 'XX001';
      EXCEPTION WHEN OTHERS THEN
        RESET ROLE;
        -- The guard trigger runs before the RLS check and sees no balance for a foreign agent (22023); if the
        -- trigger ever changes, RLS (42501) must still refuse it. Either way the request is not stored.
        IF SQLSTATE IN ('42501', '22023') THEN
          _out := _out || format(E'PASS withdrawals: agent cannot create a request for another agent (%s)\n', SQLSTATE);
        ELSE
          _out := _out || format(E'FAIL withdrawals: cross-agent request gave SQLSTATE %s (%s), expected 42501 or 22023\n', SQLSTATE, SQLERRM);
        END IF;
      END;
    END IF;
  END IF;

  -- =============================================================================================
  -- 1c. Owner write policies that were removed: an agent cannot edit own progress or click counts
  -- =============================================================================================
  IF _agent_uid IS NOT NULL THEN
    BEGIN
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _agent_uid, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      INSERT INTO public.agent_challenge_progress (agent_id, challenge_id, current_progress)
      VALUES (_agent_id, gen_random_uuid(), 999);
      RAISE EXCEPTION 'insert applied' USING ERRCODE = 'XX001';
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      IF SQLSTATE = '42501' THEN _out := _out || E'PASS agent_challenge_progress: agent cannot insert own progress (42501)\n';
      ELSE _out := _out || format(E'FAIL agent_challenge_progress: insert gave SQLSTATE %s (%s), expected 42501\n', SQLSTATE, SQLERRM); END IF;
    END;

    -- Updates the policy does not allow touch zero rows (or raise 42501); both mean "refused"
    BEGIN
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _agent_uid, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      UPDATE public.agent_challenge_progress SET current_progress = 999 WHERE agent_id = _agent_id;
      GET DIAGNOSTICS _rc = ROW_COUNT;
      RESET ROLE;
      IF _rc = 0 THEN _out := _out || E'PASS agent_challenge_progress: agent cannot update own progress (0 rows)\n';
      ELSE _out := _out || format(E'FAIL agent_challenge_progress: agent updated %s own progress rows\n', _rc); END IF;
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      IF SQLSTATE = '42501' THEN _out := _out || E'PASS agent_challenge_progress: agent cannot update own progress (42501)\n';
      ELSE _out := _out || format(E'FAIL agent_challenge_progress: update gave SQLSTATE %s (%s)\n', SQLSTATE, SQLERRM); END IF;
    END;

    BEGIN
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _agent_uid, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      INSERT INTO public.agent_short_links (agent_id, short_code, original_url, title)
      VALUES (_agent_id, 'sectest' || substr(md5(random()::text), 1, 8), 'https://example.invalid/', 'Security test');
      UPDATE public.agent_short_links SET click_count = 99999 WHERE agent_id = _agent_id;
      GET DIAGNOSTICS _rc = ROW_COUNT;
      RESET ROLE;
      IF _rc = 0 THEN _out := _out || E'PASS agent_short_links: agent cannot update own links, so click_count cannot be forged (0 rows)\n';
      ELSE _out := _out || format(E'FAIL agent_short_links: agent updated %s own link rows\n', _rc); END IF;
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      IF SQLSTATE = '42501' THEN _out := _out || E'PASS agent_short_links: agent cannot update own links (42501)\n';
      ELSE _out := _out || format(E'FAIL agent_short_links: link update check raised %s (%s)\n', SQLSTATE, SQLERRM); END IF;
    END;
  END IF;

  -- =============================================================================================
  -- 3. Functions: anon holds only what a visitor really calls
  -- =============================================================================================
  FOREACH _fn IN ARRAY ARRAY['record_payment_va_details', 'release_expired_booking_holds', 'create_calculator_lead',
                             'admin_mark_payment_settled', 'cancel_booking', 'create_booking', 'create_booking_payment',
                             'mark_refund_sent', 'log_agent_sale']
  LOOP
    SELECT count(*), count(*) FILTER (WHERE has_function_privilege('anon', p.oid, 'EXECUTE'))
      INTO _n, _m
      FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
     WHERE ns.nspname = 'public' AND p.proname = _fn;
    IF _n = 0 THEN
      _out := _out || format(E'SKIP functions: public.%s does not exist\n', _fn);
    ELSIF _m = 0 THEN
      _out := _out || format(E'PASS functions: anon cannot execute %s\n', _fn);
    ELSE
      _out := _out || format(E'FAIL functions: anon CAN execute %s (%s overload(s))\n', _fn, _m);
    END IF;
  END LOOP;

  -- Server-side only: not even signed-in users, but the service role keeps them
  FOREACH _fn IN ARRAY ARRAY['record_payment_va_details', 'release_expired_booking_holds', 'create_calculator_lead',
                             'log_jamaah_change', 'jamaah_payments_after_change', 'jamaah_payments_guard',
                             'jamaah_registrations_after_change', 'jamaah_registrations_touch', 'handle_new_agent_notification',
                             'generate_intake_code', 'protect_website_seat_source', 'site_events_stamp',
                             'protect_agent_columns', 'guard_agent_withdrawal', 'limit_calculator_leads']
  LOOP
    SELECT count(*), count(*) FILTER (WHERE has_function_privilege('authenticated', p.oid, 'EXECUTE'))
      INTO _n, _m
      FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
     WHERE ns.nspname = 'public' AND p.proname = _fn;
    IF _n = 0 THEN
      _out := _out || format(E'SKIP functions: public.%s does not exist\n', _fn);
    ELSIF _m = 0 THEN
      _out := _out || format(E'PASS functions: authenticated cannot execute %s\n', _fn);
    ELSE
      _out := _out || format(E'FAIL functions: authenticated CAN execute %s\n', _fn);
    END IF;
  END LOOP;

  FOREACH _fn IN ARRAY ARRAY['record_payment_va_details', 'release_expired_booking_holds']
  LOOP
    SELECT count(*), count(*) FILTER (WHERE has_function_privilege('service_role', p.oid, 'EXECUTE'))
      INTO _n, _m
      FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
     WHERE ns.nspname = 'public' AND p.proname = _fn;
    IF _n = 0 THEN
      _out := _out || format(E'SKIP functions: public.%s does not exist\n', _fn);
    ELSIF _m = _n THEN
      _out := _out || format(E'PASS functions: service_role can execute %s\n', _fn);
    ELSE
      _out := _out || format(E'FAIL functions: service_role cannot execute %s\n', _fn);
    END IF;
  END LOOP;

  -- Allowlist: anything else a migration grants to anon must be a deliberate decision. If this fails after
  -- you added a public RPC on purpose, add its name below.
  SELECT string_agg(p.oid::regprocedure::text, ', ' ORDER BY p.proname) INTO _list
    FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
   WHERE ns.nspname = 'public' AND p.prokind = 'f' AND has_function_privilege('anon', p.oid, 'EXECUTE')
     AND p.proname NOT IN ('get_calculator_lead_by_token', 'has_role', 'redirect_agent_short_link');
  IF _list IS NULL THEN
    _out := _out || E'PASS functions: anon can execute only the allowlisted functions (get_calculator_lead_by_token, has_role, redirect_agent_short_link)\n';
  ELSE
    _out := _out || format(E'FAIL functions: anon can execute functions outside the allowlist: %s\n', _list);
  END IF;

  -- =============================================================================================
  -- 4. Tables: grants under RLS
  -- =============================================================================================
  -- Real attempt: anon TRUNCATE is refused before anything is touched
  BEGIN
    PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
    SET LOCAL ROLE anon;
    TRUNCATE TABLE public.site_events;
    RAISE EXCEPTION 'truncate applied' USING ERRCODE = 'XX001';
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    IF SQLSTATE = '42501' THEN
      _out := _out || E'PASS tables: anon TRUNCATE is refused (42501)\n';
    ELSE
      _out := _out || format(E'FAIL tables: anon TRUNCATE gave SQLSTATE %s (%s)\n', SQLSTATE, SQLERRM);
    END IF;
  END;

  -- Every table and view in public
  SELECT string_agg(c.relname, ', ' ORDER BY c.relname) INTO _list
    FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
   WHERE ns.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm')
     AND (has_table_privilege('anon', c.oid, 'TRUNCATE') OR has_table_privilege('anon', c.oid, 'REFERENCES')
          OR has_table_privilege('anon', c.oid, 'TRIGGER'));
  IF _list IS NULL THEN _out := _out || E'PASS tables: anon has no TRUNCATE / REFERENCES / TRIGGER on any public table\n';
  ELSE _out := _out || format(E'FAIL tables: anon has TRUNCATE/REFERENCES/TRIGGER on: %s\n', _list); END IF;

  SELECT string_agg(c.relname, ', ' ORDER BY c.relname) INTO _list
    FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
   WHERE ns.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm')
     AND (has_table_privilege('authenticated', c.oid, 'TRUNCATE') OR has_table_privilege('authenticated', c.oid, 'REFERENCES')
          OR has_table_privilege('authenticated', c.oid, 'TRIGGER'));
  IF _list IS NULL THEN _out := _out || E'PASS tables: authenticated has no TRUNCATE / REFERENCES / TRIGGER on any public table\n';
  ELSE _out := _out || format(E'FAIL tables: authenticated has TRUNCATE/REFERENCES/TRIGGER on: %s\n', _list); END IF;

  -- anon writes: only INSERT on the four analytics / lead tables
  SELECT string_agg(c.relname, ', ' ORDER BY c.relname) INTO _list
    FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
   WHERE ns.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm')
     AND (has_table_privilege('anon', c.oid, 'UPDATE') OR has_table_privilege('anon', c.oid, 'DELETE')
          OR has_any_column_privilege('anon', c.oid, 'UPDATE'));
  IF _list IS NULL THEN _out := _out || E'PASS tables: anon has no UPDATE / DELETE on any public table\n';
  ELSE _out := _out || format(E'FAIL tables: anon has UPDATE/DELETE on: %s\n', _list); END IF;

  SELECT string_agg(c.relname, ', ' ORDER BY c.relname) INTO _list
    FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
   WHERE ns.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm')
     AND (has_table_privilege('anon', c.oid, 'INSERT') OR has_any_column_privilege('anon', c.oid, 'INSERT'))
     AND c.relname NOT IN ('site_events', 'whatsapp_clicks', 'short_link_clicks', 'umroh_calculator_leads');
  IF _list IS NULL THEN _out := _out || E'PASS tables: anon can INSERT only into site_events, whatsapp_clicks, short_link_clicks, umroh_calculator_leads\n';
  ELSE _out := _out || format(E'FAIL tables: anon can INSERT into: %s\n', _list); END IF;

  SELECT string_agg(c.relname, ', ' ORDER BY c.relname) INTO _list
    FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
   WHERE ns.nspname = 'public' AND c.relname IN ('site_events', 'whatsapp_clicks', 'short_link_clicks', 'umroh_calculator_leads')
     AND NOT has_table_privilege('anon', c.oid, 'INSERT');
  IF _list IS NULL THEN _out := _out || E'PASS tables: anon can still INSERT into the four allowed tables\n';
  ELSE _out := _out || format(E'FAIL tables: anon lost INSERT on: %s (the site needs it)\n', _list); END IF;

  -- Real attempts as anon: write to a table it should never write to
  FOREACH _fn IN ARRAY ARRAY['agents', 'packages', 'user_roles', 'jamaah_registrations']
  LOOP
    BEGIN
      PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
      SET LOCAL ROLE anon;
      EXECUTE format('DELETE FROM public.%I', _fn);
      RAISE EXCEPTION 'delete applied' USING ERRCODE = 'XX001';
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      IF SQLSTATE = '42501' THEN
        _out := _out || format(E'PASS tables: anon DELETE on %s refused (42501)\n', _fn);
      ELSE
        _out := _out || format(E'FAIL tables: anon DELETE on %s gave SQLSTATE %s (%s)\n', _fn, SQLSTATE, SQLERRM);
      END IF;
    END;
  END LOOP;

  -- The ranking is a function (get_agent_leaderboard), not a view: a view runs with its owner's rights and anon/any signed-in
  -- account could read every agent's name and total commission. A visitor without a login must not be able to call it at all.
  BEGIN
    PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
    SET LOCAL ROLE anon;
    SELECT count(*) INTO _n FROM public.get_agent_leaderboard();
    RESET ROLE;
    _out := _out || format(E'FAIL tables: anon called get_agent_leaderboard() and got %s rows\n', _n);
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    IF SQLSTATE = '42501' THEN _out := _out || E'PASS tables: anon cannot call get_agent_leaderboard() (42501)\n';
    ELSE _out := _out || format(E'FAIL tables: anon call of get_agent_leaderboard() raised %s (%s)\n', SQLSTATE, SQLERRM); END IF;
  END;
  IF to_regclass('public.agent_leaderboard') IS NULL THEN _out := _out || E'PASS tables: the agent_leaderboard view (name + total_commission of every agent) is gone\n';
  ELSE _out := _out || E'FAIL tables: view public.agent_leaderboard still exists\n'; END IF;

  -- Private tables show anon nothing, even when they hold rows
  FOREACH _fn IN ARRAY ARRAY['agents', 'agent_sales', 'agent_withdrawals', 'user_roles', 'jamaah_registrations',
                             'jamaah_payments', 'jamaah_intakes', 'jamaah_intake_people', 'cogs_defaults']
  LOOP
    EXECUTE format('SELECT count(*) FROM public.%I', _fn) INTO _n;
    IF _n = 0 THEN
      _out := _out || format(E'SKIP tables: %s is empty, cannot show anon sees nothing\n', _fn);
      CONTINUE;
    END IF;
    BEGIN
      PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
      SET LOCAL ROLE anon;
      EXECUTE format('SELECT count(*) FROM public.%I', _fn) INTO _m;
      RESET ROLE;
      IF _m = 0 THEN _out := _out || format(E'PASS tables: anon sees 0 rows of %s (%s exist)\n', _fn, _n);
      ELSE _out := _out || format(E'FAIL tables: anon sees %s of %s rows in %s\n', _m, _n, _fn); END IF;
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      IF SQLSTATE = '42501' THEN _out := _out || format(E'PASS tables: anon cannot read %s (42501)\n', _fn);
      ELSE _out := _out || format(E'FAIL tables: anon read of %s gave SQLSTATE %s (%s)\n', _fn, SQLSTATE, SQLERRM); END IF;
    END;
  END LOOP;

  -- =============================================================================================
  -- 7. packages: anon reads the public columns only
  -- =============================================================================================
  FOR _c IN SELECT * FROM (VALUES
    ('SELECT * FROM public.packages LIMIT 1', 'select *'),
    ('SELECT cogs_data FROM public.packages LIMIT 1', 'select cogs_data'),
    ('SELECT cogs_status FROM public.packages LIMIT 1', 'select cogs_status'),
    ('SELECT max_discount FROM public.packages LIMIT 1', 'select max_discount'),
    ('SELECT agent_commission_amount FROM public.packages LIMIT 1', 'select agent_commission_amount'),
    ('SELECT change_reason FROM public.packages LIMIT 1', 'select change_reason')
  ) AS t(q, label)
  LOOP
    BEGIN
      PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
      SET LOCAL ROLE anon;
      EXECUTE _c.q;
      RAISE EXCEPTION 'select applied' USING ERRCODE = 'XX001';
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      IF SQLSTATE = '42501' THEN _out := _out || format(E'PASS packages: anon %s refused (42501)\n', _c.label);
      ELSE _out := _out || format(E'FAIL packages: anon %s gave SQLSTATE %s (%s), expected 42501\n', _c.label, SQLSTATE, SQLERRM); END IF;
    END;
  END LOOP;

  BEGIN
    PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
    SET LOCAL ROLE anon;
    EXECUTE 'SELECT count(*) FROM (SELECT ' || _cols || ' FROM public.packages WHERE status = ''published'' LIMIT 5) x' INTO _n;
    RESET ROLE;
    _out := _out || format(E'PASS packages: anon can select the explicit public column list (%s rows read)\n', _n);
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'FAIL packages: anon public column list raised %s (%s)\n', SQLSTATE, SQLERRM);
  END;

  BEGIN
    PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
    SET LOCAL ROLE anon;
    SELECT count(*) INTO _n FROM public.packages;
    RESET ROLE;
    SELECT count(*) INTO _m FROM public.packages WHERE status = 'published';
    IF _n = _m THEN _out := _out || format(E'PASS packages: anon count(*) works and sees only published rows (%s)\n', _n);
    ELSE _out := _out || format(E'FAIL packages: anon count(*) = %s but %s are published\n', _n, _m); END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'FAIL packages: anon count(*) raised %s (%s)\n', SQLSTATE, SQLERRM);
  END;

  IF _staff_uid IS NOT NULL THEN
    BEGIN
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _staff_uid, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      SELECT count(*) INTO _n FROM (SELECT * FROM public.packages LIMIT 5) x;
      SELECT count(*) INTO _m FROM (SELECT cogs_data FROM public.packages LIMIT 5) x;
      RESET ROLE;
      _out := _out || E'PASS packages: signed-in staff can select * and cogs_data\n';
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      _out := _out || format(E'FAIL packages: staff select * raised %s (%s)\n', SQLSTATE, SQLERRM);
    END;
  END IF;

  -- =============================================================================================
  -- 5. cogs_defaults: staff only
  -- =============================================================================================
  SELECT count(*) INTO _n FROM public.cogs_defaults;
  IF _n = 0 THEN
    _out := _out || E'SKIP cogs_defaults: table is empty\n';
  ELSE
    IF _agent_uid IS NOT NULL THEN
      BEGIN
        PERFORM set_config('request.jwt.claims', json_build_object('sub', _agent_uid, 'role', 'authenticated')::text, true);
        SET LOCAL ROLE authenticated;
        SELECT count(*) INTO _m FROM public.cogs_defaults;
        RESET ROLE;
        IF _m = 0 THEN _out := _out || format(E'PASS cogs_defaults: plain agent sees 0 of %s rows\n', _n);
        ELSE _out := _out || format(E'FAIL cogs_defaults: plain agent sees %s of %s rows\n', _m, _n); END IF;
      EXCEPTION WHEN OTHERS THEN
        RESET ROLE;
        IF SQLSTATE = '42501' THEN _out := _out || E'PASS cogs_defaults: plain agent refused (42501)\n';
        ELSE _out := _out || format(E'FAIL cogs_defaults: plain agent read raised %s (%s)\n', SQLSTATE, SQLERRM); END IF;
      END;
    END IF;
    FOR _c IN SELECT * FROM (VALUES ('superadmin', _staff_uid), ('product_admin', _pa_uid)) AS t(label, uid)
    LOOP
      IF _c.uid IS NULL THEN
        _out := _out || format(E'SKIP cogs_defaults: no %s user\n', _c.label);
        CONTINUE;
      END IF;
      BEGIN
        PERFORM set_config('request.jwt.claims', json_build_object('sub', _c.uid, 'role', 'authenticated')::text, true);
        SET LOCAL ROLE authenticated;
        SELECT count(*) INTO _m FROM public.cogs_defaults;
        RESET ROLE;
        IF _m = _n THEN _out := _out || format(E'PASS cogs_defaults: %s sees all %s rows\n', _c.label, _n);
        ELSE _out := _out || format(E'FAIL cogs_defaults: %s sees %s of %s rows\n', _c.label, _m, _n); END IF;
      EXCEPTION WHEN OTHERS THEN
        RESET ROLE;
        _out := _out || format(E'FAIL cogs_defaults: %s read raised %s (%s)\n', _c.label, SQLSTATE, SQLERRM);
      END;
    END LOOP;
  END IF;

  -- =============================================================================================
  -- 2. Storage: agent-documents is private per owner
  -- =============================================================================================
  SELECT count(*) INTO _n FROM pg_policies
   WHERE schemaname = 'storage' AND tablename = 'objects'
     AND policyname IN ('Bisa Lihat 1w100z4_0', 'Bisa Upload 1w100z4_0', 'Anyone can upload design request attachments');
  IF _n = 0 THEN _out := _out || E'PASS storage: the three leftover open policies are gone\n';
  ELSE _out := _out || format(E'FAIL storage: %s leftover open storage polic(ies) are back\n', _n); END IF;

  IF _agent_uid IS NOT NULL THEN
    _new_uid := gen_random_uuid(); -- an unrelated owner; storage.objects.owner has no foreign key
    INSERT INTO storage.objects (bucket_id, name, owner)
    VALUES ('agent-documents', _new_uid || '/sectest-ktp.jpg', _new_uid),
           ('agent-documents', _agent_uid || '/sectest-own.jpg', _agent_uid);
    BEGIN
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _agent_uid, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      SELECT count(*) INTO _n FROM storage.objects
       WHERE bucket_id = 'agent-documents' AND name = _new_uid || '/sectest-ktp.jpg';
      SELECT count(*) INTO _m FROM storage.objects
       WHERE bucket_id = 'agent-documents' AND owner IS DISTINCT FROM _agent_uid
         AND (string_to_array(name, '/'))[1] IS DISTINCT FROM _agent_uid::text;
      SELECT count(*) INTO _rc FROM storage.objects
       WHERE bucket_id = 'agent-documents' AND name = _agent_uid || '/sectest-own.jpg';
      RESET ROLE;
      IF _n = 0 AND _m = 0 THEN _out := _out || E'PASS storage: plain agent sees no other agent''s documents in agent-documents\n';
      ELSE _out := _out || format(E'FAIL storage: plain agent sees %s planted + %s other documents of other owners\n', _n, _m); END IF;
      IF _rc = 1 THEN _out := _out || E'PASS storage: plain agent still sees own document\n';
      ELSE _out := _out || format(E'FAIL storage: plain agent sees %s of own planted document\n', _rc); END IF;
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      _out := _out || format(E'FAIL storage: agent-documents read raised %s (%s)\n', SQLSTATE, SQLERRM);
    END;
  END IF;

  -- =============================================================================================
  -- 8. Lead rate limiter (anon): 5 per WhatsApp number per hour, payload <= 20000 bytes
  -- =============================================================================================
  SELECT count(*) INTO _n FROM public.umroh_calculator_leads WHERE created_at > now() - interval '1 hour';
  IF _n >= 290 THEN
    _out := _out || format(E'SKIP lead limiter: %s real leads in the last hour, global cap of 300 would interfere\n', _n);
  ELSE
    _wa := '08' || lpad(floor(random() * 1e9)::bigint::text, 9, '0');
    BEGIN
      PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
      SET LOCAL ROLE anon;
      FOR i IN 1..5 LOOP
        INSERT INTO public.umroh_calculator_leads (name, whatsapp, monthly_saving, pilgrim_count, existing_savings)
        VALUES ('Limiter Test', _wa, 1000000, 1, 0);
      END LOOP;
      RESET ROLE;
      _out := _out || E'PASS lead limiter: first 5 submissions from one number are accepted\n';
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      _out := _out || format(E'FAIL lead limiter: first 5 submissions raised %s (%s)\n', SQLSTATE, SQLERRM);
    END;

    BEGIN
      PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
      SET LOCAL ROLE anon;
      INSERT INTO public.umroh_calculator_leads (name, whatsapp, monthly_saving, pilgrim_count, existing_savings)
      VALUES ('Limiter Test', _wa, 1000000, 1, 0);
      RAISE EXCEPTION 'insert applied' USING ERRCODE = 'XX001';
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      IF SQLSTATE = 'P0001' THEN _out := _out || E'PASS lead limiter: 6th submission from the same number in an hour is refused (P0001)\n';
      ELSE _out := _out || format(E'FAIL lead limiter: 6th submission gave SQLSTATE %s (%s), expected P0001\n', SQLSTATE, SQLERRM); END IF;
    END;

    BEGIN
      PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
      SET LOCAL ROLE anon;
      INSERT INTO public.umroh_calculator_leads (name, whatsapp, monthly_saving, pilgrim_count, existing_savings)
      VALUES ('Limiter Test', '09' || substr(_wa, 3), 1000000, 1, 0);
      RESET ROLE;
      _out := _out || E'PASS lead limiter: a different number is still accepted\n';
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      _out := _out || format(E'FAIL lead limiter: different number raised %s (%s)\n', SQLSTATE, SQLERRM);
    END;

    -- Payload above 20000 bytes (md5 text does not compress)
    SELECT jsonb_build_object('blob', string_agg(md5(i::text), '')) INTO _big FROM generate_series(1, 800) i;
    BEGIN
      PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
      SET LOCAL ROLE anon;
      INSERT INTO public.umroh_calculator_leads (name, whatsapp, monthly_saving, pilgrim_count, existing_savings, result_data)
      VALUES ('Limiter Test', '07' || substr(_wa, 3), 1000000, 1, 0, _big);
      RAISE EXCEPTION 'insert applied' USING ERRCODE = 'XX001';
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      IF SQLSTATE = '22023' THEN _out := _out || E'PASS lead limiter: payload over 20000 bytes refused (22023)\n';
      ELSE _out := _out || format(E'FAIL lead limiter: oversized payload gave SQLSTATE %s (%s), expected 22023\n', SQLSTATE, SQLERRM); END IF;
    END;

    -- Server-side roles are exempt (the limiter only guards anon/authenticated clients)
    BEGIN
      SET LOCAL ROLE service_role;
      INSERT INTO public.umroh_calculator_leads (name, whatsapp, monthly_saving, pilgrim_count, existing_savings, result_data)
      VALUES ('Limiter Test', '06' || substr(_wa, 3), 1000000, 1, 0, _big);
      RESET ROLE;
      _out := _out || E'PASS lead limiter: service_role is not limited\n';
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      _out := _out || format(E'FAIL lead limiter: service_role insert raised %s (%s)\n', SQLSTATE, SQLERRM);
    END;
  END IF;

  -- =============================================================================================
  -- 6. site_events: bounded text, valid event accepted
  -- =============================================================================================
  BEGIN
    PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
    SET LOCAL ROLE anon;
    INSERT INTO public.site_events (visitor_id, session_id, event, path)
    VALUES (gen_random_uuid(), gen_random_uuid(), 'page_view', '/paket-umroh');
    RESET ROLE;
    _out := _out || E'PASS site_events: valid page_view from anon is accepted\n';
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'FAIL site_events: valid page_view raised %s (%s)\n', SQLSTATE, SQLERRM);
  END;

  FOR _c IN SELECT * FROM (VALUES
    ('event of 65 chars',  'repeat(''e'', 65)', '''/'''),
    ('path of 501 chars',  '''page_view''',    'repeat(''p'', 501)')
  ) AS t(label, ev, pth)
  LOOP
    BEGIN
      PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
      SET LOCAL ROLE anon;
      EXECUTE format('INSERT INTO public.site_events (visitor_id, session_id, event, path) VALUES (gen_random_uuid(), gen_random_uuid(), %s, %s)', _c.ev, _c.pth);
      RAISE EXCEPTION 'insert applied' USING ERRCODE = 'XX001';
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      IF SQLSTATE = '42501' THEN _out := _out || format(E'PASS site_events: %s refused (42501)\n', _c.label);
      ELSE _out := _out || format(E'FAIL site_events: %s gave SQLSTATE %s (%s), expected 42501\n', _c.label, SQLSTATE, SQLERRM); END IF;
    END;
  END LOOP;

  -- Other legal events with the longest path the table itself allows (CHECK path <= 300) are accepted
  BEGIN
    PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
    SET LOCAL ROLE anon;
    INSERT INTO public.site_events (visitor_id, session_id, event, path, device, utm_source)
    VALUES (gen_random_uuid(), gen_random_uuid(), 'view_content', repeat('p', 300), 'mobile', 'instagram');
    RESET ROLE;
    _out := _out || E'PASS site_events: view_content with a 300 char path, device and utm_source is accepted\n';
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'FAIL site_events: boundary-sized values raised %s (%s)\n', SQLSTATE, SQLERRM);
  END;

  -- =============================================================================================
  -- RLS enabled on every table in public
  -- =============================================================================================
  SELECT count(*) INTO _n FROM pg_tables WHERE schemaname = 'public';
  FOR _c IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND NOT rowsecurity ORDER BY tablename
  LOOP
    _out := _out || format(E'FAIL rls: row level security is NOT enabled on public.%s\n', _c.tablename);
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND NOT rowsecurity) THEN
    _out := _out || format(E'PASS rls: row level security is enabled on all %s tables in public\n', _n);
  END IF;

  RAISE EXCEPTION E'RESULTS\n%', _out;
END
$$;
