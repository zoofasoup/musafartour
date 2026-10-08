-- Levels start at Silver; registration fee is a gate AFTER approval (owner decisions, 8 Oct 2026). Idempotent.
--
-- 1. "Duta Musafar" is the name of the agent community, not a level. Levels: Silver (0-14 jamaah/year), Gold (15), Platinum (30).
--    A new agent starts at Silver. Rows, default, CHECK constraints, agent_levels and the commission rate table lose 'duta'.
-- 2. An approved ('active') agent whose registration fee is still 'unpaid' can open the portal read-only but cannot
--    register leads (create_agent_lead), submit jamaah as an agent (create_jamaah_intake with source 'agent'),
--    and a public referral link of such an agent does not attribute the intake to them.
--    Fee 'paid' / 'waived' (set by staff) opens selling. Existing active agents were backfilled 'waived' by 20261006190000.
-- 3. Functions redefined from the LIVE definitions: protect_agent_columns, register_agent_profile, admin_list_commission_rates,
--    set_commission_rate, create_agent_lead, create_jamaah_intake.

-- ---------------------------------------------------------------------------------------------------------------
-- 1. Data and constraints
-- ---------------------------------------------------------------------------------------------------------------
UPDATE public.agents SET level = 'silver' WHERE level = 'duta';
ALTER TABLE public.agents ALTER COLUMN level SET DEFAULT 'silver';

-- 'duta' never had a commission amount (the letters only cover silver/gold/platinum); drop any stray rows.
DELETE FROM public.agent_commission_rates WHERE level = 'duta';

DO $$
DECLARE
  _c record;
BEGIN
  FOR _c IN
    SELECT conrelid::regclass AS tbl, conname
      FROM pg_constraint
     WHERE contype = 'c'
       AND conrelid IN ('public.agents'::regclass, 'public.agent_commission_rates'::regclass)
       AND pg_get_constraintdef(oid) ILIKE '%duta%'
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', _c.tbl, _c.conname);
  END LOOP;
END $$;

ALTER TABLE public.agents DROP CONSTRAINT IF EXISTS agents_level_check;
ALTER TABLE public.agents ADD CONSTRAINT agents_level_check CHECK (level IN ('silver', 'gold', 'platinum'));
ALTER TABLE public.agent_commission_rates DROP CONSTRAINT IF EXISTS agent_commission_rates_level_check;
ALTER TABLE public.agent_commission_rates ADD CONSTRAINT agent_commission_rates_level_check CHECK (level IN ('silver', 'gold', 'platinum'));

DELETE FROM public.agent_levels WHERE level_name = 'duta';
UPDATE public.agent_levels SET min_sales = 0 WHERE level_name = 'silver';

-- ---------------------------------------------------------------------------------------------------------------
-- 2. Functions (live definitions)
-- ---------------------------------------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.protect_agent_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only guard direct client writes. Service role, SECURITY DEFINER functions and migrations run as
  -- other roles and pass untouched.
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;
  IF public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'agent_admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.status := 'pending';
    NEW.level := 'silver';
    NEW.total_sales := 0;
    NEW.total_commission := 0;
    NEW.available_balance := 0;
    NEW.approved_at := NULL;
    NEW.registration_fee_status := 'unpaid';
    NEW.registration_fee_paid_at := NULL;
    NEW.sop_accepted_at := NULL;
    NEW.sop_version := NULL;
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.level IS DISTINCT FROM OLD.level
     OR NEW.total_sales IS DISTINCT FROM OLD.total_sales
     OR NEW.total_commission IS DISTINCT FROM OLD.total_commission
     OR NEW.available_balance IS DISTINCT FROM OLD.available_balance
     OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.referral_code IS DISTINCT FROM OLD.referral_code
     OR NEW.referred_by_id IS DISTINCT FROM OLD.referred_by_id
     OR NEW.registration_fee_status IS DISTINCT FROM OLD.registration_fee_status
     OR NEW.registration_fee_paid_at IS DISTINCT FROM OLD.registration_fee_paid_at
     OR NEW.sop_accepted_at IS DISTINCT FROM OLD.sop_accepted_at
     OR NEW.sop_version IS DISTINCT FROM OLD.sop_version THEN
    RAISE EXCEPTION 'Kolom ini hanya bisa diubah oleh admin.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;


CREATE OR REPLACE FUNCTION public.register_agent_profile()
 RETURNS agents
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid        uuid := auth.uid();
  _row        public.agents%ROWTYPE;
  _email      text;
  _meta       jsonb;
  _name       text;
  _phone      text;
  _wa         text;
  _ref_input  text;
  _ref_id     uuid;
  _code       text;
  _constraint text;
  _attempt    int;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Silakan login terlebih dahulu.' USING ERRCODE = '42501';
  END IF;

  -- Idempotent: an existing row is returned untouched.
  SELECT * INTO _row FROM public.agents WHERE user_id = _uid;
  IF FOUND THEN
    RETURN _row;
  END IF;

  SELECT u.email, COALESCE(u.raw_user_meta_data, '{}'::jsonb)
    INTO _email, _meta
  FROM auth.users u
  WHERE u.id = _uid;

  IF _email IS NULL OR btrim(_email) = '' THEN
    RAISE EXCEPTION 'Akun tidak memiliki email. Hubungi admin.' USING ERRCODE = 'P0001';
  END IF;

  -- Name: metadata full_name (email form) / name (Google) -> email prefix -> 'Agen'.
  _name := btrim(COALESCE(NULLIF(_meta ->> 'full_name', ''), NULLIF(_meta ->> 'name', ''), ''));
  IF char_length(_name) < 2 THEN
    _name := btrim(split_part(_email, '@', 1));
  END IF;
  IF char_length(_name) < 2 THEN
    _name := 'Agen';
  END IF;
  _name := left(_name, 100);

  -- Phone / WhatsApp: digits only, 10-15 long, otherwise treated as missing.
  _phone := regexp_replace(COALESCE(_meta ->> 'phone', ''), '\D', '', 'g');
  IF _phone !~ '^\d{10,15}$' THEN
    _phone := NULL;
  END IF;
  _wa := regexp_replace(COALESCE(_meta ->> 'wa_number', ''), '\D', '', 'g');
  IF _wa !~ '^\d{10,15}$' THEN
    _wa := _phone;
  END IF;

  -- Referrer: ACTIVE agents only, case-insensitive, trimmed.
  _ref_input := upper(btrim(COALESCE(_meta ->> 'referral_code', '')));
  IF _ref_input <> '' THEN
    SELECT a.id INTO _ref_id
    FROM public.agents a
    WHERE upper(a.referral_code) = _ref_input
      AND a.status = 'active'
    LIMIT 1;
  END IF;

  -- Phone already used by another agent: keep going with a placeholder (see header).
  IF _phone IS NOT NULL AND EXISTS (SELECT 1 FROM public.agents WHERE phone = _phone) THEN
    _phone := NULL;
  END IF;

  _code := public.generate_referral_code();

  FOR _attempt IN 1..8 LOOP
    BEGIN
      INSERT INTO public.agents (
        user_id, email, phone, wa_number, name, referral_code, referred_by_id,
        status, level, total_sales, total_commission, available_balance, approved_at
      ) VALUES (
        _uid,
        _email,
        COALESCE(_phone, '000' || lpad(floor(random() * 1000000000)::bigint::text, 9, '0')),
        _wa,
        _name,
        _code,
        _ref_id,
        'pending', 'silver', 0, 0, 0, NULL
      )
      ON CONFLICT (user_id) DO NOTHING
      RETURNING * INTO _row;

      EXIT;
    EXCEPTION WHEN unique_violation THEN
      GET STACKED DIAGNOSTICS _constraint = CONSTRAINT_NAME;
      IF _constraint = 'agents_referral_code_key' THEN
        _code := public.generate_referral_code();
      ELSIF _constraint = 'agents_phone_key' THEN
        _phone := NULL; -- retry with a fresh placeholder
      ELSIF _constraint = 'agents_email_key' THEN
        RAISE EXCEPTION 'Email ini sudah terdaftar sebagai agen.' USING ERRCODE = 'P0001';
      ELSIF _attempt = 8 THEN
        RAISE;
      END IF;
    END;
  END LOOP;

  -- A concurrent call may have inserted first (ON CONFLICT DO NOTHING returned nothing).
  IF _row.id IS NULL THEN
    SELECT * INTO _row FROM public.agents WHERE user_id = _uid;
  END IF;

  IF _row.id IS NULL THEN
    RAISE EXCEPTION 'Gagal membuat profil agen. Silakan coba lagi.' USING ERRCODE = 'P0001';
  END IF;

  RETURN _row;
END;
$function$;


CREATE OR REPLACE FUNCTION public.admin_list_commission_rates()
 RETURNS TABLE(package_id uuid, package_name text, departure_date date, flight text, status text, tier text, level text, amount numeric, note text, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL OR NOT (public.has_role(_uid, 'admin'::public.app_role)
                          OR public.has_role(_uid, 'agent_admin'::public.app_role)
                          OR public.has_role(_uid, 'cs_admin'::public.app_role)) THEN
    RAISE EXCEPTION 'Tidak berwenang.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT p.id, p.package_name, p.departure_date::date, p.flight, p.status,
         t.tier, l.level, r.amount, r.note, r.updated_at
    FROM public.packages p
    CROSS JOIN LATERAL unnest(coalesce(p.available_tiers, ARRAY[]::text[])) AS t(tier)
    CROSS JOIN (VALUES ('silver', 1), ('gold', 2), ('platinum', 3)) AS l(level, ord)
    LEFT JOIN public.agent_commission_rates r
           ON r.package_id = p.id AND r.tier = t.tier AND r.level = l.level
   WHERE p.status IN ('published', 'draft')
     AND p.departure_date >= current_date - 30
   ORDER BY p.departure_date, p.package_name, p.id, t.tier, l.ord;
END;
$function$;


CREATE OR REPLACE FUNCTION public.set_commission_rate(_package_id uuid, _tier text, _level text, _amount numeric, _note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _row public.agent_commission_rates%ROWTYPE;
BEGIN
  IF _uid IS NULL OR NOT (public.has_role(_uid, 'admin'::public.app_role)
                          OR public.has_role(_uid, 'agent_admin'::public.app_role)) THEN
    RAISE EXCEPTION 'Tidak berwenang.' USING ERRCODE = '42501';
  END IF;
  IF _package_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.packages WHERE id = _package_id) THEN
    RAISE EXCEPTION 'Paket tidak ditemukan.' USING ERRCODE = '22023';
  END IF;
  IF _tier IS NULL OR btrim(_tier) = '' THEN
    RAISE EXCEPTION 'Kelas paket wajib diisi.' USING ERRCODE = '22023';
  END IF;
  IF _level IS NULL OR _level NOT IN ('silver', 'gold', 'platinum') THEN
    RAISE EXCEPTION 'Level agen tidak valid.' USING ERRCODE = '22023';
  END IF;
  IF _amount IS NULL OR _amount < 0 THEN
    RAISE EXCEPTION 'Nominal komisi tidak boleh negatif.' USING ERRCODE = '22023';
  END IF;
  IF _amount <> trunc(_amount) THEN
    RAISE EXCEPTION 'Nominal komisi harus bilangan bulat (rupiah).' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.agent_commission_rates (package_id, tier, level, amount, note, updated_at, updated_by)
  VALUES (_package_id, btrim(_tier), _level, _amount, nullif(btrim(coalesce(_note, '')), ''), now(), _uid)
  ON CONFLICT (package_id, tier, level) DO UPDATE
    SET amount = EXCLUDED.amount,
        note = EXCLUDED.note,
        updated_at = now(),
        updated_by = _uid
  RETURNING * INTO _row;

  RETURN jsonb_build_object('id', _row.id, 'package_id', _row.package_id, 'tier', _row.tier, 'level', _row.level,
                            'amount', _row.amount, 'note', _row.note, 'updated_at', _row.updated_at);
END;
$function$;


CREATE OR REPLACE FUNCTION public.create_agent_lead(_name text, _whatsapp text, _package_id uuid DEFAULT NULL::uuid, _note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _me uuid := public.agent_lead_actor();
  _n text := btrim(coalesce(_name, ''));
  _wa text := public.normalize_wa_phone(_whatsapp);
  _nt text := nullif(btrim(coalesce(_note, '')), '');
  _owner uuid;
  _fee text;
  _row public.agent_leads%ROWTYPE;
  c_other constant text := 'Nomor ini sudah terdaftar sebagai lead agen lain dan masih dalam masa perlindungan. Hubungi PIC Agen jika ada pertanyaan.';
BEGIN
  SELECT a.registration_fee_status INTO _fee FROM public.agents a WHERE a.id = _me;
  IF _fee IS NULL OR _fee NOT IN ('paid', 'waived') THEN
    RAISE EXCEPTION 'Biaya registrasi belum diterima. Selesaikan pembayaran dulu.' USING ERRCODE = 'P0001';
  END IF;

  IF char_length(_n) < 2 OR char_length(_n) > 100 THEN
    RAISE EXCEPTION 'Tulis nama calon jamaah (2 sampai 100 huruf).' USING ERRCODE = 'P0001';
  END IF;
  IF _wa IS NULL THEN
    RAISE EXCEPTION 'Nomor WhatsApp belum benar. Contoh: 0812 3456 7890.' USING ERRCODE = 'P0001';
  END IF;
  IF _nt IS NOT NULL AND char_length(_nt) > 300 THEN
    RAISE EXCEPTION 'Catatan maksimal 300 karakter.' USING ERRCODE = 'P0001';
  END IF;
  IF _package_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.packages p WHERE p.id = _package_id AND p.status = 'published') THEN
    RAISE EXCEPTION 'Paket yang kamu pilih tidak ditemukan. Pilih paket lain.' USING ERRCODE = 'P0001';
  END IF;

  PERFORM public.expire_agent_leads();

  SELECT l.agent_id INTO _owner FROM public.agent_leads l WHERE l.whatsapp = _wa AND l.status = 'active';
  IF FOUND THEN
    IF _owner = _me THEN
      RAISE EXCEPTION 'Lead ini sudah kamu daftarkan.' USING ERRCODE = 'P0001';
    END IF;
    RAISE EXCEPTION '%', c_other USING ERRCODE = 'P0001';
  END IF;

  BEGIN
    INSERT INTO public.agent_leads (agent_id, name, whatsapp, package_id, interest_note)
    VALUES (_me, _n, _wa, _package_id, _nt)
    RETURNING * INTO _row;
  EXCEPTION WHEN unique_violation THEN
    -- Someone registered the same phone a moment ago.
    RAISE EXCEPTION '%', c_other USING ERRCODE = 'P0001';
  END;

  RETURN jsonb_build_object('id', _row.id, 'protected_until', _row.protected_until);
END;
$function$;


CREATE OR REPLACE FUNCTION public.create_jamaah_intake(_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pkg public.packages%ROWTYPE;
  v_agent uuid;
  v_agent_name text;
  v_fee text;
  v_ref text := nullif(btrim(coalesce(_payload ->> 'ref_code', '')), '');
  v_phone text := _payload ->> 'contact_phone';
  v_people jsonb := _payload -> 'people';
  v_id uuid;
  v_code text;
  v_n integer;
  v_person jsonb;
  v_pos integer := 0;
  v_name text := btrim(_payload ->> 'contact_name');
  v_lead public.agent_leads%ROWTYPE;
  v_lead_phone text;
  v_other_name text;
BEGIN
  IF coalesce((_payload ->> 'consent')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'consent_required' USING ERRCODE = 'P0001';
  END IF;
  IF v_people IS NULL OR jsonb_typeof(v_people) <> 'array' THEN RAISE EXCEPTION 'people_required' USING ERRCODE = 'P0001'; END IF;
  v_n := jsonb_array_length(v_people);
  IF v_n < 1 OR v_n > 10 THEN RAISE EXCEPTION 'people_count' USING ERRCODE = 'P0001'; END IF;

  SELECT * INTO v_pkg FROM public.packages
   WHERE id = (_payload ->> 'package_id')::uuid AND status = 'published' AND departure_date::date >= current_date;
  IF NOT FOUND THEN RAISE EXCEPTION 'package_unavailable' USING ERRCODE = 'P0001'; END IF;

  -- At most 5 submissions from one number per day: enough for real families, not for a script.
  IF (SELECT count(*) FROM public.jamaah_intakes WHERE contact_phone = v_phone AND created_at > now() - interval '1 day') >= 5 THEN
    RAISE EXCEPTION 'rate_limited' USING ERRCODE = 'P0001';
  END IF;

  IF v_ref IS NOT NULL THEN
    SELECT id, registration_fee_status INTO v_agent, v_fee FROM public.agents WHERE lower(referral_code) = lower(v_ref) AND status = 'active' LIMIT 1;
    -- Registration fee not received yet: the agent cannot sell. A submission from the agent portal is refused with a
    -- friendly message; a public visitor on the agent's link still registers, just without attribution.
    IF v_agent IS NOT NULL AND v_fee NOT IN ('paid', 'waived') THEN
      IF _payload ->> 'source' = 'agent' THEN
        RAISE EXCEPTION 'Biaya registrasi belum diterima. Selesaikan pembayaran dulu.' USING ERRCODE = 'P0001';
      END IF;
      v_agent := NULL;
    END IF;
  END IF;
  IF v_agent IS NOT NULL THEN
    SELECT name INTO v_agent_name FROM public.agents WHERE id = v_agent;
  END IF;

  LOOP
    v_code := public.generate_intake_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.jamaah_intakes WHERE code = v_code);
  END LOOP;

  INSERT INTO public.jamaah_intakes
    (code, package_id, contact_name, contact_phone, contact_city, contact_attending, pay_together,
     agent_id, ref_code, heard_from, notes, source, consent_at, consent_version)
  VALUES
    (v_code, v_pkg.id, v_name, v_phone, nullif(btrim(coalesce(_payload ->> 'contact_city', '')), ''),
     coalesce((_payload ->> 'contact_attending')::boolean, true), coalesce((_payload ->> 'pay_together')::boolean, false),
     v_agent, v_ref, nullif(btrim(coalesce(_payload ->> 'heard_from', '')), ''), nullif(btrim(coalesce(_payload ->> 'notes', '')), ''),
     CASE WHEN _payload ->> 'source' = 'agent' THEN 'agent' ELSE 'public' END, now(), coalesce(_payload ->> 'consent_version', 'v1'))
  RETURNING id INTO v_id;

  FOR v_person IN SELECT * FROM jsonb_array_elements(v_people) LOOP
    v_pos := v_pos + 1;
    INSERT INTO public.jamaah_intake_people (intake_id, position, full_name, gender, category, room_type, relation)
    VALUES (v_id, v_pos, btrim(v_person ->> 'full_name'), v_person ->> 'gender', v_person ->> 'category',
            v_person ->> 'room_type', nullif(btrim(coalesce(v_person ->> 'relation', '')), ''));
  END LOOP;

  -- Agent leads (SOP). Never allowed to break a registration.
  BEGIN
    v_lead_phone := public.normalize_wa_phone(v_phone);
    IF v_lead_phone IS NOT NULL THEN
      PERFORM public.expire_agent_leads();

      SELECT * INTO v_lead FROM public.agent_leads
       WHERE whatsapp = v_lead_phone AND status = 'active' AND protected_until > now()
       LIMIT 1;

      IF FOUND THEN
        IF v_agent IS NULL OR v_agent = v_lead.agent_id THEN
          UPDATE public.agent_leads SET status = 'registered', intake_id = v_id, updated_at = now() WHERE id = v_lead.id;
          IF v_agent IS NULL THEN
            -- The agent who registered and protected the lead keeps the jamaah.
            UPDATE public.jamaah_intakes SET agent_id = v_lead.agent_id WHERE id = v_id;
            v_agent := v_lead.agent_id;
            SELECT name INTO v_agent_name FROM public.agents WHERE id = v_agent;
          END IF;
        ELSE
          SELECT name INTO v_other_name FROM public.agents WHERE id = v_lead.agent_id;
          INSERT INTO public.admin_notifications (title, message, type, action_url, meta)
          VALUES ('Sengketa lead agen',
                  'Calon jamaah ' || v_name || ' mendaftar lewat agen ' || coalesce(v_agent_name, '-') ||
                  ', padahal nomornya masih lead terlindungi milik agen ' || coalesce(v_other_name, '-') || '. Management perlu memutuskan.',
                  'lead_conflict', '/admin/agent-leads',
                  jsonb_build_object(
                    'lead_id', v_lead.id,
                    'lead_agent_id', v_lead.agent_id,
                    'intake_agent_id', v_agent,
                    'intake_id', v_id,
                    'contact_name', v_name,
                    'lead_agent_name', v_other_name,
                    'intake_agent_name', v_agent_name));
        END IF;
      END IF;

      -- The intake agent's own lead for this phone (also an inactive one) counts as registered too.
      IF v_agent IS NOT NULL THEN
        UPDATE public.agent_leads SET status = 'registered', intake_id = v_id, updated_at = now()
         WHERE agent_id = v_agent AND whatsapp = v_lead_phone AND status IN ('active', 'inactive') AND intake_id IS NULL;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'agent lead link skipped for intake %: % (%)', v_id, SQLERRM, SQLSTATE;
  END;

  INSERT INTO public.admin_notifications (title, message, type, action_url, meta)
  VALUES ('Pendaftaran baru: ' || v_name || ' (' || v_n || ' orang)',
          v_pkg.package_name || ' · kode ' || v_code, 'jamaah_intake', '/admin/jamaah/masuk?intake=' || v_id,
          jsonb_build_object(
            'actor', jsonb_build_object('name', coalesce(v_agent_name, v_name), 'kind', CASE WHEN v_agent IS NOT NULL THEN 'agent' ELSE 'public' END),
            'contact_name', v_name,
            'package_name', v_pkg.package_name,
            'code', v_code,
            'people_count', v_n,
            'intake_id', v_id));

  RETURN jsonb_build_object('id', v_id, 'code', v_code);
END;
$function$;
