-- website_settings already holds address/phone/email/socials and is
-- correctly read by TentangKami.tsx, but had no column for the PPIU
-- license number or bank names - so Footer.tsx, Kontak.tsx, GoogleMap.tsx,
-- AgentSalesGuide.tsx, and HeroSection.tsx each hardcoded their own copy
-- of this info independently (confirmed via grep for the license number
-- across src/). Adds the missing columns and backfills the one real row
-- with the already-confirmed-correct values from this session's prior work.
ALTER TABLE public.website_settings
  ADD COLUMN IF NOT EXISTS ppiu_license_number TEXT,
  ADD COLUMN IF NOT EXISTS company_legal_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_names TEXT[];

-- Only one row exists (deduped earlier this session), so this touches it
-- regardless of id.
UPDATE public.website_settings
SET ppiu_license_number = '17102200953750002',
    company_legal_name = 'PT Musa Amanah Wisata',
    bank_names = ARRAY['BCA', 'BSI', 'BNI'],
    office_hours = COALESCE(NULLIF(office_hours, ''), 'Senin - Jumat: 09.00 - 17.00 WIB, Sabtu: 09.00 - 14.00 WIB, Minggu & Libur: Tutup');
