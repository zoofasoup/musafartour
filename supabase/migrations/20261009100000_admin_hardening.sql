-- Admin hardening (re-audit docs/audit/06-admin.md): ADM-102, ADM-103, ADM-109, ADM-110, ADM-105, ADM-115, ADM-117,
-- ADM-014 (intake message sent), ADM-031/032/033 (menu promises), ADM-106 (rate log), ADM-021 (queue counts),
-- ADM-011 (dashboard counts), ADM-036 (package cost columns).
-- Idempotent: safe to run twice. Written in sections; every section is independent of the later ones.

-- =====================================================================================================================
-- 1. ADM-102: money columns of agents change only from SECURITY DEFINER functions (never from the API, staff included)
-- =====================================================================================================================
-- Staff (admin, agent_admin) keep status, level and profile fields. Balance, total commission and total sales move only
-- through log_agent_sale, sync_registration_commission, the commission lifecycle and process_agent_withdrawal, which run
-- as the function owner (current_user = postgres, not anon/authenticated) and therefore pass untouched.
CREATE OR REPLACE FUNCTION public.protect_agent_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- Service role, SECURITY DEFINER functions and migrations run as other roles and pass untouched.
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  -- Money columns: nobody writes them through the API, staff included.
  IF TG_OP = 'UPDATE' THEN
    IF NEW.total_sales IS DISTINCT FROM OLD.total_sales
       OR NEW.total_commission IS DISTINCT FROM OLD.total_commission
       OR NEW.available_balance IS DISTINCT FROM OLD.available_balance THEN
      RAISE EXCEPTION 'Saldo, total komisi dan total penjualan agen hanya berubah lewat sistem komisi, tidak bisa diubah langsung.' USING ERRCODE = '42501';
    END IF;
  ELSIF coalesce(NEW.total_sales, 0) <> 0 OR coalesce(NEW.total_commission, 0) <> 0 OR coalesce(NEW.available_balance, 0) <> 0 THEN
    IF public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'agent_admin'::app_role) THEN
      RAISE EXCEPTION 'Saldo, total komisi dan total penjualan agen hanya berubah lewat sistem komisi, tidak bisa diisi langsung.' USING ERRCODE = '42501';
    END IF;
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

-- =====================================================================================================================
-- 2. ADM-103: an agent with money or lead history cannot be hard-deleted; history FKs stop cascading
-- =====================================================================================================================
CREATE OR REPLACE FUNCTION public.block_agent_delete_with_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF EXISTS (SELECT 1 FROM public.agent_sales WHERE agent_id = OLD.id)
     OR EXISTS (SELECT 1 FROM public.agent_withdrawals WHERE agent_id = OLD.id)
     OR EXISTS (SELECT 1 FROM public.commission_payouts WHERE agent_id = OLD.id)
     OR EXISTS (SELECT 1 FROM public.agent_commission_adjustments WHERE agent_id = OLD.id)
     OR EXISTS (SELECT 1 FROM public.agent_leads WHERE agent_id = OLD.id) THEN
    RAISE EXCEPTION 'Agen punya riwayat komisi atau lead dan tidak bisa dihapus. Nonaktifkan agen saja.';
  END IF;
  RETURN OLD;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.block_agent_delete_with_history() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS aa_block_agent_delete_with_history ON public.agents;
CREATE TRIGGER aa_block_agent_delete_with_history
  BEFORE DELETE ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.block_agent_delete_with_history();

-- Financial history tables: ON DELETE RESTRICT (commission_payouts already is). Leads keep CASCADE because the trigger
-- above blocks the delete first; their rows are not money.
DO $$
DECLARE _t text;
BEGIN
  FOREACH _t IN ARRAY ARRAY['agent_sales', 'agent_withdrawals', 'agent_commission_adjustments'] LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', _t, _t || '_agent_id_fkey');
    EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE RESTRICT', _t, _t || '_agent_id_fkey');
  END LOOP;
END $$;

-- =====================================================================================================================
-- 3. ADM-109: has_role stays executable by anon ON PURPOSE.
-- =====================================================================================================================
-- Many policies are TO public (anon included) and call has_role(auth.uid(), ...) (hotels, packages, redirects, ...). Postgres
-- needs EXECUTE for the calling role while it evaluates a policy, so revoking it from anon would break every anonymous read
-- of those tables. With auth.uid() = NULL the function returns false, and a uuid cannot be guessed. Nothing to change.
COMMENT ON FUNCTION public.has_role(uuid, public.app_role) IS
  'Role check used by RLS policies. Executable by anon on purpose: policies TO public evaluate it for anonymous visitors (ADM-109).';

-- =====================================================================================================================
-- 4. ADM-110: agent_levels no longer carries the old percentage commission (commission is a rupiah amount per package now)
-- =====================================================================================================================
ALTER TABLE public.agent_levels DROP COLUMN IF EXISTS commission_rate_min;
ALTER TABLE public.agent_levels DROP COLUMN IF EXISTS commission_rate_max;

-- =====================================================================================================================
-- 5. ADM-105: only owner and product_admin read the cost basis (cogs_defaults)
-- =====================================================================================================================
DROP POLICY IF EXISTS "Staff can read cogs defaults" ON public.cogs_defaults;
DROP POLICY IF EXISTS "Owner and product admin read cogs defaults" ON public.cogs_defaults;
CREATE POLICY "Owner and product admin read cogs defaults" ON public.cogs_defaults
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'product_admin'::app_role));

-- =====================================================================================================================
-- 6. ADM-115: agent_admin sees notifications about agents and commissions only (no jamaah names)
-- =====================================================================================================================
-- Known types: agent_registration, agent_withdrawal, lead_conflict, commission_* (agents); jamaah_intake (jamaah data).
DROP POLICY IF EXISTS "Admins can view notifications" ON public.admin_notifications;
CREATE POLICY "Admins can view notifications" ON public.admin_notifications
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'cs_admin'::app_role)
    OR (public.has_role(auth.uid(), 'agent_admin'::app_role)
        AND (type IN ('agent_registration', 'agent_withdrawal', 'lead_conflict') OR type LIKE 'commission%'))
  );
DROP POLICY IF EXISTS "Admins can update notifications" ON public.admin_notifications;
CREATE POLICY "Admins can update notifications" ON public.admin_notifications
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'cs_admin'::app_role)
    OR (public.has_role(auth.uid(), 'agent_admin'::app_role)
        AND (type IN ('agent_registration', 'agent_withdrawal', 'lead_conflict') OR type LIKE 'commission%'))
  );

-- =====================================================================================================================
-- 7. ADM-032 / ADM-033 / ADM-031: menu promises
-- =====================================================================================================================
-- ADM-032: content_admin has the Redirect tab on the SEO page, so it may manage redirects.
DROP POLICY IF EXISTS "content_admin can manage redirects" ON public.redirects;
CREATE POLICY "content_admin can manage redirects" ON public.redirects
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'content_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'content_admin'::app_role));

-- ADM-033: Biaya Iklan counts closed calculator leads per campaign. The advertiser gets the COUNTS only, never the rows
-- (names and WhatsApp numbers stay with owner and sales).
CREATE OR REPLACE FUNCTION public.ad_spend_closed_calculator_counts()
RETURNS TABLE (utm_campaign text, closed_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'advertiser'::app_role)) THEN
    RAISE EXCEPTION 'Tidak berwenang' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT l.utm_campaign, count(*)::bigint
      FROM public.umroh_calculator_leads l
     WHERE l.status = 'CLOSED' AND l.utm_campaign IS NOT NULL
     GROUP BY l.utm_campaign;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.ad_spend_closed_calculator_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ad_spend_closed_calculator_counts() TO authenticated;

-- ADM-031: product_admin gets NO access to calculator leads (decision: the menu item is removed for that role in
-- src/components/admin/adminMenu.ts). Nothing to change in the database: the existing policies already refuse it.

-- =====================================================================================================================
-- 8. ADM-014: record that the DP + manifest message was sent after accepting an intake
-- =====================================================================================================================
ALTER TABLE public.jamaah_intakes ADD COLUMN IF NOT EXISTS info_sent_at timestamptz;
ALTER TABLE public.jamaah_intakes ADD COLUMN IF NOT EXISTS info_sent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Written only by mark_intake_info_sent (below): a direct API update of these two columns is refused.
CREATE OR REPLACE FUNCTION public.guard_intake_info_sent()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF current_user IN ('anon', 'authenticated')
     AND (NEW.info_sent_at IS DISTINCT FROM OLD.info_sent_at OR NEW.info_sent_by IS DISTINCT FROM OLD.info_sent_by) THEN
    RAISE EXCEPTION 'Catatan pengiriman info hanya bisa diisi lewat tombol "Sudah dikirim".' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.guard_intake_info_sent() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS aa_guard_intake_info_sent ON public.jamaah_intakes;
CREATE TRIGGER aa_guard_intake_info_sent BEFORE UPDATE ON public.jamaah_intakes
  FOR EACH ROW EXECUTE FUNCTION public.guard_intake_info_sent();

-- Staff (owner, cs_admin) mark an accepted intake as "DP and manifest message sent". Pressing it again (resend) moves the time.
CREATE OR REPLACE FUNCTION public.mark_intake_info_sent(_intake_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _now timestamptz := now(); _status text;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'cs_admin'::app_role)) THEN
    RAISE EXCEPTION 'Tidak berwenang' USING ERRCODE = '42501';
  END IF;
  SELECT status INTO _status FROM public.jamaah_intakes WHERE id = _intake_id;
  IF _status IS NULL THEN RAISE EXCEPTION 'Pendaftaran tidak ditemukan'; END IF;
  IF _status <> 'accepted' THEN RAISE EXCEPTION 'Pendaftaran ini belum diterima'; END IF;
  UPDATE public.jamaah_intakes SET info_sent_at = _now, info_sent_by = auth.uid() WHERE id = _intake_id;
  RETURN _now;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.mark_intake_info_sent(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_intake_info_sent(uuid) TO authenticated;

-- =====================================================================================================================
-- 9. ADM-021 / ADM-011: work-queue counts for the menu badges and the owner dashboard
-- =====================================================================================================================
-- One light read. Every figure is only filled for the roles that may open the page behind it (others get no key):
--   intakes_new, belum_dp, lunas_due, lunas_overdue ........ admin, cs_admin
--   payments_pending (count, amount) ...................... admin, cs_admin, finance
--   commission_eligible / commission_approved ............. admin, agent_admin, finance
--   agents_pending ........................................ admin, agent_admin
--   disputes_open ......................................... admin, agent_admin, cs_admin
--   seats_low ............................................. admin, product_admin
-- "admin" includes the owner (superadmin) through has_role.
CREATE OR REPLACE FUNCTION public.admin_work_counts()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _owner boolean := public.has_role(_uid, 'admin'::app_role);
  _cs boolean := public.has_role(_uid, 'cs_admin'::app_role);
  _ag boolean := public.has_role(_uid, 'agent_admin'::app_role);
  _pa boolean := public.has_role(_uid, 'product_admin'::app_role);
  _fin boolean := public.commission_is_finance(_uid);
  _out jsonb := '{}'::jsonb;
  _n bigint; _m bigint; _k bigint; _amt numeric;
  _today date := (now() AT TIME ZONE 'Asia/Jakarta')::date;
BEGIN
  IF _uid IS NULL OR NOT (_owner OR _cs OR _ag OR _pa OR _fin) THEN
    RAISE EXCEPTION 'Tidak berwenang' USING ERRCODE = '42501';
  END IF;

  IF _owner OR _cs THEN
    SELECT count(*) INTO _n FROM public.jamaah_intakes WHERE status = 'new';
    _out := _out || jsonb_build_object('intakes_new', _n);
  END IF;

  IF _owner OR _cs OR _fin THEN
    SELECT count(*), coalesce(sum(amount), 0) INTO _n, _amt FROM public.jamaah_payments WHERE status = 'pending';
    _out := _out || jsonb_build_object('payments_pending', jsonb_build_object('count', _n, 'amount', _amt));
  END IF;

  IF _owner OR _ag OR _fin THEN
    SELECT count(*) FILTER (WHERE commission_state = 'eligible'), count(*) FILTER (WHERE commission_state = 'approved')
      INTO _n, _m FROM public.agent_sales WHERE status = 'confirmed';
    _out := _out || jsonb_build_object('commission_eligible', _n, 'commission_approved', _m);
  END IF;

  IF _owner OR _ag THEN
    SELECT count(*) INTO _n FROM public.agents WHERE status = 'pending';
    _out := _out || jsonb_build_object('agents_pending', _n);
  END IF;

  IF _owner OR _ag OR _cs THEN
    SELECT count(*) INTO _n FROM public.lead_disputes WHERE status = 'open';
    _out := _out || jsonb_build_object('disputes_open', _n);
  END IF;

  IF _owner OR _cs THEN
    -- Jamaah who have not paid the DP yet (a family that pays together is one unit: the DP of everyone together).
    WITH r AS (
      SELECT coalesce(reg.group_id::text, reg.id::text) AS unit, reg.list_price - reg.discount AS agreed,
             coalesce((SELECT sum(p.amount) FROM public.jamaah_payments p WHERE p.registration_id = reg.id AND p.status = 'verified'), 0) AS paid
        FROM public.jamaah_registrations reg
        JOIN public.packages pk ON pk.id = reg.package_id
       WHERE reg.status = 'active' AND pk.departure_date >= _today
    ), u AS (
      SELECT count(*) AS members, sum(agreed) AS agreed, sum(paid) AS paid FROM r GROUP BY unit
    )
    SELECT coalesce(sum(members), 0) INTO _n FROM u WHERE paid < least(5000000 * members, agreed);
    _out := _out || jsonb_build_object('belum_dp', _n);

    -- Lunas due (departure minus 30 days) in the next 14 days, and already overdue; only what is still owed.
    WITH r AS (
      SELECT pk.departure_date - 30 AS due,
             reg.list_price - reg.discount
             - coalesce((SELECT sum(p.amount) FROM public.jamaah_payments p WHERE p.registration_id = reg.id AND p.status = 'verified'), 0) AS owed
        FROM public.jamaah_registrations reg
        JOIN public.packages pk ON pk.id = reg.package_id
       WHERE reg.status = 'active' AND pk.departure_date >= _today
    )
    SELECT count(*) FILTER (WHERE due >= _today AND due <= _today + 14),
           coalesce(sum(owed) FILTER (WHERE due >= _today AND due <= _today + 14), 0),
           count(*) FILTER (WHERE due < _today)
      INTO _n, _amt, _k FROM r WHERE owed > 0;
    _out := _out || jsonb_build_object('lunas_due', jsonb_build_object('count', _n, 'amount', _amt), 'lunas_overdue', _k);
  END IF;

  IF _owner OR _pa THEN
    -- Published departures with 0 to 3 seats left (website-counted packages use slots_registered, sheet packages slots_filled)
    SELECT count(*) INTO _n FROM public.packages pk
     WHERE pk.status = 'published' AND pk.departure_date >= _today AND pk.slots_total IS NOT NULL
       AND pk.slots_total - CASE WHEN pk.seat_source = 'website' THEN coalesce(pk.slots_registered, 0) ELSE coalesce(pk.slots_filled, 0) END BETWEEN 0 AND 3;
    _out := _out || jsonb_build_object('seats_low', _n);
  END IF;

  RETURN _out;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.admin_work_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_work_counts() TO authenticated;

-- =====================================================================================================================
-- 10. ADM-106: history of commission rate changes (who, old, new), written by set/clear_commission_rate
-- =====================================================================================================================
CREATE TABLE IF NOT EXISTS public.agent_commission_rate_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  tier text NOT NULL,
  level text NOT NULL,
  old_amount numeric,
  new_amount numeric,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agent_commission_rate_log_pkg_idx ON public.agent_commission_rate_log (package_id, changed_at DESC);
ALTER TABLE public.agent_commission_rate_log ENABLE ROW LEVEL SECURITY;
-- Append-only from the two functions below (they run as the owner); staff only read, through the history function.
REVOKE ALL ON public.agent_commission_rate_log FROM anon, authenticated;
GRANT SELECT ON public.agent_commission_rate_log TO authenticated;
DROP POLICY IF EXISTS "Staff read commission rate log" ON public.agent_commission_rate_log;
CREATE POLICY "Staff read commission rate log" ON public.agent_commission_rate_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'agent_admin'::app_role) OR public.has_role(auth.uid(), 'cs_admin'::app_role));

CREATE OR REPLACE FUNCTION public.set_commission_rate(_package_id uuid, _tier text, _level text, _amount numeric, _note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _row public.agent_commission_rates%ROWTYPE;
  _old numeric;
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

  SELECT amount INTO _old FROM public.agent_commission_rates
   WHERE package_id = _package_id AND tier = btrim(_tier) AND level = _level;

  INSERT INTO public.agent_commission_rates (package_id, tier, level, amount, note, updated_at, updated_by)
  VALUES (_package_id, btrim(_tier), _level, _amount, nullif(btrim(coalesce(_note, '')), ''), now(), _uid)
  ON CONFLICT (package_id, tier, level) DO UPDATE
    SET amount = EXCLUDED.amount,
        note = EXCLUDED.note,
        updated_at = now(),
        updated_by = _uid
  RETURNING * INTO _row;

  IF _old IS DISTINCT FROM _amount THEN
    INSERT INTO public.agent_commission_rate_log (package_id, tier, level, old_amount, new_amount, changed_by)
    VALUES (_package_id, btrim(_tier), _level, _old, _amount, _uid);
  END IF;

  RETURN jsonb_build_object('id', _row.id, 'package_id', _row.package_id, 'tier', _row.tier, 'level', _row.level,
                            'amount', _row.amount, 'note', _row.note, 'updated_at', _row.updated_at);
END;
$function$;

CREATE OR REPLACE FUNCTION public.clear_commission_rate(_package_id uuid, _tier text, _level text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _n integer;
  _old numeric;
BEGIN
  IF _uid IS NULL OR NOT (public.has_role(_uid, 'admin'::public.app_role)
                          OR public.has_role(_uid, 'agent_admin'::public.app_role)) THEN
    RAISE EXCEPTION 'Tidak berwenang.' USING ERRCODE = '42501';
  END IF;
  SELECT amount INTO _old FROM public.agent_commission_rates
   WHERE package_id = _package_id AND tier = btrim(coalesce(_tier, '')) AND level = _level;
  DELETE FROM public.agent_commission_rates
   WHERE package_id = _package_id AND tier = btrim(coalesce(_tier, '')) AND level = _level;
  GET DIAGNOSTICS _n = ROW_COUNT;
  IF _n > 0 THEN
    INSERT INTO public.agent_commission_rate_log (package_id, tier, level, old_amount, new_amount, changed_by)
    VALUES (_package_id, btrim(_tier), _level, _old, NULL, _uid);
  END IF;
  RETURN jsonb_build_object('deleted', _n);
END;
$function$;

-- Newest first, with who changed it (email of the staff account).
CREATE OR REPLACE FUNCTION public.admin_commission_rate_history(_package_id uuid)
RETURNS TABLE (changed_at timestamptz, tier text, level text, old_amount numeric, new_amount numeric, changed_by_name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'agent_admin'::app_role)
          OR public.has_role(auth.uid(), 'cs_admin'::app_role)) THEN
    RAISE EXCEPTION 'Tidak berwenang.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT g.changed_at, g.tier, g.level, g.old_amount, g.new_amount, coalesce(u.email::text, 'tidak diketahui')
      FROM public.agent_commission_rate_log g
      LEFT JOIN auth.users u ON u.id = g.changed_by
     WHERE g.package_id = _package_id
     ORDER BY g.changed_at DESC
     LIMIT 100;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.admin_commission_rate_history(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_commission_rate_history(uuid) TO authenticated;

-- =====================================================================================================================
-- 11. ADM-117: who may call each new authenticated-callable function (reviewed; tests/db/14_admin_hardening.sql section 11
--     calls every one as the roles that must be refused)
-- =====================================================================================================================
COMMENT ON FUNCTION public.admin_work_counts() IS 'Menu badge and dashboard counts. admin/superadmin, cs_admin, agent_admin, product_admin, finance; every figure is limited to the caller''s role. Others: 42501.';
COMMENT ON FUNCTION public.mark_intake_info_sent(uuid) IS 'Record that the DP + manifest message was sent. admin/superadmin and cs_admin only.';
COMMENT ON FUNCTION public.ad_spend_closed_calculator_counts() IS 'Closed calculator leads per campaign, counts only. admin/superadmin and advertiser.';
COMMENT ON FUNCTION public.admin_commission_rate_history(uuid) IS 'Commission rate change history of a package. admin/superadmin, agent_admin, cs_admin.';
COMMENT ON FUNCTION public.admin_list_commissions() IS 'Commission list for the payout page. commission_is_staff: admin/superadmin, agent_admin, finance.';
COMMENT ON FUNCTION public.admin_list_commission_adjustments() IS 'Clawbacks and adjustments. Staff of the commission page (admin/superadmin, agent_admin, finance).';
COMMENT ON FUNCTION public.admin_list_lead_disputes() IS 'Open and resolved lead disputes. Staff of the commission page (admin/superadmin, agent_admin, finance).';
COMMENT ON FUNCTION public.approve_commissions(uuid[], text) IS 'Approve commissions: _as=manajemen needs the owner (superadmin), _as=finance needs the finance role; two different people. Others: 42501.';
COMMENT ON FUNCTION public.mark_agent_commissions_paid(uuid, uuid[], date, text, text, uuid) IS 'Record a payout of approved commissions with 5 percent tax, NIK and proof. finance or owner only.';
COMMENT ON FUNCTION public.resolve_lead_dispute(uuid, uuid, integer, text) IS 'Decide a lead dispute. admin/superadmin only (management).';
COMMENT ON FUNCTION public.list_my_commissions() IS 'An agent''s own commissions (auth.uid() of an agent). Anyone else gets nothing or 42501.';
COMMENT ON FUNCTION public.list_my_commission_adjustments() IS 'An agent''s own clawbacks (auth.uid() of an agent). Anyone else gets nothing or 42501.';
COMMENT ON FUNCTION public.commission_is_staff(uuid) IS 'Role helper used by RLS and the commission functions: true for admin/superadmin, agent_admin, finance. Callable by authenticated like has_role; never by anon.';
COMMENT ON FUNCTION public.commission_is_finance(uuid) IS 'Role helper used by RLS policies (finance notifications): true for the finance role. Callable by authenticated like has_role; never by anon.';
COMMENT ON FUNCTION public.commission_is_management(uuid) IS 'Role helper: true for admin/superadmin (management approval). Callable by authenticated like has_role; never by anon.';
COMMENT ON FUNCTION public.commission_net(numeric) IS 'Pure arithmetic: commission minus 5 percent tax. No data access, harmless for any signed-in caller; not for anon.';
COMMENT ON FUNCTION public.commission_nik_ok(text) IS 'Pure check that a NIK has 16 digits. No data access, harmless for any signed-in caller; not for anon.';
COMMENT ON FUNCTION public.commission_today() IS 'Today in Asia/Jakarta. No data access, harmless for any signed-in caller; not for anon.';
