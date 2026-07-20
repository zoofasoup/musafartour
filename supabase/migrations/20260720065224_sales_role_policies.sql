-- sales: work the calculator lead queue, view WhatsApp click volume, and
-- record conversions (closing the gap where whatsapp_conversions existed
-- but nothing ever wrote to it).
CREATE POLICY "sales can manage calculator leads" ON public.umroh_calculator_leads FOR ALL
  USING (has_role(auth.uid(), 'sales'::app_role)) WITH CHECK (has_role(auth.uid(), 'sales'::app_role));

CREATE POLICY "sales can view whatsapp_clicks" ON public.whatsapp_clicks FOR SELECT
  USING (has_role(auth.uid(), 'sales'::app_role));

CREATE POLICY "sales can view whatsapp_conversions" ON public.whatsapp_conversions FOR SELECT
  USING (has_role(auth.uid(), 'sales'::app_role));

CREATE POLICY "sales can insert whatsapp_conversions" ON public.whatsapp_conversions FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'sales'::app_role));
