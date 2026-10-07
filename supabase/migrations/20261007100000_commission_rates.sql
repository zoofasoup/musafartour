-- Per-departure, per-tier, per-level agent commission (signed letters 035/036/037/MSFR/IX/2026). Idempotent.
--
-- Commission = f(package/departure, tier (class), agent level). Levels: duta, silver, gold, platinum.
-- The letters only cover silver, gold and platinum; Duta has no amount yet (the owner fills it in later), so a
-- configured package pays a Duta agent 0 until a 'duta' row exists.
--
-- 1. agent_commission_rates   : the table (staff read only, writes only through set/clear_commission_rate)
-- 2. set/clear_commission_rate, admin_list_commission_rates, get_my_commission_rates : the RPCs the UI uses
-- 3. registration_commission_tier, agent_commission_for : internal (postgres / service_role only)
-- 4. sync_registration_commission, list_my_agent_jamaah : redefined from the LIVE definitions, now rate based
-- 5. Seed from the letters (exactly-one-match joins; unmatched lines are skipped, never guessed)
--
-- A registration does not store a tier: jamaah_registrations has only room_type (quad/triple/double/infant/non_bed,
-- the occupancy) and list_price. The tier (class) is a property of the package: every package carries its own tier key(s)
-- in packages.available_tiers (hemat, nyaman, pelataran-hemat, five-star), and today every package has exactly one.
-- registration_commission_tier() resolves it.

-- ---------------------------------------------------------------------------------------------------------------
-- 1. Table
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_commission_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  tier text NOT NULL,
  level text NOT NULL CHECK (level IN ('duta', 'silver', 'gold', 'platinum')),
  amount numeric(12,0) NOT NULL CHECK (amount >= 0),
  note text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  UNIQUE (package_id, tier, level)
);

ALTER TABLE public.agent_commission_rates ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.agent_commission_rates FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.agent_commission_rates TO authenticated;

DROP POLICY IF EXISTS "Staff read commission rates" ON public.agent_commission_rates;
CREATE POLICY "Staff read commission rates" ON public.agent_commission_rates
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'agent_admin'::public.app_role)
      OR public.has_role(auth.uid(), 'cs_admin'::public.app_role));

-- ---------------------------------------------------------------------------------------------------------------
-- 2a. set_commission_rate / clear_commission_rate (admin or agent_admin only)
-- ---------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_commission_rate(
  _package_id uuid, _tier text, _level text, _amount numeric, _note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _row public.agent_commission_rates%ROWTYPE;
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
  IF _level IS NULL OR _level NOT IN ('duta', 'silver', 'gold', 'platinum') THEN
    RAISE EXCEPTION 'Level agen tidak valid.' USING ERRCODE = '22023';
  END IF;
  IF _amount IS NULL OR _amount < 0 THEN
    RAISE EXCEPTION 'Nominal komisi tidak boleh negatif.' USING ERRCODE = '22023';
  END IF;
  IF _amount <> trunc(_amount) THEN
    RAISE EXCEPTION 'Nominal komisi harus bilangan bulat (rupiah).' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.agent_commission_rates (package_id, tier, level, amount, note, updated_at, updated_by)
  VALUES (_package_id, btrim(_tier), _level, _amount, nullif(btrim(coalesce(_note, '')), ''), now(), _uid)
  ON CONFLICT (package_id, tier, level) DO UPDATE
    SET amount = EXCLUDED.amount,
        note = EXCLUDED.note,
        updated_at = now(),
        updated_by = _uid
  RETURNING * INTO _row;

  RETURN jsonb_build_object('id', _row.id, 'package_id', _row.package_id, 'tier', _row.tier, 'level', _row.level,
                            'amount', _row.amount, 'note', _row.note, 'updated_at', _row.updated_at);
END;
$function$;

REVOKE ALL ON FUNCTION public.set_commission_rate(uuid, text, text, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_commission_rate(uuid, text, text, numeric, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.clear_commission_rate(_package_id uuid, _tier text, _level text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _n integer;
BEGIN
  IF _uid IS NULL OR NOT (public.has_role(_uid, 'admin'::public.app_role)
                          OR public.has_role(_uid, 'agent_admin'::public.app_role)) THEN
    RAISE EXCEPTION 'Tidak berwenang.' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.agent_commission_rates
   WHERE package_id = _package_id AND tier = btrim(coalesce(_tier, '')) AND level = _level;
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN jsonb_build_object('deleted', _n);
END;
$function$;

REVOKE ALL ON FUNCTION public.clear_commission_rate(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clear_commission_rate(uuid, text, text) TO authenticated;

-- ---------------------------------------------------------------------------------------------------------------
-- 2b. admin_list_commission_rates: the grid the admin edits. One row per (package, tier in available_tiers, level),
--     amount NULL when no rate is set. Published and draft packages departing from 30 days ago onwards.
-- ---------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_commission_rates()
RETURNS TABLE(package_id uuid, package_name text, departure_date date, flight text, status text,
              tier text, level text, amount numeric, note text, updated_at timestamptz)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL OR NOT (public.has_role(_uid, 'admin'::public.app_role)
                          OR public.has_role(_uid, 'agent_admin'::public.app_role)
                          OR public.has_role(_uid, 'cs_admin'::public.app_role)) THEN
    RAISE EXCEPTION 'Tidak berwenang.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT p.id, p.package_name, p.departure_date::date, p.flight, p.status,
         t.tier, l.level, r.amount, r.note, r.updated_at
    FROM public.packages p
    CROSS JOIN LATERAL unnest(coalesce(p.available_tiers, ARRAY[]::text[])) AS t(tier)
    CROSS JOIN (VALUES ('duta', 1), ('silver', 2), ('gold', 3), ('platinum', 4)) AS l(level, ord)
    LEFT JOIN public.agent_commission_rates r
           ON r.package_id = p.id AND r.tier = t.tier AND r.level = l.level
   WHERE p.status IN ('published', 'draft')
     AND p.departure_date >= current_date - 30
   ORDER BY p.departure_date, p.package_name, p.id, t.tier, l.ord;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_list_commission_rates() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_commission_rates() TO authenticated;

-- ---------------------------------------------------------------------------------------------------------------
-- 2c. get_my_commission_rates: what the caller earns per package and tier, at the caller's OWN level only.
--     Active or pending agents; published packages only (agents never see drafts); nothing about other levels.
-- ---------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_commission_rates()
RETURNS TABLE(package_id uuid, tier text, amount numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Tidak berwenang.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT r.package_id, r.tier, r.amount
    FROM public.agents a
    JOIN public.agent_commission_rates r ON r.level = a.level
    JOIN public.packages p ON p.id = r.package_id AND p.status = 'published'
   WHERE a.user_id = _uid
     AND a.status IN ('active', 'pending')
   ORDER BY p.departure_date, r.tier;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_my_commission_rates() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_commission_rates() TO authenticated;

-- ---------------------------------------------------------------------------------------------------------------
-- 3a. registration_commission_tier: the tier (class) a registration belongs to. INTERNAL (postgres / service_role).
--     A package with one tier (all of them today): that tier. A package with several tiers: the one whose price for the
--     registration's room_type equals its list_price, when exactly one does; otherwise NULL (never a guess).
-- ---------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.registration_commission_tier(_package_id uuid, _room_type text, _list_price numeric)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  p record;
  _tiers text[];
  _hits text[] := ARRAY[]::text[];
  t text;
  _price numeric;
BEGIN
  SELECT available_tiers, package_price, hemat_package_price, pelataran_package_price, five_star_package_price
    INTO p FROM public.packages WHERE id = _package_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  _tiers := coalesce(p.available_tiers, ARRAY[]::text[]);
  IF coalesce(array_length(_tiers, 1), 0) = 0 THEN RETURN NULL; END IF;
  IF array_length(_tiers, 1) = 1 THEN RETURN _tiers[1]; END IF;

  FOREACH t IN ARRAY _tiers LOOP
    _price := CASE t
      WHEN 'five-star' THEN (p.five_star_package_price ->> _room_type)::numeric
      WHEN 'hemat' THEN (p.hemat_package_price ->> _room_type)::numeric
      WHEN 'pelataran-hemat' THEN (p.pelataran_package_price ->> _room_type)::numeric
      ELSE (p.package_price ->> _room_type)::numeric
    END;
    IF _price IS NOT NULL AND _price > 0 AND _price = _list_price THEN _hits := _hits || t; END IF;
  END LOOP;
  IF array_length(_hits, 1) = 1 THEN RETURN _hits[1]; END IF;
  RETURN NULL;
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
  RETURN NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public.registration_commission_tier(uuid, text, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registration_commission_tier(uuid, text, numeric) TO service_role;

-- ---------------------------------------------------------------------------------------------------------------
-- 3b. agent_commission_for: the commission an agent earns for one jamaah of (package, tier). INTERNAL.
--     * The package has NO rows in agent_commission_rates at all  -> packages.agent_commission_amount (flat Rp 1.500.000),
--       so a package nobody has configured keeps working as before.
--     * The package has rows -> the amount for (package, tier, the agent's level), and 0 when that level has no row
--       (for example duta, which the letters do not cover), or when the tier is unknown (NULL).
--     The level used is the agent's CURRENT level at the moment the commission is credited (when the jamaah turns lunas),
--     not the level at registration time. Once credited, the sale keeps its amount; only a reversal and re-credit recomputes.
-- ---------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.agent_commission_for(_package_id uuid, _tier text, _agent_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _level text;
  _amount numeric;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.agent_commission_rates WHERE package_id = _package_id) THEN
    SELECT coalesce(agent_commission_amount, 0) INTO _amount FROM public.packages WHERE id = _package_id;
    RETURN coalesce(_amount, 0);
  END IF;

  SELECT level INTO _level FROM public.agents WHERE id = _agent_id;
  IF _level IS NULL OR _tier IS NULL THEN RETURN 0; END IF;

  SELECT amount INTO _amount FROM public.agent_commission_rates
   WHERE package_id = _package_id AND tier = _tier AND level = _level;
  RETURN coalesce(_amount, 0);
END;
$function$;

REVOKE ALL ON FUNCTION public.agent_commission_for(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.agent_commission_for(uuid, text, uuid) TO service_role;

-- ---------------------------------------------------------------------------------------------------------------
-- 4a. sync_registration_commission: LIVE definition + the amount from agent_commission_for().
--     Everything else is unchanged (lunas check, commission_skipped, paid sales untouched, reversal on refund / cancel /
--     reject / agent change, credit on lunas). Extra rule: a sale that is already credited to the same agent keeps the
--     amount it was credited with, so a later level change or rate edit never reverses or re-prices it by itself.
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
  v_paid numeric;
  v_due numeric;
  v_amount numeric := 0;
  v_should boolean;
  v_has_sale boolean;
BEGIN
  SELECT reg.*, p.package_name, p.departure_date
    INTO r
    FROM public.jamaah_registrations reg
    JOIN public.packages p ON p.id = reg.package_id
   WHERE reg.id = _registration_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT coalesce(sum(amount), 0) INTO v_paid
    FROM public.jamaah_payments WHERE registration_id = _registration_id AND status = 'verified';
  v_due := r.list_price - r.discount;

  SELECT * INTO s FROM public.agent_sales WHERE registration_id = _registration_id;
  v_has_sale := FOUND;

  IF r.agent_id IS NOT NULL THEN
    IF v_has_sale AND s.status = 'confirmed' AND s.agent_id = r.agent_id THEN
      v_amount := s.commission_amount;   -- already credited: keep what was credited
    ELSE
      v_amount := public.agent_commission_for(
        r.package_id, public.registration_commission_tier(r.package_id, r.room_type, r.list_price), r.agent_id);
    END IF;
  END IF;

  v_should := r.status = 'active' AND r.agent_id IS NOT NULL AND v_due > 0
              AND v_paid >= v_due AND coalesce(v_amount, 0) > 0
              AND NOT r.commission_skipped;

  -- Already paid out to the agent: never touch it automatically (clawback is a manual decision).
  IF v_has_sale AND s.status = 'paid' THEN RETURN; END IF;

  -- Reverse a credited commission that no longer applies, or that moves to another agent.
  IF v_has_sale AND s.status = 'confirmed' AND (NOT v_should OR s.agent_id IS DISTINCT FROM r.agent_id) THEN
    UPDATE public.agents
       SET total_sales = greatest(total_sales - 1, 0),
           total_commission = total_commission - s.commission_amount,
           available_balance = available_balance - s.commission_amount
     WHERE id = s.agent_id;
    UPDATE public.agent_sales SET status = 'cancelled' WHERE id = s.id;
    s.status := 'cancelled';
  END IF;

  IF v_should AND (NOT v_has_sale OR s.status <> 'confirmed') THEN
    INSERT INTO public.agent_sales
      (agent_id, customer_name, customer_phone, package_id, package_name, sale_amount,
       commission_amount, status, departure_date, notes, source, registration_id)
    VALUES
      (r.agent_id, r.full_name, coalesce(r.phone, '-'), r.package_id, r.package_name, v_due,
       v_amount, 'confirmed', r.departure_date::date, 'Lunas (pendaftaran offline)',
       'registration', r.id)
    ON CONFLICT (registration_id) WHERE registration_id IS NOT NULL DO UPDATE
      SET agent_id = EXCLUDED.agent_id,
          customer_name = EXCLUDED.customer_name,
          sale_amount = EXCLUDED.sale_amount,
          commission_amount = EXCLUDED.commission_amount,
          status = 'confirmed';
    UPDATE public.agents
       SET total_sales = total_sales + 1,
           total_commission = total_commission + v_amount,
           available_balance = available_balance + v_amount
     WHERE id = r.agent_id;
  END IF;
END;
$function$;

-- ---------------------------------------------------------------------------------------------------------------
-- 4b. list_my_agent_jamaah: LIVE definition; commission_amount / commission_status now follow the same rule as
--     sync_registration_commission: the credited amount once earned, else what agent_commission_for() says right now.
--     (The rates were still read from packages.agent_commission_amount here.) Columns and ordering are unchanged.
-- ---------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_my_agent_jamaah()
RETURNS TABLE(registration_id uuid, full_name text, phone text, package_name text, departure_date date, room_type text,
              status text, agreed_price numeric, paid_verified numeric, paid_pending numeric, outstanding numeric,
              due_date date, pay_state text, commission_amount numeric, commission_status text,
              created_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    r.id,
    r.full_name,
    r.phone,
    pk.package_name,
    pk.departure_date::date,
    r.room_type,
    r.status,
    b.agreed_price,
    b.paid_verified,
    b.paid_pending,
    b.outstanding,
    b.due_date,
    CASE
      WHEN r.status = 'cancelled' THEN 'batal'
      WHEN b.outstanding < 0 THEN 'lebih'
      WHEN b.outstanding = 0 AND b.agreed_price > 0 THEN 'lunas'
      WHEN b.paid_verified >= least(5000000, b.agreed_price) THEN 'dp'
      ELSE 'belum_dp'
    END,
    CASE
      WHEN r.commission_skipped OR r.status = 'cancelled' THEN 0
      WHEN s.status IN ('confirmed', 'paid') THEN s.commission_amount
      ELSE c.amt
    END,
    CASE
      WHEN s.status IN ('confirmed', 'paid') THEN 'earned'
      WHEN r.status = 'active' AND NOT r.commission_skipped AND coalesce(c.amt, 0) > 0 THEN 'waiting'
      ELSE 'none'
    END,
    r.created_at
  FROM public.jamaah_registrations r
  JOIN public.packages pk ON pk.id = r.package_id
  JOIN public.jamaah_registration_balances b ON b.registration_id = r.id
  LEFT JOIN public.agent_sales s ON s.registration_id = r.id
  CROSS JOIN LATERAL (
    SELECT public.agent_commission_for(
      r.package_id, public.registration_commission_tier(r.package_id, r.room_type, r.list_price), r.agent_id) AS amt
  ) c
  WHERE r.agent_id IN (SELECT a.id FROM public.agents a WHERE a.user_id = auth.uid())
  ORDER BY r.created_at DESC
  LIMIT 500
$function$;

-- ---------------------------------------------------------------------------------------------------------------
-- 5. Seed: the letter rates (035/036/037/MSFR/IX/2026), Silver / Gold / Platinum.
--    A letter line is inserted only when exactly ONE package matches its departure date, airline and tier key
--    (Pelataran = pelataran-hemat, Nyaman = nyaman, Hemat = hemat, Five-Star = five-star). Anything else is skipped and
--    reported with RAISE NOTICE, never guessed. SOLD OUT lines (4 Nov Pelataran SV, 25 Nov By Jodan GA) are not listed.
--    ON CONFLICT DO NOTHING: re-running never overwrites a rate an admin has edited.
-- ---------------------------------------------------------------------------------------------------------------
DO $seed$
DECLARE
  l record;
  _pkgs uuid[];
  _tier text;
  _flight text;
  _inserted integer := 0;
  _skipped integer := 0;
BEGIN
  FOR l IN
    SELECT * FROM (VALUES
      (DATE '2026-11-05', 'Pelataran', 'Qatar', 1500000, 2000000, 2500000),
      (DATE '2026-11-05', 'Nyaman',    'Qatar', 1500000, 2000000, 2500000),
      (DATE '2026-11-16', 'Nyaman',    'Oman',  1500000, 2000000, 2500000),
      (DATE '2026-11-26', 'Pelataran', 'SV',    1500000, 2000000, 2500000),
      (DATE '2026-11-26', 'Nyaman',    'SV',    1500000, 2000000, 2500000),
      (DATE '2026-11-26', 'Hemat',     'SV',    1500000, 2000000, 2500000),
      (DATE '2026-12-28', 'Nyaman',    'Oman',  1500000, 2000000, 2500000),
      (DATE '2027-01-04', 'Nyaman',    'SV',    1500000, 2500000, 3500000),
      (DATE '2027-01-06', 'Pelataran', 'SV',    1500000, 3000000, 3500000),
      (DATE '2027-01-06', 'Hemat',     'Oman',  1000000, 1000000, 1000000),
      (DATE '2027-01-10', 'Hemat',     'Oman',  1000000, 1000000, 1000000),
      (DATE '2027-01-14', 'Five-Star', 'SV',    1500000, 3000000, 3500000),
      (DATE '2027-01-22', 'Hemat',     'SV',    1500000, 3000000, 3500000),
      (DATE '2027-01-23', 'Five-Star', 'SV',    1500000, 2000000, 2500000),
      (DATE '2027-01-23', 'Nyaman',    'SV',    1500000, 2000000, 2500000),
      (DATE '2027-02-04', 'Nyaman',    'SV',    1500000, 2000000, 2500000),
      (DATE '2027-02-09', 'Hemat',     'SV',    1500000, 3000000, 3500000),
      (DATE '2027-03-15', 'Nyaman',    'SV',    1500000, 2000000, 2500000),
      (DATE '2027-03-18', 'Nyaman',    'SV',    1500000, 2000000, 2500000),
      (DATE '2027-03-18', 'Pelataran', 'SV',    1500000, 2000000, 2500000)
    ) AS v(dep, class, airline, silver, gold, platinum)
  LOOP
    _tier := CASE l.class WHEN 'Pelataran' THEN 'pelataran-hemat' WHEN 'Nyaman' THEN 'nyaman'
                          WHEN 'Hemat' THEN 'hemat' WHEN 'Five-Star' THEN 'five-star' END;
    _flight := CASE l.airline WHEN 'SV' THEN 'Saudia' WHEN 'Qatar' THEN 'Qatar' WHEN 'Oman' THEN 'Oman' WHEN 'GA' THEN 'Garuda' END;

    SELECT array_agg(p.id) INTO _pkgs
      FROM public.packages p
     WHERE p.departure_date = l.dep AND lower(p.flight) = lower(_flight) AND _tier = ANY (p.available_tiers);

    IF coalesce(array_length(_pkgs, 1), 0) <> 1 THEN
      _skipped := _skipped + 1;
      RAISE NOTICE 'commission seed SKIPPED: % % % (tier %): % matching packages', l.dep, l.class, l.airline, _tier,
        coalesce(array_length(_pkgs, 1), 0);
      CONTINUE;
    END IF;

    INSERT INTO public.agent_commission_rates (package_id, tier, level, amount, note)
    SELECT _pkgs[1], _tier, x.level, x.amount, 'Surat 035/036/037/MSFR/IX/2026'
      FROM (VALUES ('silver', l.silver), ('gold', l.gold), ('platinum', l.platinum)) AS x(level, amount)
    ON CONFLICT (package_id, tier, level) DO NOTHING;
    _inserted := _inserted + 1;
  END LOOP;
  RAISE NOTICE 'commission seed: % letter lines inserted, % skipped', _inserted, _skipped;
END
$seed$;
