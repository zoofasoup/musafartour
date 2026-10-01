-- Offline booking, jamaah data and finance, run from the admin panel.
-- Replaces the Google Sheet (columns: Nama Jamaah, Size, Ambil Perlengkapan, Paket,
-- Rencana, Realisasi, Selisih, Domisili, Start, Keterangan, Agen) and the online
-- Midtrans booking flow, which is switched off here.
--
-- Rules (owner, 2026-10-01): DP min Rp 5 jt per pax, cicilan any time/any amount,
-- lunas at the latest H-30, every payment through a PT Musa Amanah Wisata account.
-- CS (cs_admin) records payments; only the owner (admin/superadmin) verifies them.

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

-- A family / travel party. Registrations can be grouped; one transfer can be split across it.
CREATE TABLE public.jamaah_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.packages(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid()
);
CREATE INDEX jamaah_groups_package_idx ON public.jamaah_groups (package_id);

-- One jamaah on one package (one row of the old sheet, plus manifest data).
CREATE TABLE public.jamaah_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.packages(id) ON DELETE RESTRICT,
  group_id uuid REFERENCES public.jamaah_groups(id) ON DELETE SET NULL,

  -- Sheet columns
  full_name text NOT NULL CHECK (char_length(btrim(full_name)) BETWEEN 1 AND 150),
  phone text,
  domicile text,                                   -- Domisili
  start_city text,                                 -- Start
  room_type text NOT NULL CHECK (room_type IN ('quad', 'triple', 'double')),  -- Paket
  list_price numeric(14, 0) NOT NULL CHECK (list_price >= 0),                -- Rencana
  discount numeric(14, 0) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  price_note text,                                 -- Keterangan (diskon, dll)
  agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,  -- Agen
  referral_note text,                              -- agent/referrer not in the system
  equipment_size text,                             -- Size
  equipment_taken_at timestamptz,                  -- Ambil Perlengkapan

  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  cancelled_at timestamptz,
  cancel_reason text,
  refund_amount numeric(14, 0) CHECK (refund_amount >= 0),
  refund_paid_at date,

  -- Manifest data (all optional, filled in as documents come in)
  gender text CHECK (gender IN ('L', 'P')),
  nik text,
  birth_place text,
  date_of_birth date,
  passport_number text,
  passport_issued_at date,
  passport_expiry date,
  passport_issue_office text,
  mahram_name text,
  mahram_relation text,
  meningitis_vaccinated_at date,
  polio_vaccinated_at date,
  roommate_note text,
  ktp_path text,          -- storage paths in the private jamaah-docs bucket
  passport_path text,
  photo_path text,
  notes text,

  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT jamaah_registrations_discount_le_price CHECK (discount <= list_price),
  CONSTRAINT jamaah_registrations_cancel_reason CHECK (status = 'active' OR cancel_reason IS NOT NULL)
);
CREATE INDEX jamaah_registrations_package_idx ON public.jamaah_registrations (package_id);
CREATE INDEX jamaah_registrations_group_idx ON public.jamaah_registrations (group_id);
CREATE INDEX jamaah_registrations_agent_idx ON public.jamaah_registrations (agent_id);

-- Money received for a registration. Never negative: refunds live on the registration.
CREATE TABLE public.jamaah_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES public.jamaah_registrations(id) ON DELETE RESTRICT,
  -- Rows split from one bank transfer (e.g. a family paying together) share this id.
  transfer_id uuid,
  amount numeric(14, 0) NOT NULL CHECK (amount > 0),
  paid_on date NOT NULL,
  -- PT accounts only. SALDO_AWAL = amount already received before the website (sheet import).
  bank_account text NOT NULL CHECK (bank_account IN ('BCA', 'BSI', 'BNI', 'SALDO_AWAL')),
  payer_name text,
  proof_path text,
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  reject_reason text,
  recorded_by uuid DEFAULT auth.uid(),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  verified_by uuid,
  verified_at timestamptz
);
CREATE INDEX jamaah_payments_registration_idx ON public.jamaah_payments (registration_id);
CREATE INDEX jamaah_payments_status_idx ON public.jamaah_payments (status);
CREATE INDEX jamaah_payments_transfer_idx ON public.jamaah_payments (transfer_id);

-- Who changed what, for both tables (finance needs a trail).
CREATE TABLE public.jamaah_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  row_id uuid NOT NULL,
  registration_id uuid,
  action text NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_id uuid,
  actor_email text,
  actor_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX jamaah_audit_log_registration_idx ON public.jamaah_audit_log (registration_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 2. Seats: per package, counted from the sheet or from these registrations
-- ---------------------------------------------------------------------------

-- 'sheet' keeps today's behaviour (nightly sync-seats writes slots_filled).
-- Switch a package to 'website' once its jamaah are imported and the counts match.
ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS seat_source text NOT NULL DEFAULT 'sheet' CHECK (seat_source IN ('sheet', 'website')),
  ADD COLUMN IF NOT EXISTS slots_registered integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.refresh_package_registered_slots(_package_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.packages p
     SET slots_registered = (SELECT count(*) FROM public.jamaah_registrations r
                              WHERE r.package_id = _package_id AND r.status = 'active')
   WHERE p.id = _package_id;
$$;

CREATE OR REPLACE FUNCTION public.jamaah_registrations_after_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM public.refresh_package_registered_slots(OLD.package_id);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF TG_OP = 'INSERT' OR NEW.package_id IS DISTINCT FROM OLD.package_id THEN
      PERFORM public.refresh_package_registered_slots(NEW.package_id);
    ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
      PERFORM public.refresh_package_registered_slots(NEW.package_id);
    END IF;
    PERFORM public.sync_registration_commission(NEW.id);
  END IF;
  RETURN NULL;
END;
$$;

-- The nightly sheet sync runs as the service role (no auth.uid()). Once a package's
-- seats come from the website, it must not overwrite slots_total any more.
CREATE OR REPLACE FUNCTION public.protect_website_seat_source()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.seat_source = 'website' AND OLD.seat_source = 'website' AND auth.uid() IS NULL THEN
    NEW.slots_total := OLD.slots_total;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_website_seat_source ON public.packages;
CREATE TRIGGER protect_website_seat_source BEFORE UPDATE ON public.packages
  FOR EACH ROW EXECUTE FUNCTION public.protect_website_seat_source();

-- Keep slots_registered out of the package change log (the registration log covers it).
CREATE OR REPLACE FUNCTION public.log_package_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_email text;
  v_name text;
  v_reason text;
  v_old jsonb;
  v_new jsonb;
  v_diff jsonb := '{}'::jsonb;
  v_key text;
  v_ignored text[] := ARRAY['updated_at', 'change_reason', 'slots_registered'];
BEGIN
  IF v_actor IS NOT NULL THEN
    SELECT u.email,
           coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name')
      INTO v_email, v_name
      FROM auth.users u
     WHERE u.id = v_actor;
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.package_change_log
      (package_id, package_label, action, changes, reason, actor_id, actor_email, actor_name)
    VALUES
      (OLD.id, OLD.package_name || ' · ' || OLD.departure_date::text, 'delete',
       jsonb_build_object('_snapshot', to_jsonb(OLD)), OLD.change_reason, v_actor, v_email, v_name);
    RETURN OLD;
  END IF;

  v_reason := nullif(btrim(NEW.change_reason), '');
  NEW.change_reason := NULL;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.package_change_log
      (package_id, package_label, action, changes, reason, actor_id, actor_email, actor_name)
    VALUES
      (NEW.id, NEW.package_name || ' · ' || NEW.departure_date::text, 'insert',
       '{}'::jsonb, v_reason, v_actor, v_email, v_name);
    RETURN NEW;
  END IF;

  v_old := to_jsonb(OLD) - v_ignored;
  v_new := to_jsonb(NEW) - v_ignored;
  FOR v_key IN SELECT jsonb_object_keys(v_new) LOOP
    IF (v_old -> v_key) IS DISTINCT FROM (v_new -> v_key) THEN
      v_diff := v_diff || jsonb_build_object(
        v_key, jsonb_build_object('old', v_old -> v_key, 'new', v_new -> v_key)
      );
    END IF;
  END LOOP;

  IF v_diff <> '{}'::jsonb THEN
    INSERT INTO public.package_change_log
      (package_id, package_label, action, changes, reason, actor_id, actor_email, actor_name)
    VALUES
      (NEW.id, NEW.package_name || ' · ' || NEW.departure_date::text, 'update',
       v_diff, v_reason, v_actor, v_email, v_name);
  END IF;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Payment rules: CS records, owner verifies, verified money is immutable
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.jamaah_payments_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner boolean := has_role(auth.uid(), 'admin'::app_role);
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.recorded_by := coalesce(auth.uid(), NEW.recorded_by);
    NEW.recorded_at := now();
    IF NOT v_owner THEN
      NEW.status := 'pending';
    END IF;
    IF NEW.status = 'verified' THEN
      NEW.verified_by := auth.uid();
      NEW.verified_at := now();
    ELSE
      NEW.verified_by := NULL;
      NEW.verified_at := NULL;
    END IF;
    IF NEW.status = 'rejected' AND coalesce(btrim(NEW.reject_reason), '') = '' THEN
      RAISE EXCEPTION 'Alasan penolakan wajib diisi.' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE
  IF NOT v_owner THEN
    IF OLD.status <> 'pending' THEN
      RAISE EXCEPTION 'Pembayaran yang sudah diverifikasi atau ditolak tidak bisa diubah.' USING ERRCODE = '42501';
    END IF;
    IF NEW.status <> OLD.status THEN
      RAISE EXCEPTION 'Hanya owner yang bisa memverifikasi atau menolak pembayaran.' USING ERRCODE = '42501';
    END IF;
  ELSIF OLD.status = 'verified' AND NEW.status = 'verified'
        AND (NEW.amount, NEW.registration_id, NEW.paid_on, NEW.bank_account)
            IS DISTINCT FROM (OLD.amount, OLD.registration_id, OLD.paid_on, OLD.bank_account) THEN
    -- Correct a verified payment by rejecting it (with a reason) and recording a new one.
    RAISE EXCEPTION 'Pembayaran terverifikasi tidak bisa diubah. Tolak dengan alasan, lalu catat ulang.' USING ERRCODE = '42501';
  END IF;

  IF NEW.status = 'verified' AND OLD.status <> 'verified' THEN
    NEW.verified_by := auth.uid();
    NEW.verified_at := now();
  ELSIF NEW.status = 'pending' THEN
    NEW.verified_by := NULL;
    NEW.verified_at := NULL;
  END IF;
  IF NEW.status = 'rejected' AND coalesce(btrim(NEW.reject_reason), '') = '' THEN
    RAISE EXCEPTION 'Alasan penolakan wajib diisi.' USING ERRCODE = '23514';
  END IF;

  NEW.recorded_by := OLD.recorded_by;
  NEW.recorded_at := OLD.recorded_at;
  RETURN NEW;
END;
$$;

CREATE TRIGGER jamaah_payments_guard BEFORE INSERT OR UPDATE ON public.jamaah_payments
  FOR EACH ROW EXECUTE FUNCTION public.jamaah_payments_guard();

-- ---------------------------------------------------------------------------
-- 4. Agent commission: credited when a registration is fully paid (verified),
--    reversed automatically if that stops being true before it is paid out.
-- ---------------------------------------------------------------------------

ALTER TABLE public.agent_sales
  ADD COLUMN IF NOT EXISTS registration_id uuid REFERENCES public.jamaah_registrations(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS agent_sales_registration_uidx
  ON public.agent_sales (registration_id) WHERE registration_id IS NOT NULL;
ALTER TABLE public.agent_sales DROP CONSTRAINT IF EXISTS agent_sales_source_check;
ALTER TABLE public.agent_sales
  ADD CONSTRAINT agent_sales_source_check CHECK (source IN ('manual', 'booking', 'registration'));

CREATE OR REPLACE FUNCTION public.sync_registration_commission(_registration_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  s record;
  v_paid numeric;
  v_due numeric;
  v_should boolean;
BEGIN
  SELECT reg.*, p.agent_commission_amount, p.package_name, p.departure_date
    INTO r
    FROM public.jamaah_registrations reg
    JOIN public.packages p ON p.id = reg.package_id
   WHERE reg.id = _registration_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT coalesce(sum(amount), 0) INTO v_paid
    FROM public.jamaah_payments WHERE registration_id = _registration_id AND status = 'verified';
  v_due := r.list_price - r.discount;
  v_should := r.status = 'active' AND r.agent_id IS NOT NULL AND v_due > 0
              AND v_paid >= v_due AND coalesce(r.agent_commission_amount, 0) > 0;

  SELECT * INTO s FROM public.agent_sales WHERE registration_id = _registration_id;

  -- Already paid out to the agent: never touch it automatically (clawback is a manual decision).
  IF FOUND AND s.status = 'paid' THEN RETURN; END IF;

  -- Reverse a credited commission that no longer applies, or that moves to another agent.
  IF FOUND AND s.status = 'confirmed' AND (NOT v_should OR s.agent_id IS DISTINCT FROM r.agent_id) THEN
    UPDATE public.agents
       SET total_sales = greatest(total_sales - 1, 0),
           total_commission = total_commission - s.commission_amount,
           available_balance = available_balance - s.commission_amount
     WHERE id = s.agent_id;
    UPDATE public.agent_sales SET status = 'cancelled' WHERE id = s.id;
    s.status := 'cancelled';
  END IF;

  IF v_should AND (NOT FOUND OR s.status <> 'confirmed') THEN
    INSERT INTO public.agent_sales
      (agent_id, customer_name, customer_phone, package_id, package_name, sale_amount,
       commission_amount, status, departure_date, notes, source, registration_id)
    VALUES
      (r.agent_id, r.full_name, coalesce(r.phone, '-'), r.package_id, r.package_name, v_due,
       r.agent_commission_amount, 'confirmed', r.departure_date::date, 'Lunas (pendaftaran offline)',
       'registration', r.id)
    ON CONFLICT (registration_id) WHERE registration_id IS NOT NULL DO UPDATE
      SET agent_id = EXCLUDED.agent_id,
          customer_name = EXCLUDED.customer_name,
          sale_amount = EXCLUDED.sale_amount,
          commission_amount = EXCLUDED.commission_amount,
          status = 'confirmed';
    UPDATE public.agents
       SET total_sales = total_sales + 1,
           total_commission = total_commission + r.agent_commission_amount,
           available_balance = available_balance + r.agent_commission_amount
     WHERE id = r.agent_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.jamaah_payments_after_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM public.sync_registration_commission(OLD.registration_id);
  END IF;
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.registration_id IS DISTINCT FROM OLD.registration_id) THEN
    PERFORM public.sync_registration_commission(NEW.registration_id);
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER jamaah_payments_after_change AFTER INSERT OR UPDATE OR DELETE ON public.jamaah_payments
  FOR EACH ROW EXECUTE FUNCTION public.jamaah_payments_after_change();

CREATE TRIGGER jamaah_registrations_after_change AFTER INSERT OR UPDATE OR DELETE ON public.jamaah_registrations
  FOR EACH ROW EXECUTE FUNCTION public.jamaah_registrations_after_change();

CREATE OR REPLACE FUNCTION public.jamaah_registrations_touch()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
    NEW.cancelled_at := now();
  ELSIF NEW.status = 'active' THEN
    NEW.cancelled_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER jamaah_registrations_touch BEFORE UPDATE ON public.jamaah_registrations
  FOR EACH ROW EXECUTE FUNCTION public.jamaah_registrations_touch();

-- ---------------------------------------------------------------------------
-- 5. Audit trail
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.log_jamaah_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_email text;
  v_name text;
  v_old jsonb := CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) - ARRAY['updated_at'] END;
  v_new jsonb := CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) - ARRAY['updated_at'] END;
  v_diff jsonb := '{}'::jsonb;
  v_key text;
  v_row jsonb := coalesce(v_new, v_old);
BEGIN
  IF v_actor IS NOT NULL THEN
    SELECT u.email, coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name')
      INTO v_email, v_name FROM auth.users u WHERE u.id = v_actor;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    FOR v_key IN SELECT jsonb_object_keys(v_new) LOOP
      IF (v_old -> v_key) IS DISTINCT FROM (v_new -> v_key) THEN
        v_diff := v_diff || jsonb_build_object(v_key, jsonb_build_object('old', v_old -> v_key, 'new', v_new -> v_key));
      END IF;
    END LOOP;
    IF v_diff = '{}'::jsonb THEN RETURN NULL; END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_diff := jsonb_build_object('_snapshot', v_old);
  END IF;

  INSERT INTO public.jamaah_audit_log
    (table_name, row_id, registration_id, action, changes, actor_id, actor_email, actor_name)
  VALUES
    (TG_TABLE_NAME, (v_row ->> 'id')::uuid,
     CASE TG_TABLE_NAME WHEN 'jamaah_registrations' THEN (v_row ->> 'id')::uuid
                        WHEN 'jamaah_payments' THEN (v_row ->> 'registration_id')::uuid END,
     lower(TG_OP), v_diff, v_actor, v_email, v_name);
  RETURN NULL;
END;
$$;

CREATE TRIGGER log_jamaah_registration_change AFTER INSERT OR UPDATE OR DELETE ON public.jamaah_registrations
  FOR EACH ROW EXECUTE FUNCTION public.log_jamaah_change();
CREATE TRIGGER log_jamaah_payment_change AFTER INSERT OR UPDATE OR DELETE ON public.jamaah_payments
  FOR EACH ROW EXECUTE FUNCTION public.log_jamaah_change();
CREATE TRIGGER log_jamaah_group_change AFTER INSERT OR UPDATE OR DELETE ON public.jamaah_groups
  FOR EACH ROW EXECUTE FUNCTION public.log_jamaah_change();

REVOKE ALL ON FUNCTION public.sync_registration_commission(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_package_registered_slots(uuid) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. Balances: one row per registration, read by the admin pages
-- ---------------------------------------------------------------------------

CREATE VIEW public.jamaah_registration_balances
WITH (security_invoker = true) AS
SELECT
  r.id AS registration_id,
  r.package_id,
  (r.list_price - r.discount) AS agreed_price,
  coalesce(sum(p.amount) FILTER (WHERE p.status = 'verified'), 0) AS paid_verified,
  coalesce(sum(p.amount) FILTER (WHERE p.status = 'pending'), 0) AS paid_pending,
  (r.list_price - r.discount) - coalesce(sum(p.amount) FILTER (WHERE p.status = 'verified'), 0) AS outstanding,
  (pk.departure_date::date - 30) AS due_date
FROM public.jamaah_registrations r
JOIN public.packages pk ON pk.id = r.package_id
LEFT JOIN public.jamaah_payments p ON p.registration_id = r.id
GROUP BY r.id, pk.departure_date;

-- ---------------------------------------------------------------------------
-- 7. Access: owner (admin/superadmin) everything; CS records but cannot verify or delete
-- ---------------------------------------------------------------------------

ALTER TABLE public.jamaah_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jamaah_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jamaah_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jamaah_audit_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.jamaah_groups, public.jamaah_registrations, public.jamaah_payments,
              public.jamaah_audit_log, public.jamaah_registration_balances FROM anon;

CREATE POLICY "Staff read jamaah groups" ON public.jamaah_groups FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'cs_admin'::app_role));
CREATE POLICY "Staff add jamaah groups" ON public.jamaah_groups FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'cs_admin'::app_role));
CREATE POLICY "Staff edit jamaah groups" ON public.jamaah_groups FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'cs_admin'::app_role));
CREATE POLICY "Owner deletes jamaah groups" ON public.jamaah_groups FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff read registrations" ON public.jamaah_registrations FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'cs_admin'::app_role));
CREATE POLICY "Staff add registrations" ON public.jamaah_registrations FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'cs_admin'::app_role));
CREATE POLICY "Staff edit registrations" ON public.jamaah_registrations FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'cs_admin'::app_role));
CREATE POLICY "Owner deletes registrations" ON public.jamaah_registrations FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff read payments" ON public.jamaah_payments FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'cs_admin'::app_role));
CREATE POLICY "Staff record payments" ON public.jamaah_payments FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'cs_admin'::app_role));
CREATE POLICY "Staff edit pending payments, owner verifies" ON public.jamaah_payments FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)
         OR (has_role(auth.uid(), 'cs_admin'::app_role) AND status = 'pending'));
CREATE POLICY "Delete unverified payments" ON public.jamaah_payments FOR DELETE TO authenticated
  USING ((has_role(auth.uid(), 'admin'::app_role) AND status <> 'verified')
         OR (has_role(auth.uid(), 'cs_admin'::app_role) AND status = 'pending' AND recorded_by = auth.uid()));

CREATE POLICY "Staff read jamaah audit log" ON public.jamaah_audit_log FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'cs_admin'::app_role));

-- CS needs every package (incl. Final, not yet live) to register jamaah on it.
CREATE POLICY "cs_admin can view all packages" ON public.packages FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'cs_admin'::app_role));

-- Agent picker for the registration form: names and codes only (agents holds KTP/bank data).
CREATE OR REPLACE FUNCTION public.list_agent_options()
RETURNS TABLE (id uuid, name text, referral_code text, status text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, a.name, a.referral_code, a.status
    FROM public.agents a
   WHERE has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'cs_admin'::app_role)
   ORDER BY a.name;
$$;
REVOKE ALL ON FUNCTION public.list_agent_options() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_agent_options() TO authenticated;

-- ---------------------------------------------------------------------------
-- 8. Private storage for transfer proofs, KTP, passports and photos
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('jamaah-docs', 'jamaah-docs', false, 10485760,
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Staff read jamaah docs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'jamaah-docs'
         AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'cs_admin'::app_role)));
CREATE POLICY "Staff upload jamaah docs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'jamaah-docs'
              AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'cs_admin'::app_role)));
CREATE POLICY "Staff replace jamaah docs" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'jamaah-docs'
         AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'cs_admin'::app_role)));
CREATE POLICY "Owner deletes jamaah docs" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'jamaah-docs' AND has_role(auth.uid(), 'admin'::app_role));

-- ---------------------------------------------------------------------------
-- 9. Online booking (Midtrans) is switched off: its tables stay as an archive,
--    but nobody can create bookings or payment orders through the API any more
--    (a stray booking would still reserve seats via slots_booked_online).
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  f regprocedure;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure FROM pg_proc p
     WHERE p.pronamespace = 'public'::regnamespace
       AND p.proname IN ('create_booking', 'create_booking_payment')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f);
  END LOOP;
END;
$$;
