-- Add five-star tier fields to packages table
ALTER TABLE public.packages 
ADD COLUMN five_star_makkah_hotel_name TEXT,
ADD COLUMN five_star_makkah_hotel_star INTEGER,
ADD COLUMN five_star_makkah_distance TEXT,
ADD COLUMN five_star_makkah_duration_walk TEXT,
ADD COLUMN five_star_madinah_hotel_name TEXT,
ADD COLUMN five_star_madinah_hotel_star INTEGER,
ADD COLUMN five_star_madinah_distance TEXT,
ADD COLUMN five_star_madinah_duration_walk TEXT,
ADD COLUMN five_star_package_price JSONB DEFAULT '{"quad": 0, "triple": 0, "double": 0}'::jsonb,
ADD COLUMN best_seller_transport TEXT DEFAULT 'Bus Eksklusif',
ADD COLUMN five_star_transport TEXT DEFAULT 'Kereta Cepat';

COMMENT ON COLUMN public.packages.five_star_makkah_hotel_name IS 'Hotel name in Makkah for five-star tier';
COMMENT ON COLUMN public.packages.five_star_madinah_hotel_name IS 'Hotel name in Madinah for five-star tier';
COMMENT ON COLUMN public.packages.five_star_package_price IS 'Pricing for five-star tier (quad, triple, double)';
COMMENT ON COLUMN public.packages.best_seller_transport IS 'Transport type for best seller tier (default: Bus Eksklusif)';
COMMENT ON COLUMN public.packages.five_star_transport IS 'Transport type for five-star tier (default: Kereta Cepat)';