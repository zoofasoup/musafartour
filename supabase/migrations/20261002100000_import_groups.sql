-- Families in the old sheet pay once (merged Realisasi cell). The import now creates one group per family,
-- gives the members' opening balances a shared transfer_id (like "Satu rombongan" in the payment dialog),
-- keeps the sheet's row order, and stores the (L)/(P) mark as gender.

CREATE OR REPLACE FUNCTION public.import_jamaah_rows(_package_id uuid, _rows jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  r jsonb;
  v_id uuid;
  v_count integer := 0;
  v_paid numeric;
  v_price numeric;
  v_existing text[];
  v_name text;
  v_key text;
  v_groups jsonb := '{}'::jsonb;     -- group_key -> jamaah_groups.id
  v_transfers jsonb := '{}'::jsonb;  -- group_key -> shared transfer_id
  v_group_id uuid;
  v_transfer_id uuid;
BEGIN
  IF _rows IS NULL OR jsonb_typeof(_rows) <> 'array' THEN
    RAISE EXCEPTION 'Data import harus berupa daftar baris';
  END IF;

  SELECT coalesce(array_agg(lower(btrim(full_name))), ARRAY[]::text[]) INTO v_existing
    FROM public.jamaah_registrations WHERE package_id = _package_id;

  FOR r IN SELECT * FROM jsonb_array_elements(_rows) LOOP
    v_name := btrim(r->>'full_name');
    CONTINUE WHEN v_name IS NULL OR v_name = '' OR lower(v_name) = ANY (v_existing);

    v_paid := coalesce((r->>'paid')::numeric, 0);
    v_price := coalesce((r->>'list_price')::numeric, 0);
    v_key := nullif(btrim(coalesce(r->>'group_key', '')), '');
    v_group_id := NULL;
    v_transfer_id := NULL;

    IF v_key IS NOT NULL THEN
      IF v_groups ? v_key THEN
        v_group_id := (v_groups->>v_key)::uuid;
        v_transfer_id := (v_transfers->>v_key)::uuid;
      ELSE
        INSERT INTO public.jamaah_groups (package_id, name)
        VALUES (_package_id, left(coalesce(nullif(btrim(r->>'group_name'), ''), 'Keluarga ' || v_name), 120))
        RETURNING id INTO v_group_id;
        v_transfer_id := gen_random_uuid();
        v_groups := v_groups || jsonb_build_object(v_key, v_group_id);
        v_transfers := v_transfers || jsonb_build_object(v_key, v_transfer_id);
      END IF;
    END IF;

    INSERT INTO public.jamaah_registrations
      (package_id, group_id, full_name, phone, room_type, list_price, discount, price_note, agent_id, referral_note,
       equipment_size, equipment_taken_at, domicile, start_city, gender, notes, commission_skipped, created_at)
    VALUES
      (_package_id, v_group_id, v_name, nullif(r->>'phone', ''), r->>'room_type', v_price, 0, nullif(r->>'price_note', ''),
       nullif(r->>'agent_id', '')::uuid, nullif(r->>'referral_note', ''), nullif(r->>'equipment_size', ''),
       CASE WHEN coalesce((r->>'equipment_taken')::boolean, false) THEN now() END,
       nullif(r->>'domicile', ''), nullif(r->>'start_city', ''), nullif(r->>'gender', ''), 'Import dari Google Sheet',
       v_price > 0 AND v_paid >= v_price,
       clock_timestamp())  -- one tick per row keeps the sheet's order (now() is the same for the whole call)
    RETURNING id INTO v_id;

    IF v_paid > 0 THEN
      INSERT INTO public.jamaah_payments (registration_id, transfer_id, amount, paid_on, bank_account, notes, status)
      VALUES (v_id, v_transfer_id, v_paid, current_date, 'SALDO_AWAL', 'Realisasi dari Google Sheet (saldo awal)', 'verified');
    END IF;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.import_jamaah_rows(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.import_jamaah_rows(uuid, jsonb) TO authenticated;
