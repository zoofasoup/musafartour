-- Add city_name column to hotels table for "Lainnya" locations
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS city_name text;
