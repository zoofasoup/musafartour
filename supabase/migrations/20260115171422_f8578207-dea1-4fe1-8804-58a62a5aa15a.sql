-- Create marketing_materials table
CREATE TABLE public.marketing_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id UUID REFERENCES public.packages(id) ON DELETE SET NULL,
  category TEXT NOT NULL DEFAULT 'general',
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_size TEXT,
  format TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create agent_short_links table for link shortener
CREATE TABLE public.agent_short_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  short_code TEXT NOT NULL UNIQUE,
  original_url TEXT NOT NULL,
  title TEXT,
  click_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketing_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_short_links ENABLE ROW LEVEL SECURITY;

-- RLS policies for marketing_materials (viewable by all authenticated users)
CREATE POLICY "Marketing materials viewable by authenticated users"
ON public.marketing_materials
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage marketing materials"
ON public.marketing_materials
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for agent_short_links
CREATE POLICY "Agents can view their own links"
ON public.agent_short_links
FOR SELECT
USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Agents can create their own links"
ON public.agent_short_links
FOR INSERT
WITH CHECK (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Agents can update their own links"
ON public.agent_short_links
FOR UPDATE
USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Agents can delete their own links"
ON public.agent_short_links
FOR DELETE
USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all links"
ON public.agent_short_links
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes
CREATE INDEX idx_marketing_materials_category ON public.marketing_materials(category);
CREATE INDEX idx_marketing_materials_package_id ON public.marketing_materials(package_id);
CREATE INDEX idx_agent_short_links_agent_id ON public.agent_short_links(agent_id);
CREATE INDEX idx_agent_short_links_short_code ON public.agent_short_links(short_code);

-- Create storage bucket for marketing materials
INSERT INTO storage.buckets (id, name, public) VALUES ('marketing-materials', 'marketing-materials', true);

-- Storage policies for marketing materials bucket
CREATE POLICY "Marketing materials are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'marketing-materials');

CREATE POLICY "Admins can upload marketing materials"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'marketing-materials' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update marketing materials"
ON storage.objects FOR UPDATE
USING (bucket_id = 'marketing-materials' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete marketing materials"
ON storage.objects FOR DELETE
USING (bucket_id = 'marketing-materials' AND has_role(auth.uid(), 'admin'::app_role));