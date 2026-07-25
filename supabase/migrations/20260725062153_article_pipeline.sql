-- Auto-article engine state: topics never repeat and every run is logged,
-- since the pipeline runs unattended on a daily cron with no human editor
-- to catch a silently-repeating or silently-failing run.

CREATE TABLE public.article_pipeline_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL DEFAULT 'evergreen' CHECK (kind IN ('evergreen', 'trending')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'skipped')),
  skip_reason TEXT,
  article_id UUID REFERENCES public.articles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_article_pipeline_topics_status ON public.article_pipeline_topics(status, kind, created_at);

CREATE TABLE public.article_pipeline_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_date DATE NOT NULL DEFAULT CURRENT_DATE,
  publish_status TEXT NOT NULL,
  topics_attempted INT NOT NULL DEFAULT 0,
  articles_published INT NOT NULL DEFAULT 0,
  articles_skipped INT NOT NULL DEFAULT 0,
  regenerations INT NOT NULL DEFAULT 0,
  trending_used BOOLEAN NOT NULL DEFAULT false,
  details JSONB NOT NULL DEFAULT '[]'::jsonb,
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

CREATE INDEX idx_article_pipeline_runs_date ON public.article_pipeline_runs(run_date DESC);

ALTER TABLE public.article_pipeline_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_pipeline_runs ENABLE ROW LEVEL SECURITY;

-- Admin-only visibility; the pipeline itself writes via the service role key,
-- which bypasses RLS, so no policy needs to grant write access to any app role.
CREATE POLICY "Admins can view pipeline topics" ON public.article_pipeline_topics
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'content_admin'::app_role));

CREATE POLICY "Admins can manage pipeline topics" ON public.article_pipeline_topics
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view pipeline runs" ON public.article_pipeline_runs
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'content_admin'::app_role));

CREATE TRIGGER update_article_pipeline_topics_updated_at
  BEFORE UPDATE ON public.article_pipeline_topics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Traceability: which published articles came from the unattended pipeline
-- vs. a human writer, and which run produced them.
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pipeline_run_id UUID REFERENCES public.article_pipeline_runs(id) ON DELETE SET NULL;

-- Evergreen umroh topic backlog. Deliberately avoids anything price-specific
-- or ruling-specific (fiqh) since those are handled as in-article safety
-- rails, not topic-level exclusions, and a topic like "biaya umroh 2026"
-- would push the model toward a number the site can't stand behind.
INSERT INTO public.article_pipeline_topics (topic, kind) VALUES
  ('Persiapan fisik sebelum berangkat umroh untuk jamaah lanjut usia', 'evergreen'),
  ('Daftar barang bawaan umroh yang sering terlupa', 'evergreen'),
  ('Perbedaan umroh reguler dan umroh plus wisata halal', 'evergreen'),
  ('Panduan memilih koper dan tas yang cocok untuk perjalanan umroh', 'evergreen'),
  ('Adab dan etika selama berada di Masjidil Haram', 'evergreen'),
  ('Tips menjaga stamina selama rangkaian ibadah umroh', 'evergreen'),
  ('Cara memilih travel umroh yang terpercaya dan berizin resmi', 'evergreen'),
  ('Persiapan mental menjelang keberangkatan umroh pertama kali', 'evergreen'),
  ('Panduan pakaian ihram untuk jamaah pria dan wanita', 'evergreen'),
  ('Makanan yang sebaiknya dibawa dan dihindari selama perjalanan umroh', 'evergreen'),
  ('Tips menjaga kesehatan di cuaca panas Arab Saudi', 'evergreen'),
  ('Panduan dokumen dan persyaratan administrasi keberangkatan umroh', 'evergreen'),
  ('Perbedaan suasana umroh di musim ramai dan musim sepi', 'evergreen'),
  ('Tips fotografi dan dokumentasi perjalanan umroh yang santun', 'evergreen'),
  ('Cara mempersiapkan keluarga yang ditinggal selama umroh', 'evergreen'),
  ('Panduan komunikasi dan internet selama berada di Arab Saudi', 'evergreen'),
  ('Tips packing efisien untuk perjalanan umroh 9 hari', 'evergreen'),
  ('Perbedaan pengalaman umroh saat berangkat sendiri dan berkelompok', 'evergreen'),
  ('Panduan menjaga kekhusyukan ibadah di tengah keramaian jamaah', 'evergreen'),
  ('Tips memilih waktu terbaik untuk berangkat umroh sepanjang tahun', 'evergreen'),
  ('Cara mempersiapkan anak yang ikut serta dalam perjalanan umroh', 'evergreen'),
  ('Panduan etika berbelanja oleh-oleh di sekitar Masjidil Haram', 'evergreen'),
  ('Tips menjaga kondisi tubuh saat menjalani ibadah sai', 'evergreen'),
  ('Perlengkapan kesehatan pribadi yang wajib dibawa jamaah umroh', 'evergreen'),
  ('Panduan adaptasi jet lag sebelum dan sesudah perjalanan umroh', 'evergreen'),
  ('Cara memilih pembimbing ibadah yang berpengalaman', 'evergreen'),
  ('Tips menjaga kebersamaan rombongan selama perjalanan umroh', 'evergreen'),
  ('Panduan berpakaian nyaman namun sopan selama perjalanan umroh', 'evergreen'),
  ('Persiapan finansial dan menabung untuk keberangkatan umroh', 'evergreen'),
  ('Tips menjaga niat dan fokus ibadah sejak sebelum keberangkatan', 'evergreen'),
  ('Panduan penginapan dan hotel selama rangkaian perjalanan umroh', 'evergreen'),
  ('Cara mempersiapkan fisik untuk banyak berjalan kaki selama umroh', 'evergreen'),
  ('Tips menjaga hubungan baik dengan sesama jamaah satu rombongan', 'evergreen'),
  ('Panduan ziarah tempat-tempat bersejarah di Makkah dan Madinah', 'evergreen'),
  ('Perbedaan pengalaman umroh di Makkah dan di Madinah', 'evergreen'),
  ('Tips memilih maskapai dan rute penerbangan untuk umroh', 'evergreen'),
  ('Panduan menjaga kesehatan pencernaan selama di Arab Saudi', 'evergreen'),
  ('Cara mempersiapkan diri menghadapi cuaca dingin di malam hari', 'evergreen'),
  ('Tips packing obat-obatan pribadi untuk perjalanan umroh', 'evergreen'),
  ('Panduan menjaga adab saat berada di Raudhah', 'evergreen'),
  ('Cara memilih paket umroh sesuai kebutuhan keluarga', 'evergreen'),
  ('Tips beradaptasi dengan perbedaan budaya selama di Arab Saudi', 'evergreen'),
  ('Panduan menjaga kebugaran pasca perjalanan umroh setelah pulang', 'evergreen'),
  ('Cara mempersiapkan diri untuk umroh di bulan Ramadhan', 'evergreen'),
  ('Tips menjaga barang berharga dan dokumen selama perjalanan', 'evergreen'),
  ('Panduan memilih perlengkapan ibadah yang praktis dibawa', 'evergreen'),
  ('Cara mempersiapkan diri secara spiritual sebelum umroh', 'evergreen'),
  ('Tips menjaga silaturahmi dengan sesama jamaah setelah pulang umroh', 'evergreen'),
  ('Panduan etika dan sopan santun di dalam pesawat menuju Arab Saudi', 'evergreen'),
  ('Cara memilih waktu istirahat yang tepat di sela rangkaian ibadah', 'evergreen')
ON CONFLICT (topic) DO NOTHING;
