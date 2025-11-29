-- Add gender column to testimonials table
ALTER TABLE public.testimonials 
ADD COLUMN gender text DEFAULT 'male' CHECK (gender IN ('male', 'female'));