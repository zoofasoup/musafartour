-- Public registration form (/daftar/<slug>): what people submit waits in a queue until CS accepts it.
-- Nobody but staff can read the queue and the public has no table access at all: the website's server
-- function writes through create_jamaah_intake() with the service role (checked, rate limited).

-- 1. Tables ---------------------------------------------------------------------

CREATE TABLE public.jamaah_intakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,                       -- short reference the person keeps, e.g. MSF-7K3QX
  package_id uuid NOT NULL REFERENCES public.packages(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'accepted', 'rejected')),

  contact_name text NOT NULL CHECK (char_length(btrim(contact_name)) BETWEEN 1 AND 150),
  contact_phone text NOT NULL CHECK (contact_phone ~ '^62[0-9]{8,13}$'),   -- normalised: 62812...
  contact_city text,
  contact_attending boolean NOT NULL DEFAULT true,  -- false: registering for someone else
  pay_together boolean NOT NULL DEFAULT false,      -- one transfer for everyone: becomes one family

  agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  ref_code text,                                    -- the referral code as received
  heard_from text,
  notes text,
  source text NOT NULL DEFAULT 'public' CHECK (source IN ('public', 'agent')),

  consent_at timestamptz NOT NULL,                  -- agreed to the data and payment terms
  consent_version text NOT NULL,

  -- Personal link for step 2 (completing passport, documents, ...). Long and random: it is the only key.
  manifest_token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),

  reject_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT jamaah_intakes_reject_reason CHECK (status <> 'rejected' OR coalesce(btrim(reject_reason), '') <> '')
);
CREATE INDEX jamaah_intakes_status_idx ON public.jamaah_intakes (status, created_at DESC);
CREATE INDEX jamaah_intakes_package_idx ON public.jamaah_intakes (package_id);
CREATE INDEX jamaah_intakes_phone_idx ON public.jamaah_intakes (contact_phone, created_at DESC);

CREATE TABLE public.jamaah_intake_people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES public.jamaah_intakes(id) ON DELETE CASCADE,
  position integer NOT NULL,
  full_name text NOT NULL CHECK (char_length(btrim(full_name)) BETWEEN 1 AND 150),
  gender text NOT NULL CHECK (gender IN ('L', 'P')),
  category text NOT NULL CHECK (category IN ('adult', 'child_nobed', 'infant')),
  room_type text NOT NULL CHECK (room_type IN ('quad', 'triple', 'double', 'non_bed', 'infant')),
  relation text,
  registration_id uuid REFERENCES public.jamaah_registrations(id) ON DELETE SET NULL,  -- set when accepted
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Adults pick a room; a child without a bed and an infant have their own types.
  CONSTRAINT jamaah_intake_people_room_matches_category CHECK (
    (category = 'adult' AND room_type IN ('quad', 'triple', 'double'))
    OR (category = 'child_nobed' AND room_type = 'non_bed')
    OR (category = 'infant' AND room_type = 'infant')
  )
);
CREATE INDEX jamaah_intake_people_intake_idx ON public.jamaah_intake_people (intake_id, position);

ALTER TABLE public.jamaah_registrations
  ADD COLUMN IF NOT EXISTS intake_id uuid REFERENCES public.jamaah_intakes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS jamaah_registrations_intake_idx ON public.jamaah_registrations (intake_id);

-- 2. Access ---------------------------------------------------------------------

ALTER TABLE public.jamaah_intakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jamaah_intake_people ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.jamaah_intakes, public.jamaah_intake_people FROM anon;

CREATE POLICY "Staff read intakes" ON public.jamaah_intakes FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'cs_admin'::app_role));
CREATE POLICY "Staff review intakes" ON public.jamaah_intakes FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'cs_admin'::app_role));

CREATE POLICY "Staff read intake people" ON public.jamaah_intake_people FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'cs_admin'::app_role));
CREATE POLICY "Staff edit intake people" ON public.jamaah_intake_people FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'cs_admin'::app_role));

GRANT SELECT, UPDATE ON public.jamaah_intakes, public.jamaah_intake_people TO authenticated;

-- 3. Receiving a submission (called only by the website's server function) -------------

CREATE OR REPLACE FUNCTION public.generate_intake_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   -- no 0/O/1/I/L to avoid mix-ups on WhatsApp
  code text := 'MSF-';
BEGIN
  FOR i IN 1..5 LOOP
    code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  END LOOP;
  RETURN code;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_jamaah_intake(_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pkg public.packages%ROWTYPE;
  v_agent uuid;
  v_ref text := nullif(btrim(coalesce(_payload ->> 'ref_code', '')), '');
  v_phone text := _payload ->> 'contact_phone';
  v_people jsonb := _payload -> 'people';
  v_id uuid;
  v_code text;
  v_n integer;
  v_person jsonb;
  v_pos integer := 0;
  v_name text := btrim(_payload ->> 'contact_name');
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
    SELECT id INTO v_agent FROM public.agents WHERE lower(referral_code) = lower(v_ref) AND status = 'active' LIMIT 1;
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
     'public', now(), coalesce(_payload ->> 'consent_version', 'v1'))
  RETURNING id INTO v_id;

  FOR v_person IN SELECT * FROM jsonb_array_elements(v_people) LOOP
    v_pos := v_pos + 1;
    INSERT INTO public.jamaah_intake_people (intake_id, position, full_name, gender, category, room_type, relation)
    VALUES (v_id, v_pos, btrim(v_person ->> 'full_name'), v_person ->> 'gender', v_person ->> 'category',
            v_person ->> 'room_type', nullif(btrim(coalesce(v_person ->> 'relation', '')), ''));
  END LOOP;

  INSERT INTO public.admin_notifications (title, message, type, action_url)
  VALUES ('Pendaftaran baru: ' || v_name || ' (' || v_n || ' orang)',
          v_pkg.package_name || ' · kode ' || v_code, 'jamaah_intake', '/admin/jamaah/masuk');

  RETURN jsonb_build_object('id', v_id, 'code', v_code);
END;
$$;

REVOKE ALL ON FUNCTION public.create_jamaah_intake(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_jamaah_intake(jsonb) TO service_role;

-- 4. Staff: accept or reject ------------------------------------------------------

-- _people: [{ id, full_name, room_type, list_price, include }] as edited by CS. SECURITY INVOKER: row level
-- security and the audit trail apply exactly as if CS had typed each jamaah by hand (the audit says "Laily
-- mendaftarkan jamaah"). All or nothing.
CREATE OR REPLACE FUNCTION public.accept_jamaah_intake(_intake_id uuid, _people jsonb, _force boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_intake public.jamaah_intakes%ROWTYPE;
  v_pkg public.packages%ROWTYPE;
  v_person jsonb;
  v_included jsonb[] := ARRAY[]::jsonb[];
  v_group uuid;
  v_reg uuid;
  v_regs uuid[] := ARRAY[]::uuid[];
  v_phone text;
BEGIN
  SELECT * INTO v_intake FROM public.jamaah_intakes WHERE id = _intake_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pendaftaran tidak ditemukan.'; END IF;
  IF v_intake.status <> 'new' THEN RAISE EXCEPTION 'Pendaftaran ini sudah diproses.'; END IF;
  SELECT * INTO v_pkg FROM public.packages WHERE id = v_intake.package_id;

  FOR v_person IN SELECT * FROM jsonb_array_elements(_people) LOOP
    IF coalesce((v_person ->> 'include')::boolean, true) THEN v_included := v_included || v_person; END IF;
  END LOOP;
  IF coalesce(array_length(v_included, 1), 0) = 0 THEN RAISE EXCEPTION 'Pilih minimal satu peserta untuk diterima.'; END IF;

  -- Seats are counted from the registrations here only when the package already runs on website data.
  IF v_pkg.seat_source = 'website' AND v_pkg.slots_total IS NOT NULL AND NOT _force
     AND v_pkg.slots_registered + array_length(v_included, 1) > v_pkg.slots_total THEN
    RAISE EXCEPTION 'Seat tidak cukup: sisa %, diminta %.', greatest(v_pkg.slots_total - v_pkg.slots_registered, 0), array_length(v_included, 1);
  END IF;

  v_phone := CASE WHEN v_intake.contact_phone LIKE '62%' THEN '0' || substr(v_intake.contact_phone, 3) ELSE v_intake.contact_phone END;

  IF v_intake.pay_together AND array_length(v_included, 1) >= 2 THEN
    INSERT INTO public.jamaah_groups (package_id, name)
    VALUES (v_intake.package_id, left('Keluarga ' || btrim(v_included[1] ->> 'full_name'), 120))
    RETURNING id INTO v_group;
  END IF;

  FOREACH v_person IN ARRAY v_included LOOP
    INSERT INTO public.jamaah_registrations
      (package_id, group_id, full_name, phone, domicile, room_type, list_price, discount, agent_id, referral_note,
       gender, notes, intake_id, created_at)
    VALUES
      (v_intake.package_id, v_group, btrim(v_person ->> 'full_name'), v_phone, v_intake.contact_city,
       v_person ->> 'room_type', coalesce((v_person ->> 'list_price')::numeric, 0), 0, v_intake.agent_id,
       CASE WHEN v_intake.agent_id IS NULL THEN coalesce(v_intake.heard_from, v_intake.ref_code) END,
       (SELECT gender FROM public.jamaah_intake_people WHERE id = (v_person ->> 'id')::uuid),
       'Dari form ' || v_intake.code || coalesce(' · ' || v_intake.notes, ''),
       v_intake.id, clock_timestamp())
    RETURNING id INTO v_reg;
    v_regs := v_regs || v_reg;
    UPDATE public.jamaah_intake_people SET registration_id = v_reg WHERE id = (v_person ->> 'id')::uuid AND intake_id = v_intake.id;
  END LOOP;

  UPDATE public.jamaah_intakes SET status = 'accepted', reviewed_by = auth.uid(), reviewed_at = now() WHERE id = v_intake.id;
  RETURN jsonb_build_object('group_id', v_group, 'registration_ids', to_jsonb(v_regs));
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_jamaah_intake(_intake_id uuid, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF coalesce(btrim(_reason), '') = '' THEN RAISE EXCEPTION 'Tulis alasan penolakan.'; END IF;
  UPDATE public.jamaah_intakes
     SET status = 'rejected', reject_reason = btrim(_reason), reviewed_by = auth.uid(), reviewed_at = now()
   WHERE id = _intake_id AND status = 'new';
  IF NOT FOUND THEN RAISE EXCEPTION 'Pendaftaran ini sudah diproses atau tidak ditemukan.'; END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_jamaah_intake(uuid, jsonb, boolean), public.reject_jamaah_intake(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_jamaah_intake(uuid, jsonb, boolean), public.reject_jamaah_intake(uuid, text) TO authenticated;
