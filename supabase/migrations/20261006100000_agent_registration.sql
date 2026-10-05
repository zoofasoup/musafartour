-- Agent registration: create the public.agents row server-side, after the user is authenticated.
--
-- Why: with "confirm email" ON, supabase.auth.signUp() returns NO session, so the old client-side
-- INSERT into public.agents ran as anon and was rejected by RLS (auth.uid() = user_id). The form
-- data (name, phone, wa_number, referral code) was lost and a bare row with a dummy phone was
-- auto-created after the first login. The referrer lookup also ran as anon and always found nothing.
--
-- Now: signUp() passes the form data in user_metadata; after the first login the client calls
-- public.register_agent_profile(), which reads auth.uid() and auth.users.raw_user_meta_data itself.
-- Nothing is trusted from client arguments. status is always 'pending', level 'bronze', balances 0.
--
-- Phone collision behaviour (decision): registration NEVER fails because of a phone number.
--   * metadata phone invalid (not 10-15 digits) or missing (Google sign-in) -> placeholder '000xxxxxxxxx'
--   * metadata phone already used by another agent -> placeholder '000xxxxxxxxx' (the number is kept
--     in wa_number, which is not unique). Onboarding hides '000...' phones and asks for the real one;
--     if that number is truly taken, onboarding shows "Nomor telepon sudah terdaftar pada akun lain."
--   Rationale: failing here would strand a user who already confirmed an email address, and anyone
--   could otherwise probe which phone numbers are registered. Admin sees the placeholder in the
--   agents table until onboarding is done.
-- Referral: resolved among ACTIVE agents only (case-insensitive, trimmed). Unknown/inactive codes are
--   silently ignored (no attribution), never an error.

CREATE OR REPLACE FUNCTION public.register_agent_profile()
RETURNS public.agents
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
        'pending', 'bronze', 0, 0, 0, NULL
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
$$;

REVOKE ALL ON FUNCTION public.register_agent_profile() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.register_agent_profile() FROM anon;
GRANT EXECUTE ON FUNCTION public.register_agent_profile() TO authenticated;
