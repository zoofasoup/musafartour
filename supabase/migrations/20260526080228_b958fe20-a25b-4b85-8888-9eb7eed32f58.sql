
-- 1. marketing_settings: restrict SELECT to admins only
DROP POLICY IF EXISTS "Marketing settings viewable by everyone" ON public.marketing_settings;

-- 2. whatsapp_clicks: replace permissive INSERT with validated INSERT
DROP POLICY IF EXISTS "Anyone can insert clicks" ON public.whatsapp_clicks;
CREATE POLICY "Public can insert validated clicks"
ON public.whatsapp_clicks
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (cs_name IS NULL OR length(cs_name) <= 100)
  AND (message IS NULL OR length(message) <= 2000)
  AND (user_agent IS NULL OR length(user_agent) <= 500)
  AND (referrer IS NULL OR length(referrer) <= 500)
  AND (ip_hash IS NULL OR length(ip_hash) <= 64)
  AND (utm_source IS NULL OR length(utm_source) <= 100)
  AND (utm_medium IS NULL OR length(utm_medium) <= 100)
  AND (utm_campaign IS NULL OR length(utm_campaign) <= 100)
  AND (utm_term IS NULL OR length(utm_term) <= 100)
  AND (utm_content IS NULL OR length(utm_content) <= 200)
);

-- 3. whatsapp_conversions: explicit admin-only INSERT (defense in depth)
DROP POLICY IF EXISTS "Admins can insert conversions" ON public.whatsapp_conversions;
CREATE POLICY "Admins can insert conversions"
ON public.whatsapp_conversions
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 4. short_link_clicks: add public INSERT with validation
DROP POLICY IF EXISTS "Public can insert validated short link clicks" ON public.short_link_clicks;
CREATE POLICY "Public can insert validated short link clicks"
ON public.short_link_clicks
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (user_agent IS NULL OR length(user_agent) <= 500)
  AND (referer IS NULL OR length(referer) <= 500)
  AND (ip_hash IS NULL OR length(ip_hash) <= 64)
  AND (utm_source IS NULL OR length(utm_source) <= 100)
  AND (utm_medium IS NULL OR length(utm_medium) <= 100)
  AND (utm_campaign IS NULL OR length(utm_campaign) <= 100)
);

-- 5. Storage: prevent listing of public buckets (direct CDN access still works)
DROP POLICY IF EXISTS "Article images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Marketing materials are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Package images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Wisata images are publicly accessible" ON storage.objects;

CREATE POLICY "Admins can list article images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'article-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can list marketing materials"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'marketing-materials' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can list package images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'package-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can list wisata images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'wisata-images' AND has_role(auth.uid(), 'admin'::app_role));

-- 6. Revoke EXECUTE on SECURITY DEFINER helper functions from public roles
REVOKE EXECUTE ON FUNCTION public.slugify(text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.generate_referral_code() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
