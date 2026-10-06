-- Tests for supabase/migrations/20261006180000_agent_leads.sql (SOP: agent LEADS and 30-day protection).
--
-- Runs against the live linked project, but only inside a transaction that always aborts (the final
-- RAISE EXCEPTION), so nothing is stored. Run with: ./scripts/run-db-tests.sh tests/db/08_agent_leads.sql
-- The migration is applied inside the transaction first by scripts/run-db-tests.sh while it is listed in
-- tests/db/pending-migrations.txt; after the push it is simply already there.
--
-- Report lines start with PASS, FAIL, SKIP or KNOWN.
-- Needs one upcoming published package (intake checks) and one admin/superadmin account (staff checks). The agents
-- themselves (two active, one pending) and a cs_admin / sales account are planted inside the transaction.
--
-- Sections:
--   1. Phone normalisation and who may call what (anon, pending agent, authenticated)
--   2. create_agent_lead: normalised phone, exactly 30 days, duplicates, other agent blocked without leaking, expiry
--   3. Isolation between agents (direct tables, functions)
--   4. Follow-ups, status transitions, helper
--   5. Link to registration (create_jamaah_intake): same agent, no agent, other agent (dispute), never breaks registration
--   6. Staff overview admin_agent_leads()

BEGIN;

-- Runs one statement as a signed-in user (or anon) and returns {"ok":true,"rows":[...]} or {"ok":false,"state":...,"msg":...}.
CREATE FUNCTION pg_temp.as_user(_uid uuid, _sql text, _role text DEFAULT 'authenticated') RETURNS jsonb LANGUAGE plpgsql AS $f$
DECLARE
  _r jsonb;
BEGIN
  IF _role = 'anon' THEN
    PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
    SET LOCAL ROLE anon;
  ELSE
    PERFORM set_config('request.jwt.claims', json_build_object('sub', _uid, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
  END IF;
  BEGIN
    IF upper(left(ltrim(_sql), 6)) = 'SELECT' THEN
      EXECUTE 'SELECT coalesce(jsonb_agg(to_jsonb(t)), ''[]''::jsonb) FROM (' || _sql || ') t' INTO _r;
    ELSE
      EXECUTE _sql;
      _r := '[]'::jsonb;
    END IF;
    RESET ROLE;
    RETURN jsonb_build_object('ok', true, 'rows', _r);
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    RETURN jsonb_build_object('ok', false, 'state', SQLSTATE, 'msg', SQLERRM);
  END;
END
$f$;

CREATE FUNCTION pg_temp.rep(_ok boolean, _label text, _detail text DEFAULT '') RETURNS text LANGUAGE sql AS $f$
  SELECT CASE WHEN coalesce(_ok, false) THEN 'PASS ' || _label || E'\n' ELSE 'FAIL ' || _label || ' [' || coalesce(_detail, '') || E']\n' END
$f$;

DO $$
DECLARE
  _out text := '';
  _pkg uuid;
  _staff uuid;
  _a uuid := gen_random_uuid();   -- active agent A
  _b uuid := gen_random_uuid();   -- active agent B
  _p uuid := gen_random_uuid();   -- pending agent
  _cs uuid := gen_random_uuid();  -- cs_admin
  _sales uuid := gen_random_uuid(); -- staff role without access to leads
  _arow public.agents%ROWTYPE;
  _brow public.agents%ROWTYPE;
  _u uuid;
  _r jsonb;
  _x jsonb;
  _loc text[] := ARRAY[]::text[];     -- local style phones 08...
  _wa text[] := ARRAY[]::text[];      -- normalised
  _i integer;
  _lead1 uuid; _lead2 uuid; _lead3 uuid; _lead4 uuid; _lead5 uuid; _lead6 uuid; _lead7 uuid; _lead_old uuid;
  _row public.agent_leads%ROWTYPE;
  _n bigint;
  _t text;
  _payload jsonb;
  _res jsonb;
  _intake uuid;
  _agent_of_intake uuid;
  c_other constant text := 'Nomor ini sudah terdaftar sebagai lead agen lain dan masih dalam masa perlindungan. Hubungi PIC Agen jika ada pertanyaan.';
BEGIN
  SELECT id INTO _pkg FROM public.packages WHERE status = 'published' AND departure_date::date >= current_date ORDER BY departure_date LIMIT 1;
  SELECT user_id INTO _staff FROM public.user_roles WHERE role IN ('superadmin', 'admin') ORDER BY role LIMIT 1;

  FOR _i IN 1..12 LOOP
    _loc := _loc || ('08' || lpad(floor(random() * 1e9)::bigint::text, 9, '0'));
    _wa := _wa || ('62' || substr(_loc[_i], 2));
  END LOOP;

  -- Plant agents A, B (active) and P (pending) through the real sign-up function, plus two staff-ish accounts.
  FOREACH _u IN ARRAY ARRAY[_a, _b, _p, _cs, _sales] LOOP
    INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
    VALUES (_u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'lead-' || substr(md5(random()::text), 1, 10) || '@example.invalid',
            jsonb_build_object('full_name', 'LeadTest ' || substr(_u::text, 1, 6), 'agent_signup', true), now(), now());
  END LOOP;
  FOREACH _u IN ARRAY ARRAY[_a, _b, _p] LOOP
    PERFORM set_config('request.jwt.claims', json_build_object('sub', _u, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    PERFORM public.register_agent_profile();
    RESET ROLE;
  END LOOP;
  UPDATE public.agents SET status = 'active', approved_at = now() WHERE user_id IN (_a, _b);
  SELECT * INTO _arow FROM public.agents WHERE user_id = _a;
  SELECT * INTO _brow FROM public.agents WHERE user_id = _b;
  INSERT INTO public.user_roles (user_id, role) VALUES (_cs, 'cs_admin'), (_sales, 'sales');

  -- ============================ 1. phones and who may call what ============================
  _out := _out || pg_temp.rep(public.normalize_wa_phone('0812 3456 7890') = '6281234567890'
                          AND public.normalize_wa_phone('+62 812-3456-7890') = '6281234567890'
                          AND public.normalize_wa_phone('81234567890') = '6281234567890'
                          AND public.normalize_wa_phone('6281234567890') = '6281234567890',
                          'normalize_wa_phone: 08.., +62, 8.. and 62.. all become 62xxxxxxxxxx');
  _out := _out || pg_temp.rep(public.normalize_wa_phone('12345') IS NULL AND public.normalize_wa_phone('') IS NULL AND public.normalize_wa_phone(NULL) IS NULL AND public.normalize_wa_phone('0812345') IS NULL,
                          'normalize_wa_phone: too short, empty and null give NULL');

  _r := pg_temp.as_user(NULL, format('SELECT public.create_agent_lead(%L, %L)', 'Anon Test', _loc[1]), 'anon');
  _out := _out || pg_temp.rep(NOT (_r ->> 'ok')::boolean AND _r ->> 'state' = '42501', 'anon cannot call create_agent_lead (42501)', _r::text);
  _r := pg_temp.as_user(NULL, 'SELECT count(*) FROM public.agent_leads', 'anon');
  _out := _out || pg_temp.rep(NOT (_r ->> 'ok')::boolean AND _r ->> 'state' = '42501', 'anon cannot read agent_leads (42501)', _r::text);
  _r := pg_temp.as_user(NULL, 'SELECT count(*) FROM public.agent_lead_followups', 'anon');
  _out := _out || pg_temp.rep(NOT (_r ->> 'ok')::boolean AND _r ->> 'state' = '42501', 'anon cannot read agent_lead_followups (42501)', _r::text);
  _r := pg_temp.as_user(NULL, 'SELECT * FROM public.list_my_agent_leads()', 'anon');
  _out := _out || pg_temp.rep(NOT (_r ->> 'ok')::boolean AND _r ->> 'state' = '42501', 'anon cannot call list_my_agent_leads (42501)', _r::text);

  _r := pg_temp.as_user(_p, format('SELECT public.create_agent_lead(%L, %L)', 'Pending Test', _loc[1]));
  _out := _out || pg_temp.rep(NOT (_r ->> 'ok')::boolean AND _r ->> 'state' = '42501' AND _r ->> 'msg' = 'Akun agen belum aktif.', 'pending agent cannot create a lead (42501, Akun agen belum aktif.)', _r::text);
  _r := pg_temp.as_user(_p, 'SELECT * FROM public.list_my_agent_leads()');
  _out := _out || pg_temp.rep(NOT (_r ->> 'ok')::boolean AND _r ->> 'state' = '42501', 'pending agent cannot list leads (42501)', _r::text);
  _r := pg_temp.as_user(_p, format('SELECT public.add_lead_followup(%L, ''chat'', ''x'')', gen_random_uuid()));
  _out := _out || pg_temp.rep(NOT (_r ->> 'ok')::boolean AND _r ->> 'state' = '42501', 'pending agent cannot add a follow-up (42501)', _r::text);
  _r := pg_temp.as_user(gen_random_uuid(), format('SELECT public.create_agent_lead(%L, %L)', 'Outsider', _loc[1]));
  _out := _out || pg_temp.rep(NOT (_r ->> 'ok')::boolean AND _r ->> 'state' = '42501', 'a signed-in user without an agents row cannot create a lead (42501)', _r::text);
  SELECT count(*) INTO _n FROM public.agent_leads WHERE whatsapp = _wa[1];
  _out := _out || pg_temp.rep(_n = 0, 'refused calls stored nothing', _n::text);

  -- ============================ 2. create_agent_lead ============================
  _r := pg_temp.as_user(_a, format('SELECT public.create_agent_lead(%L, %L, NULL, %L) AS r', '  Lead Satu  ', _loc[1], 'tahu dari status WA'));
  _out := _out || pg_temp.rep((_r ->> 'ok')::boolean, 'active agent creates a lead', _r::text);
  SELECT * INTO _row FROM public.agent_leads WHERE whatsapp = _wa[1];
  _lead1 := _row.id;
  _out := _out || pg_temp.rep(_row.agent_id = _arow.id AND _row.whatsapp = _wa[1] AND _row.status = 'active' AND _row.name = 'Lead Satu' AND _row.interest_note = 'tahu dari status WA',
                          'lead stored for agent A: phone 08.. normalised to 62.., name trimmed, status active', row_to_json(_row)::text);
  _out := _out || pg_temp.rep(_row.protected_until - _row.registered_at = interval '30 days', 'protection is exactly 30 days from registration', (_row.protected_until - _row.registered_at)::text);
  _out := _out || pg_temp.rep(_r -> 'rows' -> 0 -> 'r' ->> 'id' = _lead1::text AND (_r -> 'rows' -> 0 -> 'r' ->> 'protected_until') IS NOT NULL, 'create_agent_lead returns {id, protected_until}', _r::text);

  _r := pg_temp.as_user(_a, format('SELECT public.create_agent_lead(%L, %L)', 'Lead Satu Lagi', '+' || _wa[1]));
  _out := _out || pg_temp.rep(NOT (_r ->> 'ok')::boolean AND _r ->> 'state' = 'P0001' AND _r ->> 'msg' = 'Lead ini sudah kamu daftarkan.', 'same agent, same phone (+62 form) -> friendly duplicate error', _r::text);

  _r := pg_temp.as_user(_b, format('SELECT public.create_agent_lead(%L, %L)', 'Lead Saingan', _loc[1]));
  _out := _out || pg_temp.rep(NOT (_r ->> 'ok')::boolean AND _r ->> 'state' = 'P0001' AND _r ->> 'msg' = c_other, 'other agent, same phone while protected -> friendly error', _r::text);
  _out := _out || pg_temp.rep(position(_arow.name IN coalesce(_r ->> 'msg', '')) = 0 AND position(_arow.referral_code IN coalesce(_r ->> 'msg', '')) = 0
                          AND (_r ->> 'msg') !~ '[0-9]{4}-[0-9]{2}' AND (_r ->> 'msg') !~ 'LeadTest',
                          'the other-agent error leaks no agent name, Agent ID or date', _r::text);

  _r := pg_temp.as_user(_a, format('SELECT public.create_agent_lead(%L, %L)', 'Nomor Salah', '12345'));
  _out := _out || pg_temp.rep(NOT (_r ->> 'ok')::boolean AND _r ->> 'state' = 'P0001' AND _r ->> 'msg' LIKE 'Nomor WhatsApp belum benar%', 'bad phone is refused with the form message', _r::text);
  _r := pg_temp.as_user(_a, format('SELECT public.create_agent_lead(%L, %L)', 'X', _loc[2]));
  _out := _out || pg_temp.rep(NOT (_r ->> 'ok')::boolean AND _r ->> 'state' = 'P0001', 'one-letter name is refused', _r::text);
  _r := pg_temp.as_user(_a, format('SELECT public.create_agent_lead(%L, %L, NULL, %L)', 'Catatan Panjang', _loc[2], repeat('x', 301)));
  _out := _out || pg_temp.rep(NOT (_r ->> 'ok')::boolean AND _r ->> 'state' = 'P0001', 'a note over 300 characters is refused', _r::text);
  _r := pg_temp.as_user(_a, format('SELECT public.create_agent_lead(%L, %L, %L)', 'Paket Ngawur', _loc[2], gen_random_uuid()));
  _out := _out || pg_temp.rep(NOT (_r ->> 'ok')::boolean AND _r ->> 'state' = 'P0001', 'an unknown package is refused', _r::text);

  -- Direct duplicate active rows are impossible at table level (unique partial index)
  BEGIN
    INSERT INTO public.agent_leads (agent_id, name, whatsapp) VALUES (_brow.id, 'Dup Direct', _wa[1]);
    _out := _out || E'FAIL unique partial index: a second ACTIVE lead for the same phone was inserted\n';
  EXCEPTION WHEN unique_violation THEN
    _out := _out || E'PASS unique partial index: a second ACTIVE lead for the same phone is refused (23505)\n';
  END;

  -- Protection over: the other agent CAN register the phone, the old lead turns inactive with the reason
  UPDATE public.agent_leads SET registered_at = now() - interval '31 days', protected_until = now() - interval '1 day' WHERE id = _lead1;
  _r := pg_temp.as_user(_b, format('SELECT public.create_agent_lead(%L, %L)', 'Lead Satu Milik B', _loc[1]));
  _out := _out || pg_temp.rep((_r ->> 'ok')::boolean, 'after the 30 days the other agent can register the same phone', _r::text);
  SELECT * INTO _row FROM public.agent_leads WHERE id = _lead1;
  _out := _out || pg_temp.rep(_row.status = 'inactive' AND _row.inactive_reason = 'Masa perlindungan 30 hari berakhir', 'the expired lead became inactive with the protection reason', _row.status || ' / ' || coalesce(_row.inactive_reason, ''));
  _lead_old := _lead1;
  SELECT id INTO _lead1 FROM public.agent_leads WHERE whatsapp = _wa[1] AND status = 'active';   -- now B's lead

  _r := pg_temp.as_user(_a, format('SELECT public.set_lead_status(%L, ''active'')', _lead_old));
  _out := _out || pg_temp.rep(NOT (_r ->> 'ok')::boolean AND _r ->> 'state' = 'P0001', 'an expired inactive lead cannot be revived', _r::text);

  _r := pg_temp.as_user(_a, format('SELECT public.create_agent_lead(%L, %L)', 'Sekarang Terlindungi B', _loc[1]));
  _out := _out || pg_temp.rep(NOT (_r ->> 'ok')::boolean AND _r ->> 'msg' = c_other, 'now agent A is the one blocked by B''s fresh protection', _r::text);

  -- expire_agent_leads: not callable by users, callable by service_role
  _r := pg_temp.as_user(_a, 'SELECT public.expire_agent_leads()');
  _out := _out || pg_temp.rep(NOT (_r ->> 'ok')::boolean AND _r ->> 'state' = '42501', 'authenticated cannot call expire_agent_leads (42501)', _r::text);
  UPDATE public.agent_leads SET protected_until = now() - interval '1 minute' WHERE id = _lead1;
  SET LOCAL ROLE service_role;
  _n := public.expire_agent_leads();
  RESET ROLE;
  SELECT status INTO _t FROM public.agent_leads WHERE id = _lead1;
  _out := _out || pg_temp.rep(_n >= 1 AND _t = 'inactive', 'service_role expire_agent_leads marks stale leads inactive', _n || ' / ' || _t);
  -- put B's lead back into a protected state for the next sections
  UPDATE public.agent_leads SET status = 'active', inactive_reason = NULL, protected_until = now() + interval '20 days' WHERE id = _lead1;

  -- ============================ 3. isolation ============================
  _r := pg_temp.as_user(_a, format('SELECT public.create_agent_lead(%L, %L, NULL)', 'Lead Dua A', _loc[3]));
  SELECT id INTO _lead2 FROM public.agent_leads WHERE whatsapp = _wa[3];
  _r := pg_temp.as_user(_a, format('SELECT public.add_lead_followup(%L, ''call'', ''telepon pertama'')', _lead2));
  _out := _out || pg_temp.rep((_r ->> 'ok')::boolean, 'A adds a follow-up to A''s lead', _r::text);

  _r := pg_temp.as_user(_a, 'SELECT * FROM public.list_my_agent_leads()');
  _x := _r -> 'rows';
  _out := _out || pg_temp.rep((_r ->> 'ok')::boolean AND jsonb_array_length(_x) >= 1
                          AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(_x) e WHERE e ->> 'id' = _lead1::text)
                          AND EXISTS (SELECT 1 FROM jsonb_array_elements(_x) e WHERE e ->> 'id' = _lead2::text),
                          'list_my_agent_leads: A sees own leads and not B''s', left(_r::text, 300));
  _r := pg_temp.as_user(_b, 'SELECT * FROM public.list_my_agent_leads()');
  _x := _r -> 'rows';
  _out := _out || pg_temp.rep((_r ->> 'ok')::boolean AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(_x) e WHERE e ->> 'id' = _lead2::text)
                          AND EXISTS (SELECT 1 FROM jsonb_array_elements(_x) e WHERE e ->> 'id' = _lead1::text),
                          'list_my_agent_leads: B sees own leads and not A''s', left(_r::text, 300));

  _r := pg_temp.as_user(_b, 'SELECT id FROM public.agent_leads');
  _out := _out || pg_temp.rep((_r ->> 'ok')::boolean AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(_r -> 'rows') e WHERE e ->> 'id' = _lead2::text), 'RLS: B reads none of A''s rows in agent_leads', left(_r::text, 200));
  _r := pg_temp.as_user(_b, 'SELECT id FROM public.agent_lead_followups');
  _out := _out || pg_temp.rep((_r ->> 'ok')::boolean AND jsonb_array_length(_r -> 'rows') = 0, 'RLS: B reads none of A''s follow-ups', left(_r::text, 200));
  _r := pg_temp.as_user(_a, format('SELECT id FROM public.agent_lead_followups WHERE lead_id = %L', _lead2));
  _out := _out || pg_temp.rep((_r ->> 'ok')::boolean AND jsonb_array_length(_r -> 'rows') = 1, 'RLS: A reads own follow-up directly', left(_r::text, 200));

  _r := pg_temp.as_user(_b, format('UPDATE public.agent_leads SET name = ''Hacked'' WHERE id = %L', _lead2));
  _out := _out || pg_temp.rep(NOT (_r ->> 'ok')::boolean AND _r ->> 'state' = '42501', 'direct UPDATE on agent_leads is refused (42501)', _r::text);
  _r := pg_temp.as_user(_a, format('UPDATE public.agent_leads SET protected_until = now() + interval ''999 days'' WHERE id = %L', _lead2));
  _out := _out || pg_temp.rep(NOT (_r ->> 'ok')::boolean AND _r ->> 'state' = '42501', 'an agent cannot extend their own protection with a direct UPDATE (42501)', _r::text);
  _r := pg_temp.as_user(_a, format('INSERT INTO public.agent_leads (agent_id, name, whatsapp) VALUES (%L, ''Direct'', %L)', _arow.id, _wa[9]));
  _out := _out || pg_temp.rep(NOT (_r ->> 'ok')::boolean AND _r ->> 'state' = '42501', 'direct INSERT into agent_leads is refused (42501)', _r::text);
  _r := pg_temp.as_user(_a, format('DELETE FROM public.agent_leads WHERE id = %L', _lead2));
  _out := _out || pg_temp.rep(NOT (_r ->> 'ok')::boolean AND _r ->> 'state' = '42501', 'direct DELETE on agent_leads is refused (42501)', _r::text);
  _r := pg_temp.as_user(_a, format('INSERT INTO public.agent_lead_followups (lead_id, agent_id, kind) VALUES (%L, %L, ''note'')', _lead2, _arow.id));
  _out := _out || pg_temp.rep(NOT (_r ->> 'ok')::boolean AND _r ->> 'state' = '42501', 'direct INSERT into agent_lead_followups is refused (42501)', _r::text);
  SELECT count(*) INTO _n FROM public.agent_leads WHERE id = _lead2 AND name = 'Lead Dua A';
  _out := _out || pg_temp.rep(_n = 1, 'the refused writes changed nothing', _n::text);

  _r := pg_temp.as_user(_b, format('SELECT public.add_lead_followup(%L, ''chat'', ''mau curi'')', _lead2));
  _out := _out || pg_temp.rep(NOT (_r ->> 'ok')::boolean AND _r ->> 'state' = 'P0001' AND _r ->> 'msg' = 'Lead tidak ditemukan.', 'B cannot add a follow-up to A''s lead', _r::text);
  _r := pg_temp.as_user(_b, format('SELECT public.set_lead_status(%L, ''lost'')', _lead2));
  _out := _out || pg_temp.rep(NOT (_r ->> 'ok')::boolean AND _r ->> 'state' = 'P0001' AND _r ->> 'msg' = 'Lead tidak ditemukan.', 'B cannot change the status of A''s lead', _r::text);
  _r := pg_temp.as_user(_b, format('SELECT public.set_lead_helper(%L, %L)', _lead2, _brow.referral_code));
  _out := _out || pg_temp.rep(NOT (_r ->> 'ok')::boolean AND _r ->> 'state' = 'P0001', 'B cannot set a helper on A''s lead', _r::text);
  SELECT count(*) INTO _n FROM public.agent_lead_followups WHERE lead_id = _lead2;
  SELECT status INTO _t FROM public.agent_leads WHERE id = _lead2;
  _out := _out || pg_temp.rep(_n = 1 AND _t = 'active', 'B''s attempts left A''s lead untouched', _n || ' / ' || _t);

  -- ============================ 4. follow-ups, status, helper ============================
  SELECT * INTO _row FROM public.agent_leads WHERE id = _lead2;
  _out := _out || pg_temp.rep(_row.last_followup_at IS NOT NULL AND _row.protected_until - _row.registered_at = interval '30 days',
                          'a follow-up sets last_followup_at and does not extend the protection', row_to_json(_row)::text);
  _r := pg_temp.as_user(_a, 'SELECT * FROM public.list_my_agent_leads()');
  SELECT e INTO _x FROM jsonb_array_elements(_r -> 'rows') e WHERE e ->> 'id' = _lead2::text;
  _out := _out || pg_temp.rep((_x ->> 'followup_count')::int = 1 AND (_x ->> 'days_left')::int BETWEEN 29 AND 30 AND _x ->> 'status' = 'active' AND _x ->> 'last_followup_at' IS NOT NULL,
                          'list_my_agent_leads shows follow-up count, days left (~30) and status', _x::text);

  _r := pg_temp.as_user(_a, format('SELECT public.add_lead_followup(%L, ''fax'', ''x'')', _lead2));
  _out := _out || pg_temp.rep(NOT (_r ->> 'ok')::boolean AND _r ->> 'state' = 'P0001', 'unknown follow-up kind is refused', _r::text);
  _r := pg_temp.as_user(_a, format('SELECT public.add_lead_followup(%L, ''note'', %L)', _lead2, repeat('x', 501)));
  _out := _out || pg_temp.rep(NOT (_r ->> 'ok')::boolean AND _r ->> 'state' = 'P0001', 'a follow-up note over 500 characters is refused', _r::text);

  _r := pg_temp.as_user(_a, format('SELECT public.set_lead_status(%L, ''inactive'', ''tidak bisa dihubungi'')', _lead2));
  SELECT * INTO _row FROM public.agent_leads WHERE id = _lead2;
  _out := _out || pg_temp.rep((_r ->> 'ok')::boolean AND _row.status = 'inactive' AND _row.inactive_reason = 'tidak bisa dihubungi', 'active -> inactive with a reason', _r::text);
  _r := pg_temp.as_user(_a, format('SELECT public.add_lead_followup(%L, ''chat'', ''x'')', _lead2));
  _out := _out || pg_temp.rep(NOT (_r ->> 'ok')::boolean AND _r ->> 'state' = 'P0001', 'no follow-up on an inactive lead', _r::text);
  _r := pg_temp.as_user(_a, format('SELECT public.set_lead_status(%L, ''active'')', _lead2));
  SELECT * INTO _row FROM public.agent_leads WHERE id = _lead2;
  _out := _out || pg_temp.rep((_r ->> 'ok')::boolean AND _row.status = 'active' AND _row.inactive_reason IS NULL, 'inactive -> active again while still protected', _r::text);
  _r := pg_temp.as_user(_a, format('SELECT public.set_lead_status(%L, ''registered'')', _lead2));
  _out := _out || pg_temp.rep(NOT (_r ->> 'ok')::boolean AND _r ->> 'state' = 'P0001', 'an agent cannot set a lead to registered by hand', _r::text);
  _r := pg_temp.as_user(_a, format('SELECT public.set_lead_status(%L, ''banana'')', _lead2));
  _out := _out || pg_temp.rep(NOT (_r ->> 'ok')::boolean AND _r ->> 'state' = 'P0001', 'unknown status is refused', _r::text);
  _r := pg_temp.as_user(_a, format('SELECT public.set_lead_status(%L, ''lost'', ''tidak jadi'')', _lead2));
  _out := _out || pg_temp.rep((_r ->> 'ok')::boolean, 'active -> lost', _r::text);
  _r := pg_temp.as_user(_a, format('SELECT public.set_lead_status(%L, ''active'')', _lead2));
  _out := _out || pg_temp.rep(NOT (_r ->> 'ok')::boolean AND _r ->> 'state' = 'P0001', 'lost is final (cannot go back to active)', _r::text);
  -- the phone of a lost lead is free again for anybody
  _r := pg_temp.as_user(_b, format('SELECT public.create_agent_lead(%L, %L)', 'Lead Dua Milik B', _loc[3]));
  _out := _out || pg_temp.rep((_r ->> 'ok')::boolean, 'a lost lead frees the phone for another agent', _r::text);

  -- helper
  _r := pg_temp.as_user(_a, format('SELECT public.create_agent_lead(%L, %L)', 'Lead Helper', _loc[4]));
  SELECT id INTO _lead3 FROM public.agent_leads WHERE whatsapp = _wa[4] AND status = 'active';
  _r := pg_temp.as_user(_a, format('SELECT public.set_lead_helper(%L, %L)', _lead3, lower(_brow.referral_code)));
  SELECT * INTO _row FROM public.agent_leads WHERE id = _lead3;
  _out := _out || pg_temp.rep((_r ->> 'ok')::boolean AND _row.helped_by_agent_id = _brow.id, 'set_lead_helper resolves an Agent ID case-insensitively', _r::text);
  _r := pg_temp.as_user(_a, format('SELECT public.set_lead_helper(%L, %L)', _lead3, 'ZZ-NOT-A-CODE'));
  SELECT * INTO _row FROM public.agent_leads WHERE id = _lead3;
  _out := _out || pg_temp.rep((_r ->> 'ok')::boolean AND _row.helped_by_agent_id = _brow.id, 'unknown Agent ID is a silent no-op', _r::text);
  _r := pg_temp.as_user(_a, format('SELECT public.set_lead_helper(%L, %L)', _lead3, _arow.referral_code));
  SELECT * INTO _row FROM public.agent_leads WHERE id = _lead3;
  _out := _out || pg_temp.rep((_r ->> 'ok')::boolean AND _row.helped_by_agent_id = _brow.id, 'your own Agent ID is a silent no-op', _r::text);
  _r := pg_temp.as_user(_a, format('SELECT public.set_lead_helper(%L, %L)', _lead3, (SELECT referral_code FROM public.agents WHERE user_id = _p)));
  SELECT * INTO _row FROM public.agent_leads WHERE id = _lead3;
  _out := _out || pg_temp.rep((_r ->> 'ok')::boolean AND _row.helped_by_agent_id = _brow.id, 'a pending agent cannot be a helper (silent no-op)', _r::text);
  _r := pg_temp.as_user(_a, 'SELECT * FROM public.list_my_agent_leads()');
  SELECT e INTO _x FROM jsonb_array_elements(_r -> 'rows') e WHERE e ->> 'id' = _lead3::text;
  _out := _out || pg_temp.rep(_x ->> 'helper_code' = _brow.referral_code, 'list_my_agent_leads shows the helper''s Agent ID', _x::text);
  _r := pg_temp.as_user(_a, format('SELECT public.set_lead_helper(%L, '''')', _lead3));
  SELECT * INTO _row FROM public.agent_leads WHERE id = _lead3;
  _out := _out || pg_temp.rep((_r ->> 'ok')::boolean AND _row.helped_by_agent_id IS NULL, 'an empty Agent ID clears the helper', _r::text);

  -- ============================ 5. link to registration ============================
  IF _pkg IS NULL THEN
    _out := _out || E'SKIP link to registration: needs one upcoming published package\n';
  ELSE
    _payload := jsonb_build_object('package_id', _pkg, 'contact_name', 'Lead Link Test', 'consent', true, 'consent_version', 'test', 'source', 'agent',
                  'people', jsonb_build_array(jsonb_build_object('full_name', 'Lead Link Satu', 'gender', 'L', 'category', 'adult', 'room_type', 'quad')));

    -- 5a. same agent: lead -> registered with intake_id
    _r := pg_temp.as_user(_a, format('SELECT public.create_agent_lead(%L, %L)', 'Lead Daftar Sendiri', _loc[5]));
    SELECT id INTO _lead4 FROM public.agent_leads WHERE whatsapp = _wa[5] AND status = 'active';
    SET LOCAL ROLE service_role;
    _res := public.create_jamaah_intake(_payload || jsonb_build_object('ref_code', _arow.referral_code, 'contact_phone', _wa[5]));
    RESET ROLE;
    SELECT * INTO _row FROM public.agent_leads WHERE id = _lead4;
    _out := _out || pg_temp.rep(_row.status = 'registered' AND _row.intake_id = (_res ->> 'id')::uuid, 'intake with the lead''s phone and the same Agent ID -> lead becomes registered with intake_id', row_to_json(_row)::text);
    SELECT agent_id INTO _agent_of_intake FROM public.jamaah_intakes WHERE id = (_res ->> 'id')::uuid;
    _out := _out || pg_temp.rep(_agent_of_intake = _arow.id, 'that intake stays attributed to agent A', coalesce(_agent_of_intake::text, 'null'));
    _r := pg_temp.as_user(_a, 'SELECT * FROM public.list_my_agent_leads()');
    SELECT e INTO _x FROM jsonb_array_elements(_r -> 'rows') e WHERE e ->> 'id' = _lead4::text;
    _out := _out || pg_temp.rep(_x ->> 'status' = 'registered' AND _x ->> 'intake_code' LIKE 'MSF-%' AND _x ->> 'intake_status' = 'new', 'list_my_agent_leads shows the registration (intake code and status)', _x::text);
    _r := pg_temp.as_user(_a, format('SELECT public.set_lead_status(%L, ''inactive'')', _lead4));
    _out := _out || pg_temp.rep(NOT (_r ->> 'ok')::boolean AND _r ->> 'state' = 'P0001', 'registered is final', _r::text);
    _r := pg_temp.as_user(_a, format('SELECT public.add_lead_followup(%L, ''chat'', ''sudah daftar, kirim ucapan'')', _lead4));
    _out := _out || pg_temp.rep((_r ->> 'ok')::boolean, 'follow-ups are still allowed on a registered lead', _r::text);

    -- 5b. intake without Agent ID -> attributed to the lead's agent
    _r := pg_temp.as_user(_a, format('SELECT public.create_agent_lead(%L, %L)', 'Lead Daftar Tanpa Ref', _loc[6]));
    SELECT id INTO _lead5 FROM public.agent_leads WHERE whatsapp = _wa[6] AND status = 'active';
    SET LOCAL ROLE service_role;
    _res := public.create_jamaah_intake(_payload || jsonb_build_object('contact_phone', _wa[6]));
    RESET ROLE;
    SELECT agent_id INTO _agent_of_intake FROM public.jamaah_intakes WHERE id = (_res ->> 'id')::uuid;
    SELECT * INTO _row FROM public.agent_leads WHERE id = _lead5;
    _out := _out || pg_temp.rep(_agent_of_intake = _arow.id, 'intake with NO Agent ID but a matching protected lead -> intake gets the lead''s agent', coalesce(_agent_of_intake::text, 'null'));
    _out := _out || pg_temp.rep(_row.status = 'registered' AND _row.intake_id = (_res ->> 'id')::uuid, 'and the lead is registered', row_to_json(_row)::text);

    -- 5c. intake through ANOTHER agent -> attributed as submitted + dispute notification
    _r := pg_temp.as_user(_a, format('SELECT public.create_agent_lead(%L, %L)', 'Lead Sengketa', _loc[7]));
    SELECT id INTO _lead6 FROM public.agent_leads WHERE whatsapp = _wa[7] AND status = 'active';
    SET LOCAL ROLE service_role;
    _res := public.create_jamaah_intake(_payload || jsonb_build_object('ref_code', _brow.referral_code, 'contact_phone', _wa[7]));
    RESET ROLE;
    SELECT agent_id INTO _agent_of_intake FROM public.jamaah_intakes WHERE id = (_res ->> 'id')::uuid;
    SELECT * INTO _row FROM public.agent_leads WHERE id = _lead6;
    _out := _out || pg_temp.rep(_agent_of_intake = _brow.id, 'intake through a DIFFERENT agent stays attributed as submitted', coalesce(_agent_of_intake::text, 'null'));
    _out := _out || pg_temp.rep(_row.status = 'active' AND _row.intake_id IS NULL, 'the disputed lead is left as it was (management decides)', row_to_json(_row)::text);
    SELECT count(*) INTO _n FROM public.admin_notifications
     WHERE type = 'lead_conflict' AND action_url = '/admin/agent-leads' AND title = 'Sengketa lead agen'
       AND meta ->> 'lead_id' = _lead6::text AND meta ->> 'lead_agent_id' = _arow.id::text AND meta ->> 'intake_agent_id' = _brow.id::text
       AND message LIKE '%Lead Link Test%' AND message LIKE '%' || _brow.name || '%' AND message LIKE '%' || _arow.name || '%';
    _out := _out || pg_temp.rep(_n = 1, 'a lead_conflict admin notification names the jamaah and both agents, with lead_id and both agent ids in meta', _n::text);

    -- 5d. unrelated intake is untouched
    SET LOCAL ROLE service_role;
    _res := public.create_jamaah_intake(_payload || jsonb_build_object('contact_phone', '62' || lpad(floor(random() * 1e10)::bigint::text, 10, '0')));
    RESET ROLE;
    SELECT agent_id INTO _agent_of_intake FROM public.jamaah_intakes WHERE id = (_res ->> 'id')::uuid;
    _out := _out || pg_temp.rep(_res ->> 'code' LIKE 'MSF-%' AND _agent_of_intake IS NULL, 'an intake with no ref and no matching lead behaves as before (no agent)', coalesce(_agent_of_intake::text, 'null'));

    -- 5e. an inactive own lead of the intake's agent is marked registered too
    _r := pg_temp.as_user(_a, format('SELECT public.create_agent_lead(%L, %L)', 'Lead Tidak Aktif', _loc[8]));
    SELECT id INTO _lead7 FROM public.agent_leads WHERE whatsapp = _wa[8] AND status = 'active';
    _r := pg_temp.as_user(_a, format('SELECT public.set_lead_status(%L, ''inactive'')', _lead7));
    SET LOCAL ROLE service_role;
    _res := public.create_jamaah_intake(_payload || jsonb_build_object('ref_code', _arow.referral_code, 'contact_phone', _wa[8]));
    RESET ROLE;
    SELECT * INTO _row FROM public.agent_leads WHERE id = _lead7;
    _out := _out || pg_temp.rep(_row.status = 'registered' AND _row.intake_id = (_res ->> 'id')::uuid, 'the agent''s own inactive lead for that phone is marked registered', row_to_json(_row)::text);

    -- 5f. registration never fails because of the lead logic: make every lead UPDATE blow up
    _r := pg_temp.as_user(_a, format('SELECT public.create_agent_lead(%L, %L)', 'Lead Rusak', _loc[9]));
    SELECT id INTO _lead7 FROM public.agent_leads WHERE whatsapp = _wa[9] AND status = 'active';
    CREATE FUNCTION public._lead_test_boom() RETURNS trigger LANGUAGE plpgsql AS $b$ BEGIN RAISE EXCEPTION 'boom from test'; END $b$;
    CREATE TRIGGER _lead_test_boom BEFORE UPDATE ON public.agent_leads FOR EACH ROW EXECUTE FUNCTION public._lead_test_boom();
    BEGIN
      SET LOCAL ROLE service_role;
      _res := public.create_jamaah_intake(_payload || jsonb_build_object('ref_code', _arow.referral_code, 'contact_phone', _wa[9]));
      RESET ROLE;
      SELECT * INTO _row FROM public.agent_leads WHERE id = _lead7;
      SELECT count(*) INTO _n FROM public.jamaah_intakes WHERE id = (_res ->> 'id')::uuid;
      _out := _out || pg_temp.rep(_n = 1 AND _res ->> 'code' LIKE 'MSF-%' AND _row.status = 'active',
                              'registration still succeeds when the lead logic raises (lead left active, intake stored)', row_to_json(_row)::text);
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      _out := _out || format(E'FAIL registration failed because of the lead logic: %s (%s)\n', SQLSTATE, SQLERRM);
    END;
    DROP TRIGGER _lead_test_boom ON public.agent_leads;
    DROP FUNCTION public._lead_test_boom();

    -- the grants of create_jamaah_intake are unchanged: nobody but service_role
    _r := pg_temp.as_user(_a, format('SELECT public.create_jamaah_intake(%L::jsonb)', _payload::text));
    _out := _out || pg_temp.rep(NOT (_r ->> 'ok')::boolean AND _r ->> 'state' = '42501', 'create_jamaah_intake is still not callable by authenticated (42501)', _r::text);
    _r := pg_temp.as_user(NULL, format('SELECT public.create_jamaah_intake(%L::jsonb)', _payload::text), 'anon');
    _out := _out || pg_temp.rep(NOT (_r ->> 'ok')::boolean AND _r ->> 'state' = '42501', 'create_jamaah_intake is still not callable by anon (42501)', _r::text);
  END IF;

  -- ============================ 6. staff overview ============================
  IF _staff IS NULL THEN
    _out := _out || E'SKIP staff overview: needs an admin/superadmin account\n';
  ELSE
    _r := pg_temp.as_user(_staff, 'SELECT * FROM public.admin_agent_leads()');
    _x := _r -> 'rows';
    _out := _out || pg_temp.rep((_r ->> 'ok')::boolean AND EXISTS (SELECT 1 FROM jsonb_array_elements(_x) e WHERE e ->> 'id' = _lead2::text AND e ->> 'agent_code' = _arow.referral_code)
                            AND EXISTS (SELECT 1 FROM jsonb_array_elements(_x) e WHERE e ->> 'id' = _lead1::text AND e ->> 'agent_name' = _brow.name),
                            'admin: admin_agent_leads() returns every agent''s leads with agent name and Agent ID', left(_r::text, 300));
    IF _pkg IS NOT NULL THEN
      SELECT e INTO _x FROM jsonb_array_elements(_r -> 'rows') e WHERE e ->> 'id' = _lead6::text;
      _out := _out || pg_temp.rep(_x ->> 'conflict_intake_agent_name' = _brow.name, 'admin: the disputed lead carries conflict_intake_agent_name (the other agent)', _x::text);
      SELECT e INTO _x FROM jsonb_array_elements(_r -> 'rows') e WHERE e ->> 'id' = _lead4::text;
      _out := _out || pg_temp.rep(_x ->> 'conflict_intake_agent_name' IS NULL AND _x ->> 'intake_code' LIKE 'MSF-%', 'admin: a normal registered lead has no conflict and shows its intake code', _x::text);
    END IF;
    SELECT e INTO _x FROM jsonb_array_elements(_r -> 'rows') e WHERE e ->> 'id' = _lead3::text;
    _out := _out || pg_temp.rep(_x ->> 'followup_count' = '0' AND _x ->> 'helper_name' IS NULL, 'admin: follow-up count and helper columns are present', _x::text);
    _r := pg_temp.as_user(_staff, 'SELECT id FROM public.agent_leads');
    _out := _out || pg_temp.rep((_r ->> 'ok')::boolean AND EXISTS (SELECT 1 FROM jsonb_array_elements(_r -> 'rows') e WHERE e ->> 'id' = _lead2::text), 'admin: reads all agent_leads rows directly (RLS)', left(_r::text, 200));
    _r := pg_temp.as_user(_staff, 'SELECT id FROM public.agent_lead_followups');
    _out := _out || pg_temp.rep((_r ->> 'ok')::boolean AND jsonb_array_length(_r -> 'rows') >= 1, 'admin: reads all follow-ups directly (RLS)', left(_r::text, 200));
    _r := pg_temp.as_user(_staff, format('UPDATE public.agent_leads SET name = ''Staff Edit'' WHERE id = %L', _lead2));
    _out := _out || pg_temp.rep(NOT (_r ->> 'ok')::boolean AND _r ->> 'state' = '42501', 'admin: the table is read-only even for staff (42501)', _r::text);
  END IF;

  _r := pg_temp.as_user(_cs, 'SELECT * FROM public.admin_agent_leads()');
  _out := _out || pg_temp.rep((_r ->> 'ok')::boolean, 'cs_admin can read admin_agent_leads()', _r::text);
  _r := pg_temp.as_user(_sales, 'SELECT * FROM public.admin_agent_leads()');
  _out := _out || pg_temp.rep(NOT (_r ->> 'ok')::boolean AND _r ->> 'state' = '42501', 'a role without lead access (sales) cannot call admin_agent_leads() (42501)', _r::text);
  _r := pg_temp.as_user(_sales, 'SELECT id FROM public.agent_leads');
  _out := _out || pg_temp.rep((_r ->> 'ok')::boolean AND jsonb_array_length(_r -> 'rows') = 0, 'a role without lead access (sales) sees no rows of agent_leads', left(_r::text, 200));
  _r := pg_temp.as_user(_a, 'SELECT * FROM public.admin_agent_leads()');
  _out := _out || pg_temp.rep(NOT (_r ->> 'ok')::boolean AND _r ->> 'state' = '42501', 'a plain agent cannot call admin_agent_leads() (42501)', _r::text);
  _r := pg_temp.as_user(NULL, 'SELECT * FROM public.admin_agent_leads()', 'anon');
  _out := _out || pg_temp.rep(NOT (_r ->> 'ok')::boolean AND _r ->> 'state' = '42501', 'anon cannot call admin_agent_leads() (42501)', _r::text);

  RAISE EXCEPTION E'RESULTS\n%', _out;
END
$$;
