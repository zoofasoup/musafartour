-- Create table for admin short links (broadcast follow-up)
CREATE TABLE public.short_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  short_code TEXT NOT NULL UNIQUE,
  original_url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  click_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.short_links ENABLE ROW LEVEL SECURITY;

-- Create index for fast lookup
CREATE INDEX idx_short_links_short_code ON public.short_links(short_code);
CREATE INDEX idx_short_links_active ON public.short_links(is_active);

-- RLS policies - Admins can manage all links
CREATE POLICY "Admins can view all short links"
ON public.short_links
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create short links"
ON public.short_links
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update short links"
ON public.short_links
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete short links"
ON public.short_links
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Public can read active links (for redirect edge function with service role)
CREATE POLICY "Public can read active links"
ON public.short_links
FOR SELECT
USING (is_active = true);

-- Create click tracking table for analytics
CREATE TABLE public.short_link_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id UUID NOT NULL REFERENCES public.short_links(id) ON DELETE CASCADE,
  clicked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_agent TEXT,
  referer TEXT,
  ip_hash TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT
);

-- Enable RLS
ALTER TABLE public.short_link_clicks ENABLE ROW LEVEL SECURITY;

-- Indexes for analytics queries
CREATE INDEX idx_short_link_clicks_link_id ON public.short_link_clicks(link_id);
CREATE INDEX idx_short_link_clicks_date ON public.short_link_clicks(clicked_at);

-- RLS policies
CREATE POLICY "Admins can view click analytics"
ON public.short_link_clicks
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger to update updated_at
CREATE TRIGGER update_short_links_updated_at
BEFORE UPDATE ON public.short_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();