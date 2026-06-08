
CREATE TABLE public.umroh_calculator_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  whatsapp text NOT NULL,
  monthly_saving numeric NOT NULL,
  pilgrim_count integer NOT NULL DEFAULT 1,
  existing_savings numeric NOT NULL DEFAULT 0,
  recommended_package_id uuid REFERENCES public.packages(id) ON DELETE SET NULL,
  recommended_tier text,
  daily_target numeric,
  months_to_departure integer,
  result_data jsonb,
  referrer text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (length(name) BETWEEN 1 AND 100),
  CHECK (length(whatsapp) BETWEEN 6 AND 20)
);

GRANT SELECT, INSERT ON public.umroh_calculator_leads TO anon, authenticated;
GRANT ALL ON public.umroh_calculator_leads TO service_role;

ALTER TABLE public.umroh_calculator_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert calculator leads"
  ON public.umroh_calculator_leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(name) BETWEEN 1 AND 100
    AND length(whatsapp) BETWEEN 6 AND 20
    AND monthly_saving >= 0
    AND pilgrim_count BETWEEN 1 AND 20
    AND existing_savings >= 0
  );

CREATE POLICY "Anyone can view a lead by id"
  ON public.umroh_calculator_leads
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can manage all calculator leads"
  ON public.umroh_calculator_leads
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_umroh_calculator_leads_updated_at
  BEFORE UPDATE ON public.umroh_calculator_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
