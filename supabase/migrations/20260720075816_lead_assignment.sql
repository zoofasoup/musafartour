-- Lightweight "claim" ownership so a flat lead list has some accountability
-- - who's actually working this one. assigned_to_email is a denormalized
-- snapshot (not a join to auth.users, which isn't publicly queryable) so
-- display doesn't need extra permissions.
ALTER TABLE public.umroh_calculator_leads
  ADD COLUMN IF NOT EXISTS assigned_to UUID,
  ADD COLUMN IF NOT EXISTS assigned_to_email TEXT;

ALTER TABLE public.whatsapp_clicks
  ADD COLUMN IF NOT EXISTS assigned_to UUID,
  ADD COLUMN IF NOT EXISTS assigned_to_email TEXT;

-- sales previously only had SELECT on whatsapp_clicks - claiming a row
-- needs UPDATE too.
CREATE POLICY "sales can update whatsapp_clicks" ON public.whatsapp_clicks FOR UPDATE
  USING (has_role(auth.uid(), 'sales'::app_role));
