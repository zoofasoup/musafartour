-- The admin panel already gates its sidebar by four granular roles
-- (superadmin, product_admin, content_admin, agent_admin), but every RLS
-- policy in the schema so far only ever checks has_role(uid, 'admin') -
-- these roles have been UI labels with no matching database authorization.
-- A product_admin could open /admin/packages and have every save silently
-- rejected by Postgres. This migration is additive only: it never removes
-- an existing grant, it only widens who has_role('admin') accepts (for
-- superadmin) and adds new scoped policies for the other three roles.

-- superadmin implies admin everywhere has_role(uid, 'admin') is checked -
-- one function change instead of touching ~88 existing policies.
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND (role = _role OR (role = 'superadmin' AND _role = 'admin'))
  )
$$;

-- product_admin: package catalog & logistics
CREATE POLICY "product_admin can manage packages" ON public.packages FOR ALL
  USING (has_role(auth.uid(), 'product_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'product_admin'::app_role));
CREATE POLICY "product_admin can manage hotels" ON public.hotels FOR ALL
  USING (has_role(auth.uid(), 'product_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'product_admin'::app_role));
CREATE POLICY "product_admin can manage package_items" ON public.package_items FOR ALL
  USING (has_role(auth.uid(), 'product_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'product_admin'::app_role));
CREATE POLICY "product_admin can manage equipment_items" ON public.equipment_items FOR ALL
  USING (has_role(auth.uid(), 'product_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'product_admin'::app_role));
CREATE POLICY "product_admin can manage departure_schedules" ON public.departure_schedules FOR ALL
  USING (has_role(auth.uid(), 'product_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'product_admin'::app_role));

-- content_admin: marketing/blog content
CREATE POLICY "content_admin can manage hero_section" ON public.hero_section FOR ALL
  USING (has_role(auth.uid(), 'content_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'content_admin'::app_role));
CREATE POLICY "content_admin can manage selling_points" ON public.selling_points FOR ALL
  USING (has_role(auth.uid(), 'content_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'content_admin'::app_role));
CREATE POLICY "content_admin can manage testimonials" ON public.testimonials FOR ALL
  USING (has_role(auth.uid(), 'content_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'content_admin'::app_role));
CREATE POLICY "content_admin can manage gallery_images" ON public.gallery_images FOR ALL
  USING (has_role(auth.uid(), 'content_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'content_admin'::app_role));
CREATE POLICY "content_admin can manage articles" ON public.articles FOR ALL
  USING (has_role(auth.uid(), 'content_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'content_admin'::app_role));
CREATE POLICY "content_admin can manage faq_items" ON public.faq_items FOR ALL
  USING (has_role(auth.uid(), 'content_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'content_admin'::app_role));
CREATE POLICY "content_admin can manage seo_settings" ON public.seo_settings FOR ALL
  USING (has_role(auth.uid(), 'content_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'content_admin'::app_role));
CREATE POLICY "content_admin can manage page_seo" ON public.page_seo FOR ALL
  USING (has_role(auth.uid(), 'content_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'content_admin'::app_role));

-- agent_admin: the external-agent domain (partner support)
CREATE POLICY "agent_admin can manage agents" ON public.agents FOR ALL
  USING (has_role(auth.uid(), 'agent_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'agent_admin'::app_role));
CREATE POLICY "agent_admin can manage agent_sales" ON public.agent_sales FOR ALL
  USING (has_role(auth.uid(), 'agent_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'agent_admin'::app_role));
CREATE POLICY "agent_admin can manage agent_withdrawals" ON public.agent_withdrawals FOR ALL
  USING (has_role(auth.uid(), 'agent_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'agent_admin'::app_role));
CREATE POLICY "agent_admin can manage agent_levels" ON public.agent_levels FOR ALL
  USING (has_role(auth.uid(), 'agent_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'agent_admin'::app_role));
CREATE POLICY "agent_admin can manage agent_challenges" ON public.agent_challenges FOR ALL
  USING (has_role(auth.uid(), 'agent_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'agent_admin'::app_role));
CREATE POLICY "agent_admin can manage agent_challenge_progress" ON public.agent_challenge_progress FOR ALL
  USING (has_role(auth.uid(), 'agent_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'agent_admin'::app_role));
CREATE POLICY "agent_admin can manage agent_badges" ON public.agent_badges FOR ALL
  USING (has_role(auth.uid(), 'agent_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'agent_admin'::app_role));
CREATE POLICY "agent_admin can manage agent_earned_badges" ON public.agent_earned_badges FOR ALL
  USING (has_role(auth.uid(), 'agent_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'agent_admin'::app_role));
CREATE POLICY "agent_admin can manage agent_rewards" ON public.agent_rewards FOR ALL
  USING (has_role(auth.uid(), 'agent_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'agent_admin'::app_role));
CREATE POLICY "agent_admin can manage agent_points" ON public.agent_points FOR ALL
  USING (has_role(auth.uid(), 'agent_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'agent_admin'::app_role));
CREATE POLICY "agent_admin can manage agent_short_links" ON public.agent_short_links FOR ALL
  USING (has_role(auth.uid(), 'agent_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'agent_admin'::app_role));

-- Storage: same scoped roles for the buckets each of them manages content in.
CREATE POLICY "product_admin can manage package images" ON storage.objects FOR ALL
  USING (bucket_id = 'package-images' AND has_role(auth.uid(), 'product_admin'::app_role))
  WITH CHECK (bucket_id = 'package-images' AND has_role(auth.uid(), 'product_admin'::app_role));

CREATE POLICY "content_admin can manage article images" ON storage.objects FOR ALL
  USING (bucket_id = 'article-images' AND has_role(auth.uid(), 'content_admin'::app_role))
  WITH CHECK (bucket_id = 'article-images' AND has_role(auth.uid(), 'content_admin'::app_role));

CREATE POLICY "content_admin can manage wisata images" ON storage.objects FOR ALL
  USING (bucket_id = 'wisata-images' AND has_role(auth.uid(), 'content_admin'::app_role))
  WITH CHECK (bucket_id = 'wisata-images' AND has_role(auth.uid(), 'content_admin'::app_role));
