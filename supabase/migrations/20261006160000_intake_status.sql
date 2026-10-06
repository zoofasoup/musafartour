-- "Cek status pendaftaran" (/cek-status): a person who registered through /daftar can see where their
-- registration stands with the registration code (MSF-XXXXX) plus the WhatsApp number they registered with.
--
-- Only the website's server function (functions/api/cek-status.ts, service role) can call this. The browser has
-- no access. The answer is deliberately thin: a stage, the package, the departure date and a head count.
-- It never contains the private manifest link, document paths, amounts, names or any form data.
--
-- Guessing protection: Turnstile + Cloudflare in front, and here at most 10 failed attempts per code per hour
-- (counted for any well-formed code, existing or not, so the limit itself reveals nothing).

-- 1. Failed attempts ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.intake_status_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code text NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS intake_status_attempts_code_idx ON public.intake_status_attempts (code, attempted_at DESC);

ALTER TABLE public.intake_status_attempts ENABLE ROW LEVEL SECURITY;   -- no policies: only the function below touches it
REVOKE ALL ON public.intake_status_attempts FROM PUBLIC, anon, authenticated;

-- 2. The lookup --------------------------------------------------------------------------

-- Returns {"found": false} for any code/number that does not match (a failed attempt is recorded, which is why
-- this is a return value and not an exception: an exception would roll the record back). Raises P0001
-- 'rate_limited' once a code has 10 failed attempts in the last hour.
CREATE OR REPLACE FUNCTION public.get_intake_status(_code text, _phone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  -- Business rule (PRODUCT.md): DP Rp 5 jt per person. Keep in sync with DP_MIN_PER_PAX in src/lib/jamaah.ts.
  c_dp_per_person constant numeric := 5000000;
  v_code text := regexp_replace(upper(btrim(coalesce(_code, ''))), '^MSF-?', 'MSF-');
  v_digits text := regexp_replace(coalesce(_phone, ''), '[^0-9]', '', 'g');
  v_phone text;
  v_intake public.jamaah_intakes%ROWTYPE;
  v_pkg public.packages%ROWTYPE;
  v_people integer;
  v_active integer;
  v_due numeric;
  v_paid numeric;
  v_waiting integer;
  v_incomplete integer;
  v_stage text;
  v_label text;
BEGIN
  -- Normalise like the registration form: 0812..., 812..., 62812... -> 62812...
  v_phone := CASE WHEN v_digits LIKE '0%' THEN '62' || substr(v_digits, 2)
                  WHEN v_digits LIKE '8%' THEN '62' || v_digits
                  ELSE v_digits END;

  -- A malformed code can never match; answer the same way without recording anything.
  IF v_code !~ '^MSF-[A-Z2-9]{5}$' OR v_phone !~ '^62[0-9]{8,13}$' THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  IF (SELECT count(*) FROM public.intake_status_attempts
       WHERE code = v_code AND attempted_at > now() - interval '1 hour') >= 10 THEN
    RAISE EXCEPTION 'rate_limited' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_intake FROM public.jamaah_intakes WHERE code = v_code AND contact_phone = v_phone;
  IF NOT FOUND THEN
    INSERT INTO public.intake_status_attempts (code) VALUES (v_code);
    -- Housekeeping, now and then: old attempts are of no use.
    IF random() < 0.05 THEN
      DELETE FROM public.intake_status_attempts WHERE attempted_at < now() - interval '1 day';
    END IF;
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT * INTO v_pkg FROM public.packages WHERE id = v_intake.package_id;

  SELECT count(*) INTO v_people FROM public.jamaah_intake_people WHERE intake_id = v_intake.id;

  SELECT count(*), coalesce(sum(r.list_price - r.discount), 0)
    INTO v_active, v_due
    FROM public.jamaah_registrations r
   WHERE r.intake_id = v_intake.id AND r.status = 'active';

  SELECT coalesce(sum(p.amount) FILTER (WHERE p.status = 'verified'), 0),
         count(*) FILTER (WHERE p.status = 'pending')
    INTO v_paid, v_waiting
    FROM public.jamaah_payments p
    JOIN public.jamaah_registrations r ON r.id = p.registration_id
   WHERE r.intake_id = v_intake.id AND r.status = 'active';

  -- Core data still missing for at least one person (identity, passport, the three documents).
  SELECT count(*) INTO v_incomplete
    FROM public.jamaah_registrations r
   WHERE r.intake_id = v_intake.id AND r.status = 'active'
     AND (r.nik IS NULL OR r.date_of_birth IS NULL OR r.passport_number IS NULL OR r.passport_expiry IS NULL
          OR r.ktp_path IS NULL OR r.passport_path IS NULL OR r.photo_path IS NULL);

  IF v_intake.status = 'new' THEN
    v_stage := 'waiting_cs';  v_label := 'Menunggu CS';
  ELSIF v_intake.status = 'rejected' THEN
    v_stage := 'rejected';    v_label := 'Belum bisa diproses';
  ELSIF v_active = 0 THEN
    v_stage := 'cancelled';   v_label := 'Dibatalkan';
  ELSIF v_due > 0 AND v_paid >= v_due THEN
    v_stage := 'lunas';       v_label := 'Lunas';
  ELSIF v_paid >= c_dp_per_person * v_active THEN
    v_stage := 'dp_received'; v_label := 'DP diterima';
  ELSE
    v_stage := 'accepted';    v_label := 'Diterima CS, menunggu DP';
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'code', v_intake.code,
    'stage', v_stage,
    'label', v_label,
    'package_name', v_pkg.package_name,
    'departure_date', v_pkg.departure_date,
    'people_count', CASE WHEN v_intake.status = 'accepted' AND v_active > 0 THEN v_active ELSE v_people END,
    'data_pending', v_stage IN ('accepted', 'dp_received', 'lunas') AND v_incomplete > 0,
    'payment_checking', v_stage IN ('accepted', 'dp_received') AND v_waiting > 0
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_intake_status(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_intake_status(text, text) TO service_role;
