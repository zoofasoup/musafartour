-- Add unique constraint on slug for upsert support
-- First update any null slugs
UPDATE public.packages 
SET slug = slugify(package_name) || '-' || to_char(departure_date::date, 'YYYY-MM-DD')
WHERE slug IS NULL OR slug = '';

-- Make slug NOT NULL and UNIQUE
ALTER TABLE public.packages 
  ALTER COLUMN slug SET NOT NULL,
  ALTER COLUMN slug SET DEFAULT '';

-- Add unique index (if duplicates exist, append id suffix)
DO $$
DECLARE
  dup RECORD;
BEGIN
  FOR dup IN 
    SELECT id, slug, ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at) as rn
    FROM public.packages
    WHERE slug IN (SELECT slug FROM public.packages GROUP BY slug HAVING COUNT(*) > 1)
  LOOP
    IF dup.rn > 1 THEN
      UPDATE public.packages SET slug = dup.slug || '-' || dup.rn WHERE id = dup.id;
    END IF;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_packages_slug_unique ON public.packages (slug);
