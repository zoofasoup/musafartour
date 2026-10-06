-- Admin audit (docs/audit/01-admin.md): make the database agree with what the admin menu already promises each role.
-- Only grants what AdminLayout shows to a role. Nothing else is widened. Idempotent.
--
--   ADM-006  Master COGS: save failed for superadmin and product_admin because the write policy compared
--            user_roles.role = 'admin' literally. has_role(uid,'admin') also counts superadmin.
--   ADM-007  Hero, Gallery and Testimoni (content_admin) upload to the package-images bucket, which only had
--            policies for admin and product_admin. content_admin may now INSERT there, but only under the folders
--            those three pages write to (hero/, gallery/, testimonials/), so it cannot touch package photos.
--            (The `gallery` and `testimonials` buckets are not used by the app and are left alone.)
--   ADM-008  Chat Rotation is in the advertiser menu but whatsapp_cs was writable by admin only.

-- ---------------------------------------------------------------------------------------------------------------
-- ADM-006: cogs_defaults
-- ---------------------------------------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow all access for admin users" ON public.cogs_defaults;
DROP POLICY IF EXISTS "Admins and product admins write cogs defaults" ON public.cogs_defaults;
CREATE POLICY "Admins and product admins write cogs defaults"
  ON public.cogs_defaults
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'product_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'product_admin'::public.app_role));

-- ---------------------------------------------------------------------------------------------------------------
-- ADM-007: content_admin uploads for Hero / Gallery / Testimoni
-- ---------------------------------------------------------------------------------------------------------------
DROP POLICY IF EXISTS "content_admin can upload site images to package-images" ON storage.objects;
CREATE POLICY "content_admin can upload site images to package-images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'package-images'
    AND public.has_role(auth.uid(), 'content_admin'::public.app_role)
    AND (storage.foldername(name))[1] IN ('hero', 'gallery', 'testimonials')
  );

-- ---------------------------------------------------------------------------------------------------------------
-- ADM-008: advertiser manages the WhatsApp CS rotation
-- ---------------------------------------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Advertisers can manage whatsapp_cs" ON public.whatsapp_cs;
CREATE POLICY "Advertisers can manage whatsapp_cs"
  ON public.whatsapp_cs
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'advertiser'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'advertiser'::public.app_role));
