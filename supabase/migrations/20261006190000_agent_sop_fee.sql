-- Agent program aligned with SOP/AGEN/001 (PT Musa Amanah Wisata). Idempotent: safe to run twice.
--
-- 1. agents: registration fee tracking (Rp 1.500.000, once for life) and SOP acceptance.
--    Existing ACTIVE agents joined before the fee existed, so they are backfilled to 'waived' (only the first time the
--    column is added; a re-run must never waive an agent who is still expected to pay).
-- 2. protect_agent_columns(): the fee and SOP columns can only be changed by staff (admin / agent_admin). A direct
--    client INSERT is forced to 'unpaid' with no paid_at / SOP stamp. Redefined from the LIVE definition.
-- 3. accept_agent_sop(_version): the caller's own agents row gets sop_accepted_at / sop_version, once.
-- 4. Levels: Duta Musafar (after registration) / Silver / Gold / Platinum, by jamaah per year (0 / 1 / 15 / 30).
--    There is no Bronze: rows move to 'duta', the default becomes 'duta', agent_levels is rewritten, and the guard
--    trigger and register_agent_profile() hand out 'duta'.

-- ---------------------------------------------------------------------------------------------------------------
-- 1. Columns
-- ---------------------------------------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'agents' AND column_name = 'registration_fee_status'
  ) THEN
    ALTER TABLE public.agents
      ADD COLUMN registration_fee_status text NOT NULL DEFAULT 'unpaid'
        CONSTRAINT agents_registration_fee_status_check CHECK (registration_fee_status IN ('unpaid', 'paid', 'waived'));
    -- Agents already active before the fee existed.
    UPDATE public.agents SET registration_fee_status = 'waived' WHERE status = 'active';
  END IF;
END $$;

ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS registration_fee_paid_at timestamptz;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS sop_accepted_at timestamptz;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS sop_version text;

-- ---------------------------------------------------------------------------------------------------------------
-- 4a. Level data (before the guard/registration functions start handing out 'duta')
-- ---------------------------------------------------------------------------------------------------------------
ALTER TABLE public.agents DROP CONSTRAINT IF EXISTS agents_level_check;
UPDATE public.agents SET level = 'duta' WHERE level = 'bronze';
ALTER TABLE public.agents ALTER COLUMN level SET DEFAULT 'duta';
ALTER TABLE public.agents ADD CONSTRAINT agents_level_check CHECK (level IN ('duta', 'silver', 'gold', 'platinum'));

-- agent_levels: min/max jamaah per year. Ranges do not overlap: Silver 1-14, Gold 15-29, Platinum 30+.
-- The old percent columns are kept as they were (the commission is not a percentage); Duta copies Bronze's values.
INSERT INTO public.agent_levels (level_name, min_sales, max_sales, commission_rate_min, commission_rate_max, benefits)
SELECT 'duta', 0, 0, b.commission_rate_min, b.commission_rate_max, b.benefits
FROM public.agent_levels b
WHERE b.level_name = 'bronze'
  AND NOT EXISTS (SELECT 1 FROM public.agent_levels WHERE level_name = 'duta');

INSERT INTO public.agent_levels (level_name, min_sales, max_sales, commission_rate_min, commission_rate_max, benefits)
SELECT 'duta', 0, 0, 0, 0, ARRAY[]::text[]
WHERE NOT EXISTS (SELECT 1 FROM public.agent_levels WHERE level_name = 'duta');

DELETE FROM public.agent_levels WHERE level_name = 'bronze';

UPDATE public.agent_levels SET min_sales = 0,  max_sales = 0    WHERE level_name = 'duta';
UPDATE public.agent_levels SET min_sales = 1,  max_sales = 14   WHERE level_name = 'silver';
UPDATE public.agent_levels SET min_sales = 15, max_sales = 29   WHERE level_name = 'gold';
UPDATE public.agent_levels SET min_sales = 30, max_sales = NULL WHERE level_name = 'platinum';
UPDATE public.agent_levels
   SET benefits = ARRAY['Komisi sesuai tingkat dan paket', 'Akses marketing kit', 'Dukungan PIC Agen via WhatsApp']
 WHERE level_name IN ('duta', 'silver', 'gold', 'platinum');

-- ---------------------------------------------------------------------------------------------------------------
-- 2. Guard trigger (live definition + fee/SOP columns + 'duta')
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
    NEW.level := 'duta';
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

-- ---------------------------------------------------------------------------------------------------------------
-- 4b. register_agent_profile (live definition, 'bronze' -> 'duta')
-- ---------------------------------------------------------------------------------------------------------------
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
        'pending', 'duta', 0, 0, 0, NULL
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

-- ---------------------------------------------------------------------------------------------------------------
-- 3. accept_agent_sop
-- ---------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_agent_sop(_version text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _v   text := left(btrim(COALESCE(_version, '')), 64);
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Silakan login terlebih dahulu.' USING ERRCODE = '42501';
  END IF;
  IF _v = '' THEN
    RAISE EXCEPTION 'Versi SOP wajib diisi.' USING ERRCODE = 'P0001';
  END IF;

  -- Only the caller's own row, and only the first acceptance is recorded.
  UPDATE public.agents
     SET sop_accepted_at = now(), sop_version = _v
   WHERE user_id = _uid AND sop_accepted_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_agent_sop(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_agent_sop(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.accept_agent_sop(text) TO authenticated;
