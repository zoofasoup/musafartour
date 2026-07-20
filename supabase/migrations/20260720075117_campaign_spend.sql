-- Confirmed via prior audit: nowhere in the schema or UI can anyone log ad
-- spend, so cost-per-conversion can't be computed even manually, despite
-- conversions (whatsapp_conversions, umroh_calculator_leads) already being
-- UTM-tagged. This is the missing spend side of that equation.
CREATE TABLE public.campaign_spend (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_name TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'meta',
  amount NUMERIC NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CHECK (amount >= 0),
  CHECK (period_end >= period_start)
);

ALTER TABLE public.campaign_spend ENABLE ROW LEVEL SECURITY;

CREATE POLICY "advertiser can manage campaign_spend" ON public.campaign_spend FOR ALL
  USING (has_role(auth.uid(), 'advertiser'::app_role)) WITH CHECK (has_role(auth.uid(), 'advertiser'::app_role));

CREATE POLICY "admin can manage campaign_spend" ON public.campaign_spend FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_campaign_spend_campaign_name ON public.campaign_spend(campaign_name);
