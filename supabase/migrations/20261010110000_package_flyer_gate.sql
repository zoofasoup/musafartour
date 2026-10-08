-- Alur paket: flyer dibuat setelah harga final, jadi paket tidak boleh Tayang tanpa flyer.
-- Varian flyer (Agen, Lampung, Depok, ...) hanya beda harga dan fitur tambahan, disimpan per paket.
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS flyer_variants jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION public.packages_require_flyer_to_publish() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'published'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published')
     AND coalesce(NEW.banner_image, '') = '' THEN
    RAISE EXCEPTION 'Paket belum bisa Tayang: unggah flyer dulu (langkah 3).' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS packages_require_flyer_to_publish ON public.packages;
CREATE TRIGGER packages_require_flyer_to_publish BEFORE INSERT OR UPDATE OF status ON public.packages
  FOR EACH ROW EXECUTE FUNCTION public.packages_require_flyer_to_publish();
REVOKE EXECUTE ON FUNCTION public.packages_require_flyer_to_publish() FROM PUBLIC, anon, authenticated;
