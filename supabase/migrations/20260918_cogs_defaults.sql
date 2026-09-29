CREATE TABLE IF NOT EXISTS public.cogs_defaults (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.cogs_defaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access for authenticated users" ON public.cogs_defaults
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all access for admin users" ON public.cogs_defaults
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Insert initial template data
INSERT INTO public.cogs_defaults (id, data) VALUES (
  'default',
  '{"rates": {"sar_usd": 3.75, "usd_idr": 16000}, "version": "2.0", "lain_lain": [{"id": "l1", "quad": 1500000, "name": "Fee Marketing", "double": 1500000, "triple": 1500000}, {"id": "l2", "quad": 1500000, "name": "Fee Agent", "double": 1500000, "triple": 1500000}, {"id": "l3", "quad": 500000, "name": "Gimmick Fee", "double": 500000, "triple": 500000}, {"id": "l4", "quad": 3000000, "name": "Margin (Profit)", "double": 3000000, "triple": 3000000}], "pricing": {"harga_jual": {"quad": 32400000, "double": 35400000, "triple": 33400000}, "harga_diskon": {"quad": 0, "double": 0, "triple": 0}}, "indo_expenses": {"add_ons": [], "esensial": [{"id": "e1", "quad": 15500000, "name": "Tiket Pesawat", "double": 15500000, "triple": 15500000, "checked": true, "provider": "Garuda Indonesia"}, {"id": "e2", "quad": 1500000, "name": "Perlengkapan", "double": 1500000, "triple": 1500000, "checked": true}, {"id": "e3", "quad": 200000, "name": "Asuransi", "double": 200000, "triple": 200000, "checked": true}, {"id": "e4", "quad": 250000, "name": "Lounge Bandara", "double": 250000, "triple": 250000, "checked": true}]}, "land_arrangement": {"visa": [{"id": "v1", "quad": 212, "name": "Visa Umroh", "double": 212, "triple": 212}, {"id": "v2", "quad": 0, "name": "Asuransi Saudi", "double": 0, "triple": 0}, {"id": "v3", "quad": 0, "name": "Asuransi Siskopatuh", "double": 0, "triple": 0}], "hotels": [{"id": "h1", "city": "Makkah", "name": "", "type": "FB", "dur_d": 4, "dur_n": 4, "quad": 505, "double": 405, "triple": 455}, {"id": "h2", "city": "Madinah", "name": "", "type": "FB", "dur_d": 3, "dur_n": 3, "quad": 530, "double": 310, "triple": 355}], "handling": [{"id": "hn1", "quad": 0, "name": "Mutawif/ah", "double": 0, "triple": 0}, {"id": "hn2", "quad": 0, "name": "Snack", "double": 0, "triple": 0}, {"id": "hn3", "quad": 75, "name": "Zam - zam 5L", "double": 75, "triple": 75}, {"id": "hn4", "quad": 20, "name": "Koper Mutawif", "double": 20, "triple": 20}, {"id": "hn5", "quad": 65, "name": "Handling Saudi", "double": 65, "triple": 65}]}}'::jsonb
) ON CONFLICT (id) DO NOTHING;
