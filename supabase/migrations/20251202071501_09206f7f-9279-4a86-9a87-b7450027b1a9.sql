-- Create global SEO settings table
CREATE TABLE IF NOT EXISTS public.seo_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_title text NOT NULL DEFAULT 'Musafar Tour - Paket Umroh & Haji Terpercaya',
  site_description text,
  default_og_image text,
  default_keywords text,
  twitter_card_type text DEFAULT 'summary_large_image',
  twitter_site text,
  robots_txt text DEFAULT 'User-agent: *
Allow: /
Disallow: /admin/
Disallow: /auth
Sitemap: https://musafartour.com/sitemap.xml',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create page SEO settings table
CREATE TABLE IF NOT EXISTS public.page_seo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_path text UNIQUE NOT NULL,
  page_name text NOT NULL,
  meta_title text,
  meta_description text,
  focus_keyword text,
  canonical_url text,
  robots_meta text DEFAULT 'index, follow',
  og_image text,
  schema_type text DEFAULT 'WebPage',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create redirects table
CREATE TABLE IF NOT EXISTS public.redirects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_path text UNIQUE NOT NULL,
  to_path text NOT NULL,
  redirect_type integer DEFAULT 301,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add SEO fields to articles table if not exists
ALTER TABLE public.articles 
  ADD COLUMN IF NOT EXISTS focus_keyword text,
  ADD COLUMN IF NOT EXISTS canonical_url text,
  ADD COLUMN IF NOT EXISTS robots_meta text DEFAULT 'index, follow',
  ADD COLUMN IF NOT EXISTS og_image text,
  ADD COLUMN IF NOT EXISTS schema_type text DEFAULT 'Article';

-- Add SEO fields to packages table if not exists
ALTER TABLE public.packages 
  ADD COLUMN IF NOT EXISTS meta_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS focus_keyword text,
  ADD COLUMN IF NOT EXISTS canonical_url text,
  ADD COLUMN IF NOT EXISTS robots_meta text DEFAULT 'index, follow',
  ADD COLUMN IF NOT EXISTS og_image text,
  ADD COLUMN IF NOT EXISTS schema_type text DEFAULT 'Product';

-- Enable RLS on new tables
ALTER TABLE public.seo_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_seo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redirects ENABLE ROW LEVEL SECURITY;

-- RLS policies for seo_settings
CREATE POLICY "SEO settings viewable by everyone"
  ON public.seo_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage SEO settings"
  ON public.seo_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for page_seo
CREATE POLICY "Page SEO viewable by everyone"
  ON public.page_seo FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage page SEO"
  ON public.page_seo FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for redirects
CREATE POLICY "Redirects viewable by everyone"
  ON public.redirects FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage redirects"
  ON public.redirects FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create triggers for updated_at
CREATE TRIGGER update_seo_settings_updated_at
  BEFORE UPDATE ON public.seo_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_page_seo_updated_at
  BEFORE UPDATE ON public.page_seo
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_redirects_updated_at
  BEFORE UPDATE ON public.redirects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default SEO settings
INSERT INTO public.seo_settings (site_title, site_description, default_keywords)
VALUES (
  'Musafar Tour - Paket Umroh & Haji Terpercaya 2025',
  'Paket umroh mulai 20 jutaan dengan pelayanan terbaik. Hotel bintang 5, katering Indonesia, pembimbing berpengalaman. Daftar sekarang!',
  'paket umroh, travel umroh terpercaya, umroh 2025, haji khusus, wisata halal, umroh murah'
)
ON CONFLICT DO NOTHING;

-- Insert default page SEO for main pages
INSERT INTO public.page_seo (page_path, page_name, meta_title, meta_description) VALUES
  ('/', 'Homepage', 'Musafar Tour - Paket Umroh & Haji Terpercaya 2025', 'Paket umroh mulai 20 jutaan dengan pelayanan terbaik. Hotel bintang 5, katering Indonesia, pembimbing berpengalaman.'),
  ('/paket-umroh', 'Paket Umroh', 'Paket Umroh Terlengkap 2025 - Musafar Tour', 'Pilihan paket umroh terlengkap dengan harga terjangkau. Mulai dari paket hemat hingga five star.'),
  ('/jadwal-umroh', 'Jadwal Umroh', 'Jadwal Keberangkatan Umroh 2025 - Musafar Tour', 'Lihat jadwal keberangkatan umroh terbaru. Berangkat setiap bulan dengan kuota terbatas.'),
  ('/tentang-kami', 'Tentang Kami', 'Tentang Kami - Musafar Tour', 'Musafar Tour adalah travel umroh terpercaya dengan pengalaman lebih dari 10 tahun melayani jamaah umroh.'),
  ('/galeri', 'Galeri', 'Galeri Foto Umroh - Musafar Tour', 'Dokumentasi perjalanan umroh bersama Musafar Tour. Lihat keseruan jamaah kami di tanah suci.'),
  ('/kontak', 'Kontak', 'Hubungi Kami - Musafar Tour', 'Hubungi Musafar Tour untuk konsultasi gratis. Kami siap membantu merencanakan perjalanan umroh Anda.'),
  ('/artikel', 'Artikel', 'Artikel & Tips Umroh - Musafar Tour', 'Baca artikel dan tips seputar umroh, persiapan, doa, dan panduan lengkap untuk jamaah.')
ON CONFLICT (page_path) DO NOTHING;