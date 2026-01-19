-- Add Google Maps URL column to hotels table
ALTER TABLE public.hotels
ADD COLUMN google_maps_url text;