-- Kode tetap per paket (codename), kunci yang sama dengan kolom "Codename" di spreadsheet.
-- Dipakai untuk mencocokkan sheet dengan website tanpa menebak dari tanggal berangkat
-- (beberapa paket berangkat di tanggal yang sama). Format: DDMM/TIER/MASKAPAI/TAHUN.
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS codename text;

UPDATE public.packages SET codename = '2106/HEM/OMA/2026' WHERE id = '5add888d-241a-4370-a1a7-e82fd91e2230' AND codename IS NULL;
UPDATE public.packages SET codename = '2906/PEL/SVA/2026' WHERE id = '2897e021-2484-454a-a50b-14e139336e99' AND codename IS NULL;
UPDATE public.packages SET codename = '3006/PEL/QTR/2026' WHERE id = '6f27fab0-b680-4344-820d-17229ee10f67' AND codename IS NULL;
UPDATE public.packages SET codename = '0307/HEM/GIA/2026' WHERE id = '379a61e1-12e1-4ac3-92f7-a4b87533886d' AND codename IS NULL;
UPDATE public.packages SET codename = '0607/FST/GIA/2026' WHERE id = '76b795b7-baa5-4938-afd8-df379bd39ab0' AND codename IS NULL;
UPDATE public.packages SET codename = '1607/NYA/GIA/2026' WHERE id = '71fa18d6-39fc-4852-8a18-b2a74060d943' AND codename IS NULL;
UPDATE public.packages SET codename = '2907/NYA/GIA/2026' WHERE id = '244b72ef-c508-4974-b10a-3bec6c7c86d4' AND codename IS NULL;
UPDATE public.packages SET codename = '0508/NYA/GIA/2026' WHERE id = '1e22efac-c2a9-424b-b6bf-66cedba60f5f' AND codename IS NULL;
UPDATE public.packages SET codename = '1208/NYA/GIA/2026' WHERE id = 'bd652778-f162-424b-908f-34fc5f3c9a37' AND codename IS NULL;
UPDATE public.packages SET codename = '0209/NYA/GIA/2026' WHERE id = '4e793fec-9cf1-4103-b424-4f85383cabc4' AND codename IS NULL;
UPDATE public.packages SET codename = '1609/FST/GIA/2026' WHERE id = '16a7b97e-6bbd-4519-80af-ee417e2b4fc1' AND codename IS NULL;
UPDATE public.packages SET codename = '2309/HEM/GIA/2026' WHERE id = 'bb795f44-60fe-4a87-b526-444b5bab288b' AND codename IS NULL;
UPDATE public.packages SET codename = '1110/HEM/SVA/2026' WHERE id = '58bd6fb6-9dce-4a2f-8844-9856416c4cd4' AND codename IS NULL;
UPDATE public.packages SET codename = '2010/PEL/SVA/2026' WHERE id = '6633167a-e0e1-49e7-a40c-5545d3bc36bf' AND codename IS NULL;
UPDATE public.packages SET codename = '2710/PEL/SVA/2026' WHERE id = '89a90fb3-5377-4a08-9ae7-2d958eae34d4' AND codename IS NULL;
UPDATE public.packages SET codename = '0411/PEL/SVA/2026' WHERE id = 'ed001c4c-cf6b-41c7-90b1-29e29b887385' AND codename IS NULL;
UPDATE public.packages SET codename = '0511/PEL/QTR/2026' WHERE id = 'bffada54-3154-40df-b59d-9fad09b031b8' AND codename IS NULL;
UPDATE public.packages SET codename = '1611/NYA/OMA/2026' WHERE id = '7a585a60-9fef-48ef-bcca-e9926436bac2' AND codename IS NULL;
UPDATE public.packages SET codename = '2511/HEM/GIA/2026' WHERE id = 'ddb6f5dc-0991-455e-99b8-aec9ddd8087a' AND codename IS NULL;
UPDATE public.packages SET codename = '2611/HEM/SVA/2026' WHERE id = 'e47546b3-c71c-48be-8f46-7348b05c3544' AND codename IS NULL;
UPDATE public.packages SET codename = '2812/NYA/OMA/2026' WHERE id = '36b98f70-f9cb-4050-9735-5f79ce9c12f9' AND codename IS NULL;
UPDATE public.packages SET codename = '0401/NYA/SVA/2027' WHERE id = '3c00ad4f-1c5c-44f9-bb26-d8e8e2a054a6' AND codename IS NULL;
UPDATE public.packages SET codename = '0601/PEL/SVA/2027' WHERE id = '27f07646-236d-4b51-8fd0-bcebd3b4fe63' AND codename IS NULL;
UPDATE public.packages SET codename = '1001/NYA/OMA/2027' WHERE id = 'ffea1e3a-cf48-4916-8bdc-8e7e6dfd6192' AND codename IS NULL;
UPDATE public.packages SET codename = '1401/FST/SVA/2027' WHERE id = '7ec8963d-075a-4239-a2a7-11d8167447bc' AND codename IS NULL;
UPDATE public.packages SET codename = '2201/HEM/SVA/2027' WHERE id = '31ba5759-2e82-41fa-a187-0b8e8180d022' AND codename IS NULL;
UPDATE public.packages SET codename = '2301/NYA/SVA/2027' WHERE id = 'ca86bb9b-aad5-4ff4-a7bf-e9b29b9b2f35' AND codename IS NULL;
UPDATE public.packages SET codename = '2301/FST/SVA/2027' WHERE id = 'c00c50aa-4c36-4dfb-8be2-49433f4e48a3' AND codename IS NULL;
UPDATE public.packages SET codename = '2601/NYA/SVA/2027' WHERE id = '76eaec79-5e7f-47e1-85f0-81cb5780b97a' AND codename IS NULL;
UPDATE public.packages SET codename = '0402/NYA/SVA/2027' WHERE id = '3d5baac7-834b-4921-b142-8f9f03b17e8b' AND codename IS NULL;
UPDATE public.packages SET codename = '0902/HEM/SVA/2027' WHERE id = 'f0d26cab-df52-4d9c-89bd-9cbb9cdf66c7' AND codename IS NULL;
UPDATE public.packages SET codename = '1503/NYA/SVA/2027' WHERE id = '2dfef07e-0a4b-4c04-aaac-e0d88f140517' AND codename IS NULL;
UPDATE public.packages SET codename = '1803/NYA/SVA/2027' WHERE id = '9042b085-0456-43b1-bd6c-b89ca48a0ac5' AND codename IS NULL;
UPDATE public.packages SET codename = '1803/PEL/SVA/2027' WHERE id = '3a80b5c5-06f2-487d-afe9-c119931752a2' AND codename IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS packages_codename_key ON public.packages (codename) WHERE codename IS NOT NULL;

-- Kode dibuat otomatis untuk paket baru bila belum diisi, supaya tidak ada paket tanpa kunci.
CREATE OR REPLACE FUNCTION public.packages_default_codename() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_tier text; v_air text; v_base text; v_code text; v_i int := 1;
BEGIN
  IF NEW.codename IS NOT NULL AND NEW.codename <> '' THEN RETURN NEW; END IF;
  IF NEW.departure_date IS NULL THEN RETURN NEW; END IF;
  v_tier := CASE lower(coalesce(NEW.available_tiers[1], ''))
    WHEN 'hemat' THEN 'HEM' WHEN 'nyaman' THEN 'NYA' WHEN 'five-star' THEN 'FST'
    WHEN 'pelataran' THEN 'PEL' WHEN 'pelataran-hemat' THEN 'PEL' ELSE 'PKT' END;
  v_air := CASE
    WHEN lower(coalesce(NEW.flight, '')) LIKE '%oman%' THEN 'OMA'
    WHEN lower(coalesce(NEW.flight, '')) LIKE '%saudia%' THEN 'SVA'
    WHEN lower(coalesce(NEW.flight, '')) LIKE '%qatar%' THEN 'QTR'
    WHEN lower(coalesce(NEW.flight, '')) LIKE '%garuda%' THEN 'GIA'
    ELSE 'XXX' END;
  v_base := to_char(NEW.departure_date, 'DDMM') || '/' || v_tier || '/' || v_air || '/' || to_char(NEW.departure_date, 'YYYY');
  v_code := v_base;
  WHILE EXISTS (SELECT 1 FROM public.packages WHERE codename = v_code AND id <> NEW.id) LOOP
    v_i := v_i + 1; v_code := v_base || '-' || v_i;
  END LOOP;
  NEW.codename := v_code;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS packages_default_codename ON public.packages;
CREATE TRIGGER packages_default_codename BEFORE INSERT ON public.packages
  FOR EACH ROW EXECUTE FUNCTION public.packages_default_codename();
REVOKE EXECUTE ON FUNCTION public.packages_default_codename() FROM PUBLIC, anon, authenticated;
