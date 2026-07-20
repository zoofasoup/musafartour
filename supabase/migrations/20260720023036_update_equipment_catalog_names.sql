-- Replace the 5 generic placeholder equipment items with the real 11-item
-- jamaah kit catalog (names only - photos are uploaded by the admin via
-- /admin/equipment, since they're not available as files at migration time).
UPDATE public.equipment_items SET name = 'Koper', display_order = 1 WHERE name = 'Koper';
UPDATE public.equipment_items SET name = 'Tas Jinjing', display_order = 2 WHERE name = 'Tas Selempang';
UPDATE public.equipment_items SET name = 'Kain Ihram', display_order = 5 WHERE name = 'Kain Ihram / Mukena';
UPDATE public.equipment_items SET name = 'Baju Seragam', display_order = 3 WHERE name = 'Baju Seragam';
UPDATE public.equipment_items SET name = 'Buku Panduan & Doa Umroh', display_order = 8 WHERE name = 'ID Card & Buku Panduan';

INSERT INTO public.equipment_items (name, display_order) VALUES
  ('Jubah/Outer Batik', 4),
  ('Mukena', 6),
  ('Kaos Musafar', 7),
  ('Syal', 9),
  ('Pouch Serut', 10),
  ('Tumbler', 11);
