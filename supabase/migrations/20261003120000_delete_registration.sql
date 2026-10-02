-- Owner-only permanent delete of one jamaah, for test data and mistakes.
--
-- SECURITY INVOKER: row level security decides, and only the owner (admin / superadmin) may delete registrations,
-- so CS calling this gets nothing deleted. A jamaah with ANY payment record is refused: money records are never
-- removed as a side effect, they have to be dealt with first. The audit trail keeps a snapshot of what was deleted.
--
-- Also removes what would otherwise be left behind: the family if it is now empty, and the form registration
-- (and its private link) if no other jamaah came from it. Returns the document paths so the app can delete the files.

-- Owner may remove a form registration (the function below does it when its last jamaah is deleted).
GRANT DELETE ON public.jamaah_intakes TO authenticated;
CREATE POLICY "Owner deletes intakes" ON public.jamaah_intakes FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.delete_jamaah_registration(_registration_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_reg public.jamaah_registrations%ROWTYPE;
  v_paths text[];
  v_deleted integer;
BEGIN
  SELECT * INTO v_reg FROM public.jamaah_registrations WHERE id = _registration_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Jamaah tidak ditemukan.'; END IF;

  IF EXISTS (SELECT 1 FROM public.jamaah_payments WHERE registration_id = _registration_id) THEN
    RAISE EXCEPTION 'Jamaah ini punya catatan pembayaran. Hapus catatan pembayarannya dulu, atau gunakan status Batal.';
  END IF;

  v_paths := ARRAY(SELECT p FROM unnest(ARRAY[v_reg.ktp_path, v_reg.passport_path, v_reg.photo_path]) AS p WHERE p IS NOT NULL);

  DELETE FROM public.jamaah_registrations WHERE id = _registration_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  IF v_deleted = 0 THEN RAISE EXCEPTION 'Hanya owner yang bisa menghapus jamaah.'; END IF;

  IF v_reg.group_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.jamaah_registrations WHERE group_id = v_reg.group_id) THEN
    DELETE FROM public.jamaah_groups WHERE id = v_reg.group_id;
  END IF;

  IF v_reg.intake_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.jamaah_registrations WHERE intake_id = v_reg.intake_id) THEN
    DELETE FROM public.jamaah_intakes WHERE id = v_reg.intake_id;
  END IF;

  RETURN jsonb_build_object('paths', to_jsonb(v_paths));
END;
$$;

REVOKE ALL ON FUNCTION public.delete_jamaah_registration(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_jamaah_registration(uuid) TO authenticated;
