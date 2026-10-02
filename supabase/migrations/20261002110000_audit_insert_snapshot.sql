-- History needs to say WHAT was recorded, not only that something was: a new payment's amount and bank,
-- a new registration's details. Inserts now keep the new row under "_snapshot" like deletes already did.
-- (Updates keep { field: { old, new } }.) Older insert entries have no snapshot; the app falls back to the row itself.

CREATE OR REPLACE FUNCTION public.log_jamaah_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_email text;
  v_name text;
  v_old jsonb := CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) - ARRAY['updated_at'] END;
  v_new jsonb := CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) - ARRAY['updated_at'] END;
  v_diff jsonb := '{}'::jsonb;
  v_key text;
  v_row jsonb := coalesce(v_new, v_old);
BEGIN
  IF v_actor IS NOT NULL THEN
    SELECT u.email, coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name')
      INTO v_email, v_name FROM auth.users u WHERE u.id = v_actor;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    FOR v_key IN SELECT jsonb_object_keys(v_new) LOOP
      IF (v_old -> v_key) IS DISTINCT FROM (v_new -> v_key) THEN
        v_diff := v_diff || jsonb_build_object(v_key, jsonb_build_object('old', v_old -> v_key, 'new', v_new -> v_key));
      END IF;
    END LOOP;
    IF v_diff = '{}'::jsonb THEN RETURN NULL; END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_diff := jsonb_build_object('_snapshot', v_old);
  ELSE
    v_diff := jsonb_build_object('_snapshot', v_new);
  END IF;

  INSERT INTO public.jamaah_audit_log
    (table_name, row_id, registration_id, action, changes, actor_id, actor_email, actor_name)
  VALUES
    (TG_TABLE_NAME, (v_row ->> 'id')::uuid,
     CASE TG_TABLE_NAME WHEN 'jamaah_registrations' THEN (v_row ->> 'id')::uuid
                        WHEN 'jamaah_payments' THEN (v_row ->> 'registration_id')::uuid END,
     lower(TG_OP), v_diff, v_actor, v_email, v_name);
  RETURN NULL;
END;
$$;
