-- Agents can set their own profile photo: `marketing-materials/<agent id>/avatar.jpg` (public bucket, read is already open).
-- Until now only admins could write to this bucket, so the upload from the agent profile was refused. Idempotent.
DROP POLICY IF EXISTS "Agents upload own avatar" ON storage.objects;
CREATE POLICY "Agents upload own avatar" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'marketing-materials'
    AND name = (storage.foldername(name))[1] || '/avatar.jpg'
    AND (storage.foldername(name))[1] IN (SELECT a.id::text FROM public.agents a WHERE a.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Agents replace own avatar" ON storage.objects;
CREATE POLICY "Agents replace own avatar" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'marketing-materials'
    AND name = (storage.foldername(name))[1] || '/avatar.jpg'
    AND (storage.foldername(name))[1] IN (SELECT a.id::text FROM public.agents a WHERE a.user_id = auth.uid())
  )
  WITH CHECK (
    bucket_id = 'marketing-materials'
    AND name = (storage.foldername(name))[1] || '/avatar.jpg'
    AND (storage.foldername(name))[1] IN (SELECT a.id::text FROM public.agents a WHERE a.user_id = auth.uid())
  );
