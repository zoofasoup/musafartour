-- Private bucket for commission transfer proofs (bukti transfer). Idempotent.
-- Path convention: "<agent_id>/<file>". Staff (owner, superadmin, finance) upload when marking a commission paid; the
-- agent can read ONLY the proofs of payouts made to them (a signed URL from the browser: createSignedUrl).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('commission-proofs', 'commission-proofs', false, 10485760,
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Staff upload commission proofs" ON storage.objects;
CREATE POLICY "Staff upload commission proofs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'commission-proofs'
              AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.commission_is_finance(auth.uid())));

DROP POLICY IF EXISTS "Staff read commission proofs" ON storage.objects;
CREATE POLICY "Staff read commission proofs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'commission-proofs' AND public.commission_is_staff(auth.uid()));

DROP POLICY IF EXISTS "Agents read own commission proofs" ON storage.objects;
CREATE POLICY "Agents read own commission proofs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'commission-proofs'
         AND name IN (SELECT po.proof_path FROM public.commission_payouts po
                       JOIN public.agents a ON a.id = po.agent_id
                      WHERE a.user_id = auth.uid() AND po.proof_path IS NOT NULL));
