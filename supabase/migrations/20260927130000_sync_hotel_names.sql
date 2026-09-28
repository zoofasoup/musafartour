-- Sync hotel data across packages: 35 of 55 distinct hotel names used in packages.* text
-- fields didn't exist in public.hotels at all (typos, star-emoji suffixes baked into the
-- name, inconsistent casing, missing prefixes). This normalizes package text to match
-- existing public.hotels entries where one already exists, and adds the genuinely new
-- hotels that don't. Verified read-only against live data before writing this migration;
-- see conversation for the full audit. A few merges are flagged LOW CONFIDENCE below —
-- spellings close enough to be the same hotel, but not certain.

-- ============================================================
-- 1. New hotels (no existing match in public.hotels)
-- ============================================================
INSERT INTO public.hotels (name, city_name, star_rating, distance, walking_duration) VALUES
  ('Mukhtara Al Gharbi', 'Madinah', 3, '700 meter', '6-10 menit'),
  -- LOW CONFIDENCE: merged "fajr badea 4" (Umroh Pelataran) + "fajar bade 4" (Umroh Nyaman
  -- 2X Jumat) as the same hotel (likely typos of the same name); used the former's distance/
  -- duration. Please verify these are actually the same property.
  ('Fajr Badee', 'Makkah', 3, '800 meter', '12-15 menit'),
  ('Marwa Rayhan by Rotana', 'Makkah', NULL, NULL, NULL),
  ('Novotel', 'Madinah', NULL, NULL, NULL),
  ('AGT', 'Madinah', NULL, NULL, NULL),
  ('ODST Al Madinah', 'Madinah', NULL, NULL, NULL),
  ('Snood Ajyad', 'Makkah', NULL, NULL, NULL),
  ('Ramada Dar Fayzen', 'Makkah', NULL, NULL, NULL),
  -- LOW CONFIDENCE: merged "Olayan Ajyad/prestige" (Umroh Pelataran) + "PRESTIGE" (Umroh
  -- Nyaman Syawal) — the slash in the first name suggests the admin themselves was noting
  -- an alt name. Please verify.
  ('Olayan Ajyad Prestige', 'Makkah', NULL, NULL, NULL),
  ('Olayan Al Haram', 'Makkah', NULL, NULL, NULL)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 2. Canonicalize package hotel-name text to match public.hotels
--    (typo/star-suffix/casing fixes; no data change beyond spelling)
-- ============================================================
UPDATE public.packages SET makkah_hotel_name = 'Grand Al Massa' WHERE makkah_hotel_name = 'GRAND ALMASSA';
UPDATE public.packages SET makkah_hotel_name = 'Fajr Badee' WHERE makkah_hotel_name = 'fajar bade 4';
UPDATE public.packages SET makkah_hotel_name = 'Maysan Al Maqam' WHERE makkah_hotel_name = 'Maysan Al Maqom ⭐️4';
UPDATE public.packages SET makkah_hotel_name = 'Snood Ajyad' WHERE makkah_hotel_name = 'SNOOD AJYAD';
UPDATE public.packages SET makkah_hotel_name = 'Olayan Ajyad Prestige' WHERE makkah_hotel_name = 'PRESTIGE';

UPDATE public.packages SET madinah_hotel_name = 'Winner Inn Dar Al Khair' WHERE madinah_hotel_name = 'Winner Inn';
UPDATE public.packages SET madinah_hotel_name = 'Mukhtara Al Gharbi' WHERE madinah_hotel_name = 'mukhtara al gharbi';
UPDATE public.packages SET madinah_hotel_name = 'Rua International' WHERE madinah_hotel_name = 'Rua International ⭐️4';
-- LOW CONFIDENCE: "DIYAR EIMAN" (Umroh Nyaman Syawal) merged into the well-established
-- "Deyar Al Eiman" (used consistently across many other packages). Please verify.
UPDATE public.packages SET madinah_hotel_name = 'Deyar Al Eiman' WHERE madinah_hotel_name = 'DIYAR EIMAN';

UPDATE public.packages SET hemat_makkah_hotel_name = 'Wahat Ajyad Hotel' WHERE hemat_makkah_hotel_name = 'Waha Ajyad';
UPDATE public.packages SET hemat_makkah_hotel_name = 'Nada Ajyad' WHERE hemat_makkah_hotel_name = 'Nada Ajyad ⭐️3';
UPDATE public.packages SET hemat_makkah_hotel_name = 'Fajr Badee' WHERE hemat_makkah_hotel_name = 'fajr badea 4';
UPDATE public.packages SET hemat_makkah_hotel_name = 'Ramada Dar Fayzen' WHERE hemat_makkah_hotel_name = 'Ramada dar fayzen';
UPDATE public.packages SET hemat_makkah_hotel_name = 'Al Olayan Golden' WHERE hemat_makkah_hotel_name IN ('Al Olayan Golden ⭐️3', 'Olayan Golden');
UPDATE public.packages SET hemat_makkah_hotel_name = 'Maysan Al Maqam' WHERE hemat_makkah_hotel_name = 'Maysan Al Maqom ⭐️4';
UPDATE public.packages SET hemat_makkah_hotel_name = 'Emaar Grand' WHERE hemat_makkah_hotel_name = 'Emaar Grand ⭐️3';

-- LOW CONFIDENCE: "Al Ansar Golden Tulip" merged into the existing "Anshor Golden Tulip"
-- (same Arabic name, different transliteration). Please verify.
UPDATE public.packages SET hemat_madinah_hotel_name = 'Anshor Golden Tulip' WHERE hemat_madinah_hotel_name = 'Al Ansar Golden Tulip';
UPDATE public.packages SET hemat_madinah_hotel_name = 'Manazeel Safia' WHERE hemat_madinah_hotel_name = 'Manazeel Safia ⭐️3';
UPDATE public.packages SET hemat_madinah_hotel_name = 'Emaar Taiba' WHERE hemat_madinah_hotel_name = 'Emaar Taiba ⭐️3';
UPDATE public.packages SET hemat_madinah_hotel_name = 'Rua International' WHERE hemat_madinah_hotel_name = 'Rua International ⭐️4';
UPDATE public.packages SET hemat_madinah_hotel_name = 'Mirage Salam' WHERE hemat_madinah_hotel_name = 'Mirage Salam ⭐️3';

UPDATE public.packages SET five_star_makkah_hotel_name = 'Movenpick' WHERE five_star_makkah_hotel_name = 'Mövenpick Hotel ⭐️5';
UPDATE public.packages SET five_star_makkah_hotel_name = 'Marwa Rayhan by Rotana' WHERE five_star_makkah_hotel_name = 'MARWA RAYHAN BY ROTANA';

UPDATE public.packages SET five_star_madinah_hotel_name = 'Peninsula Worth' WHERE five_star_madinah_hotel_name = 'Peninsula Worth ⭐️5';
UPDATE public.packages SET five_star_madinah_hotel_name = 'Novotel' WHERE five_star_madinah_hotel_name = 'NOVOTEL';
UPDATE public.packages SET five_star_madinah_hotel_name = 'Winner Inn Dar Al Khair' WHERE five_star_madinah_hotel_name = 'Winner inn';

UPDATE public.packages SET pelataran_makkah_hotel_name = 'Maysan Al Maqam' WHERE pelataran_makkah_hotel_name = 'Maysan Al Maqom';
UPDATE public.packages SET pelataran_makkah_hotel_name = 'Olayan Ajyad Prestige' WHERE pelataran_makkah_hotel_name = 'Olayan Ajyad/prestige';
UPDATE public.packages SET pelataran_makkah_hotel_name = 'Al Safwah Hotel Tower' WHERE pelataran_makkah_hotel_name = 'SAFWA TOWER';
UPDATE public.packages SET pelataran_makkah_hotel_name = 'Movenpick' WHERE pelataran_makkah_hotel_name = 'Mövenpick Hotel ⭐️5';

UPDATE public.packages SET pelataran_madinah_hotel_name = 'Anshor Golden Tulip' WHERE pelataran_madinah_hotel_name = 'Al Ansar Golden Tulip';
UPDATE public.packages SET pelataran_madinah_hotel_name = 'Rua International' WHERE pelataran_madinah_hotel_name = 'Rua International ⭐️4';

-- ============================================================
-- 3. Star-rating corrections: the package's own *_hotel_star column disagreed
--    with the actual hotel (verified against public.hotels / majority of other
--    packages using the same hotel). Name updated separately above.
-- ============================================================
-- "Maysan Almaqom" rows stored star=5; every other package using this hotel (and
-- public.hotels itself) says 4.
UPDATE public.packages
  SET pelataran_makkah_hotel_name = 'Maysan Al Maqam', pelataran_makkah_hotel_star = 4
  WHERE pelataran_makkah_hotel_name = 'Maysan Almaqom';

-- "Peninsula Worth" (already spelled correctly) stored star=5 on some rows; public.hotels
-- and the "Peninsula Worth ⭐️5" variant (fixed above) both agree on 4.
UPDATE public.packages SET madinah_hotel_star = 4 WHERE madinah_hotel_name = 'Peninsula Worth' AND madinah_hotel_star = 5;
