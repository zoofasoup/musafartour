-- articles.status was only ever draft/published, toggled by hand, with no
-- way to queue a post for a future date - confirmed no scheduling column
-- and no cron/edge function anywhere that would auto-publish later.
-- publish_at lets marketing set status to 'published' ahead of time while
-- the article stays invisible to the public until that moment; enforced in
-- RLS (not just filtered out of the list query client-side), so a
-- scheduled article isn't accessible by direct URL either.
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS publish_at TIMESTAMP WITH TIME ZONE;

DROP POLICY IF EXISTS "Published articles viewable by everyone" ON public.articles;

CREATE POLICY "Published articles viewable by everyone"
ON public.articles
FOR SELECT
USING (status = 'published' AND (publish_at IS NULL OR publish_at <= now()));
