-- Agent commission lifecycle (SOP section 9 and 11, agent manager Virna, owner decisions 2026-10-08). Idempotent.
--
-- A commission is RECORDED when the jamaah is lunas (unchanged) but it is no longer withdrawable by the agent:
--   PENDING   recorded; conditions not met (jamaah has not departed, agent suspended, lead dispute open)
--   ELIGIBLE  all conditions met AND the jamaah's departure_date has been reached
--   APPROVED  approved by management (superadmin) AND by finance (role 'finance'), two DIFFERENT users
--   PAID      paid by admin in a batch: 5% PPh withheld, transfer proof attached, NIK required
-- The agent no longer requests withdrawals (insert policy dropped; agent_withdrawals and its old rows stay as history).
--
-- Sections: 0 helpers, 1 schema, 2 guards, 3 hold/evaluate/recount helpers, 4 sync_registration_commission,
-- 5 refresh + cron, 6 lead disputes, 7 agent / admin read functions, 8 approve and pay, 9 withdrawals closed, 10 RLS.
-- The role 'finance' is added by 20261008105000_role_finance.sql; this file never writes the enum literal (it checks
-- user_roles.role::text), so it can be applied in the same transaction as that one.

-- ---------------------------------------------------------------------------------------------------------------
-- 0. Helpers
-- ---------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.commission_today()
RETURNS date
LANGUAGE sql
STABLE
AS $$ SELECT (now() AT TIME ZONE 'Asia/Jakarta')::date $$;

-- finance = user_roles.role 'finance'. Compared as text so no enum literal is needed (see the header).
CREATE OR REPLACE FUNCTION public.commission_is_finance(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid AND role::text = 'finance') $$;

-- management = the literal superadmin role (has_role(.., 'superadmin') does not match 'admin').
CREATE OR REPLACE FUNCTION public.commission_is_management(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$ SELECT public.has_role(_uid, 'superadmin'::public.app_role) $$;

-- Staff that may SEE the commission pages: admin (incl. superadmin), finance, agent_admin.
CREATE OR REPLACE FUNCTION public.commission_is_staff(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT _uid IS NOT NULL AND (public.has_role(_uid, 'admin'::public.app_role)
                               OR public.has_role(_uid, 'agent_admin'::public.app_role)
                               OR public.commission_is_finance(_uid))
$$;

-- NIK = 16 digits (agents.ktp_number).
CREATE OR REPLACE FUNCTION public.commission_nik_ok(_nik text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$ SELECT coalesce(btrim(_nik), '') ~ '^[0-9]{16}$' $$;

REVOKE ALL ON FUNCTION public.commission_today(), public.commission_is_finance(uuid), public.commission_is_management(uuid),
  public.commission_is_staff(uuid), public.commission_nik_ok(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.commission_today(), public.commission_is_finance(uuid), public.commission_is_management(uuid),
  public.commission_is_staff(uuid), public.commission_nik_ok(text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------------------------------------------
-- 1. Schema
-- ---------------------------------------------------------------------------------------------------------------
-- Helper split (SOP section 6) and lead disputes (AGT-106) live on the registration / a table of their own.
ALTER TABLE public.jamaah_registrations
  ADD COLUMN IF NOT EXISTS commission_helper_agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS commission_helper_percent integer;
ALTER TABLE public.jamaah_registrations DROP CONSTRAINT IF EXISTS jamaah_registrations_helper_percent_check;
ALTER TABLE public.jamaah_registrations
  ADD CONSTRAINT jamaah_registrations_helper_percent_check
  CHECK (commission_helper_percent IS NULL OR commission_helper_percent BETWEEN 1 AND 99);

CREATE TABLE IF NOT EXISTS public.lead_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES public.jamaah_intakes(id) ON DELETE CASCADE,
  lead_id uuid,
  lead_agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  intake_agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  winner_agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  helper_agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  helper_percent integer CHECK (helper_percent IS NULL OR helper_percent BETWEEN 1 AND 99),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_by uuid,
  resolved_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS lead_disputes_open_uidx ON public.lead_disputes (intake_id) WHERE status = 'open';

-- One row per transfer to one agent (a batch may hold several agents: same batch_id).
CREATE TABLE IF NOT EXISTS public.commission_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE RESTRICT,
  batch_id uuid,
  gross_amount numeric(14, 0) NOT NULL CHECK (gross_amount >= 0),
  tax_amount numeric(14, 0) NOT NULL CHECK (tax_amount >= 0),
  clawback_amount numeric(14, 0) NOT NULL DEFAULT 0 CHECK (clawback_amount >= 0),
  net_amount numeric(14, 0) NOT NULL CHECK (net_amount >= 0),
  transfer_date date NOT NULL,
  transfer_reference text NOT NULL,
  proof_path text,
  bank_name text,
  bank_account text,
  account_name text,
  paid_by uuid,
  paid_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS commission_payouts_agent_idx ON public.commission_payouts (agent_id, paid_at DESC);

ALTER TABLE public.agent_sales
  ADD COLUMN IF NOT EXISTS commission_state text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS hold_reason text,
  ADD COLUMN IF NOT EXISTS counted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS eligible_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_mgmt_by uuid,
  ADD COLUMN IF NOT EXISTS approved_mgmt_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_fin_by uuid,
  ADD COLUMN IF NOT EXISTS approved_fin_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_by uuid,
  ADD COLUMN IF NOT EXISTS tax_amount numeric(14, 0),
  ADD COLUMN IF NOT EXISTS net_amount numeric(14, 0),
  ADD COLUMN IF NOT EXISTS payout_id uuid REFERENCES public.commission_payouts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS parent_sale_id uuid REFERENCES public.agent_sales(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS reprice_diff numeric(14, 0);

ALTER TABLE public.agent_sales DROP CONSTRAINT IF EXISTS agent_sales_commission_state_check;
ALTER TABLE public.agent_sales
  ADD CONSTRAINT agent_sales_commission_state_check CHECK (commission_state IN ('pending', 'eligible', 'approved', 'paid'));
ALTER TABLE public.agent_sales DROP CONSTRAINT IF EXISTS agent_sales_hold_reason_check;
ALTER TABLE public.agent_sales
  ADD CONSTRAINT agent_sales_hold_reason_check CHECK (hold_reason IS NULL OR hold_reason IN ('suspended', 'dispute'));
CREATE UNIQUE INDEX IF NOT EXISTS agent_sales_parent_uidx ON public.agent_sales (parent_sale_id) WHERE parent_sale_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS agent_sales_state_idx ON public.agent_sales (commission_state, departure_date);

-- Rows credited before this migration already sit in the agent totals.
UPDATE public.agent_sales SET counted = true WHERE status IN ('confirmed', 'paid') AND NOT counted;

-- Refund / cancel AFTER payout: a debt of the agent, netted against the NEXT payout (AGT-104).
CREATE TABLE IF NOT EXISTS public.agent_commission_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  sale_id uuid REFERENCES public.agent_sales(id) ON DELETE SET NULL,
  amount numeric(14, 0) NOT NULL CHECK (amount > 0),
  settled_amount numeric(14, 0) NOT NULL DEFAULT 0 CHECK (settled_amount >= 0),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'settled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz,
  settled_payout_id uuid REFERENCES public.commission_payouts(id) ON DELETE SET NULL,
  CONSTRAINT agent_commission_adjustments_settled_le CHECK (settled_amount <= amount)
);
CREATE UNIQUE INDEX IF NOT EXISTS agent_commission_adjustments_sale_uidx
  ON public.agent_commission_adjustments (sale_id) WHERE sale_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS agent_commission_adjustments_agent_idx ON public.agent_commission_adjustments (agent_id, status);

-- ---------------------------------------------------------------------------------------------------------------
-- 2. Guard: the state machine is driven only by the functions below. A direct INSERT / UPDATE through the API
--    (admin and agent_admin may still edit agent_sales for manual entries) cannot touch the lifecycle columns, and an
--    approved or paid sale cannot be re-priced, re-assigned or cancelled by hand.
-- ---------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_agent_sales_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.commission_state := 'pending';
    NEW.hold_reason := NULL;
    NEW.counted := false;
    NEW.eligible_at := NULL;
    NEW.approved_mgmt_by := NULL; NEW.approved_mgmt_at := NULL;
    NEW.approved_fin_by := NULL; NEW.approved_fin_at := NULL; NEW.approved_at := NULL;
    NEW.paid_at := NULL; NEW.paid_by := NULL; NEW.tax_amount := NULL; NEW.net_amount := NULL;
    NEW.payout_id := NULL; NEW.parent_sale_id := NULL; NEW.reprice_diff := NULL;
    RETURN NEW;
  END IF;

  IF (NEW.commission_state, NEW.hold_reason, NEW.counted, NEW.eligible_at, NEW.approved_mgmt_by, NEW.approved_mgmt_at,
      NEW.approved_fin_by, NEW.approved_fin_at, NEW.approved_at, NEW.paid_at, NEW.paid_by, NEW.tax_amount, NEW.net_amount,
      NEW.payout_id, NEW.parent_sale_id, NEW.reprice_diff)
     IS DISTINCT FROM
     (OLD.commission_state, OLD.hold_reason, OLD.counted, OLD.eligible_at, OLD.approved_mgmt_by, OLD.approved_mgmt_at,
      OLD.approved_fin_by, OLD.approved_fin_at, OLD.approved_at, OLD.paid_at, OLD.paid_by, OLD.tax_amount, OLD.net_amount,
      OLD.payout_id, OLD.parent_sale_id, OLD.reprice_diff) THEN
    RAISE EXCEPTION 'Status komisi hanya bisa diubah lewat alur persetujuan dan pembayaran komisi.' USING ERRCODE = '42501';
  END IF;
  IF OLD.commission_state IN ('approved', 'paid')
     AND (NEW.commission_amount, NEW.agent_id, NEW.status) IS DISTINCT FROM (OLD.commission_amount, OLD.agent_id, OLD.status) THEN
    RAISE EXCEPTION 'Komisi yang sudah disetujui atau dibayar tidak bisa diubah.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS aa_guard_agent_sales_lifecycle ON public.agent_sales;
CREATE TRIGGER aa_guard_agent_sales_lifecycle BEFORE INSERT OR UPDATE ON public.agent_sales
  FOR EACH ROW EXECUTE FUNCTION public.guard_agent_sales_lifecycle();

-- Sales written by log_agent_sale() and the old booking function credit the agent's totals themselves, so they are born
-- "counted". Rows made by sync_registration_commission (source 'registration') are counted by commission_recount().
-- A direct INSERT through the API credits nothing, so it stays uncounted (the guard above runs first for those).
CREATE OR REPLACE FUNCTION public.agent_sales_born_counted()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') AND NEW.source <> 'registration' AND NEW.status = 'confirmed' THEN
    NEW.counted := true;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS ab_agent_sales_born_counted ON public.agent_sales;
CREATE TRIGGER ab_agent_sales_born_counted BEFORE INSERT ON public.agent_sales
  FOR EACH ROW EXECUTE FUNCTION public.agent_sales_born_counted();

-- The helper split columns on a registration are decided by management (resolve_lead_dispute) only.
CREATE OR REPLACE FUNCTION public.guard_registration_commission_split()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.commission_helper_agent_id := NULL;
    NEW.commission_helper_percent := NULL;
  ELSIF (NEW.commission_helper_agent_id, NEW.commission_helper_percent)
        IS DISTINCT FROM (OLD.commission_helper_agent_id, OLD.commission_helper_percent) THEN
    NEW.commission_helper_agent_id := OLD.commission_helper_agent_id;
    NEW.commission_helper_percent := OLD.commission_helper_percent;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS aa_guard_registration_commission_split ON public.jamaah_registrations;
CREATE TRIGGER aa_guard_registration_commission_split BEFORE INSERT OR UPDATE ON public.jamaah_registrations
  FOR EACH ROW EXECUTE FUNCTION public.guard_registration_commission_split();

-- ---------------------------------------------------------------------------------------------------------------
-- 3. Internal helpers (postgres / service_role only)
-- ---------------------------------------------------------------------------------------------------------------
-- 3a. Keep agents.total_sales / total_commission / available_balance in step with agent_sales.counted.
--     A sale counts while it is confirmed or paid AND not held. available_balance is "recorded and not yet paid out".
CREATE OR REPLACE FUNCTION public.commission_recount(_sale_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  s public.agent_sales%ROWTYPE;
  v_want boolean;
BEGIN
  SELECT * INTO s FROM public.agent_sales WHERE id = _sale_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  v_want := s.status IN ('confirmed', 'paid') AND (s.hold_reason IS NULL OR s.status = 'paid');
  IF v_want AND NOT s.counted THEN
    UPDATE public.agents
       SET total_sales = total_sales + 1,
           total_commission = total_commission + s.commission_amount,
           available_balance = available_balance + s.commission_amount
     WHERE id = s.agent_id;
    UPDATE public.agent_sales SET counted = true WHERE id = s.id;
  ELSIF NOT v_want AND s.counted THEN
    UPDATE public.agents
       SET total_sales = greatest(total_sales - 1, 0),
           total_commission = total_commission - s.commission_amount,
           available_balance = available_balance - s.commission_amount
     WHERE id = s.agent_id;
    UPDATE public.agent_sales SET counted = false WHERE id = s.id;
  END IF;
END;
$function$;

-- 3b. Why a sale is held right now: the agent is not active, or its intake has an open lead dispute.
CREATE OR REPLACE FUNCTION public.commission_hold_for(_sale_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
           WHEN a.status IS DISTINCT FROM 'active' THEN 'suspended'
           WHEN reg.intake_id IS NOT NULL
                AND EXISTS (SELECT 1 FROM public.lead_disputes d WHERE d.intake_id = reg.intake_id AND d.status = 'open')
             THEN 'dispute'
         END
    FROM public.agent_sales s
    JOIN public.agents a ON a.id = s.agent_id
    LEFT JOIN public.agent_sales ps ON ps.id = s.parent_sale_id
    LEFT JOIN public.jamaah_registrations reg ON reg.id = coalesce(s.registration_id, ps.registration_id)
   WHERE s.id = _sale_id
$function$;

-- 3c. PENDING <-> ELIGIBLE for one sale. TRUE when it just became eligible. Approved / paid rows never move here.
CREATE OR REPLACE FUNCTION public.commission_evaluate(_sale_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  s public.agent_sales%ROWTYPE;
  v_ok boolean;
BEGIN
  SELECT * INTO s FROM public.agent_sales WHERE id = _sale_id FOR UPDATE;
  IF NOT FOUND OR s.status <> 'confirmed' OR s.commission_state NOT IN ('pending', 'eligible') THEN
    RETURN false;
  END IF;
  v_ok := s.hold_reason IS NULL AND s.departure_date IS NOT NULL AND s.departure_date <= public.commission_today();
  IF v_ok AND s.commission_state = 'pending' THEN
    UPDATE public.agent_sales SET commission_state = 'eligible', eligible_at = now() WHERE id = s.id;
    RETURN true;
  ELSIF NOT v_ok AND s.commission_state = 'eligible' THEN
    -- Conditions stopped holding (dispute, suspension, departure moved): back to PENDING, approvals so far are void.
    UPDATE public.agent_sales
       SET commission_state = 'pending', eligible_at = NULL,
           approved_mgmt_by = NULL, approved_mgmt_at = NULL, approved_fin_by = NULL, approved_fin_at = NULL
     WHERE id = s.id;
  END IF;
  RETURN false;
END;
$function$;

-- 3d. One admin notification per package departure (not per jamaah), unless an unread one is still waiting.
CREATE OR REPLACE FUNCTION public.commission_notify_eligible(_package_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_name text;
  v_dep date;
  v_n integer;
BEGIN
  IF _package_id IS NULL THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.admin_notifications
              WHERE type = 'commission_eligible' AND NOT is_read AND archived_at IS NULL
                AND meta ->> 'package_id' = _package_id::text) THEN
    RETURN;
  END IF;
  SELECT package_name, departure_date INTO v_name, v_dep FROM public.packages WHERE id = _package_id;
  SELECT count(*) INTO v_n FROM public.agent_sales
   WHERE package_id = _package_id AND status = 'confirmed' AND commission_state = 'eligible';
  IF v_n = 0 THEN RETURN; END IF;
  INSERT INTO public.admin_notifications (title, message, type, action_url, meta)
  VALUES ('Komisi agen layak dibayar',
          coalesce(v_name, 'Paket') || ' berangkat ' || coalesce(to_char(v_dep, 'DD-MM-YYYY'), '-') || ': ' || v_n ||
          ' komisi agen layak diproses (butuh persetujuan manajemen dan finance).',
          'commission_eligible', '/admin/pembayaran-komisi?tab=layak',
          jsonb_build_object('package_id', _package_id, 'departure_date', v_dep, 'count', v_n));
END;
$function$;

-- 3e. A refund / cancel / rejected payment AFTER the commission was paid: record the debt, never a negative balance.
CREATE OR REPLACE FUNCTION public.commission_clawback(_sale_id uuid, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  s public.agent_sales%ROWTYPE;
  v_amount numeric;
  v_name text;
  v_id uuid;
BEGIN
  SELECT * INTO s FROM public.agent_sales WHERE id = _sale_id;
  IF NOT FOUND OR s.status <> 'paid' THEN RETURN; END IF;
  v_amount := coalesce(s.net_amount, s.commission_amount);   -- what the agent actually received
  IF v_amount <= 0 THEN RETURN; END IF;
  INSERT INTO public.agent_commission_adjustments (agent_id, sale_id, amount, reason)
  VALUES (s.agent_id, s.id, v_amount, _reason)
  ON CONFLICT (sale_id) WHERE sale_id IS NOT NULL DO NOTHING
  RETURNING id INTO v_id;
  IF v_id IS NOT NULL THEN
    SELECT name INTO v_name FROM public.agents WHERE id = s.agent_id;
    INSERT INTO public.admin_notifications (title, message, type, action_url, meta)
    VALUES ('Komisi agen perlu dikembalikan',
            coalesce(v_name, 'Agen') || ': ' || _reason || ' (' || s.customer_name || '). Rp ' ||
            replace(to_char(v_amount, 'FM999G999G999G999'), ',', '.') || ' dipotong dari pembayaran komisi berikutnya.',
            'commission_clawback', '/admin/pembayaran-komisi?tab=ditahan',
            jsonb_build_object('agent_id', s.agent_id, 'sale_id', s.id, 'adjustment_id', v_id, 'amount', v_amount));
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.commission_recount(uuid), public.commission_hold_for(uuid), public.commission_evaluate(uuid),
  public.commission_notify_eligible(uuid), public.commission_clawback(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.commission_recount(uuid), public.commission_hold_for(uuid), public.commission_evaluate(uuid),
  public.commission_notify_eligible(uuid), public.commission_clawback(uuid, text) TO service_role;

-- ---------------------------------------------------------------------------------------------------------------
-- 4. sync_registration_commission (LIVE definition from 20261007100000 + lifecycle). Called by the triggers on
--    jamaah_registrations and jamaah_payments, and by resolve_lead_dispute.
--    * AGT-112  the registration row is locked FOR UPDATE first, so two sessions verifying payments of the same
--               registration run one after the other; the unique partial index on registration_id stays the backstop.
--    * AGT-103  package move: PENDING / ELIGIBLE commissions are re-priced with the NEW package (its rate for the agent's
--               level); APPROVED / PAID are frozen and only reprice_diff is set for admin to look at.
--    * AGT-104  refund / cancel / rejected payment after PAID: a row in agent_commission_adjustments, never a negative
--               balance. The old "never touch paid" early return is now exactly that and nothing else.
--    * AGT-106  an open lead dispute on the registration's intake, AGT-109 an agent who is not active: the sale is
--               recorded but held (hold_reason), stays PENDING and is not counted in the agent's totals.
--    * Helper split (resolve_lead_dispute): the helper gets a child row (parent_sale_id) for helper_percent of the total,
--               the registering agent keeps the rest. Both rows run the same lifecycle on their own.
--    Not changed: how the AMOUNT is computed (agent_commission_for), credit when lunas, reversal before payout, and that
--    a sale already credited to the same agent keeps its amount (a level or rate change never re-prices by itself).
-- ---------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_registration_commission(_registration_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  s record;
  c record;
  v_paid numeric;
  v_due numeric;
  v_core boolean;
  v_should boolean;
  v_total numeric := 0;
  v_main numeric := 0;
  v_helper numeric := 0;
  v_child_existing numeric := 0;
  v_new numeric;
  v_hold text;
  v_hold_helper text;
  v_has_sale boolean;
  v_has_child boolean;
  v_frozen boolean := false;
  v_id uuid;
  v_main_id uuid;
  v_pkg uuid;
BEGIN
  -- AGT-112: serialise every sync of the same registration.
  PERFORM 1 FROM public.jamaah_registrations WHERE id = _registration_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT reg.*, p.package_name, p.departure_date AS pkg_departure
    INTO r
    FROM public.jamaah_registrations reg
    JOIN public.packages p ON p.id = reg.package_id
   WHERE reg.id = _registration_id;

  SELECT coalesce(sum(amount), 0) INTO v_paid
    FROM public.jamaah_payments WHERE registration_id = _registration_id AND status = 'verified';
  v_due := r.list_price - r.discount;
  v_core := r.status = 'active' AND v_due > 0 AND v_paid >= v_due AND NOT r.commission_skipped;

  SELECT * INTO s FROM public.agent_sales WHERE registration_id = _registration_id FOR UPDATE;
  v_has_sale := FOUND;

  -- Already PAID out: never re-price or cancel. A refund / cancellation / rejected payment becomes a clawback record.
  IF v_has_sale AND s.status = 'paid' THEN
    IF NOT v_core THEN
      PERFORM public.commission_clawback(s.id, CASE WHEN r.status = 'cancelled'
        THEN 'Jamaah dibatalkan setelah komisi dibayar' ELSE 'Pembayaran jamaah dibatalkan atau ditolak setelah komisi dibayar' END);
      FOR c IN SELECT id, status FROM public.agent_sales WHERE parent_sale_id = s.id LOOP
        IF c.status = 'paid' THEN
          PERFORM public.commission_clawback(c.id, 'Jamaah dibatalkan atau pembayaran ditolak setelah komisi dibayar');
        ELSIF c.status = 'confirmed' THEN
          UPDATE public.agent_sales SET status = 'cancelled' WHERE id = c.id;
          PERFORM public.commission_recount(c.id);
        END IF;
      END LOOP;
    END IF;
    RETURN;
  END IF;

  -- Hold: the agent is not active (AGT-109) or the intake has an open lead dispute (AGT-106).
  IF r.agent_id IS NOT NULL THEN
    v_hold := CASE
      WHEN NOT EXISTS (SELECT 1 FROM public.agents WHERE id = r.agent_id AND status = 'active') THEN 'suspended'
      WHEN r.intake_id IS NOT NULL
           AND EXISTS (SELECT 1 FROM public.lead_disputes d WHERE d.intake_id = r.intake_id AND d.status = 'open') THEN 'dispute'
    END;
    v_new := public.agent_commission_for(
      r.package_id, public.registration_commission_tier(r.package_id, r.room_type, r.list_price), r.agent_id);
  END IF;

  -- Total commission for this jamaah (main + helper share).
  IF v_has_sale AND s.status = 'confirmed' AND s.agent_id IS NOT DISTINCT FROM r.agent_id THEN
    SELECT coalesce(sum(commission_amount), 0) INTO v_child_existing
      FROM public.agent_sales WHERE parent_sale_id = s.id AND status IN ('confirmed', 'paid');
    v_total := s.commission_amount + v_child_existing;           -- already credited: keep what was credited
    v_frozen := s.commission_state IN ('approved', 'paid');
    IF s.package_id IS DISTINCT FROM r.package_id AND NOT v_frozen THEN
      v_total := coalesce(v_new, 0);                              -- AGT-103: re-price with the new package
    END IF;
  ELSE
    v_total := coalesce(v_new, 0);
  END IF;

  IF r.commission_helper_agent_id IS NOT NULL AND r.commission_helper_percent IS NOT NULL
     AND r.commission_helper_agent_id IS DISTINCT FROM r.agent_id THEN
    v_helper := round(v_total * r.commission_helper_percent / 100.0);
  END IF;
  v_main := v_total - v_helper;
  IF v_frozen THEN v_main := s.commission_amount; END IF;

  v_should := v_core AND r.agent_id IS NOT NULL AND v_total > 0;

  -- Reverse a credited commission that no longer applies, or that moves to another agent (before payout).
  IF v_has_sale AND s.status = 'confirmed' AND (NOT v_should OR s.agent_id IS DISTINCT FROM r.agent_id) THEN
    FOR c IN SELECT id, status FROM public.agent_sales WHERE parent_sale_id = s.id AND status IN ('confirmed', 'paid') LOOP
      IF c.status = 'paid' THEN
        PERFORM public.commission_clawback(c.id, 'Jamaah dibatalkan atau pembayaran ditolak setelah komisi dibayar');
      ELSE
        UPDATE public.agent_sales SET status = 'cancelled' WHERE id = c.id;
        PERFORM public.commission_recount(c.id);
      END IF;
    END LOOP;
    UPDATE public.agent_sales SET status = 'cancelled' WHERE id = s.id;
    PERFORM public.commission_recount(s.id);
    s.status := 'cancelled';
    v_frozen := false;
  END IF;

  IF NOT v_should THEN RETURN; END IF;

  IF NOT v_has_sale OR s.status <> 'confirmed' THEN
    -- Credit (first time, or again after a reversal).
    INSERT INTO public.agent_sales
      (agent_id, customer_name, customer_phone, package_id, package_name, sale_amount,
       commission_amount, status, departure_date, notes, source, registration_id, commission_state, hold_reason)
    VALUES
      (r.agent_id, r.full_name, coalesce(r.phone, '-'), r.package_id, r.package_name, v_due,
       v_main, 'confirmed', r.pkg_departure, 'Lunas (pendaftaran offline)', 'registration', r.id, 'pending', v_hold)
    ON CONFLICT (registration_id) WHERE registration_id IS NOT NULL DO UPDATE
      SET agent_id = EXCLUDED.agent_id,
          customer_name = EXCLUDED.customer_name,
          customer_phone = EXCLUDED.customer_phone,
          package_id = EXCLUDED.package_id,
          package_name = EXCLUDED.package_name,
          sale_amount = EXCLUDED.sale_amount,
          commission_amount = EXCLUDED.commission_amount,
          departure_date = EXCLUDED.departure_date,
          status = 'confirmed',
          commission_state = 'pending',
          hold_reason = EXCLUDED.hold_reason,
          eligible_at = NULL,
          approved_mgmt_by = NULL, approved_mgmt_at = NULL, approved_fin_by = NULL, approved_fin_at = NULL, approved_at = NULL,
          reprice_diff = NULL
    RETURNING id INTO v_id;
    v_main_id := v_id;
  ELSE
    v_main_id := s.id;
    IF NOT v_frozen THEN
      -- Keep the agent totals right when the amount changes (re-price) while the sale is counted.
      IF s.counted AND v_main <> s.commission_amount THEN
        UPDATE public.agents
           SET total_commission = total_commission + (v_main - s.commission_amount),
               available_balance = available_balance + (v_main - s.commission_amount)
         WHERE id = s.agent_id;
      END IF;
      UPDATE public.agent_sales
         SET commission_amount = v_main, package_id = r.package_id, package_name = r.package_name,
             departure_date = r.pkg_departure, sale_amount = v_due, customer_name = r.full_name,
             customer_phone = coalesce(r.phone, '-'), hold_reason = v_hold, reprice_diff = NULL
       WHERE id = s.id;
    ELSE
      -- AGT-103: frozen. Flag the difference between what a re-price would give and what is frozen.
      UPDATE public.agent_sales
         SET reprice_diff = CASE WHEN s.package_id IS DISTINCT FROM r.package_id
                                 THEN nullif(coalesce(v_new, 0) - v_total, 0) END
       WHERE id = s.id;
    END IF;
  END IF;

  PERFORM public.commission_recount(v_main_id);
  IF public.commission_evaluate(v_main_id) THEN v_pkg := r.package_id; END IF;

  -- Helper share as its own row (own approvals and payout), unless the main row is frozen.
  IF NOT v_frozen THEN
    SELECT * INTO c FROM public.agent_sales WHERE parent_sale_id = v_main_id FOR UPDATE;
    v_has_child := FOUND;
    IF v_helper > 0 THEN
      v_hold_helper := CASE
        WHEN NOT EXISTS (SELECT 1 FROM public.agents WHERE id = r.commission_helper_agent_id AND status = 'active') THEN 'suspended'
        WHEN v_hold = 'dispute' THEN 'dispute'
      END;
      IF NOT v_has_child THEN
        INSERT INTO public.agent_sales
          (agent_id, customer_name, customer_phone, package_id, package_name, sale_amount, commission_amount, status,
           departure_date, notes, source, parent_sale_id, commission_state, hold_reason)
        VALUES
          (r.commission_helper_agent_id, r.full_name, coalesce(r.phone, '-'), r.package_id, r.package_name, v_due, v_helper,
           'confirmed', r.pkg_departure, 'Bagi hasil bantuan agen (' || r.commission_helper_percent || '%)', 'registration',
           v_main_id, 'pending', v_hold_helper)
        RETURNING id INTO v_id;
        PERFORM public.commission_recount(v_id);
        IF public.commission_evaluate(v_id) THEN v_pkg := r.package_id; END IF;
      ELSIF c.commission_state NOT IN ('approved', 'paid') OR c.status = 'cancelled' THEN
        IF c.status = 'confirmed' AND c.agent_id IS DISTINCT FROM r.commission_helper_agent_id THEN
          UPDATE public.agent_sales SET status = 'cancelled' WHERE id = c.id;
          PERFORM public.commission_recount(c.id);
          c.status := 'cancelled';
        END IF;
        IF c.status = 'confirmed' AND c.counted AND v_helper <> c.commission_amount THEN
          UPDATE public.agents
             SET total_commission = total_commission + (v_helper - c.commission_amount),
                 available_balance = available_balance + (v_helper - c.commission_amount)
           WHERE id = c.agent_id;
        END IF;
        UPDATE public.agent_sales
           SET agent_id = r.commission_helper_agent_id, commission_amount = v_helper, status = 'confirmed',
               package_id = r.package_id, package_name = r.package_name, departure_date = r.pkg_departure,
               sale_amount = v_due, customer_name = r.full_name, customer_phone = coalesce(r.phone, '-'),
               hold_reason = v_hold_helper,
               commission_state = CASE WHEN c.status = 'cancelled' THEN 'pending' ELSE c.commission_state END,
               eligible_at = CASE WHEN c.status = 'cancelled' THEN NULL ELSE c.eligible_at END,
               notes = 'Bagi hasil bantuan agen (' || r.commission_helper_percent || '%)'
         WHERE id = c.id;
        PERFORM public.commission_recount(c.id);
        IF public.commission_evaluate(c.id) THEN v_pkg := r.package_id; END IF;
      END IF;
    ELSIF v_has_child AND c.status = 'confirmed' AND c.commission_state NOT IN ('approved', 'paid') THEN
      UPDATE public.agent_sales SET status = 'cancelled' WHERE id = c.id;
      PERFORM public.commission_recount(c.id);
    END IF;
  END IF;

  IF v_pkg IS NOT NULL THEN PERFORM public.commission_notify_eligible(v_pkg); END IF;
END;
$function$;

-- ---------------------------------------------------------------------------------------------------------------
-- 5. Eligibility refresh. Runs lazily inside list_my_commissions / admin_list_commissions (so the screens are right even
--    if the cron did not run), when an agent's status changes, and daily 01:00 Asia/Jakarta (pg_cron, 18:00 UTC).
-- ---------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.commission_refresh(_agent_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  s record;
  v_hold text;
  v_n integer := 0;
  v_pkgs uuid[] := ARRAY[]::uuid[];
  v_pk uuid;
BEGIN
  -- A package whose departure date was edited moves its not-yet-approved commissions with it.
  UPDATE public.agent_sales a
     SET departure_date = p.departure_date
    FROM public.jamaah_registrations r
    JOIN public.packages p ON p.id = r.package_id
   WHERE a.registration_id = r.id AND a.status = 'confirmed' AND a.commission_state IN ('pending', 'eligible')
     AND a.departure_date IS DISTINCT FROM p.departure_date
     AND (_agent_id IS NULL OR a.agent_id = _agent_id);
  UPDATE public.agent_sales a
     SET departure_date = ps.departure_date
    FROM public.agent_sales ps
   WHERE a.parent_sale_id = ps.id AND a.status = 'confirmed' AND a.commission_state IN ('pending', 'eligible')
     AND a.departure_date IS DISTINCT FROM ps.departure_date
     AND (_agent_id IS NULL OR a.agent_id = _agent_id);

  FOR s IN
    SELECT id, hold_reason, package_id FROM public.agent_sales
     WHERE status = 'confirmed' AND commission_state IN ('pending', 'eligible')
       AND (_agent_id IS NULL OR agent_id = _agent_id)
     ORDER BY departure_date, id
  LOOP
    v_hold := public.commission_hold_for(s.id);
    IF v_hold IS DISTINCT FROM s.hold_reason THEN
      UPDATE public.agent_sales SET hold_reason = v_hold WHERE id = s.id;
      PERFORM public.commission_recount(s.id);
    END IF;
    IF public.commission_evaluate(s.id) THEN
      v_n := v_n + 1;
      v_pkgs := array_append(v_pkgs, s.package_id);
    END IF;
  END LOOP;

  FOR v_pk IN SELECT DISTINCT x FROM unnest(v_pkgs) AS x LOOP
    PERFORM public.commission_notify_eligible(v_pk);
  END LOOP;
  RETURN v_n;
END;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_commission_eligibility()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN jsonb_build_object('became_eligible', public.commission_refresh(NULL), 'on', public.commission_today());
END;
$function$;

REVOKE ALL ON FUNCTION public.commission_refresh(uuid), public.refresh_commission_eligibility() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.commission_refresh(uuid), public.refresh_commission_eligibility() TO service_role;

-- An agent suspended (or re-activated) moves their commissions to / from "Ditahan" at once.
CREATE OR REPLACE FUNCTION public.agents_commission_refresh()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.commission_refresh(NEW.id);
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS agents_commission_refresh ON public.agents;
CREATE TRIGGER agents_commission_refresh AFTER UPDATE OF status ON public.agents
  FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status) EXECUTE FUNCTION public.agents_commission_refresh();

-- Daily at 01:00 Asia/Jakarta (UTC+7, no DST) = 18:00 UTC. Only when pg_cron is installed.
DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('commission-eligibility-daily', '0 18 * * *', 'select public.refresh_commission_eligibility()');
  END IF;
END
$cron$;

-- ---------------------------------------------------------------------------------------------------------------
-- 6. Lead disputes (AGT-106). create_jamaah_intake already writes a 'lead_conflict' admin notification; a trigger turns
--    it into an OPEN lead_disputes row, which holds the commission of every registration of that intake until staff
--    decide with resolve_lead_dispute.
-- ---------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.capture_lead_dispute()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  BEGIN
    INSERT INTO public.lead_disputes (intake_id, lead_id, lead_agent_id, intake_agent_id)
    VALUES ((NEW.meta ->> 'intake_id')::uuid, nullif(NEW.meta ->> 'lead_id', '')::uuid,
            nullif(NEW.meta ->> 'lead_agent_id', '')::uuid, nullif(NEW.meta ->> 'intake_agent_id', '')::uuid)
    ON CONFLICT (intake_id) WHERE status = 'open' DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'lead dispute not captured for notification %: % (%)', NEW.id, SQLERRM, SQLSTATE;
  END;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS capture_lead_dispute ON public.admin_notifications;
CREATE TRIGGER capture_lead_dispute AFTER INSERT ON public.admin_notifications
  FOR EACH ROW WHEN (NEW.type = 'lead_conflict') EXECUTE FUNCTION public.capture_lead_dispute();

-- Disputes raised before this migration (unarchived notifications) become open disputes too.
INSERT INTO public.lead_disputes (intake_id, lead_id, lead_agent_id, intake_agent_id)
SELECT (n.meta ->> 'intake_id')::uuid, nullif(n.meta ->> 'lead_id', '')::uuid,
       nullif(n.meta ->> 'lead_agent_id', '')::uuid, nullif(n.meta ->> 'intake_agent_id', '')::uuid
  FROM public.admin_notifications n
 WHERE n.type = 'lead_conflict' AND n.archived_at IS NULL
   AND EXISTS (SELECT 1 FROM public.jamaah_intakes i WHERE i.id = (n.meta ->> 'intake_id')::uuid)
   AND EXISTS (SELECT 1 FROM public.agents a WHERE a.id = nullif(n.meta ->> 'lead_agent_id', '')::uuid)
   AND EXISTS (SELECT 1 FROM public.agents a WHERE a.id = nullif(n.meta ->> 'intake_agent_id', '')::uuid)
ON CONFLICT (intake_id) WHERE status = 'open' DO NOTHING;

-- Management decision. The winner is credited 100%, or, with _helper_percent (30 or 40), the other agent gets that share
-- as a helper (SOP section 6: 30/70, 60/40) and the winner keeps the rest. Staff: admin / superadmin / agent_admin.
CREATE OR REPLACE FUNCTION public.resolve_lead_dispute(
  _intake_id uuid, _winner_agent_id uuid, _helper_percent integer DEFAULT NULL, _note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  d public.lead_disputes%ROWTYPE;
  v_helper uuid;
BEGIN
  IF _uid IS NULL OR NOT (public.has_role(_uid, 'admin'::public.app_role) OR public.has_role(_uid, 'agent_admin'::public.app_role)) THEN
    RAISE EXCEPTION 'Tidak berwenang.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO d FROM public.lead_disputes WHERE intake_id = _intake_id AND status = 'open' FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tidak ada sengketa lead yang terbuka untuk pendaftaran ini.' USING ERRCODE = 'P0001';
  END IF;
  IF _winner_agent_id IS NULL OR _winner_agent_id NOT IN (d.lead_agent_id, d.intake_agent_id) THEN
    RAISE EXCEPTION 'Pemenang harus salah satu dari dua agen yang bersengketa.' USING ERRCODE = '22023';
  END IF;
  IF _helper_percent IS NOT NULL AND _helper_percent NOT IN (30, 40) THEN
    RAISE EXCEPTION 'Bagian agen pembantu hanya boleh 30 atau 40 persen.' USING ERRCODE = '22023';
  END IF;
  v_helper := CASE WHEN _helper_percent IS NULL THEN NULL
                   WHEN _winner_agent_id = d.lead_agent_id THEN d.intake_agent_id ELSE d.lead_agent_id END;
  IF _helper_percent IS NOT NULL AND (v_helper IS NULL OR v_helper = _winner_agent_id) THEN
    RAISE EXCEPTION 'Agen pembantu tidak ditemukan.' USING ERRCODE = '22023';
  END IF;

  UPDATE public.lead_disputes
     SET status = 'resolved', winner_agent_id = _winner_agent_id, helper_agent_id = v_helper,
         helper_percent = _helper_percent, note = nullif(btrim(coalesce(_note, '')), ''),
         resolved_by = _uid, resolved_at = now()
   WHERE id = d.id;

  UPDATE public.jamaah_intakes SET agent_id = _winner_agent_id WHERE id = d.intake_id;
  IF d.lead_id IS NOT NULL AND _winner_agent_id = d.lead_agent_id THEN
    UPDATE public.agent_leads SET status = 'registered', intake_id = d.intake_id, updated_at = now()
     WHERE id = d.lead_id AND status IN ('active', 'registered');
  END IF;
  -- The UPDATE fires sync_registration_commission for every registration of the intake.
  UPDATE public.jamaah_registrations
     SET agent_id = _winner_agent_id, commission_helper_agent_id = v_helper, commission_helper_percent = _helper_percent
   WHERE intake_id = d.intake_id;

  RETURN jsonb_build_object('intake_id', d.intake_id, 'winner_agent_id', _winner_agent_id,
                            'helper_agent_id', v_helper, 'helper_percent', _helper_percent);
END;
$function$;

REVOKE ALL ON FUNCTION public.resolve_lead_dispute(uuid, uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_lead_dispute(uuid, uuid, integer, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_lead_disputes()
RETURNS TABLE(id uuid, intake_id uuid, contact_name text, status text, created_at timestamptz,
              lead_agent_id uuid, lead_agent_name text, lead_agent_code text,
              intake_agent_id uuid, intake_agent_name text, intake_agent_code text,
              winner_agent_id uuid, helper_percent integer, resolved_at timestamptz)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.commission_is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Tidak berwenang.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT d.id, d.intake_id, i.contact_name, d.status, d.created_at,
         d.lead_agent_id, la.name, la.referral_code, d.intake_agent_id, ia.name, ia.referral_code,
         d.winner_agent_id, d.helper_percent, d.resolved_at
    FROM public.lead_disputes d
    LEFT JOIN public.jamaah_intakes i ON i.id = d.intake_id
    LEFT JOIN public.agents la ON la.id = d.lead_agent_id
    LEFT JOIN public.agents ia ON ia.id = d.intake_agent_id
   ORDER BY (d.status = 'open') DESC, d.created_at DESC
   LIMIT 200;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_list_lead_disputes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_lead_disputes() TO authenticated;

-- ---------------------------------------------------------------------------------------------------------------
-- 7. Read functions. Money maths: PPh 5% withheld, net = round(gross * 0.95) to whole rupiah, tax = gross - net.
-- ---------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.commission_net(_gross numeric)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$ SELECT round(_gross * 0.95) $$;
GRANT EXECUTE ON FUNCTION public.commission_net(numeric) TO authenticated, service_role;

-- The agent's own statement: one row per jamaah (or per helper share). Evaluates eligibility first.
CREATE OR REPLACE FUNCTION public.list_my_commissions()
RETURNS TABLE(sale_id uuid, registration_id uuid, customer_name text, package_name text, departure_date date,
              role text, share_percent integer, state text, hold_reason text,
              gross_amount numeric, tax_amount numeric, net_amount numeric,
              eligible_at timestamptz, approved_at timestamptz, paid_at timestamptz,
              transfer_date date, transfer_reference text, proof_path text, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_agent uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Tidak berwenang.' USING ERRCODE = '42501';
  END IF;
  SELECT a.id INTO v_agent FROM public.agents a WHERE a.user_id = auth.uid();
  IF v_agent IS NULL THEN RETURN; END IF;
  PERFORM public.commission_refresh(v_agent);

  RETURN QUERY
  SELECT s.id, coalesce(s.registration_id, ps.registration_id), s.customer_name, s.package_name, s.departure_date,
         CASE WHEN s.parent_sale_id IS NULL THEN 'utama' ELSE 'bantuan' END,
         CASE WHEN s.parent_sale_id IS NOT NULL THEN reg.commission_helper_percent
              WHEN EXISTS (SELECT 1 FROM public.agent_sales c WHERE c.parent_sale_id = s.id AND c.status <> 'cancelled')
                THEN 100 - reg.commission_helper_percent END,
         s.commission_state, s.hold_reason,
         s.commission_amount,
         coalesce(s.tax_amount, s.commission_amount - public.commission_net(s.commission_amount)),
         coalesce(s.net_amount, public.commission_net(s.commission_amount)),
         s.eligible_at, s.approved_at, s.paid_at, po.transfer_date, po.transfer_reference, po.proof_path, s.created_at
    FROM public.agent_sales s
    LEFT JOIN public.agent_sales ps ON ps.id = s.parent_sale_id
    LEFT JOIN public.jamaah_registrations reg ON reg.id = coalesce(s.registration_id, ps.registration_id)
    LEFT JOIN public.commission_payouts po ON po.id = s.payout_id
   WHERE s.agent_id = v_agent AND s.status IN ('confirmed', 'paid')
   ORDER BY s.departure_date DESC NULLS LAST, s.created_at DESC
   LIMIT 1000;
END;
$function$;

CREATE OR REPLACE FUNCTION public.list_my_commission_adjustments()
RETURNS TABLE(id uuid, customer_name text, amount numeric, settled_amount numeric, remaining numeric,
              reason text, status text, created_at timestamptz)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Tidak berwenang.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT j.id, s.customer_name, j.amount, j.settled_amount, j.amount - j.settled_amount, j.reason, j.status, j.created_at
    FROM public.agent_commission_adjustments j
    JOIN public.agents a ON a.id = j.agent_id AND a.user_id = auth.uid()
    LEFT JOIN public.agent_sales s ON s.id = j.sale_id
   ORDER BY j.created_at DESC
   LIMIT 200;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_list_commissions()
RETURNS TABLE(sale_id uuid, registration_id uuid, agent_id uuid, agent_name text, agent_code text, agent_level text,
              agent_status text, bank_name text, bank_account text, account_name text, agent_nik text, nik_ok boolean,
              customer_name text, package_id uuid, package_name text, departure_date date,
              role text, share_percent integer, state text, hold_reason text,
              gross_amount numeric, tax_amount numeric, net_amount numeric,
              eligible_at timestamptz, approved_mgmt_by uuid, approved_mgmt_at timestamptz,
              approved_fin_by uuid, approved_fin_at timestamptz, approved_at timestamptz,
              paid_at timestamptz, payout_id uuid, transfer_date date, transfer_reference text, proof_path text,
              reprice_diff numeric, open_clawback numeric, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.commission_is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Tidak berwenang.' USING ERRCODE = '42501';
  END IF;
  PERFORM public.commission_refresh(NULL);

  RETURN QUERY
  SELECT s.id, coalesce(s.registration_id, ps.registration_id), s.agent_id, a.name, a.referral_code, a.level, a.status,
         a.bank_name, a.bank_account, a.account_name, a.ktp_number, public.commission_nik_ok(a.ktp_number),
         s.customer_name, s.package_id, s.package_name, s.departure_date,
         CASE WHEN s.parent_sale_id IS NULL THEN 'utama' ELSE 'bantuan' END,
         CASE WHEN s.parent_sale_id IS NOT NULL THEN reg.commission_helper_percent
              WHEN EXISTS (SELECT 1 FROM public.agent_sales c WHERE c.parent_sale_id = s.id AND c.status <> 'cancelled')
                THEN 100 - reg.commission_helper_percent END,
         s.commission_state, s.hold_reason,
         s.commission_amount,
         coalesce(s.tax_amount, s.commission_amount - public.commission_net(s.commission_amount)),
         coalesce(s.net_amount, public.commission_net(s.commission_amount)),
         s.eligible_at, s.approved_mgmt_by, s.approved_mgmt_at, s.approved_fin_by, s.approved_fin_at, s.approved_at,
         s.paid_at, s.payout_id, po.transfer_date, po.transfer_reference, po.proof_path,
         s.reprice_diff,
         (SELECT coalesce(sum(j.amount - j.settled_amount), 0) FROM public.agent_commission_adjustments j
           WHERE j.agent_id = s.agent_id AND j.status = 'open'),
         s.created_at
    FROM public.agent_sales s
    JOIN public.agents a ON a.id = s.agent_id
    LEFT JOIN public.agent_sales ps ON ps.id = s.parent_sale_id
    LEFT JOIN public.jamaah_registrations reg ON reg.id = coalesce(s.registration_id, ps.registration_id)
    LEFT JOIN public.commission_payouts po ON po.id = s.payout_id
   WHERE s.status IN ('confirmed', 'paid')
   ORDER BY s.departure_date DESC NULLS LAST, a.name, s.created_at DESC
   LIMIT 2000;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_list_commission_adjustments()
RETURNS TABLE(id uuid, agent_id uuid, agent_name text, agent_code text, customer_name text, amount numeric,
              settled_amount numeric, remaining numeric, reason text, status text, created_at timestamptz)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.commission_is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Tidak berwenang.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT j.id, j.agent_id, a.name, a.referral_code, s.customer_name, j.amount, j.settled_amount,
         j.amount - j.settled_amount, j.reason, j.status, j.created_at
    FROM public.agent_commission_adjustments j
    JOIN public.agents a ON a.id = j.agent_id
    LEFT JOIN public.agent_sales s ON s.id = j.sale_id
   ORDER BY (j.status = 'open') DESC, j.created_at DESC
   LIMIT 500;
END;
$function$;

REVOKE ALL ON FUNCTION public.list_my_commissions(), public.list_my_commission_adjustments(),
  public.admin_list_commissions(), public.admin_list_commission_adjustments() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_my_commissions(), public.list_my_commission_adjustments(),
  public.admin_list_commissions(), public.admin_list_commission_adjustments() TO authenticated;

-- ---------------------------------------------------------------------------------------------------------------
-- 8a. Approval. _as = 'manajemen' (superadmin) or 'finance' (role finance). A commission becomes APPROVED when BOTH
--     approvals exist and they come from two DIFFERENT users. Only ELIGIBLE commissions can be approved and the agent
--     needs a valid NIK. Returns {approved, skipped:[{sale_id, reason}]}; raises when nothing could be approved.
-- ---------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_commissions(_sale_ids uuid[], _as text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  s record;
  v_id uuid;
  v_reason text;
  v_approved integer := 0;
  v_skipped jsonb := '[]'::jsonb;
  v_first text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Tidak berwenang.' USING ERRCODE = '42501';
  END IF;
  IF _as IS NULL OR _as NOT IN ('manajemen', 'finance') THEN
    RAISE EXCEPTION 'Peran persetujuan tidak dikenal.' USING ERRCODE = '22023';
  END IF;
  IF _as = 'manajemen' AND NOT public.commission_is_management(_uid) THEN
    RAISE EXCEPTION 'Hanya manajemen (superadmin) yang bisa menyetujui sebagai manajemen.' USING ERRCODE = '42501';
  END IF;
  IF _as = 'finance' AND NOT public.commission_is_finance(_uid) THEN
    RAISE EXCEPTION 'Hanya pengguna dengan peran finance yang bisa menyetujui sebagai finance.' USING ERRCODE = '42501';
  END IF;
  IF _sale_ids IS NULL OR coalesce(array_length(_sale_ids, 1), 0) = 0 THEN
    RAISE EXCEPTION 'Pilih komisi yang akan disetujui.' USING ERRCODE = '22023';
  END IF;

  PERFORM public.commission_refresh(NULL);

  FOREACH v_id IN ARRAY _sale_ids LOOP
    SELECT x.*, a.ktp_number AS nik, a.status AS agent_status INTO s
      FROM public.agent_sales x JOIN public.agents a ON a.id = x.agent_id
     WHERE x.id = v_id FOR UPDATE OF x;
    v_reason := NULL;
    IF NOT FOUND THEN
      v_reason := 'Komisi tidak ditemukan.';
    ELSIF s.status <> 'confirmed' THEN
      v_reason := 'Komisi sudah dibatalkan atau dibayar.';
    ELSIF s.commission_state IN ('approved', 'paid') THEN
      v_reason := 'Komisi sudah disetujui.';
    ELSIF s.commission_state <> 'eligible' THEN
      v_reason := CASE s.hold_reason
        WHEN 'dispute' THEN 'Komisi ditahan: sengketa lead belum diputuskan.'
        WHEN 'suspended' THEN 'Komisi ditahan: agen tidak aktif.'
        ELSE 'Komisi belum layak: jamaah belum berangkat.' END;
    ELSIF NOT public.commission_nik_ok(s.nik) THEN
      v_reason := 'NIK agen belum lengkap.';
    ELSIF _as = 'manajemen' AND s.approved_mgmt_by IS NOT NULL THEN
      v_reason := 'Sudah disetujui manajemen.';
    ELSIF _as = 'finance' AND s.approved_fin_by IS NOT NULL THEN
      v_reason := 'Sudah disetujui finance.';
    ELSIF _as = 'manajemen' AND s.approved_fin_by = _uid THEN
      v_reason := 'Dua persetujuan harus dari dua pengguna berbeda. Kamu sudah menyetujui sebagai finance.';
    ELSIF _as = 'finance' AND s.approved_mgmt_by = _uid THEN
      v_reason := 'Dua persetujuan harus dari dua pengguna berbeda. Kamu sudah menyetujui sebagai manajemen.';
    END IF;

    IF v_reason IS NOT NULL THEN
      v_skipped := v_skipped || jsonb_build_object('sale_id', v_id, 'reason', v_reason);
      CONTINUE;
    END IF;

    IF _as = 'manajemen' THEN
      UPDATE public.agent_sales SET approved_mgmt_by = _uid, approved_mgmt_at = now() WHERE id = v_id;
    ELSE
      UPDATE public.agent_sales SET approved_fin_by = _uid, approved_fin_at = now() WHERE id = v_id;
    END IF;
    UPDATE public.agent_sales
       SET commission_state = 'approved', approved_at = now()
     WHERE id = v_id AND approved_mgmt_by IS NOT NULL AND approved_fin_by IS NOT NULL;
    v_approved := v_approved + 1;
  END LOOP;

  IF v_approved = 0 AND jsonb_array_length(v_skipped) > 0 THEN
    v_first := v_skipped -> 0 ->> 'reason';
    RAISE EXCEPTION '%', v_first USING ERRCODE = 'P0001';
  END IF;
  RETURN jsonb_build_object('approved', v_approved, 'skipped', v_skipped);
END;
$function$;

-- ---------------------------------------------------------------------------------------------------------------
-- 8b. Payout, ONE agent per call (one transfer per agent per batch; the same _batch_id groups the calls of a batch).
--     Needs APPROVED rows of that agent, NIK, an active agent, a transfer reference + date and a proof file in the
--     commission-proofs bucket under "<agent_id>/". 5% PPh is withheld from the gross; open clawbacks of the agent are
--     netted (oldest first) against what is left. Staff: admin / superadmin / finance.
-- ---------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_agent_commissions_paid(
  _agent_id uuid, _sale_ids uuid[], _transfer_date date, _reference text, _proof_path text, _batch_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  a public.agents%ROWTYPE;
  s record;
  j record;
  v_ref text := nullif(btrim(coalesce(_reference, '')), '');
  v_proof text := nullif(btrim(coalesce(_proof_path, '')), '');
  v_gross numeric := 0;
  v_tax numeric := 0;
  v_net numeric := 0;
  v_left numeric;
  v_take numeric;
  v_claw numeric := 0;
  v_count integer := 0;
  v_payout public.commission_payouts%ROWTYPE;
  v_pid uuid := gen_random_uuid();
BEGIN
  IF _uid IS NULL OR NOT (public.has_role(_uid, 'admin'::public.app_role) OR public.commission_is_finance(_uid)) THEN
    RAISE EXCEPTION 'Tidak berwenang.' USING ERRCODE = '42501';
  END IF;
  IF _sale_ids IS NULL OR coalesce(array_length(_sale_ids, 1), 0) = 0 THEN
    RAISE EXCEPTION 'Pilih komisi yang akan dibayar.' USING ERRCODE = '22023';
  END IF;
  IF _transfer_date IS NULL OR _transfer_date > public.commission_today() THEN
    RAISE EXCEPTION 'Tanggal transfer tidak valid.' USING ERRCODE = '22023';
  END IF;
  IF v_ref IS NULL THEN
    RAISE EXCEPTION 'Nomor referensi transfer wajib diisi.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO a FROM public.agents WHERE id = _agent_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agen tidak ditemukan.' USING ERRCODE = 'P0001';
  END IF;
  IF NOT public.commission_nik_ok(a.ktp_number) THEN
    RAISE EXCEPTION 'NIK agen belum lengkap.' USING ERRCODE = 'P0001';
  END IF;
  IF a.status <> 'active' THEN
    RAISE EXCEPTION 'Agen tidak aktif, komisi tidak bisa dibayar.' USING ERRCODE = 'P0001';
  END IF;

  -- Lock and check every sale first.
  FOR s IN SELECT * FROM public.agent_sales WHERE id = ANY (_sale_ids) ORDER BY id FOR UPDATE LOOP
    IF s.agent_id <> _agent_id THEN
      RAISE EXCEPTION 'Satu komisi bukan milik agen ini.' USING ERRCODE = 'P0001';
    END IF;
    IF s.status <> 'confirmed' OR s.commission_state <> 'approved' THEN
      RAISE EXCEPTION 'Hanya komisi berstatus Disetujui yang bisa dibayar (%).', s.customer_name USING ERRCODE = 'P0001';
    END IF;
    v_count := v_count + 1;
    v_gross := v_gross + s.commission_amount;
    v_net := v_net + public.commission_net(s.commission_amount);
  END LOOP;
  IF v_count <> (SELECT count(DISTINCT x) FROM unnest(_sale_ids) AS x) THEN
    RAISE EXCEPTION 'Ada komisi yang tidak ditemukan.' USING ERRCODE = 'P0001';
  END IF;
  v_tax := v_gross - v_net;

  -- Clawbacks (refund after an earlier payout) are netted against this payout, oldest first. First only the amount...
  v_left := v_net;
  FOR j IN SELECT * FROM public.agent_commission_adjustments
            WHERE agent_id = _agent_id AND status = 'open' ORDER BY created_at, id FOR UPDATE LOOP
    EXIT WHEN v_left <= 0;
    v_take := least(j.amount - j.settled_amount, v_left);
    v_left := v_left - v_take;
    v_claw := v_claw + v_take;
  END LOOP;

  IF v_net - v_claw > 0 THEN
    IF v_proof IS NULL THEN
      RAISE EXCEPTION 'Bukti transfer wajib diunggah.' USING ERRCODE = '22023';
    END IF;
    IF v_proof NOT LIKE _agent_id::text || '/%' THEN
      RAISE EXCEPTION 'Bukti transfer harus disimpan di folder agen ini.' USING ERRCODE = '22023';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'commission-proofs' AND name = v_proof) THEN
      RAISE EXCEPTION 'Berkas bukti transfer belum ditemukan, unggah ulang.' USING ERRCODE = '22023';
    END IF;
  END IF;

  INSERT INTO public.commission_payouts
    (id, agent_id, batch_id, gross_amount, tax_amount, clawback_amount, net_amount, transfer_date, transfer_reference,
     proof_path, bank_name, bank_account, account_name, paid_by)
  VALUES
    (v_pid, _agent_id, _batch_id, v_gross, v_tax, v_claw, v_net - v_claw, _transfer_date, v_ref,
     v_proof, a.bank_name, a.bank_account, a.account_name, _uid)
  RETURNING * INTO v_payout;

  -- ...then settle the adjustments (they point at the payout row, so this comes after the insert).
  v_left := v_net;
  FOR j IN SELECT * FROM public.agent_commission_adjustments
            WHERE agent_id = _agent_id AND status = 'open' ORDER BY created_at, id LOOP
    EXIT WHEN v_left <= 0;
    v_take := least(j.amount - j.settled_amount, v_left);
    UPDATE public.agent_commission_adjustments
       SET settled_amount = settled_amount + v_take,
           status = CASE WHEN settled_amount + v_take >= amount THEN 'settled' ELSE 'open' END,
           settled_at = CASE WHEN settled_amount + v_take >= amount THEN now() ELSE settled_at END,
           settled_payout_id = v_pid
     WHERE id = j.id;
    v_left := v_left - v_take;
  END LOOP;

  UPDATE public.agent_sales x
     SET status = 'paid', commission_state = 'paid', hold_reason = NULL, paid_at = now(), paid_by = _uid,
         net_amount = public.commission_net(x.commission_amount),
         tax_amount = x.commission_amount - public.commission_net(x.commission_amount),
         payout_id = v_pid
   WHERE x.id = ANY (_sale_ids);

  -- "Recorded and not yet paid out" goes down by the gross of the paid sales.
  UPDATE public.agents SET available_balance = available_balance - v_gross WHERE id = _agent_id;

  RETURN to_jsonb(v_payout);
END;
$function$;

REVOKE ALL ON FUNCTION public.approve_commissions(uuid[], text),
  public.mark_agent_commissions_paid(uuid, uuid[], date, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_commissions(uuid[], text),
  public.mark_agent_commissions_paid(uuid, uuid[], date, text, text, uuid) TO authenticated;

-- ---------------------------------------------------------------------------------------------------------------
-- 9. The agent no longer withdraws. Drop the agent insert path; agent_withdrawals and its rows stay as history, the
--    agent can still read their own old rows, staff keep their policies. guard_agent_withdrawal, the notify trigger and
--    process_agent_withdrawal stay in the database, unused.
-- ---------------------------------------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Agents can request withdrawals" ON public.agent_withdrawals;

-- ---------------------------------------------------------------------------------------------------------------
-- 10. RLS for the new tables (reads only; every write goes through the functions above)
-- ---------------------------------------------------------------------------------------------------------------
ALTER TABLE public.lead_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_commission_adjustments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lead_disputes, public.commission_payouts, public.agent_commission_adjustments FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.lead_disputes, public.commission_payouts, public.agent_commission_adjustments TO authenticated;

DROP POLICY IF EXISTS "Staff read lead disputes" ON public.lead_disputes;
CREATE POLICY "Staff read lead disputes" ON public.lead_disputes FOR SELECT TO authenticated
  USING (public.commission_is_staff(auth.uid()) OR public.has_role(auth.uid(), 'cs_admin'::public.app_role));

DROP POLICY IF EXISTS "Staff read commission payouts" ON public.commission_payouts;
CREATE POLICY "Staff read commission payouts" ON public.commission_payouts FOR SELECT TO authenticated
  USING (public.commission_is_staff(auth.uid()));
DROP POLICY IF EXISTS "Agents read own commission payouts" ON public.commission_payouts;
CREATE POLICY "Agents read own commission payouts" ON public.commission_payouts FOR SELECT TO authenticated
  USING (agent_id IN (SELECT a.id FROM public.agents a WHERE a.user_id = auth.uid()));

DROP POLICY IF EXISTS "Staff read commission adjustments" ON public.agent_commission_adjustments;
CREATE POLICY "Staff read commission adjustments" ON public.agent_commission_adjustments FOR SELECT TO authenticated
  USING (public.commission_is_staff(auth.uid()));
DROP POLICY IF EXISTS "Agents read own commission adjustments" ON public.agent_commission_adjustments;
CREATE POLICY "Agents read own commission adjustments" ON public.agent_commission_adjustments FOR SELECT TO authenticated
  USING (agent_id IN (SELECT a.id FROM public.agents a WHERE a.user_id = auth.uid()));

-- Finance (read only): the payment and jamaah pages their menu shows, and the commission notifications.
-- Verifying a payment stays with the owner (jamaah_payments_guard).
DROP POLICY IF EXISTS "Finance read registrations" ON public.jamaah_registrations;
CREATE POLICY "Finance read registrations" ON public.jamaah_registrations FOR SELECT TO authenticated
  USING (public.commission_is_finance(auth.uid()));
DROP POLICY IF EXISTS "Finance read payments" ON public.jamaah_payments;
CREATE POLICY "Finance read payments" ON public.jamaah_payments FOR SELECT TO authenticated
  USING (public.commission_is_finance(auth.uid()));
DROP POLICY IF EXISTS "Finance read jamaah groups" ON public.jamaah_groups;
CREATE POLICY "Finance read jamaah groups" ON public.jamaah_groups FOR SELECT TO authenticated
  USING (public.commission_is_finance(auth.uid()));
DROP POLICY IF EXISTS "Finance read commission notifications" ON public.admin_notifications;
CREATE POLICY "Finance read commission notifications" ON public.admin_notifications FOR SELECT TO authenticated
  USING (public.commission_is_finance(auth.uid()) AND type LIKE 'commission%');
DROP POLICY IF EXISTS "Finance update commission notifications" ON public.admin_notifications;
CREATE POLICY "Finance update commission notifications" ON public.admin_notifications FOR UPDATE TO authenticated
  USING (public.commission_is_finance(auth.uid()) AND type LIKE 'commission%')
  WITH CHECK (public.commission_is_finance(auth.uid()) AND type LIKE 'commission%');

-- Trigger functions and the pure helper: not callable through the API by anon / PUBLIC.
REVOKE ALL ON FUNCTION public.guard_agent_sales_lifecycle(), public.guard_registration_commission_split(), public.agent_sales_born_counted(),
  public.agents_commission_refresh(), public.capture_lead_dispute() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.commission_net(numeric) FROM PUBLIC, anon;
