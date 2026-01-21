-- Create table for WhatsApp click tracking
CREATE TABLE public.whatsapp_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cs_id UUID REFERENCES public.whatsapp_cs(id) ON DELETE SET NULL,
  cs_name TEXT NOT NULL,
  clicked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  message TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_hash TEXT
);

-- Create table for WhatsApp conversions (manual tracking)
CREATE TABLE public.whatsapp_conversions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  click_id UUID REFERENCES public.whatsapp_clicks(id) ON DELETE SET NULL,
  cs_id UUID REFERENCES public.whatsapp_cs(id) ON DELETE SET NULL,
  converted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  customer_name TEXT,
  customer_phone TEXT,
  package_name TEXT,
  notes TEXT,
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.whatsapp_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversions ENABLE ROW LEVEL SECURITY;

-- Clicks: public can insert (for tracking), admins can view all
CREATE POLICY "Anyone can insert clicks" 
ON public.whatsapp_clicks 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can view all clicks" 
ON public.whatsapp_clicks 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete clicks" 
ON public.whatsapp_clicks 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Conversions: admins only
CREATE POLICY "Admins can manage conversions" 
ON public.whatsapp_conversions 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for better query performance
CREATE INDEX idx_whatsapp_clicks_cs_id ON public.whatsapp_clicks(cs_id);
CREATE INDEX idx_whatsapp_clicks_clicked_at ON public.whatsapp_clicks(clicked_at);
CREATE INDEX idx_whatsapp_clicks_utm_campaign ON public.whatsapp_clicks(utm_campaign);
CREATE INDEX idx_whatsapp_conversions_cs_id ON public.whatsapp_conversions(cs_id);
CREATE INDEX idx_whatsapp_conversions_converted_at ON public.whatsapp_conversions(converted_at);