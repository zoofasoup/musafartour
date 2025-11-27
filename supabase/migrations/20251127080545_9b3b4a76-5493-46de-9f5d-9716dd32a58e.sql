-- Create marketing_settings table
CREATE TABLE public.marketing_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meta_pixel_id text,
  meta_pixel_enabled boolean NOT NULL DEFAULT false,
  tiktok_pixel_id text,
  tiktok_pixel_enabled boolean NOT NULL DEFAULT false,
  ga4_id text,
  ga4_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.marketing_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Marketing settings viewable by everyone"
ON public.marketing_settings
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage marketing settings"
ON public.marketing_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_marketing_settings_updated_at
BEFORE UPDATE ON public.marketing_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();