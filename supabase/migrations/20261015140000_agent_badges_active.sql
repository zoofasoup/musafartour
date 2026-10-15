-- Agent badges that actually get awarded. Replaces the 12 generic January badges (nothing ever awarded them) with the SOP-based
-- catalog (names in English, requirement text in Indonesian) and awards them automatically from existing data. Idempotent.
--
-- Metrics come from data that already exists: agent_sales (counted = the same jamaah count as agents.total_sales and levels),
-- jamaah_registrations.group_id (one invoice), agent_leads, agents (profile, SOP, fee, bank, referred_by_id).

ALTER TABLE public.agent_badges ADD COLUMN IF NOT EXISTS code text;
ALTER TABLE public.agent_badges ADD COLUMN IF NOT EXISTS group_key text NOT NULL DEFAULT 'persiapan';
ALTER TABLE public.agent_badges ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
ALTER TABLE public.agent_badges ADD COLUMN IF NOT EXISTS manual boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS agent_badges_code_key ON public.agent_badges (code) WHERE code IS NOT NULL;

-- ---------------------------------------------------------------------------------------------------------------
-- 1. Catalog
-- ---------------------------------------------------------------------------------------------------------------
DELETE FROM public.agent_badges WHERE code IS NULL OR code IN ('hello-world', 'social-butterfly');

INSERT INTO public.agent_badges (code, name, description, icon, group_key, sort_order, manual, requirement_type, requirement_value, points_reward) VALUES
  ('paperwork-wizard',   'Paperwork Wizard',        'Data diri dan KTP terkirim',                     'paperwork-wizard',   'persiapan', 10, false, 'data_done', 1, 0),
  ('fine-print-reader',  'Fine Print Reader',       'SOP disetujui',                                  'fine-print-reader',  'persiapan', 20, false, 'sop_done', 1, 0),
  ('golden-ticket',      'Golden Ticket',           'Biaya registrasi beres',                         'golden-ticket',      'persiapan', 30, false, 'fee_done', 1, 0),
  ('wallet-ready',       'Wallet Ready',            'Rekening pencairan komisi terdaftar',            'wallet-ready',       'persiapan', 40, false, 'bank_set', 1, 0),
  ('day-one-closer',     'Day One Closer',          'Jamaah pertama',                                 'day-one-closer',     'penjualan', 10, false, 'sales_total', 1, 0),
  ('squad-goals',        'Squad Goals',             '5 jamaah',                                       'squad-goals',        'penjualan', 20, false, 'sales_total', 5, 0),
  ('full-house',         'Full House',              '10 jamaah',                                      'full-house',         'penjualan', 30, false, 'sales_total', 10, 0),
  ('tour-bus-tycoon',    'Tour Bus Tycoon',         '25 jamaah',                                      'tour-bus-tycoon',    'penjualan', 40, false, 'sales_total', 25, 0),
  ('gold-rush',          'Gold Rush',               'Level Gold: 15 jamaah dalam satu tahun',         'gold-rush',          'penjualan', 50, false, 'sales_year', 15, 0),
  ('sky-high',           'Sky High',                'Level Platinum: 30 jamaah dalam satu tahun',     'sky-high',           'penjualan', 60, false, 'sales_year', 30, 0),
  ('one-shot',           'One Shot',                '5 jamaah dalam satu invoice',                    'one-shot',           'penjualan', 70, false, 'invoice_size', 5, 0),
  ('clean-sweep',        'Clean Sweep',             '10 jamaah dalam satu invoice',                   'clean-sweep',        'penjualan', 80, false, 'invoice_size', 10, 0),
  ('convoy-king',        'Convoy King',             '40 jamaah dalam satu invoice',                   'convoy-king',        'penjualan', 90, false, 'invoice_size', 40, 0),
  ('warming-up',         'Warming Up',              '3 bulan berturut-turut ada jamaah',              'warming-up',         'konsistensi', 30, false, 'streak_months', 3, 0),
  ('on-fire',            'On Fire',                 '6 bulan berturut-turut ada jamaah',              'on-fire',            'konsistensi', 40, false, 'streak_months', 6, 0),
  ('never-miss-a-month', 'Never Miss a Month',      '12 bulan berturut-turut ada jamaah',             'never-miss-a-month', 'konsistensi', 50, false, 'streak_months', 12, 0),
  ('plus-one',           'Plus One',                'Ajak 1 agen baru dengan Agent ID kamu',          'plus-one',           'jaringan', 10, false, 'referred_total', 1, 0),
  ('crew-chief',         'Crew Chief',              'Ajak 3 agen baru',                               'crew-chief',         'jaringan', 20, false, 'referred_total', 3, 0),
  ('whole-village',      'Whole Village',           'Ajak 10 agen baru',                              'whole-village',      'jaringan', 30, false, 'referred_total', 10, 0),
  ('pay-it-forward',     'Pay It Forward',          'Agen yang kamu ajak sudah memberangkatkan jamaah', 'pay-it-forward',   'jaringan', 40, false, 'referral_departed', 1, 0),
  ('class-act',          'Class Act',               'Ikut pembinaan 6 kali dalam setahun (dicatat admin)', 'class-act',      'jaringan', 50, true,  'manual', 1, 0),
  ('top-of-the-board',   'Top of the Board',        'Masuk Top 10 agen tahunan (diberikan admin)',    'top-of-the-board',   'jaringan', 60, true,  'manual', 1, 0),
  ('rookie-of-the-year', 'Rookie of the Year',      'Best Rookie tahunan (diberikan admin)',          'rookie-of-the-year', 'jaringan', 70, true,  'manual', 1, 0)
ON CONFLICT (code) WHERE code IS NOT NULL DO UPDATE
  SET name = EXCLUDED.name, description = EXCLUDED.description, icon = EXCLUDED.icon, group_key = EXCLUDED.group_key,
      sort_order = EXCLUDED.sort_order, manual = EXCLUDED.manual, requirement_type = EXCLUDED.requirement_type,
      requirement_value = EXCLUDED.requirement_value;

-- ---------------------------------------------------------------------------------------------------------------
-- 2. Metrics of one agent
-- ---------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.agent_badge_metrics(_agent uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a public.agents%ROWTYPE;
  v_sales integer; v_year integer; v_inv integer; v_streak integer; v_leads integer; v_ref integer; v_refdep integer;
BEGIN
  SELECT * INTO a FROM public.agents WHERE id = _agent;
  IF NOT FOUND THEN RETURN '{}'::jsonb; END IF;

  SELECT count(*) INTO v_sales FROM public.agent_sales WHERE agent_id = _agent AND counted;

  SELECT coalesce(max(c), 0) INTO v_year FROM (
    SELECT count(*) AS c FROM public.agent_sales
     WHERE agent_id = _agent AND counted
     GROUP BY extract(year FROM (booking_date AT TIME ZONE 'Asia/Jakarta'))
  ) y;

  SELECT coalesce(max(c), 0) INTO v_inv FROM (
    SELECT count(*) AS c
      FROM public.agent_sales s
      LEFT JOIN public.jamaah_registrations r ON r.id = s.registration_id
     WHERE s.agent_id = _agent AND s.counted
     GROUP BY coalesce(r.group_id::text, s.registration_id::text, s.id::text)
  ) g;

  SELECT coalesce(max(n), 0) INTO v_streak FROM (
    SELECT count(*) AS n FROM (
      SELECT m, m - (row_number() OVER (ORDER BY m))::integer AS grp FROM (
        SELECT DISTINCT (extract(year FROM d) * 12 + extract(month FROM d))::integer AS m FROM (
          SELECT (booking_date AT TIME ZONE 'Asia/Jakarta')::date AS d
            FROM public.agent_sales WHERE agent_id = _agent AND counted
        ) x
      ) mm
    ) q GROUP BY grp
  ) r;

  SELECT count(*) INTO v_leads FROM public.agent_leads WHERE agent_id = _agent;
  SELECT count(*) INTO v_ref FROM public.agents WHERE referred_by_id = _agent;
  SELECT count(*) INTO v_refdep FROM public.agents x
   WHERE x.referred_by_id = _agent
     AND EXISTS (SELECT 1 FROM public.agent_sales s WHERE s.agent_id = x.id AND s.counted);

  RETURN jsonb_build_object(
    'data_done', CASE WHEN coalesce(a.ktp_number, '') <> '' AND coalesce(a.ktp_image_url, '') <> '' AND coalesce(a.address, '') <> '' THEN 1 ELSE 0 END,
    'sop_done', CASE WHEN a.sop_accepted_at IS NOT NULL THEN 1 ELSE 0 END,
    'fee_done', CASE WHEN a.registration_fee_status IN ('paid', 'waived') THEN 1 ELSE 0 END,
    'bank_set', CASE WHEN coalesce(a.bank_name, '') <> '' AND coalesce(a.bank_account, '') <> '' THEN 1 ELSE 0 END,
    'sales_total', v_sales, 'sales_year', v_year, 'invoice_size', v_inv, 'streak_months', v_streak,
    'leads_total', v_leads, 'referred_total', v_ref, 'referral_departed', v_refdep
  );
END;
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- 3. Award what is earned (never takes a badge away)
-- ---------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.evaluate_agent_badges(_agent uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m jsonb := public.agent_badge_metrics(_agent);
  n integer := 0;
BEGIN
  IF m = '{}'::jsonb THEN RETURN 0; END IF;
  INSERT INTO public.agent_earned_badges (agent_id, badge_id)
  SELECT _agent, b.id FROM public.agent_badges b
   WHERE b.code IS NOT NULL AND NOT b.manual
     AND coalesce((m ->> b.requirement_type)::integer, 0) >= b.requirement_value
  ON CONFLICT (agent_id, badge_id) DO NOTHING;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- 4. Triggers: evaluate when something relevant changes
-- ---------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.badges_on_agent_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.evaluate_agent_badges(NEW.id);
  IF NEW.referred_by_id IS NOT NULL THEN PERFORM public.evaluate_agent_badges(NEW.referred_by_id); END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.badges_on_agent_row()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.agent_id IS NOT NULL THEN PERFORM public.evaluate_agent_badges(NEW.agent_id); END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.badges_on_sale_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ref uuid;
BEGIN
  PERFORM public.evaluate_agent_badges(NEW.agent_id);
  SELECT referred_by_id INTO v_ref FROM public.agents WHERE id = NEW.agent_id;
  IF v_ref IS NOT NULL THEN PERFORM public.evaluate_agent_badges(v_ref); END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.agent_badge_metrics(uuid), public.evaluate_agent_badges(uuid),
  public.badges_on_agent_change(), public.badges_on_agent_row(), public.badges_on_sale_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS badges_agent_change ON public.agents;
CREATE TRIGGER badges_agent_change
  AFTER INSERT OR UPDATE OF ktp_number, ktp_image_url, address, sop_accepted_at, registration_fee_status, bank_name, bank_account, referred_by_id
  ON public.agents FOR EACH ROW EXECUTE FUNCTION public.badges_on_agent_change();

DROP TRIGGER IF EXISTS badges_lead_insert ON public.agent_leads;
CREATE TRIGGER badges_lead_insert
  AFTER INSERT ON public.agent_leads FOR EACH ROW EXECUTE FUNCTION public.badges_on_agent_row();

DROP TRIGGER IF EXISTS badges_sale_change ON public.agent_sales;
CREATE TRIGGER badges_sale_change
  AFTER INSERT OR UPDATE OF counted ON public.agent_sales FOR EACH ROW EXECUTE FUNCTION public.badges_on_sale_change();

-- ---------------------------------------------------------------------------------------------------------------
-- 5. The agent's own view: every badge with progress and the date earned
-- ---------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.my_badge_progress()
RETURNS TABLE(code text, name text, description text, group_key text, sort_order integer, manual boolean,
              target integer, current integer, earned_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent uuid;
  m jsonb;
BEGIN
  SELECT id INTO v_agent FROM public.agents WHERE user_id = auth.uid();
  IF v_agent IS NULL THEN RETURN; END IF;
  m := public.agent_badge_metrics(v_agent);
  RETURN QUERY
  SELECT b.code, b.name, b.description, b.group_key, b.sort_order, b.manual,
         b.requirement_value,
         CASE WHEN b.manual THEN 0 ELSE least(coalesce((m ->> b.requirement_type)::integer, 0), b.requirement_value) END,
         e.earned_at
    FROM public.agent_badges b
    LEFT JOIN public.agent_earned_badges e ON e.badge_id = b.id AND e.agent_id = v_agent
   WHERE b.code IS NOT NULL
   ORDER BY b.group_key, b.sort_order;
END;
$$;
REVOKE ALL ON FUNCTION public.my_badge_progress() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_badge_progress() TO authenticated;

-- Admin hands out the manual badges (Class Act, Top of the Board, Rookie of the Year).
CREATE OR REPLACE FUNCTION public.admin_award_badge(_agent uuid, _code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'agent_admin'::app_role)) THEN
    RAISE EXCEPTION 'Hanya admin yang bisa memberi badge.' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.agent_earned_badges (agent_id, badge_id)
  SELECT _agent, id FROM public.agent_badges WHERE code = _code AND manual
  ON CONFLICT (agent_id, badge_id) DO NOTHING;
  IF NOT FOUND AND NOT EXISTS (SELECT 1 FROM public.agent_badges WHERE code = _code AND manual) THEN
    RAISE EXCEPTION 'Badge manual tidak ditemukan.';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_award_badge(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_award_badge(uuid, text) TO authenticated;

-- ---------------------------------------------------------------------------------------------------------------
-- 6. Backfill: everyone who already qualifies gets the badge now
-- ---------------------------------------------------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.agents LOOP
    PERFORM public.evaluate_agent_badges(r.id);
  END LOOP;
END;
$$;
