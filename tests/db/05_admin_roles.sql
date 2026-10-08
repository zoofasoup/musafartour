-- Admin role policy tests: supabase/migrations/20261006150000_admin_role_policies.sql (audit ADM-006, ADM-007, ADM-008).
--
-- Runs against the live linked project, but only inside a transaction that always aborts (the final
-- RAISE EXCEPTION), so nothing is stored. Run with: ./scripts/run-db-tests.sh tests/db/05_admin_roles.sql
--
-- The migration below is applied INSIDE the aborted transaction first (it is idempotent), so these checks prove the
-- migration file's effect before and after it is pushed. KEEP THE COPY IN SYNC with the migration file.
--
-- Report lines start with PASS, FAIL, SKIP or KNOWN. Users for roles that nobody holds in production (admin,
-- content_admin, advertiser, cs_admin, sales) are planted inside the transaction.
--
-- Result kinds: rows (statement worked and touched >= 1 row), norows (no error but RLS hid every row),
-- refused (SQLSTATE 42501).

BEGIN;

-- ===== BEGIN COPY OF supabase/migrations/20261006150000_admin_role_policies.sql =====
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

-- ===== END COPY =====

DO $$
DECLARE
  _out text := '';
  _super uuid;
  _pa uuid;
  _adm uuid; _ca uuid; _adv uuid; _cs uuid; _sales uuid; _none uuid;
  _t record;
  _rc integer;
  _res text;
  _n bigint;
  _cogs_id text;
  _wa_id uuid;
  _planted_wa uuid;
BEGIN
  SELECT user_id INTO _super FROM public.user_roles WHERE role = 'superadmin' LIMIT 1;
  SELECT user_id INTO _pa FROM public.user_roles WHERE role = 'product_admin' LIMIT 1;
  IF _super IS NULL THEN _out := _out || E'SKIP staff: no superadmin in user_roles\n'; END IF;
  IF _pa IS NULL THEN _out := _out || E'SKIP staff: no product_admin in user_roles (checks for it are skipped)\n'; END IF;

  -- Plant one user per role that production does not have.
  FOR _t IN SELECT * FROM (VALUES ('admin'), ('content_admin'), ('advertiser'), ('cs_admin'), ('sales'), ('none')) AS r(role)
  LOOP
    DECLARE _u uuid := gen_random_uuid();
    BEGIN
      INSERT INTO auth.users (id, email, instance_id, aud, role)
      VALUES (_u, 'admrole-' || _u || '@example.invalid', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');
      IF _t.role <> 'none' THEN
        INSERT INTO public.user_roles (user_id, role) VALUES (_u, _t.role::public.app_role);
      END IF;
      IF _t.role = 'admin' THEN _adm := _u;
      ELSIF _t.role = 'content_admin' THEN _ca := _u;
      ELSIF _t.role = 'advertiser' THEN _adv := _u;
      ELSIF _t.role = 'cs_admin' THEN _cs := _u;
      ELSIF _t.role = 'sales' THEN _sales := _u;
      ELSE _none := _u; END IF;
    END;
  END LOOP;

  -- Planted rows the update/delete checks aim at.
  _cogs_id := 'admtest-' || substr(md5(random()::text), 1, 8);
  INSERT INTO public.cogs_defaults (id, data) VALUES (_cogs_id, '{}'::jsonb);
  INSERT INTO public.whatsapp_cs (name, phone_number, is_active) VALUES ('admtest inactive', '620000000000', false) RETURNING id INTO _planted_wa;
  INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('package-images', 'hero/admtest-planted.webp', _super);

  -- ===========================================================================================================
  -- label, who, statement, expected result kind
  -- ===========================================================================================================
  FOR _t IN SELECT * FROM (VALUES
    -- ADM-006 cogs_defaults: owner roles and product_admin write, everybody else does not
    ('cogs: superadmin can update',        _super, format('UPDATE public.cogs_defaults SET data = %L WHERE id = %L', '{"a":1}', _cogs_id), 'rows'),
    ('cogs: superadmin can insert',        _super, format('INSERT INTO public.cogs_defaults (id, data) VALUES (%L, %L)', _cogs_id || 'b', '{}'), 'rows'),
    ('cogs: admin can update',             _adm,   format('UPDATE public.cogs_defaults SET data = %L WHERE id = %L', '{"a":1}', _cogs_id), 'rows'),
    ('cogs: product_admin can update',     _pa,    format('UPDATE public.cogs_defaults SET data = %L WHERE id = %L', '{"a":1}', _cogs_id), 'rows'),
    ('cogs: product_admin can insert',     _pa,    format('INSERT INTO public.cogs_defaults (id, data) VALUES (%L, %L)', _cogs_id || 'c', '{}'), 'rows'),
    ('cogs: content_admin cannot update',  _ca,    format('UPDATE public.cogs_defaults SET data = %L WHERE id = %L', '{"a":1}', _cogs_id), 'norows'),
    ('cogs: content_admin cannot insert',  _ca,    format('INSERT INTO public.cogs_defaults (id, data) VALUES (%L, %L)', _cogs_id || 'd', '{}'), 'refused'),
    ('cogs: cs_admin cannot insert',       _cs,    format('INSERT INTO public.cogs_defaults (id, data) VALUES (%L, %L)', _cogs_id || 'e', '{}'), 'refused'),
    ('cogs: advertiser cannot update',     _adv,   format('UPDATE public.cogs_defaults SET data = %L WHERE id = %L', '{"a":1}', _cogs_id), 'norows'),
    ('cogs: user without role cannot insert', _none, format('INSERT INTO public.cogs_defaults (id, data) VALUES (%L, %L)', _cogs_id || 'f', '{}'), 'refused'),
    -- Changed on purpose (ADM-105, 20261009100000_admin_hardening.sql): only owner and product_admin read the cost basis
    ('cogs: cs_admin can no longer read',  _cs,    format('SELECT 1 FROM public.cogs_defaults WHERE id = %L', _cogs_id), 'norows'),
    ('cogs: product_admin can still read', _pa,    format('SELECT 1 FROM public.cogs_defaults WHERE id = %L', _cogs_id), 'rows'),
    ('cogs: user without role still cannot read', _none, format('SELECT 1 FROM public.cogs_defaults WHERE id = %L', _cogs_id), 'norows'),

    -- ADM-007 storage: content_admin uploads only the folders Hero / Gallery / Testimoni write to
    ('storage: content_admin uploads package-images/hero/',         _ca, $q$INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('package-images', 'hero/admtest-1.webp', auth.uid())$q$, 'rows'),
    ('storage: content_admin uploads package-images/gallery/',      _ca, $q$INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('package-images', 'gallery/admtest-1.webp', auth.uid())$q$, 'rows'),
    ('storage: content_admin uploads package-images/testimonials/', _ca, $q$INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('package-images', 'testimonials/admtest-1.webp', auth.uid())$q$, 'rows'),
    ('storage: content_admin cannot upload package photos (other folder)', _ca, $q$INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('package-images', 'packages/admtest-1.webp', auth.uid())$q$, 'refused'),
    ('storage: content_admin cannot upload at the bucket root',     _ca, $q$INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('package-images', 'admtest-root.webp', auth.uid())$q$, 'refused'),
    ('storage: content_admin cannot overwrite an existing hero file', _ca, $q$UPDATE storage.objects SET metadata = '{}'::jsonb WHERE bucket_id = 'package-images' AND name = 'hero/admtest-planted.webp'$q$, 'norows'),
    ('storage: content_admin still uploads article-images',         _ca, $q$INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('article-images', 'admtest-a.webp', auth.uid())$q$, 'rows'),
    ('storage: product_admin still uploads package-images/packages/', _pa, $q$INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('package-images', 'packages/admtest-2.webp', auth.uid())$q$, 'rows'),
    ('storage: superadmin still uploads package-images',            _super, $q$INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('package-images', 'packages/admtest-3.webp', auth.uid())$q$, 'rows'),
    ('storage: advertiser cannot upload hero/',                     _adv, $q$INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('package-images', 'hero/admtest-4.webp', auth.uid())$q$, 'refused'),
    ('storage: sales cannot upload gallery/',                       _sales, $q$INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('package-images', 'gallery/admtest-5.webp', auth.uid())$q$, 'refused'),
    ('storage: cs_admin cannot upload testimonials/',               _cs, $q$INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('package-images', 'testimonials/admtest-6.webp', auth.uid())$q$, 'refused'),
    ('storage: user without role cannot upload hero/',              _none, $q$INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('package-images', 'hero/admtest-7.webp', auth.uid())$q$, 'refused'),
    ('storage: content_admin gets no access to the gallery bucket (unused by the app)', _ca, $q$INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('gallery', 'admtest-8.webp', auth.uid())$q$, 'refused'),

    -- ADM-008 whatsapp_cs: advertiser manages Chat Rotation; nobody else gains write access
    ('chat rotation: advertiser can insert',          _adv, $q$INSERT INTO public.whatsapp_cs (name, phone_number) VALUES ('admtest adv', '620000000001')$q$, 'rows'),
    ('chat rotation: advertiser can update (inactive row too)', _adv, format('UPDATE public.whatsapp_cs SET name = %L WHERE id = %L', 'renamed', _planted_wa), 'rows'),
    ('chat rotation: advertiser sees inactive numbers', _adv, format('SELECT 1 FROM public.whatsapp_cs WHERE id = %L', _planted_wa), 'rows'),
    ('chat rotation: advertiser can delete',          _adv, format('DELETE FROM public.whatsapp_cs WHERE id = %L', _planted_wa), 'rows'),
    ('chat rotation: superadmin can still update',    _super, format('UPDATE public.whatsapp_cs SET name = %L WHERE id = %L', 'renamed', _planted_wa), 'rows'),
    ('chat rotation: content_admin cannot insert',    _ca,  $q$INSERT INTO public.whatsapp_cs (name, phone_number) VALUES ('admtest ca', '620000000002')$q$, 'refused'),
    ('chat rotation: sales cannot insert',            _sales, $q$INSERT INTO public.whatsapp_cs (name, phone_number) VALUES ('admtest sales', '620000000003')$q$, 'refused'),
    ('chat rotation: cs_admin cannot update',         _cs,  format('UPDATE public.whatsapp_cs SET name = %L WHERE id = %L', 'hack', _planted_wa), 'norows'),
    ('chat rotation: user without role cannot update', _none, format('UPDATE public.whatsapp_cs SET name = %L WHERE id = %L', 'hack', _planted_wa), 'norows'),
    ('chat rotation: user without role cannot see inactive numbers', _none, format('SELECT 1 FROM public.whatsapp_cs WHERE id = %L', _planted_wa), 'norows')
  ) AS x(label, uid, stmt, expect)
  LOOP
    IF _t.uid IS NULL THEN
      _out := _out || format(E'SKIP %s: needed role user is missing\n', _t.label);
      CONTINUE;
    END IF;
    _res := NULL;
    BEGIN
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _t.uid, 'role', 'authenticated')::text, true);
      SET LOCAL ROLE authenticated;
      EXECUTE _t.stmt;
      GET DIAGNOSTICS _rc = ROW_COUNT;
      RESET ROLE;
      _res := CASE WHEN _rc >= 1 THEN 'rows' ELSE 'norows' END;
      -- Roll this statement back so the checks stay independent of each other.
      RAISE EXCEPTION 'done' USING ERRCODE = 'XX001';
    EXCEPTION WHEN OTHERS THEN
      RESET ROLE;
      IF SQLSTATE = '42501' THEN _res := 'refused';
      ELSIF SQLSTATE <> 'XX001' THEN _res := format('error %s (%s)', SQLSTATE, SQLERRM);
      END IF;
    END;
    IF _res = _t.expect THEN
      _out := _out || format(E'PASS %s (%s)\n', _t.label, _res);
    ELSE
      _out := _out || format(E'FAIL %s: expected %s, got %s\n', _t.label, _t.expect, coalesce(_res, 'nothing'));
    END IF;
  END LOOP;

  -- ===========================================================================================================
  -- Nothing else was widened: the policies this migration owns, and the ones it replaced
  -- ===========================================================================================================
  SELECT count(*) INTO _n FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cogs_defaults' AND policyname = 'Allow all access for admin users';
  IF _n = 0 THEN _out := _out || E'PASS cogs: the literal-admin policy is gone\n';
  ELSE _out := _out || E'FAIL cogs: the old literal-admin policy still exists\n'; END IF;

  SELECT count(*) INTO _n FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cogs_defaults';
  IF _n = 2 THEN _out := _out || E'PASS cogs: exactly two policies (staff read, admin/product_admin write)\n';
  ELSE _out := _out || format(E'FAIL cogs: expected 2 policies on cogs_defaults, found %s\n', _n); END IF;

  SELECT count(*) INTO _n FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'content_admin can upload site images to package-images' AND cmd = 'INSERT';
  IF _n = 1 THEN _out := _out || E'PASS storage: content_admin policy is INSERT only (no update, no delete, no list)\n';
  ELSE _out := _out || format(E'FAIL storage: expected one INSERT-only content_admin policy for package-images, found %s\n', _n); END IF;

  RAISE EXCEPTION E'RESULTS\n%', _out;
END
$$;
