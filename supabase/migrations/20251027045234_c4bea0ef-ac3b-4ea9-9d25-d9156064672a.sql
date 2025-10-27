-- Add slug column to packages table
ALTER TABLE packages ADD COLUMN slug text UNIQUE;

-- Create index for faster slug lookups
CREATE INDEX idx_packages_slug ON packages(slug);

-- Create function to generate slug from text
CREATE OR REPLACE FUNCTION public.slugify(text_input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  slug text;
BEGIN
  -- Convert to lowercase
  slug := lower(text_input);
  
  -- Replace spaces and underscores with hyphens
  slug := regexp_replace(slug, '[\s_]+', '-', 'g');
  
  -- Remove special characters except hyphens and alphanumeric
  slug := regexp_replace(slug, '[^a-z0-9-]', '', 'g');
  
  -- Remove multiple consecutive hyphens
  slug := regexp_replace(slug, '-+', '-', 'g');
  
  -- Trim hyphens from start and end
  slug := trim(both '-' from slug);
  
  RETURN slug;
END;
$$;

-- Generate slugs for existing packages (append ID for uniqueness)
UPDATE packages 
SET slug = slugify(package_name) || '-' || substring(id::text from 1 for 8)
WHERE slug IS NULL;