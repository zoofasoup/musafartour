-- /lengkapi/<token> holds the private link to a jamaah's passport and ID data. Until now the page view was
-- stored in site_events.path with the token in it. The site now records the route pattern instead
-- (src/lib/privateRoutes.ts: safeTrackingPath); this rewrites the rows already stored. Idempotent.
UPDATE public.site_events
   SET path = '/lengkapi/[token]'
 WHERE path ~ '^/lengkapi/.'
   AND path <> '/lengkapi/[token]';
