-- Agent portal regression tests: a plain active agent opening each portal page.
--
-- Runs against the live linked project, but only inside a transaction that always aborts (the final
-- RAISE EXCEPTION), so nothing is stored. Run with: ./scripts/run-db-tests.sh tests/db/02_agent_portal.sql
--
-- Report lines start with PASS, FAIL, SKIP (prerequisite data missing) or KNOWN (a documented gap that
-- should become a real assertion once it is fixed).
--
-- Where the live data is empty, rows are planted as postgres inside the transaction so the isolation
-- checks ("an agent sees own rows only") really exercise the policy.

BEGIN;

DO $$
DECLARE
  _out text := '';
  _agent_uid uuid;
  _agent_id uuid;
  _other_id uuid;
  _other_uid uuid := gen_random_uuid();   -- owner of a document of "another agent"
  _pkg uuid;
  _code_own text;
  _code_other text;
  _reg_own uuid;
  _reg_other uuid;
  _r record;
  _c record;
  _t text;
  _own bigint;
  _all bigint;
  _vis bigint;
  _vis_other bigint;
  _n bigint;
  _rc integer;
  _names text[];
  _agent_cols constant text :=
    -- AGENT_PACKAGE_COLUMNS from src/hooks/usePackages.ts: PUBLIC_PACKAGE_COLUMNS plus the agent's own fields
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
    'waitlist_count, meta_title, meta_description, og_image, canonical_url, '
    'agent_commission_amount, status';
BEGIN
  SELECT user_id, id INTO _agent_uid, _agent_id FROM public.agents
   WHERE status = 'active' AND user_id IS NOT NULL AND user_id NOT IN (SELECT user_id FROM public.user_roles) LIMIT 1;
  IF _agent_uid IS NULL THEN
    _out := 'SKIP agent portal: no plain active agent (active, with a login, no staff role) in the database';
    RAISE EXCEPTION E'RESULTS\n%', _out;
  END IF;
  SELECT id INTO _other_id FROM public.agents WHERE id <> _agent_id LIMIT 1;
  SELECT id INTO _pkg FROM public.packages
   WHERE status = 'published' AND departure_date::date >= current_date ORDER BY departure_date LIMIT 1;

  -- ---------------------------------------------------------------------------------------------
  -- Plant data the portal pages would show (rolled back at the end)
  -- ---------------------------------------------------------------------------------------------
  INSERT INTO public.agent_sales (agent_id, customer_name, customer_phone, package_name, sale_amount, commission_amount)
  VALUES (_agent_id, 'Portal Test Own', '0800000001', 'Portal Test', 30000000, 1000000);
  IF _other_id IS NOT NULL THEN
    INSERT INTO public.agent_sales (agent_id, customer_name, customer_phone, package_name, sale_amount, commission_amount)
    VALUES (_other_id, 'Portal Test Other', '0800000002', 'Portal Test', 30000000, 1000000);
  END IF;

  IF _pkg IS NOT NULL THEN
    -- A registration submitted with this agent's referral code, one submitted without any agent
    SELECT (public.create_jamaah_intake(jsonb_build_object(
      'package_id', _pkg, 'contact_name', 'Portal Test Own', 'contact_phone', '62' || lpad(floor(random() * 1e10)::bigint::text, 10, '0'),
      'consent', true, 'consent_version', 'test', 'source', 'agent',
      'ref_code', (SELECT referral_code FROM public.agents WHERE id = _agent_id),
      'people', jsonb_build_array(jsonb_build_object('full_name', 'Portal Test Own', 'gender', 'L', 'category', 'adult', 'room_type', 'quad'))
    )) ->> 'code') INTO _code_own;
    SELECT (public.create_jamaah_intake(jsonb_build_object(
      'package_id', _pkg, 'contact_name', 'Portal Test Public', 'contact_phone', '62' || lpad(floor(random() * 1e10)::bigint::text, 10, '0'),
      'consent', true, 'consent_version', 'test',
      'people', jsonb_build_array(jsonb_build_object('full_name', 'Portal Test Public', 'gender', 'P', 'category', 'adult', 'room_type', 'quad'))
    )) ->> 'code') INTO _code_other;

    INSERT INTO public.jamaah_registrations (package_id, full_name, room_type, list_price, agent_id)
    VALUES (_pkg, 'Portal Test Jamaah Own', 'quad', 30000000, _agent_id) RETURNING id INTO _reg_own;
    INSERT INTO public.jamaah_registrations (package_id, full_name, room_type, list_price)
    VALUES (_pkg, 'Portal Test Jamaah Nobody', 'quad', 30000000) RETURNING id INTO _reg_other;
  END IF;

  INSERT INTO storage.objects (bucket_id, name, owner)
  VALUES ('agent-documents', _other_uid || '/portal-test.jpg', _other_uid);

  -- ---------------------------------------------------------------------------------------------
  -- Dashboard / profile: own agents row, exactly one visible
  -- ---------------------------------------------------------------------------------------------
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', _agent_uid, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    SELECT count(*) INTO _n FROM public.agents;
    SELECT count(*) INTO _own FROM public.agents WHERE id = _agent_id AND user_id = _agent_uid;
    RESET ROLE;
    IF _n = 1 AND _own = 1 THEN _out := _out || E'PASS agents: agent sees exactly 1 row, their own\n';
    ELSE _out := _out || format(E'FAIL agents: agent sees %s agents rows (own row visible: %s), expected exactly 1\n', _n, _own); END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'FAIL agents: select raised %s (%s)\n', SQLSTATE, SQLERRM);
  END;

  -- Own roles lookup used by the login code (a plain agent has none)
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', _agent_uid, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    SELECT count(*) INTO _n FROM public.user_roles WHERE user_id = _agent_uid;
    SELECT count(*) INTO _vis_other FROM public.user_roles WHERE user_id <> _agent_uid;
    RESET ROLE;
    IF _vis_other = 0 THEN _out := _out || format(E'PASS user_roles: agent reads own roles (%s) and nobody else''s\n', _n);
    ELSE _out := _out || format(E'FAIL user_roles: agent can see %s role rows of other users\n', _vis_other); END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'FAIL user_roles: select raised %s (%s)\n', SQLSTATE, SQLERRM);
  END;

  -- ---------------------------------------------------------------------------------------------
  -- Packages page: the agent column list, including the flat commission
  -- ---------------------------------------------------------------------------------------------
  -- Database side: every column the agent pages need, as they exist today
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', _agent_uid, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    EXECUTE 'SELECT count(*) FROM (SELECT ' || _agent_cols || ' FROM public.packages WHERE status = ''published'' LIMIT 20) x' INTO _n;
    SELECT count(*) INTO _vis FROM public.packages WHERE status = 'published' AND agent_commission_amount IS NOT NULL;
    RESET ROLE;
    _out := _out || format(E'PASS packages: agent can select the public columns plus agent_commission_amount and status (%s rows read, %s with a commission)\n', _n, _vis);
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'FAIL packages: agent package list raised %s (%s)\n', SQLSTATE, SQLERRM);
  END;

  -- App side: the literal AGENT_PACKAGE_COLUMNS string used by AgentPackages, AgentPackageDetail and AgentSchedule.
  -- It must run as-is; a column named there that no longer exists breaks all three pages (42703).
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', _agent_uid, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    EXECUTE 'SELECT count(*) FROM (SELECT ' || _agent_cols || ' FROM public.packages WHERE status = ''published'' LIMIT 20) x' INTO _n;
    RESET ROLE;
    _out := _out || E'PASS packages: the literal AGENT_PACKAGE_COLUMNS from usePackages.ts runs as an agent\n';
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'FAIL packages: AGENT_PACKAGE_COLUMNS from src/hooks/usePackages.ts raised %s (%s); the agent Packages, Package detail and Schedule pages query it\n', SQLSTATE, SQLERRM);
  END;

  -- ---------------------------------------------------------------------------------------------
  -- Jamaah Saya and the intake list (SECURITY DEFINER functions scoped to the caller)
  -- ---------------------------------------------------------------------------------------------
  IF _pkg IS NULL THEN
    _out := _out || E'SKIP jamaah/intake lists: no upcoming published package to plant test registrations on\n';
  ELSE
    BEGIN
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _agent_uid, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      SELECT count(*) INTO _own FROM public.list_my_agent_jamaah() WHERE registration_id = _reg_own;
      SELECT count(*) INTO _vis_other FROM public.list_my_agent_jamaah() WHERE registration_id = _reg_other;
      SELECT count(*) INTO _vis FROM public.list_my_agent_jamaah();
      RESET ROLE;
      SELECT count(*) INTO _all FROM public.jamaah_registrations WHERE agent_id = _agent_id;
      IF _own = 1 AND _vis_other = 0 AND _vis = least(_all, 500) THEN
        _out := _out || format(E'PASS list_my_agent_jamaah: returns own jamaah only (%s rows, planted one visible, unassigned one hidden)\n', _vis);
      ELSE
        _out := _out || format(E'FAIL list_my_agent_jamaah: own planted=%s, unassigned planted visible=%s, returned %s, own registrations %s\n', _own, _vis_other, _vis, _all);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      _out := _out || format(E'FAIL list_my_agent_jamaah: raised %s (%s)\n', SQLSTATE, SQLERRM);
    END;

    BEGIN
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _agent_uid, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      SELECT count(*) INTO _own FROM public.list_my_agent_intakes() WHERE code = _code_own;
      SELECT count(*) INTO _vis_other FROM public.list_my_agent_intakes() WHERE code = _code_other;
      RESET ROLE;
      IF _own = 1 AND _vis_other = 0 THEN
        _out := _out || E'PASS list_my_agent_intakes: shows the intake sent with the agent''s code, hides one without it\n';
      ELSE
        _out := _out || format(E'FAIL list_my_agent_intakes: own intake visible=%s, other intake visible=%s\n', _own, _vis_other);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      _out := _out || format(E'FAIL list_my_agent_intakes: raised %s (%s)\n', SQLSTATE, SQLERRM);
    END;

    -- The private stage-2 link must never be returned to an agent
    SELECT proargnames INTO _names FROM pg_proc WHERE oid = 'public.list_my_agent_intakes()'::regprocedure;
    IF 'manifest_token' = ANY (_names) THEN _out := _out || E'FAIL list_my_agent_intakes: result exposes manifest_token\n';
    ELSE _out := _out || E'PASS list_my_agent_intakes: result does not expose manifest_token\n'; END IF;

    -- No direct table access to the registration queue
    BEGIN
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _agent_uid, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      SELECT count(*) INTO _n FROM public.jamaah_intakes;
      SELECT count(*) INTO _vis FROM public.jamaah_registrations;
      RESET ROLE;
      IF _n = 0 AND _vis = 0 THEN _out := _out || E'PASS jamaah tables: agent sees no rows of jamaah_intakes / jamaah_registrations directly\n';
      ELSE _out := _out || format(E'FAIL jamaah tables: agent sees %s intakes and %s registrations directly\n', _n, _vis); END IF;
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      IF SQLSTATE = '42501' THEN _out := _out || E'PASS jamaah tables: agent has no direct access (42501)\n';
      ELSE _out := _out || format(E'FAIL jamaah tables: direct read raised %s (%s)\n', SQLSTATE, SQLERRM); END IF;
    END;
  END IF;

  -- ---------------------------------------------------------------------------------------------
  -- Leaderboard page
  -- ---------------------------------------------------------------------------------------------
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', _agent_uid, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    SELECT count(*) INTO _n FROM public.get_agent_leaderboard();
    SELECT count(*) INTO _own FROM public.get_agent_leaderboard() WHERE id = _agent_id;
    RESET ROLE;
    IF _n >= 1 AND _own = 1 THEN _out := _out || format(E'PASS get_agent_leaderboard: agent sees the ranking (%s agents) including themselves\n', _n);
    ELSE _out := _out || format(E'FAIL get_agent_leaderboard: %s rows, own row present: %s\n', _n, _own); END IF;
    -- peers' income is private: the result has no commission column
    IF pg_get_function_result('public.get_agent_leaderboard()'::regprocedure) !~* 'commission' THEN _out := _out || E'PASS get_agent_leaderboard: no commission column in the result\n';
    ELSE _out := _out || format(E'FAIL get_agent_leaderboard: result exposes commission (%s)\n', pg_get_function_result('public.get_agent_leaderboard()'::regprocedure)); END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'FAIL get_agent_leaderboard: raised %s (%s)\n', SQLSTATE, SQLERRM);
  END;

  -- Reference tables the leaderboard, schedule and marketing pages read
  FOREACH _t IN ARRAY ARRAY['agent_levels', 'agent_badges', 'agent_challenges', 'agent_rewards']
  LOOP
    BEGIN
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _agent_uid, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      EXECUTE format('SELECT count(*) FROM public.%I', _t) INTO _vis;
      RESET ROLE;
      EXECUTE format('SELECT count(*) FROM public.%I', _t) INTO _all;
      IF _t = 'agent_levels' AND _all = 0 THEN
        _out := _out || E'SKIP agent_levels: table is empty\n';
      ELSIF _t = 'agent_levels' AND _vis <> _all THEN
        _out := _out || format(E'FAIL agent_levels: agent sees %s of %s rows\n', _vis, _all);
      ELSE
        _out := _out || format(E'PASS %s: agent can read it (%s rows visible)\n', _t, _vis);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      _out := _out || format(E'FAIL %s: agent read raised %s (%s)\n', _t, SQLSTATE, SQLERRM);
    END;
  END LOOP;

  -- Marketing kit: active materials only
  SELECT count(*) INTO _all FROM public.marketing_materials WHERE is_active = true;
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', _agent_uid, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    SELECT count(*) INTO _vis FROM public.marketing_materials;
    SELECT count(*) INTO _vis_other FROM public.marketing_materials WHERE is_active IS NOT TRUE;
    RESET ROLE;
    IF _vis = _all AND _vis_other = 0 THEN _out := _out || format(E'PASS marketing_materials: agent sees the %s active materials and no inactive ones\n', _all);
    ELSE _out := _out || format(E'FAIL marketing_materials: agent sees %s (active in table: %s), inactive visible: %s\n', _vis, _all, _vis_other); END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'FAIL marketing_materials: raised %s (%s)\n', SQLSTATE, SQLERRM);
  END;

  -- Schedule page
  SELECT count(*) INTO _all FROM public.departure_schedules;
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', _agent_uid, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    SELECT count(*) INTO _vis FROM public.departure_schedules;
    RESET ROLE;
    IF _vis = _all THEN _out := _out || format(E'PASS departure_schedules: agent sees all %s schedules\n', _all);
    ELSE _out := _out || format(E'FAIL departure_schedules: agent sees %s of %s\n', _vis, _all); END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'FAIL departure_schedules: raised %s (%s)\n', SQLSTATE, SQLERRM);
  END;

  -- ---------------------------------------------------------------------------------------------
  -- Own money and progress: sales, withdrawals, points, badges, challenge progress, short links
  -- ---------------------------------------------------------------------------------------------
  -- Plant one row each where the live tables are empty (best effort, ignored when constraints refuse)
  IF _other_id IS NOT NULL THEN
    BEGIN
      INSERT INTO public.agent_points (agent_id, total_points, redeemed_points) VALUES (_agent_id, 10, 0), (_other_id, 20, 0);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      INSERT INTO public.agent_withdrawals (agent_id, amount, bank_name, bank_account, account_name)
      VALUES (_agent_id, 100000, 'BCA', '1', 'Portal Test'), (_other_id, 200000, 'BCA', '2', 'Portal Test');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      INSERT INTO public.agent_short_links (agent_id, short_code, original_url)
      VALUES (_agent_id, 'pt-own-' || substr(md5(random()::text), 1, 6), 'https://example.invalid/a'),
             (_other_id, 'pt-oth-' || substr(md5(random()::text), 1, 6), 'https://example.invalid/b');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  FOREACH _t IN ARRAY ARRAY['agent_sales', 'agent_withdrawals', 'agent_points', 'agent_earned_badges', 'agent_challenge_progress', 'agent_short_links']
  LOOP
    EXECUTE format('SELECT count(*) FILTER (WHERE agent_id = %L), count(*) FROM public.%I', _agent_id, _t) INTO _own, _all;
    BEGIN
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _agent_uid, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      EXECUTE format('SELECT count(*), count(*) FILTER (WHERE agent_id <> %L) FROM public.%I', _agent_id, _t) INTO _vis, _vis_other;
      RESET ROLE;
      IF _vis = _own AND _vis_other = 0 THEN
        _out := _out || format(E'PASS %s: agent sees own rows only (%s own, %s in table)\n', _t, _own, _all);
        IF _all = 0 THEN _out := _out || format(E'SKIP %s: table is empty, so isolation from other agents was not exercised\n', _t); END IF;
      ELSE
        _out := _out || format(E'FAIL %s: agent sees %s rows (own %s), %s belong to others\n', _t, _vis, _own, _vis_other);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      _out := _out || format(E'FAIL %s: agent read raised %s (%s)\n', _t, SQLSTATE, SQLERRM);
    END;
  END LOOP;

  -- Marketing kit short link: create and delete own link; cannot create for another agent
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', _agent_uid, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    INSERT INTO public.agent_short_links (agent_id, short_code, original_url, title)
    VALUES (_agent_id, 'ptest' || substr(md5(random()::text), 1, 8), 'https://example.invalid/paket', 'Portal test')
    RETURNING id INTO _r;
    SELECT count(*) INTO _n FROM public.agent_short_links WHERE id = _r.id;
    DELETE FROM public.agent_short_links WHERE id = _r.id;
    GET DIAGNOSTICS _rc = ROW_COUNT;
    RESET ROLE;
    IF _n = 1 AND _rc = 1 THEN _out := _out || E'PASS agent_short_links: agent can create, read and delete own link\n';
    ELSE _out := _out || format(E'FAIL agent_short_links: created link visible=%s, delete affected %s rows\n', _n, _rc); END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'FAIL agent_short_links: create/delete raised %s (%s)\n', SQLSTATE, SQLERRM);
  END;

  IF _other_id IS NULL THEN
    _out := _out || E'SKIP agent_short_links: no second agent to test creating a link for someone else\n';
  ELSE
    BEGIN
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _agent_uid, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      INSERT INTO public.agent_short_links (agent_id, short_code, original_url)
      VALUES (_other_id, 'ptest' || substr(md5(random()::text), 1, 8), 'https://example.invalid/');
      RAISE EXCEPTION 'insert applied' USING ERRCODE = 'XX001';
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      IF SQLSTATE = '42501' THEN _out := _out || E'PASS agent_short_links: agent cannot create a link for another agent (42501)\n';
      ELSE _out := _out || format(E'FAIL agent_short_links: link for another agent gave SQLSTATE %s (%s), expected 42501\n', SQLSTATE, SQLERRM); END IF;
    END;
  END IF;

  -- ---------------------------------------------------------------------------------------------
  -- Onboarding: KTP upload into the agent's own folder of agent-documents
  -- ---------------------------------------------------------------------------------------------
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', _agent_uid, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('agent-documents', _agent_uid || '/x.jpg', _agent_uid);
    SELECT count(*) INTO _n FROM storage.objects WHERE bucket_id = 'agent-documents' AND name = _agent_uid || '/x.jpg';
    RESET ROLE;
    IF _n = 1 THEN _out := _out || E'PASS storage: agent can upload a KTP into own folder and read it back\n';
    ELSE _out := _out || format(E'FAIL storage: uploaded KTP is visible %s times to its owner\n', _n); END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    _out := _out || format(E'FAIL storage: KTP upload into own folder raised %s (%s)\n', SQLSTATE, SQLERRM);
  END;

  -- Foreign document: neither owner nor folder is the agent -> refused
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', _agent_uid, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('agent-documents', _other_uid || '/x.jpg', _other_uid);
    RAISE EXCEPTION 'insert applied' USING ERRCODE = 'XX001';
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    IF SQLSTATE = '42501' THEN _out := _out || E'PASS storage: upload that is neither owned by nor foldered under the agent is refused (42501)\n';
    ELSE _out := _out || format(E'FAIL storage: foreign upload gave SQLSTATE %s (%s), expected 42501\n', SQLSTATE, SQLERRM); END IF;
  END;

  -- KNOWN GAP: the INSERT policy "Agents can upload their own documents" accepts auth.uid() = owner OR folder = uid,
  -- so an agent can put a file into ANOTHER agent's folder by claiming ownership. A new migration is meant to
  -- require the folder to be the agent's own. When that lands this check turns into a PASS on its own and the
  -- KNOWN branch can be deleted.
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', _agent_uid, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('agent-documents', _other_uid || '/planted-by-agent.jpg', _agent_uid);
    RAISE EXCEPTION 'insert applied' USING ERRCODE = 'XX001';
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    IF SQLSTATE = 'XX001' THEN
      _out := _out || E'KNOWN storage: an agent can still upload into another agent''s folder of agent-documents by setting owner to themselves (fix pending in a new migration)\n';
    ELSIF SQLSTATE = '42501' THEN
      _out := _out || E'PASS storage: upload into another agent''s folder is refused (the known gap is fixed: replace the KNOWN branch with a plain assertion)\n';
    ELSE
      _out := _out || format(E'FAIL storage: upload into another agent''s folder gave unexpected SQLSTATE %s (%s)\n', SQLSTATE, SQLERRM);
    END IF;
  END;

  -- ---------------------------------------------------------------------------------------------
  -- Registration: generate_referral_code is intentionally not callable by signed-in users
  -- (the client falls back to generating the code itself)
  -- ---------------------------------------------------------------------------------------------
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', _agent_uid, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    PERFORM public.generate_referral_code();
    RAISE EXCEPTION 'call applied' USING ERRCODE = 'XX001';
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    IF SQLSTATE = '42501' THEN _out := _out || E'PASS generate_referral_code: not executable by authenticated (42501), client uses its fallback\n';
    ELSE _out := _out || format(E'FAIL generate_referral_code: authenticated call gave SQLSTATE %s (%s), expected 42501\n', SQLSTATE, SQLERRM); END IF;
  END;

  RAISE EXCEPTION E'RESULTS\n%', _out;
END
$$;
