-- Fix security warning: Set search_path for slugify function
CREATE OR REPLACE FUNCTION public.slugify(text_input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
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