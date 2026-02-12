
-- Create package_items table for managing include/exclude items
CREATE TABLE public.package_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('include', 'exclude')),
  is_essential BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.package_items ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Package items viewable by everyone"
ON public.package_items FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage package items"
ON public.package_items FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_package_items_updated_at
BEFORE UPDATE ON public.package_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default include items (essential/standard)
INSERT INTO public.package_items (name, type, is_essential, display_order) VALUES
  ('Tiket dan Visa', 'include', true, 1),
  ('Hotel Fullboard', 'include', true, 2),
  ('Makan 3x Sehari', 'include', true, 3),
  ('Handling', 'include', true, 4),
  ('Manasik', 'include', true, 5),
  ('City Tour', 'include', true, 6),
  ('Transportasi', 'include', true, 7),
  ('Tour Leader', 'include', true, 8),
  ('Muthowwif', 'include', true, 9),
  ('Perlengkapan', 'include', true, 10),
  ('Transmitter', 'include', true, 11),
  ('Al Baik', 'include', true, 12);

-- Seed default include items (optional)
INSERT INTO public.package_items (name, type, is_essential, display_order) VALUES
  ('Free Hotel Transit', 'include', false, 20),
  ('Al Romansiah', 'include', false, 21),
  ('Museum Al Wahyu', 'include', false, 22),
  ('Museum As Safiyyah', 'include', false, 23),
  ('Tour Badar', 'include', false, 24),
  ('Tour Thaif', 'include', false, 25),
  ('Tour Al Ula', 'include', false, 26),
  ('City Tour Singapore', 'include', false, 27),
  ('City Tour Doha', 'include', false, 28),
  ('Kereta Cepat', 'include', false, 29),
  ('Transport GMC', 'include', false, 30),
  ('Al Ula Bus VIP 12', 'include', false, 31);

-- Seed default exclude items
INSERT INTO public.package_items (name, type, is_essential, display_order) VALUES
  ('Pembuatan Paspor', 'exclude', false, 1),
  ('Vaksin Meningitis', 'exclude', false, 2),
  ('Tiket PP Daerah', 'exclude', false, 3),
  ('Biaya Kelebihan Bagasi', 'exclude', false, 4),
  ('Pengeluaran Pribadi', 'exclude', false, 5),
  ('Biaya Kirim Perlengkapan', 'exclude', false, 6);

-- Add missing columns to packages table
ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS timeframe TEXT,
  ADD COLUMN IF NOT EXISTS start_airport TEXT,
  ADD COLUMN IF NOT EXISTS route TEXT,
  ADD COLUMN IF NOT EXISTS itinerary TEXT,
  ADD COLUMN IF NOT EXISTS nights_makkah INTEGER,
  ADD COLUMN IF NOT EXISTS nights_madinah INTEGER,
  ADD COLUMN IF NOT EXISTS hotel_extra TEXT,
  ADD COLUMN IF NOT EXISTS selling_points TEXT,
  ADD COLUMN IF NOT EXISTS max_discount INTEGER DEFAULT 0;
