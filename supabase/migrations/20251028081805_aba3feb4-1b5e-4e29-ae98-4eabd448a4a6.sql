-- Hero Section Table
CREATE TABLE public.hero_section (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  cta_text TEXT NOT NULL DEFAULT 'Konsultasi Gratis',
  cta_link TEXT NOT NULL DEFAULT 'https://wa.me/6281917403797',
  background_image TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Selling Points Table
CREATE TABLE public.selling_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'check-circle',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Testimonials Table
CREATE TABLE public.testimonials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  rating INTEGER NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  content TEXT NOT NULL,
  image_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Gallery Images Table
CREATE TABLE public.gallery_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'umroh',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Departure Schedules Table
CREATE TABLE public.departure_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id UUID REFERENCES public.packages(id) ON DELETE CASCADE,
  departure_date DATE NOT NULL,
  return_date DATE NOT NULL,
  available_seats INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'full', 'closed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- FAQ Items Table
CREATE TABLE public.faq_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Website Settings Table
CREATE TABLE public.website_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_name TEXT NOT NULL DEFAULT 'Musafar Tour',
  site_tagline TEXT,
  phone_number TEXT NOT NULL DEFAULT '081917403797',
  whatsapp_number TEXT NOT NULL DEFAULT '6281917403797',
  email TEXT NOT NULL DEFAULT 'info@musafartour.com',
  address TEXT,
  google_maps_url TEXT,
  instagram_url TEXT,
  facebook_url TEXT,
  youtube_url TEXT,
  google_review_url TEXT,
  office_hours TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hero_section ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.selling_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departure_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Public read, admin write
CREATE POLICY "Hero section viewable by everyone" ON public.hero_section FOR SELECT USING (true);
CREATE POLICY "Admins can manage hero section" ON public.hero_section FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Selling points viewable by everyone" ON public.selling_points FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage selling points" ON public.selling_points FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Testimonials viewable by everyone" ON public.testimonials FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage testimonials" ON public.testimonials FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Gallery images viewable by everyone" ON public.gallery_images FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage gallery" ON public.gallery_images FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Schedules viewable by everyone" ON public.departure_schedules FOR SELECT USING (true);
CREATE POLICY "Admins can manage schedules" ON public.departure_schedules FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "FAQ items viewable by everyone" ON public.faq_items FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage FAQ" ON public.faq_items FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Settings viewable by everyone" ON public.website_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage settings" ON public.website_settings FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Update triggers
CREATE TRIGGER update_hero_section_updated_at BEFORE UPDATE ON public.hero_section FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_selling_points_updated_at BEFORE UPDATE ON public.selling_points FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_testimonials_updated_at BEFORE UPDATE ON public.testimonials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_gallery_images_updated_at BEFORE UPDATE ON public.gallery_images FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_departure_schedules_updated_at BEFORE UPDATE ON public.departure_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_faq_items_updated_at BEFORE UPDATE ON public.faq_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_website_settings_updated_at BEFORE UPDATE ON public.website_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default data
INSERT INTO public.website_settings (
  site_name, 
  site_tagline, 
  phone_number, 
  whatsapp_number, 
  email,
  google_review_url
) VALUES (
  'Musafar Tour',
  'Travel Umroh & Haji Terpercaya',
  '081917403797',
  '6281917403797',
  'info@musafartour.com',
  'https://share.google/IEeiBZM6iD11Byerq'
);