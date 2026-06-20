
-- Extend umroh_calculator_leads with revision fields
ALTER TABLE public.umroh_calculator_leads
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'A',
  ADD COLUMN IF NOT EXISTS target_timeframe_months integer,
  ADD COLUMN IF NOT EXISTS selected_package text,
  ADD COLUMN IF NOT EXISTS calculated_monthly_target numeric,
  ADD COLUMN IF NOT EXISTS calculated_daily_target numeric,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'NEW',
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS fbclid text,
  ADD COLUMN IF NOT EXISTS ctwa_clid text,
  ADD COLUMN IF NOT EXISTS event_id text;

-- Admins can view & update all leads
DROP POLICY IF EXISTS "Admins can view all calculator leads" ON public.umroh_calculator_leads;
CREATE POLICY "Admins can view all calculator leads"
ON public.umroh_calculator_leads
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update calculator leads" ON public.umroh_calculator_leads;
CREATE POLICY "Admins can update calculator leads"
ON public.umroh_calculator_leads
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_calc_leads_created ON public.umroh_calculator_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calc_leads_status ON public.umroh_calculator_leads (status);
