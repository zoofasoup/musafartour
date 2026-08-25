-- DP is a flat Rp 5.000.000 across every package, not admin-configurable per
-- package - removing the per-package fill-in from PackageForm.tsx and the
-- bulk uploader, so the column just needs the right default/current value.
ALTER TABLE public.packages ALTER COLUMN dp_amount SET DEFAULT 5000000;
UPDATE public.packages SET dp_amount = 5000000 WHERE dp_amount = 0;
