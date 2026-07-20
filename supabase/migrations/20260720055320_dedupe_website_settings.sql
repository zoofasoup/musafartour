-- website_settings is meant to be a singleton row, but a stray incomplete
-- duplicate (address/social links all null) existed alongside the real,
-- fully-populated row. The fetch query (.limit(1).maybeSingle(), no ORDER
-- BY) could non-deterministically return either one. Keep the complete row,
-- drop the incomplete duplicate.
DELETE FROM public.website_settings
WHERE id = '9daa99bd-fd8b-4fa9-8293-073a4b070c79'
  AND address IS NULL;
