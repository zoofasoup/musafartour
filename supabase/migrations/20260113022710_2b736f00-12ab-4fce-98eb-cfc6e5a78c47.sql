-- Create table for WhatsApp CS numbers
CREATE TABLE public.whatsapp_cs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  phone_number text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_cs ENABLE ROW LEVEL SECURITY;

-- Admins can manage CS numbers
CREATE POLICY "Admins can manage whatsapp_cs"
  ON public.whatsapp_cs
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Everyone can view active CS numbers (needed for redirect)
CREATE POLICY "Active CS numbers viewable by everyone"
  ON public.whatsapp_cs
  FOR SELECT
  USING (is_active = true);

-- Add trigger for updated_at
CREATE TRIGGER update_whatsapp_cs_updated_at
  BEFORE UPDATE ON public.whatsapp_cs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default CS numbers
INSERT INTO public.whatsapp_cs (name, phone_number, display_order) VALUES
  ('CS #1', '6281234567890', 1),
  ('CS #2', '6281234567891', 2),
  ('CS #3', '6281234567892', 3);