-- Agent LEADS (SOP agen): every prospective jamaah an agent brings must be registered as a lead first.
-- Idempotent: safe to run twice.
--
-- SOP rules this implements (and what it deliberately does NOT do):
--   * Minimum data per lead: name, WhatsApp, interested package, Agent ID (agents.referral_code), registration date.
--   * Protection: 30 calendar days from registration (fixed, a follow-up never extends it). Only ONE active protected
--     lead per phone across all agents (unique partial index). After the period the lead turns 'inactive' (lazily,
--     inside the functions below, and by expire_agent_leads() for a cron) and another agent may register that phone.
--   * Record per lead: communication start (registered_at), follow-up history (agent_lead_followups), status.
--   * Linking to the jamaah registration is done inside create_jamaah_intake (section 4).
--   * Disputes are decided by management. The database only records and flags them (admin_notifications type
--     'lead_conflict'). helped_by_agent_id is recorded so management can apply the 30/70 or 60/40 split later.
--     NO commission is split here.
--
-- Access: agents never write the tables directly. They call the SECURITY DEFINER functions below, each of which
-- requires an ACTIVE agents row for the caller. Agents may SELECT only their own rows; staff (admin, agent_admin,
-- cs_admin) read everything.

-- ---------------------------------------------------------------------------------------------------------------
-- 0. Phone normalisation, same rule as the registration form (src/lib/intakeForm.ts, functions/_lib/intake.ts):
--    0812... / +62812... / 62812... / 812... -> 62812..., valid when 62 + 8..13 digits, else NULL.
-- ---------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.normalize_wa_phone(_raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE WHEN d ~ '^62[0-9]{8,13}$' THEN d ELSE NULL END
  FROM (
    SELECT CASE WHEN d0 LIKE '0%' THEN '62' || substr(d0, 2)
                WHEN d0 LIKE '8%' THEN '62' || d0
                ELSE d0 END AS d
    FROM (SELECT regexp_replace(coalesce(_raw, ''), '[^0-9]', '', 'g') AS d0) s
  ) t
$$;

REVOKE ALL ON FUNCTION public.normalize_wa_phone(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.normalize_wa_phone(text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 100),
  whatsapp text NOT NULL CHECK (whatsapp ~ '^62[0-9]{8,13}$'),
  package_id uuid REFERENCES public.packages(id) ON DELETE SET NULL,
  interest_note text CHECK (interest_note IS NULL OR char_length(interest_note) <= 300),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'registered', 'lost')),
  registered_at timestamptz NOT NULL DEFAULT now(),
  protected_until timestamptz NOT NULL DEFAULT now() + interval '30 days',
  last_followup_at timestamptz,
  helped_by_agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  intake_id uuid REFERENCES public.jamaah_intakes(id) ON DELETE SET NULL,
  inactive_reason text CHECK (inactive_reason IS NULL OR char_length(inactive_reason) <= 200),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_leads_agent_status_idx ON public.agent_leads (agent_id, status);
CREATE INDEX IF NOT EXISTS agent_leads_whatsapp_idx ON public.agent_leads (whatsapp);
-- One ACTIVE protected lead per phone across all agents.
CREATE UNIQUE INDEX IF NOT EXISTS agent_leads_one_active_per_phone ON public.agent_leads (whatsapp) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS public.agent_lead_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.agent_leads(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('chat', 'call', 'meeting', 'note')),
  note text CHECK (note IS NULL OR char_length(note) <= 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_lead_followups_lead_idx ON public.agent_lead_followups (lead_id, created_at DESC);

-- ---------------------------------------------------------------------------------------------------------------
-- 2. RLS: read-only for agents (own rows) and staff (all rows); every write goes through the functions below.
-- ---------------------------------------------------------------------------------------------------------------
ALTER TABLE public.agent_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_lead_followups ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.agent_leads FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.agent_lead_followups FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.agent_leads TO authenticated;
GRANT SELECT ON public.agent_lead_followups TO authenticated;

DROP POLICY IF EXISTS "Agents read own leads" ON public.agent_leads;
CREATE POLICY "Agents read own leads" ON public.agent_leads
  FOR SELECT TO authenticated
  USING (agent_id IN (SELECT a.id FROM public.agents a WHERE a.user_id = auth.uid()));

DROP POLICY IF EXISTS "Staff read all leads" ON public.agent_leads;
CREATE POLICY "Staff read all leads" ON public.agent_leads
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'agent_admin'::public.app_role)
      OR public.has_role(auth.uid(), 'cs_admin'::public.app_role));

DROP POLICY IF EXISTS "Agents read own lead followups" ON public.agent_lead_followups;
CREATE POLICY "Agents read own lead followups" ON public.agent_lead_followups
  FOR SELECT TO authenticated
  USING (agent_id IN (SELECT a.id FROM public.agents a WHERE a.user_id = auth.uid()));

DROP POLICY IF EXISTS "Staff read all lead followups" ON public.agent_lead_followups;
CREATE POLICY "Staff read all lead followups" ON public.agent_lead_followups
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'agent_admin'::public.app_role)
      OR public.has_role(auth.uid(), 'cs_admin'::public.app_role));

-- ---------------------------------------------------------------------------------------------------------------
-- 3. Functions
-- ---------------------------------------------------------------------------------------------------------------

-- Internal: the caller's ACTIVE agent id, or 42501. Not callable from outside (only from the definer functions).
CREATE OR REPLACE FUNCTION public.agent_lead_actor()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me uuid;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    SELECT a.id INTO _me FROM public.agents a WHERE a.user_id = auth.uid() AND a.status = 'active';
  END IF;
  IF _me IS NULL THEN
    RAISE EXCEPTION 'Akun agen belum aktif.' USING ERRCODE = '42501';
  END IF;
  RETURN _me;
END;
$$;

REVOKE ALL ON FUNCTION public.agent_lead_actor() FROM PUBLIC, anon, authenticated;

-- Marks leads whose 30 days are over as inactive. Called lazily by the functions below; service_role may also run it
-- on a schedule. Returns how many leads changed.
CREATE OR REPLACE FUNCTION public.expire_agent_leads()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _n integer;
BEGIN
  UPDATE public.agent_leads
     SET status = 'inactive', inactive_reason = 'Masa perlindungan 30 hari berakhir', updated_at = now()
   WHERE status = 'active' AND protected_until < now();
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_agent_leads() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_agent_leads() TO service_role;

-- Register a lead. Never reveals which other agent owns a phone, nor until when.
CREATE OR REPLACE FUNCTION public.create_agent_lead(_name text, _whatsapp text, _package_id uuid DEFAULT NULL, _note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me uuid := public.agent_lead_actor();
  _n text := btrim(coalesce(_name, ''));
  _wa text := public.normalize_wa_phone(_whatsapp);
  _nt text := nullif(btrim(coalesce(_note, '')), '');
  _owner uuid;
  _row public.agent_leads%ROWTYPE;
  c_other constant text := 'Nomor ini sudah terdaftar sebagai lead agen lain dan masih dalam masa perlindungan. Hubungi PIC Agen jika ada pertanyaan.';
BEGIN
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
$$;

REVOKE ALL ON FUNCTION public.create_agent_lead(text, text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_agent_lead(text, text, uuid, text) TO authenticated;

-- Record a follow-up. It does not extend the protection (fixed 30 days from registration).
CREATE OR REPLACE FUNCTION public.add_lead_followup(_lead_id uuid, _kind text, _note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me uuid := public.agent_lead_actor();
  _nt text := nullif(btrim(coalesce(_note, '')), '');
  _lead public.agent_leads%ROWTYPE;
  _fid uuid;
  _at timestamptz := now();
BEGIN
  IF _kind IS NULL OR _kind NOT IN ('chat', 'call', 'meeting', 'note') THEN
    RAISE EXCEPTION 'Pilih jenis follow-up.' USING ERRCODE = 'P0001';
  END IF;
  IF _nt IS NOT NULL AND char_length(_nt) > 500 THEN
    RAISE EXCEPTION 'Catatan maksimal 500 karakter.' USING ERRCODE = 'P0001';
  END IF;

  PERFORM public.expire_agent_leads();

  SELECT * INTO _lead FROM public.agent_leads l WHERE l.id = _lead_id AND l.agent_id = _me FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead tidak ditemukan.' USING ERRCODE = 'P0001';
  END IF;
  IF _lead.status NOT IN ('active', 'registered') THEN
    RAISE EXCEPTION 'Lead ini sudah tidak aktif. Aktifkan lagi dulu bila masih dalam masa perlindungan.' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.agent_lead_followups (lead_id, agent_id, kind, note)
  VALUES (_lead.id, _me, _kind, _nt)
  RETURNING id INTO _fid;

  UPDATE public.agent_leads SET last_followup_at = _at, updated_at = _at WHERE id = _lead.id;

  RETURN jsonb_build_object('id', _fid, 'last_followup_at', _at);
END;
$$;

REVOKE ALL ON FUNCTION public.add_lead_followup(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_lead_followup(uuid, text, text) TO authenticated;

-- active -> inactive | lost; inactive -> active only while still protected. registered and lost are final.
CREATE OR REPLACE FUNCTION public.set_lead_status(_lead_id uuid, _status text, _reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me uuid := public.agent_lead_actor();
  _rs text := nullif(btrim(coalesce(_reason, '')), '');
  _lead public.agent_leads%ROWTYPE;
BEGIN
  IF _status IS NULL OR _status NOT IN ('active', 'inactive', 'lost') THEN
    RAISE EXCEPTION 'Status lead tidak dikenal.' USING ERRCODE = 'P0001';
  END IF;
  IF _rs IS NOT NULL AND char_length(_rs) > 200 THEN
    RAISE EXCEPTION 'Alasan maksimal 200 karakter.' USING ERRCODE = 'P0001';
  END IF;

  PERFORM public.expire_agent_leads();

  SELECT * INTO _lead FROM public.agent_leads l WHERE l.id = _lead_id AND l.agent_id = _me FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead tidak ditemukan.' USING ERRCODE = 'P0001';
  END IF;

  IF _lead.status IN ('registered', 'lost') THEN
    RAISE EXCEPTION 'Status lead ini sudah final dan tidak bisa diubah.' USING ERRCODE = 'P0001';
  END IF;

  IF _lead.status = 'active' AND _status IN ('inactive', 'lost') THEN
    UPDATE public.agent_leads SET status = _status, inactive_reason = _rs, updated_at = now() WHERE id = _lead.id;
  ELSIF _lead.status = 'inactive' AND _status = 'active' THEN
    IF _lead.protected_until <= now() THEN
      RAISE EXCEPTION 'Masa perlindungan 30 hari lead ini sudah berakhir. Daftarkan sebagai lead baru bila nomornya masih bebas.' USING ERRCODE = 'P0001';
    END IF;
    BEGIN
      UPDATE public.agent_leads SET status = 'active', inactive_reason = NULL, updated_at = now() WHERE id = _lead.id;
    EXCEPTION WHEN unique_violation THEN
      RAISE EXCEPTION 'Nomor ini sudah terdaftar sebagai lead agen lain dan masih dalam masa perlindungan. Hubungi PIC Agen jika ada pertanyaan.' USING ERRCODE = 'P0001';
    END;
  ELSE
    RAISE EXCEPTION 'Status lead ini tidak bisa diubah ke itu.' USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object('id', _lead.id, 'status', _status);
END;
$$;

REVOKE ALL ON FUNCTION public.set_lead_status(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_lead_status(uuid, text, text) TO authenticated;

-- The caller's own leads, newest first. Never returns another agent's data.
CREATE OR REPLACE FUNCTION public.list_my_agent_leads()
RETURNS TABLE (
  id uuid,
  name text,
  whatsapp text,
  package_id uuid,
  package_name text,
  interest_note text,
  status text,
  registered_at timestamptz,
  protected_until timestamptz,
  days_left integer,
  last_followup_at timestamptz,
  followup_count integer,
  helper_code text,
  intake_code text,
  intake_status text,
  inactive_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me uuid := public.agent_lead_actor();
BEGIN
  PERFORM public.expire_agent_leads();

  RETURN QUERY
  SELECT l.id, l.name, l.whatsapp, l.package_id, p.package_name, l.interest_note, l.status,
         l.registered_at, l.protected_until,
         greatest(0, ceil(extract(epoch FROM (l.protected_until - now())) / 86400))::integer,
         l.last_followup_at,
         (SELECT count(*)::integer FROM public.agent_lead_followups f WHERE f.lead_id = l.id),
         h.referral_code, i.code, i.status, l.inactive_reason
    FROM public.agent_leads l
    LEFT JOIN public.packages p ON p.id = l.package_id
    LEFT JOIN public.agents h ON h.id = l.helped_by_agent_id
    LEFT JOIN public.jamaah_intakes i ON i.id = l.intake_id
   WHERE l.agent_id = _me
   ORDER BY l.registered_at DESC
   LIMIT 500;
END;
$$;

REVOKE ALL ON FUNCTION public.list_my_agent_leads() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_my_agent_leads() TO authenticated;

-- Record that another agent helped close this lead (management applies the commission split later).
-- Unknown or own Agent ID: silent no-op, so it cannot be used to probe which Agent IDs exist. Empty clears it.
CREATE OR REPLACE FUNCTION public.set_lead_helper(_lead_id uuid, _helper_referral_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me uuid := public.agent_lead_actor();
  _code text := upper(btrim(coalesce(_helper_referral_code, '')));
  _helper uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.agent_leads l WHERE l.id = _lead_id AND l.agent_id = _me) THEN
    RAISE EXCEPTION 'Lead tidak ditemukan.' USING ERRCODE = 'P0001';
  END IF;

  IF _code = '' THEN
    UPDATE public.agent_leads SET helped_by_agent_id = NULL, updated_at = now() WHERE id = _lead_id AND agent_id = _me;
    RETURN;
  END IF;

  SELECT a.id INTO _helper FROM public.agents a WHERE upper(a.referral_code) = _code AND a.status = 'active' AND a.id <> _me LIMIT 1;
  IF _helper IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.agent_leads SET helped_by_agent_id = _helper, updated_at = now() WHERE id = _lead_id AND agent_id = _me;
END;
$$;

REVOKE ALL ON FUNCTION public.set_lead_helper(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_lead_helper(uuid, text) TO authenticated;

-- Staff overview. conflict_intake_agent_name is set when an intake with the same phone was sent (after the lead
-- was registered) through a DIFFERENT agent: the case management has to decide.
CREATE OR REPLACE FUNCTION public.admin_agent_leads()
RETURNS TABLE (
  id uuid,
  agent_id uuid,
  agent_name text,
  agent_code text,
  name text,
  whatsapp text,
  package_id uuid,
  package_name text,
  interest_note text,
  status text,
  registered_at timestamptz,
  protected_until timestamptz,
  last_followup_at timestamptz,
  followup_count integer,
  helper_name text,
  helper_code text,
  inactive_reason text,
  intake_code text,
  conflict_intake_agent_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL OR NOT (
       public.has_role(_uid, 'admin'::public.app_role)
    OR public.has_role(_uid, 'agent_admin'::public.app_role)
    OR public.has_role(_uid, 'cs_admin'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Hanya tim Musafar yang bisa melihat lead agen.' USING ERRCODE = '42501';
  END IF;

  PERFORM public.expire_agent_leads();

  RETURN QUERY
  SELECT l.id, l.agent_id, a.name, a.referral_code, l.name, l.whatsapp, l.package_id, p.package_name, l.interest_note,
         l.status, l.registered_at, l.protected_until, l.last_followup_at,
         (SELECT count(*)::integer FROM public.agent_lead_followups f WHERE f.lead_id = l.id),
         h.name, h.referral_code, l.inactive_reason, i.code,
         (SELECT ca.name
            FROM public.jamaah_intakes ci
            JOIN public.agents ca ON ca.id = ci.agent_id
           WHERE public.normalize_wa_phone(ci.contact_phone) = l.whatsapp
             AND ci.agent_id IS NOT NULL AND ci.agent_id <> l.agent_id
             AND ci.created_at >= l.registered_at
           ORDER BY ci.created_at DESC LIMIT 1)
    FROM public.agent_leads l
    JOIN public.agents a ON a.id = l.agent_id
    LEFT JOIN public.packages p ON p.id = l.package_id
    LEFT JOIN public.agents h ON h.id = l.helped_by_agent_id
    LEFT JOIN public.jamaah_intakes i ON i.id = l.intake_id
   ORDER BY l.registered_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_agent_leads() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_agent_leads() TO authenticated;

-- ---------------------------------------------------------------------------------------------------------------
-- 4. Link a registration to a lead: create_jamaah_intake (live definition + the lead block)
--
-- Everything the function did before is unchanged (same signature, SECURITY DEFINER, service_role only). New, after
-- the intake and its people are stored and before the admin notification:
--   * an ACTIVE protected lead for the contact phone, and the intake has no agent or the lead's own agent
--       -> lead becomes 'registered' (intake_id set); an intake without agent is attributed to the lead's agent.
--   * an ACTIVE protected lead of ANOTHER agent -> the intake stays attributed as submitted and management gets a
--       'lead_conflict' notification to decide (no automatic transfer).
--   * the intake agent's own lead for that phone (even an inactive one) is marked 'registered' too.
-- Wrapped in a sub-block: any error here is a WARNING and registration carries on.
-- ---------------------------------------------------------------------------------------------------------------
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
    SELECT id INTO v_agent FROM public.agents WHERE lower(referral_code) = lower(v_ref) AND status = 'active' LIMIT 1;
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

REVOKE ALL ON FUNCTION public.create_jamaah_intake(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_jamaah_intake(jsonb) TO service_role;
