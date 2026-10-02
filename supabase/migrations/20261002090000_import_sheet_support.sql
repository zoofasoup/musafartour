-- Support for moving the whole 1448H Google Sheet into Data Jamaah:
--   1. Two more room types seen in the sheet: non bed and infant.
--   2. commission_skipped: jamaah who were already lunas when imported must not credit the agent again.
--   3. import_jamaah_rows: one all-or-nothing call that adds the jamaah and their opening balances.

-- 1. Room types ------------------------------------------------------------

DO $$
DECLARE c text;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
     WHERE conrelid = 'public.jamaah_registrations'::regclass
       AND contype = 'c'
       AND pg_get_constraintdef(oid) ILIKE '%room_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.jamaah_registrations DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

ALTER TABLE public.jamaah_registrations
  ADD CONSTRAINT jamaah_registrations_room_type_check
  CHECK (room_type IN ('quad', 'triple', 'double', 'non_bed', 'infant'));

-- 2. Commission already settled before the website ----------------------------

ALTER TABLE public.jamaah_registrations
  ADD COLUMN IF NOT EXISTS commission_skipped boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.jamaah_registrations.commission_skipped IS
  'True for jamaah imported from the old sheet when already lunas: their agent commission was handled outside the website, so it is not credited automatically.';

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
              AND v_paid >= v_due AND coalesce(r.agent_commission_amount, 0) > 0
              AND NOT r.commission_skipped;

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

REVOKE ALL ON FUNCTION public.sync_registration_commission(uuid) FROM PUBLIC, anon, authenticated;

-- 3. All-or-nothing import --------------------------------------------------------
-- SECURITY INVOKER on purpose: row level security and the payment guard apply as for a hand-typed
-- entry. The guard keeps an owner's opening balance as verified and turns anyone else's into pending.
-- Names already registered on the package are skipped, so running it twice never duplicates.

CREATE OR REPLACE FUNCTION public.import_jamaah_rows(_package_id uuid, _rows jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  r jsonb;
  v_id uuid;
  v_count integer := 0;
  v_paid numeric;
  v_price numeric;
  v_existing text[];
  v_name text;
BEGIN
  IF _rows IS NULL OR jsonb_typeof(_rows) <> 'array' THEN
    RAISE EXCEPTION 'Data import harus berupa daftar baris';
  END IF;

  SELECT coalesce(array_agg(lower(btrim(full_name))), ARRAY[]::text[]) INTO v_existing
    FROM public.jamaah_registrations WHERE package_id = _package_id;

  FOR r IN SELECT * FROM jsonb_array_elements(_rows) LOOP
    v_name := btrim(r->>'full_name');
    CONTINUE WHEN v_name IS NULL OR v_name = '' OR lower(v_name) = ANY (v_existing);

    v_paid := coalesce((r->>'paid')::numeric, 0);
    v_price := coalesce((r->>'list_price')::numeric, 0);

    INSERT INTO public.jamaah_registrations
      (package_id, full_name, phone, room_type, list_price, discount, price_note, agent_id, referral_note,
       equipment_size, equipment_taken_at, domicile, start_city, notes, commission_skipped)
    VALUES
      (_package_id, v_name, nullif(r->>'phone', ''), r->>'room_type', v_price, 0, nullif(r->>'price_note', ''),
       nullif(r->>'agent_id', '')::uuid, nullif(r->>'referral_note', ''), nullif(r->>'equipment_size', ''),
       CASE WHEN coalesce((r->>'equipment_taken')::boolean, false) THEN now() END,
       nullif(r->>'domicile', ''), nullif(r->>'start_city', ''), 'Import dari Google Sheet',
       v_price > 0 AND v_paid >= v_price)
    RETURNING id INTO v_id;

    IF v_paid > 0 THEN
      INSERT INTO public.jamaah_payments (registration_id, amount, paid_on, bank_account, notes, status)
      VALUES (v_id, v_paid, current_date, 'SALDO_AWAL', 'Realisasi dari Google Sheet (saldo awal)', 'verified');
    END IF;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.import_jamaah_rows(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.import_jamaah_rows(uuid, jsonb) TO authenticated;
