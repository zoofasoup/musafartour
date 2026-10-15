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

-- An upload inserts the row and reads it back (RETURNING), which needs a SELECT policy too. The bucket's read policy is
-- admin-only ("Admins can list marketing materials"; public URLs do not use it), so the agent needs one for their own file.
DROP POLICY IF EXISTS "Agents read own avatar" ON storage.objects;
CREATE POLICY "Agents read own avatar" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'marketing-materials'
    AND name = (storage.foldername(name))[1] || '/avatar.jpg'
    AND (storage.foldername(name))[1] IN (SELECT a.id::text FROM public.agents a WHERE a.user_id = auth.uid())
  );

-- Removing the photo.
DROP POLICY IF EXISTS "Agents delete own avatar" ON storage.objects;
CREATE POLICY "Agents delete own avatar" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'marketing-materials'
    AND name = (storage.foldername(name))[1] || '/avatar.jpg'
    AND (storage.foldername(name))[1] IN (SELECT a.id::text FROM public.agents a WHERE a.user_id = auth.uid())
  );
