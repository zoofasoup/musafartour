-- Add photo columns to hotels table
ALTER TABLE public.hotels
ADD COLUMN exterior_photo text,
ADD COLUMN lobby_photo text,
ADD COLUMN room_photo text;