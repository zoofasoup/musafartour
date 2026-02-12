
-- Add hemat tier columns
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS hemat_makkah_hotel_name text;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS hemat_makkah_hotel_star integer;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS hemat_makkah_distance text;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS hemat_makkah_duration_walk text;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS hemat_madinah_hotel_name text;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS hemat_madinah_hotel_star integer;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS hemat_madinah_distance text;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS hemat_madinah_duration_walk text;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS hemat_transport text;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS hemat_package_price jsonb;

-- Add pelataran-hemat tier columns
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS pelataran_makkah_hotel_name text;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS pelataran_makkah_hotel_star integer;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS pelataran_makkah_distance text;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS pelataran_makkah_duration_walk text;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS pelataran_madinah_hotel_name text;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS pelataran_madinah_hotel_star integer;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS pelataran_madinah_distance text;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS pelataran_madinah_duration_walk text;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS pelataran_transport text;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS pelataran_package_price jsonb;
