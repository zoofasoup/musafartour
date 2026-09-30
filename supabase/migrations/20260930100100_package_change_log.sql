-- The website is now the only source of truth for package data (the Google Sheet
-- import is retired), so every change has to be traceable to a person.
--
-- 1. package_change_log: one row per insert/update/delete on packages, with the
--    changed fields (old -> new), who did it, and an optional reason. Written only
--    by the trigger below, so it cannot be skipped or edited from the admin panel.
-- 2. packages.change_reason: the admin form puts "Alasan perubahan" here when a
--    Final or published package is edited. The trigger moves it into the log and
--    clears it, so it never goes stale on the row.
-- 3. Status now has three values: draft -> final -> published. Public pages still
--    only read 'published', so 'final' packages stay off the website.
-- 4. product_contributor can view every package (including drafts) and the log,
--    but has no write policy anywhere, so the database rejects their edits.

ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS change_reason text;

CREATE TABLE IF NOT EXISTS public.package_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- No foreign key: the log must survive the package being deleted.
  package_id uuid NOT NULL,
  package_label text,
  action text NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
  -- { "field": { "old": ..., "new": ... } }; a delete stores { "_snapshot": <row> }.
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text,
  -- NULL actor = a system job (e.g. the nightly seat sync, booking payments).
  actor_id uuid,
  actor_email text,
  actor_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS package_change_log_package_idx
  ON public.package_change_log (package_id, created_at DESC);
CREATE INDEX IF NOT EXISTS package_change_log_created_idx
  ON public.package_change_log (created_at DESC);

ALTER TABLE public.package_change_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.package_change_log FROM anon;

-- Read-only for the product team. There is deliberately no INSERT/UPDATE/DELETE
-- policy: only the SECURITY DEFINER trigger writes here.
CREATE POLICY "Product team can view package change log" ON public.package_change_log
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'product_admin'::app_role)
    OR has_role(auth.uid(), 'product_contributor'::app_role)
  );

CREATE POLICY "product_contributor can view all packages" ON public.packages
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'product_contributor'::app_role));

CREATE OR REPLACE FUNCTION public.log_package_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_email text;
  v_name text;
  v_reason text;
  v_old jsonb;
  v_new jsonb;
  v_diff jsonb := '{}'::jsonb;
  v_key text;
  -- Bookkeeping columns that change on every save and carry no meaning.
  v_ignored text[] := ARRAY['updated_at', 'change_reason'];
BEGIN
  IF v_actor IS NOT NULL THEN
    SELECT u.email,
           coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name')
      INTO v_email, v_name
      FROM auth.users u
     WHERE u.id = v_actor;
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.package_change_log
      (package_id, package_label, action, changes, reason, actor_id, actor_email, actor_name)
    VALUES
      (OLD.id, OLD.package_name || ' · ' || OLD.departure_date::text, 'delete',
       jsonb_build_object('_snapshot', to_jsonb(OLD)), OLD.change_reason, v_actor, v_email, v_name);
    RETURN OLD;
  END IF;

  v_reason := nullif(btrim(NEW.change_reason), '');
  NEW.change_reason := NULL;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.package_change_log
      (package_id, package_label, action, changes, reason, actor_id, actor_email, actor_name)
    VALUES
      (NEW.id, NEW.package_name || ' · ' || NEW.departure_date::text, 'insert',
       '{}'::jsonb, v_reason, v_actor, v_email, v_name);
    RETURN NEW;
  END IF;

  -- UPDATE: record only the fields that actually changed.
  v_old := to_jsonb(OLD) - v_ignored;
  v_new := to_jsonb(NEW) - v_ignored;
  FOR v_key IN SELECT jsonb_object_keys(v_new) LOOP
    IF (v_old -> v_key) IS DISTINCT FROM (v_new -> v_key) THEN
      v_diff := v_diff || jsonb_build_object(
        v_key, jsonb_build_object('old', v_old -> v_key, 'new', v_new -> v_key)
      );
    END IF;
  END LOOP;

  IF v_diff <> '{}'::jsonb THEN
    INSERT INTO public.package_change_log
      (package_id, package_label, action, changes, reason, actor_id, actor_email, actor_name)
    VALUES
      (NEW.id, NEW.package_name || ' · ' || NEW.departure_date::text, 'update',
       v_diff, v_reason, v_actor, v_email, v_name);
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.log_package_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS log_package_change ON public.packages;
CREATE TRIGGER log_package_change
  BEFORE INSERT OR UPDATE OR DELETE ON public.packages
  FOR EACH ROW EXECUTE FUNCTION public.log_package_change();
