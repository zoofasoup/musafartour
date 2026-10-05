-- Security hardening, found by probing the live database (2026-10-05).
--
-- 1. An agent could rewrite their own `agents` row in any column: status (self-approve), balance,
--    commission, level. And create a withdrawal with any amount or status.
-- 2. Any logged-in user could read every document in the `agent-documents` bucket (KTP photos) and
--    upload anywhere in it, through two leftover dashboard policies.
-- 3. Anonymous visitors could call booking functions they never need (record_payment_va_details has
--    no check at all and rewrites payment rows).
-- 4. anon and authenticated held TRUNCATE/REFERENCES/TRIGGER and anon held INSERT/UPDATE/DELETE on
--    every table; RLS was the only barrier.
-- 5. Any logged-in user could read cogs_defaults (internal cost structure).
-- 6. Open inserts and public buckets had no size or type limits.

-- ---------------------------------------------------------------------------------------------
-- 1a. agents: owners may edit their profile, never the fields that carry trust or money
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_agent_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Only guard direct client writes. Service role, SECURITY DEFINER functions and migrations run as
  -- other roles and pass untouched.
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;
  IF public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'agent_admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.status := 'pending';
    NEW.level := 'bronze';
    NEW.total_sales := 0;
    NEW.total_commission := 0;
    NEW.available_balance := 0;
    NEW.approved_at := NULL;
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.level IS DISTINCT FROM OLD.level
     OR NEW.total_sales IS DISTINCT FROM OLD.total_sales
     OR NEW.total_commission IS DISTINCT FROM OLD.total_commission
     OR NEW.available_balance IS DISTINCT FROM OLD.available_balance
     OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.referral_code IS DISTINCT FROM OLD.referral_code
     OR NEW.referred_by_id IS DISTINCT FROM OLD.referred_by_id THEN
    RAISE EXCEPTION 'Kolom ini hanya bisa diubah oleh admin.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS aa_protect_agent_columns ON public.agents;
CREATE TRIGGER aa_protect_agent_columns
  BEFORE INSERT OR UPDATE ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.protect_agent_columns();

-- ---------------------------------------------------------------------------------------------
-- 1b. agent_withdrawals: a request is always pending, positive and within the real balance
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_agent_withdrawal()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _balance numeric;
  _pending numeric;
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;
  IF public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'agent_admin'::app_role) THEN
    RETURN NEW;
  END IF;

  NEW.status := 'pending';
  NEW.processed_at := NULL;
  NEW.admin_notes := NULL;

  IF NEW.amount IS NULL OR NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Jumlah penarikan tidak valid.' USING ERRCODE = '22023';
  END IF;

  SELECT a.available_balance INTO _balance
  FROM public.agents a
  WHERE a.id = NEW.agent_id AND a.user_id = auth.uid();

  SELECT COALESCE(SUM(w.amount), 0) INTO _pending
  FROM public.agent_withdrawals w
  WHERE w.agent_id = NEW.agent_id AND w.status = 'pending';

  IF COALESCE(_balance, 0) - _pending < NEW.amount THEN
    RAISE EXCEPTION 'Saldo tidak cukup untuk penarikan ini.' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS aa_guard_agent_withdrawal ON public.agent_withdrawals;
CREATE TRIGGER aa_guard_agent_withdrawal
  BEFORE INSERT ON public.agent_withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.guard_agent_withdrawal();

-- 1c. Owner write policies the app never uses and that let an agent edit their own progress and click counts
DROP POLICY IF EXISTS "Agents can insert their own progress" ON public.agent_challenge_progress;
DROP POLICY IF EXISTS "Agents can update their own progress" ON public.agent_challenge_progress;
DROP POLICY IF EXISTS "Agents can update their own links" ON public.agent_short_links;

-- ---------------------------------------------------------------------------------------------
-- 2. Storage: remove the two leftover policies, keep the owner-scoped ones
--    ("Users can view their own documents" already lets owner and admin read.)
-- ---------------------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Bisa Lihat 1w100z4_0" ON storage.objects;
DROP POLICY IF EXISTS "Bisa Upload 1w100z4_0" ON storage.objects;
-- Unused anonymous upload into a public bucket: free file hosting for anyone.
DROP POLICY IF EXISTS "Anyone can upload design request attachments" ON storage.objects;

-- 6. Size and type limits (enforced on upload, existing files untouched)
UPDATE storage.buckets
SET file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif','image/avif','image/heic']
WHERE id IN ('article-images','articles','avatars','gallery','package-images','team','testimonials','wisata-images');

UPDATE storage.buckets
SET file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/heic','application/pdf']
WHERE id = 'agent-documents';

UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','application/pdf']
WHERE id = 'design-request-attachments';

UPDATE storage.buckets SET file_size_limit = 52428800 WHERE id = 'marketing-materials';

-- ---------------------------------------------------------------------------------------------
-- 3. Functions: anon keeps only what a visitor really calls
--    (create_calculator_lead, get_calculator_lead_by_token, redirect_agent_short_link, has_role,
--     which RLS policies evaluate for every role.)
-- ---------------------------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION
  public.admin_mark_payment_settled, public.cancel_booking, public.create_booking, public.create_booking_payment,
  public.mark_refund_sent, public.log_agent_sale, public.record_payment_va_details, public.release_expired_booking_holds
FROM PUBLIC, anon;

-- Never meant to be called by a client: server-side only, or fired by triggers.
REVOKE EXECUTE ON FUNCTION
  public.record_payment_va_details, public.release_expired_booking_holds
FROM authenticated;
GRANT EXECUTE ON FUNCTION public.record_payment_va_details, public.release_expired_booking_holds TO service_role;

REVOKE EXECUTE ON FUNCTION
  public.log_jamaah_change, public.jamaah_payments_after_change, public.jamaah_payments_guard,
  public.jamaah_registrations_after_change, public.jamaah_registrations_touch, public.handle_new_agent_notification,
  public.generate_intake_code, public.protect_website_seat_source, public.site_events_stamp,
  public.protect_agent_columns, public.guard_agent_withdrawal
FROM PUBLIC, anon, authenticated;

-- New objects: nothing reaches anon unless a migration grants it on purpose.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon;

-- ---------------------------------------------------------------------------------------------
-- 4. Tables: RLS stays, but the grants underneath shrink to what the app needs
-- ---------------------------------------------------------------------------------------------
REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM anon;
-- The only anonymous writes: analytics and click logs (each has a length-checked policy).
GRANT INSERT ON public.site_events, public.whatsapp_clicks, public.short_link_clicks, public.umroh_calculator_leads TO anon;

-- ---------------------------------------------------------------------------------------------
-- 5. cogs_defaults: staff only (it holds the internal cost structure)
-- ---------------------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.cogs_defaults;
CREATE POLICY "Staff can read cogs defaults" ON public.cogs_defaults
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role <> 'user'::app_role));

-- ---------------------------------------------------------------------------------------------
-- 6. Open analytics insert: bound the text so it cannot be used to stuff the table
-- ---------------------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Visitors can record site events" ON public.site_events;
CREATE POLICY "Visitors can record site events" ON public.site_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(event) <= 64
    AND (path IS NULL OR length(path) <= 500)
    AND (lead_source IS NULL OR length(lead_source) <= 100)
    AND (utm_source IS NULL OR length(utm_source) <= 200)
    AND (utm_medium IS NULL OR length(utm_medium) <= 200)
    AND (utm_campaign IS NULL OR length(utm_campaign) <= 200)
    AND (referrer_host IS NULL OR length(referrer_host) <= 200)
    AND (device IS NULL OR length(device) <= 50)
  );

-- ---------------------------------------------------------------------------------------------
-- 7. packages: the public key reads every column except the internal ones
--    (cost structure, commission, discount ceiling, change notes). The site already selects an explicit
--    column list (PUBLIC_PACKAGE_COLUMNS), so nothing it shows changes. A column added later is NOT
--    readable by anon until granted here, which is the safe default.
--    Signed-in users (agents, staff) keep full access; separating staff-only data is a follow-up.
-- ---------------------------------------------------------------------------------------------
REVOKE SELECT ON public.packages FROM anon;
DO $$
DECLARE c text;
BEGIN
  FOR c IN
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'packages'
      AND column_name NOT IN ('cogs_data', 'cogs_status', 'max_discount', 'change_reason', 'agent_commission_amount')
  LOOP
    EXECUTE format('GRANT SELECT (%I) ON public.packages TO anon', c);
  END LOOP;
END $$;
