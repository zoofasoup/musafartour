-- Komisi agen: Rp 1.500.000 per jamaah, sama untuk semua paket (keputusan pemilik, 6 Okt 2026).
-- Komisi tercatat saat jamaah lunas (sync_registration_commission membaca packages.agent_commission_amount).
-- Paket baru yang tidak mengisi kolom ini ikut mendapat nilai yang sama.
ALTER TABLE public.packages ALTER COLUMN agent_commission_amount SET DEFAULT 1500000;

UPDATE public.packages
   SET agent_commission_amount = 1500000
 WHERE agent_commission_amount IS DISTINCT FROM 1500000;
