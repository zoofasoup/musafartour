-- Drop existing packages table and recreate with new structure
DROP TABLE IF EXISTS public.packages CASCADE;

-- Create packages table with complete fields
CREATE TABLE public.packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Package Information
  package_name TEXT NOT NULL,
  departure_date DATE NOT NULL,
  duration_days INTEGER NOT NULL,
  flight TEXT NOT NULL,
  flight_type TEXT NOT NULL,
  
  -- Accommodation - Madinah
  madinah_hotel_name TEXT,
  madinah_hotel_star INTEGER,
  madinah_distance TEXT,
  madinah_duration_walk TEXT,
  
  -- Accommodation - Makkah
  makkah_hotel_name TEXT,
  makkah_hotel_star INTEGER,
  makkah_distance TEXT,
  makkah_duration_walk TEXT,
  
  -- Price (stored as JSONB for multiple tiers)
  package_price JSONB NOT NULL DEFAULT '{"quad": 0, "triple": 0, "double": 0}'::jsonb,
  
  -- Facilities
  included_items TEXT,
  excluded_items TEXT,
  equipment_list TEXT,
  
  -- Media & Display
  banner_image TEXT,
  gallery_images TEXT[],
  catalog_link TEXT,
  itinerary_link TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Packages are viewable by everyone"
  ON public.packages FOR SELECT
  USING (status = 'published' OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert packages"
  ON public.packages FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update packages"
  ON public.packages FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete packages"
  ON public.packages FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_packages_updated_at
  BEFORE UPDATE ON public.packages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage buckets for images
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('package-images', 'package-images', true),
  ('wisata-images', 'wisata-images', true),
  ('article-images', 'article-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for package images
CREATE POLICY "Package images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'package-images');

CREATE POLICY "Admins can upload package images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'package-images' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update package images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'package-images' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete package images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'package-images' AND has_role(auth.uid(), 'admin'));

-- Storage policies for wisata images
CREATE POLICY "Wisata images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'wisata-images');

CREATE POLICY "Admins can upload wisata images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'wisata-images' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update wisata images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'wisata-images' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete wisata images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'wisata-images' AND has_role(auth.uid(), 'admin'));

-- Storage policies for article images
CREATE POLICY "Article images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'article-images');

CREATE POLICY "Admins can upload article images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'article-images' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update article images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'article-images' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete article images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'article-images' AND has_role(auth.uid(), 'admin'));