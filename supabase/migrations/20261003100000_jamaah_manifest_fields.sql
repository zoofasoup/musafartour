-- Stage 2 of the registration form: jamaah complete their own manifest data from a private link.
-- Adds the fields of the paper form "Formulir Pendaftaran Umrah" (PT Musa Amanah Wisata) that the table lacked.
-- All new columns are nullable, so existing rows and the sheet import are untouched.

ALTER TABLE public.jamaah_registrations
  ADD COLUMN father_name text,
  ADD COLUMN marital_status text CHECK (marital_status IN ('married', 'single')),
  ADD COLUMN address text,
  ADD COLUMN email text,
  ADD COLUMN occupation text,
  ADD COLUMN education text CHECK (education IN ('sd', 'smp', 'sma', 's1', 'other')),
  ADD COLUMN blood_type text CHECK (blood_type IN ('A', 'B', 'AB', 'O')),
  ADD COLUMN emergency_name text,
  ADD COLUMN emergency_relation text,
  ADD COLUMN emergency_phone text,
  ADD COLUMN medical_notes text;

-- ---------------------------------------------------------------------------
-- Read what a private link may see: the people of ONE accepted intake, nothing else.
-- Only the service role (the /api/lengkapi function) can call these; the token is the only credential.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_manifest_by_token(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_intake public.jamaah_intakes%ROWTYPE;
  v_pkg public.packages%ROWTYPE;
BEGIN
  IF _token IS NULL OR _token !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Link tidak valid.'; END IF;
  SELECT * INTO v_intake FROM public.jamaah_intakes WHERE manifest_token = _token;
  IF NOT FOUND THEN RAISE EXCEPTION 'Link tidak valid.'; END IF;
  IF v_intake.status = 'new' THEN RAISE EXCEPTION 'Pendaftaran belum diterima. Kami akan menghubungi kamu lewat WhatsApp.'; END IF;
  IF v_intake.status = 'rejected' THEN RAISE EXCEPTION 'Link tidak valid.'; END IF;
  SELECT * INTO v_pkg FROM public.packages WHERE id = v_intake.package_id;

  RETURN jsonb_build_object(
    'code', v_intake.code,
    'contact_name', v_intake.contact_name,
    'package_name', v_pkg.package_name,
    'departure_date', v_pkg.departure_date,
    'people', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', r.id, 'full_name', r.full_name, 'gender', r.gender, 'room_type', r.room_type,
        'is_child', r.room_type IN ('non_bed', 'infant'),
        'nik', r.nik, 'birth_place', r.birth_place, 'date_of_birth', r.date_of_birth,
        'passport_number', r.passport_number, 'passport_issued_at', r.passport_issued_at, 'passport_expiry', r.passport_expiry,
        'passport_issue_office', r.passport_issue_office,
        'father_name', r.father_name, 'marital_status', r.marital_status, 'address', r.address, 'email', r.email,
        'occupation', r.occupation, 'education', r.education, 'blood_type', r.blood_type,
        'emergency_name', r.emergency_name, 'emergency_relation', r.emergency_relation, 'emergency_phone', r.emergency_phone,
        'medical_notes', r.medical_notes, 'mahram_name', r.mahram_name, 'mahram_relation', r.mahram_relation,
        'meningitis_vaccinated_at', r.meningitis_vaccinated_at, 'polio_vaccinated_at', r.polio_vaccinated_at,
        'equipment_size', r.equipment_size, 'roommate_note', r.roommate_note,
        'has_ktp', r.ktp_path IS NOT NULL, 'has_passport', r.passport_path IS NOT NULL, 'has_photo', r.photo_path IS NOT NULL
      ) ORDER BY r.created_at, r.id)
      FROM public.jamaah_registrations r
      WHERE r.intake_id = v_intake.id AND r.status = 'active'
    ), '[]'::jsonb)
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Save fields for one person of that intake. Only the whitelisted keys are applied; every value is checked.
-- Fields not sent stay as they are, so people can save in parts.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.save_manifest_by_token(_token text, _registration_id uuid, _fields jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_intake_id uuid;
  v_reg public.jamaah_registrations%ROWTYPE;
  v_dep date;
  k text;
  v text;
  d date;
  v_max int;
  v_ids text[] := ARRAY['nik','birth_place','date_of_birth','passport_number','passport_issued_at','passport_expiry','passport_issue_office',
    'father_name','marital_status','address','email','occupation','education','blood_type','emergency_name','emergency_relation',
    'emergency_phone','medical_notes','mahram_name','mahram_relation','meningitis_vaccinated_at','polio_vaccinated_at','equipment_size','roommate_note'];
BEGIN
  IF _token IS NULL OR _token !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Link tidak valid.'; END IF;
  SELECT id INTO v_intake_id FROM public.jamaah_intakes WHERE manifest_token = _token AND status = 'accepted';
  IF NOT FOUND THEN RAISE EXCEPTION 'Link tidak valid.'; END IF;
  SELECT * INTO v_reg FROM public.jamaah_registrations WHERE id = _registration_id AND intake_id = v_intake_id AND status = 'active' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Data jamaah tidak ditemukan di pendaftaran ini.'; END IF;
  SELECT departure_date INTO v_dep FROM public.packages WHERE id = v_reg.package_id;
  IF jsonb_typeof(_fields) <> 'object' THEN RAISE EXCEPTION 'Data tidak terbaca.'; END IF;

  FOREACH k IN ARRAY v_ids LOOP
    CONTINUE WHEN NOT (_fields ? k);
    v := nullif(btrim(regexp_replace(coalesce(_fields ->> k, ''), '\s+', ' ', 'g')), '');
    v_max := CASE k WHEN 'address' THEN 300 WHEN 'medical_notes' THEN 500 ELSE 120 END;
    IF v IS NOT NULL AND char_length(v) > v_max THEN
      RAISE EXCEPTION 'Isian "%" terlalu panjang.', k;
    END IF;

    IF k = 'nik' AND v IS NOT NULL AND v !~ '^[0-9]{16}$' THEN RAISE EXCEPTION 'NIK harus 16 angka.'; END IF;
    IF k = 'email' AND v IS NOT NULL AND v !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RAISE EXCEPTION 'Alamat email belum benar.'; END IF;
    IF k = 'emergency_phone' AND v IS NOT NULL AND regexp_replace(v, '[^0-9]', '', 'g') !~ '^[0-9]{8,15}$' THEN RAISE EXCEPTION 'Nomor HP kontak darurat belum benar.'; END IF;
    IF k = 'passport_number' AND v IS NOT NULL THEN v := upper(v); IF v !~ '^[A-Z0-9]{5,12}$' THEN RAISE EXCEPTION 'Nomor paspor belum benar.'; END IF; END IF;
    IF k IN ('date_of_birth', 'passport_issued_at', 'passport_expiry', 'meningitis_vaccinated_at', 'polio_vaccinated_at') AND v IS NOT NULL THEN
      IF v !~ '^\d{4}-\d{2}-\d{2}$' THEN RAISE EXCEPTION 'Tanggal "%" belum benar.', k; END IF;
      BEGIN d := v::date; EXCEPTION WHEN others THEN RAISE EXCEPTION 'Tanggal "%" belum benar.', k; END;
      IF k = 'date_of_birth' AND (d < date '1900-01-01' OR d > current_date) THEN RAISE EXCEPTION 'Tanggal lahir belum benar.'; END IF;
      IF k IN ('passport_issued_at', 'meningitis_vaccinated_at', 'polio_vaccinated_at') AND d > current_date THEN RAISE EXCEPTION 'Tanggal "%" tidak boleh di masa depan.', k; END IF;
      IF k = 'passport_expiry' AND d < current_date THEN RAISE EXCEPTION 'Paspor sudah kedaluwarsa.'; END IF;
    END IF;
    IF k = 'marital_status' AND v IS NOT NULL AND v NOT IN ('married', 'single') THEN RAISE EXCEPTION 'Pilih status kawin.'; END IF;
    IF k = 'education' AND v IS NOT NULL AND v NOT IN ('sd', 'smp', 'sma', 's1', 'other') THEN RAISE EXCEPTION 'Pilih pendidikan.'; END IF;
    IF k = 'blood_type' AND v IS NOT NULL THEN v := upper(v); IF v NOT IN ('A', 'B', 'AB', 'O') THEN RAISE EXCEPTION 'Pilih golongan darah.'; END IF; END IF;

    -- The column name comes from the fixed list above, never from the caller.
    EXECUTE format('UPDATE public.jamaah_registrations SET %I = %s WHERE id = $1',
                   k, CASE WHEN k IN ('date_of_birth','passport_issued_at','passport_expiry','meningitis_vaccinated_at','polio_vaccinated_at') THEN '$2::date' ELSE '$2' END)
      USING _registration_id, v;
  END LOOP;

  SELECT * INTO v_reg FROM public.jamaah_registrations WHERE id = _registration_id;
  IF v_reg.passport_issued_at IS NOT NULL AND v_reg.passport_expiry IS NOT NULL AND v_reg.passport_expiry <= v_reg.passport_issued_at THEN
    RAISE EXCEPTION 'Tanggal paspor berlaku harus setelah tanggal terbit.';
  END IF;
END;
$$;

-- Record an uploaded document. The function (service role) wrote the file; the path is never taken from the browser.
CREATE OR REPLACE FUNCTION public.set_manifest_doc_by_token(_token text, _registration_id uuid, _kind text, _path text)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_intake_id uuid;
BEGIN
  IF _token IS NULL OR _token !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Link tidak valid.'; END IF;
  SELECT id INTO v_intake_id FROM public.jamaah_intakes WHERE manifest_token = _token AND status = 'accepted';
  IF NOT FOUND THEN RAISE EXCEPTION 'Link tidak valid.'; END IF;
  IF _kind NOT IN ('ktp', 'passport', 'photo') THEN RAISE EXCEPTION 'Jenis dokumen tidak dikenal.'; END IF;
  IF _path IS NULL OR _path !~ ('^manifest/' || _registration_id::text || '/[a-z]+-[a-f0-9-]{36}\.(jpg|png|pdf)$') THEN RAISE EXCEPTION 'Lokasi dokumen tidak valid.'; END IF;
  UPDATE public.jamaah_registrations
     SET ktp_path = CASE WHEN _kind = 'ktp' THEN _path ELSE ktp_path END,
         passport_path = CASE WHEN _kind = 'passport' THEN _path ELSE passport_path END,
         photo_path = CASE WHEN _kind = 'photo' THEN _path ELSE photo_path END
   WHERE id = _registration_id AND intake_id = v_intake_id AND status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'Data jamaah tidak ditemukan di pendaftaran ini.'; END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.get_manifest_by_token(text), public.save_manifest_by_token(text, uuid, jsonb), public.set_manifest_doc_by_token(text, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_manifest_by_token(text), public.save_manifest_by_token(text, uuid, jsonb), public.set_manifest_doc_by_token(text, uuid, text, text) TO service_role;
