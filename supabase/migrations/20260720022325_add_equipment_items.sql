-- Create equipment_items table for managing the "Perlengkapan" (jamaah kit) catalog,
-- shown with photos on the package detail page. This is a sitewide catalog (what every
-- jamaah receives), not per-package data, since packages never actually stored real
-- per-package equipment - only a placeholder default string.
CREATE TABLE public.equipment_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.equipment_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipment items viewable by everyone"
ON public.equipment_items FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage equipment items"
ON public.equipment_items FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_equipment_items_updated_at
BEFORE UPDATE ON public.equipment_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.equipment_items (name, display_order) VALUES
  ('Koper', 1),
  ('Tas Selempang', 2),
  ('Kain Ihram / Mukena', 3),
  ('Baju Seragam', 4),
  ('ID Card & Buku Panduan', 5);
