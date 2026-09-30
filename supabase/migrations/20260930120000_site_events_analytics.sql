-- First-party analytics for the admin Analytics dashboard.
--
-- The site already stored WhatsApp clicks, calculator leads, conversions, bookings
-- and ad spend, but nothing about traffic: no page views, package views or cart
-- adds, so there was no funnel. site_events records those, with an anonymous
-- random visitor id (localStorage) and session id (sessionStorage). No names,
-- phone numbers, IPs or message text are stored.
--
-- Unlike the ad pixels (once per person), every occurrence is recorded here, so
-- the dashboard can show both totals and unique people.

CREATE TABLE IF NOT EXISTS public.site_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  visitor_id uuid NOT NULL,
  session_id uuid NOT NULL,
  event text NOT NULL CHECK (event IN ('page_view', 'view_content', 'add_to_cart', 'lead')),
  path text NOT NULL CHECK (char_length(path) <= 300),
  package_id uuid,
  lead_source text CHECK (char_length(lead_source) <= 60),
  -- Session attribution, captured on the first page of the visit.
  utm_source text CHECK (char_length(utm_source) <= 150),
  utm_medium text CHECK (char_length(utm_medium) <= 150),
  utm_campaign text CHECK (char_length(utm_campaign) <= 150),
  referrer_host text CHECK (char_length(referrer_host) <= 150),
  device text CHECK (device IN ('mobile', 'tablet', 'desktop'))
);

CREATE INDEX IF NOT EXISTS site_events_created_idx ON public.site_events (created_at);
CREATE INDEX IF NOT EXISTS site_events_event_created_idx ON public.site_events (event, created_at);

-- Visitors may only append; the timestamp is always the server's, so a client
-- can't backfill or post-date events.
CREATE OR REPLACE FUNCTION public.site_events_stamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.created_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS site_events_stamp ON public.site_events;
CREATE TRIGGER site_events_stamp BEFORE INSERT ON public.site_events
  FOR EACH ROW EXECUTE FUNCTION public.site_events_stamp();

ALTER TABLE public.site_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.site_events FROM anon, authenticated;
GRANT INSERT ON public.site_events TO anon, authenticated;

CREATE POLICY "Visitors can record site events" ON public.site_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Raw rows are never read directly; the dashboard goes through the summary function.

/**
 * Everything the Analytics dashboard shows for [_from, _to), as one JSON object.
 * Days and hours are in Asia/Jakarta. Admin, superadmin and advertiser only.
 */
CREATE OR REPLACE FUNCTION public.get_analytics_summary(_from timestamptz, _to timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_days numeric := greatest(extract(epoch FROM (_to - _from)) / 86400.0, 1);
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'advertiser'::app_role)) THEN
    RAISE EXCEPTION 'Tidak punya akses ke analytics' USING ERRCODE = '42501';
  END IF;

  WITH
  ev AS (
    SELECT *,
           (created_at AT TIME ZONE 'Asia/Jakarta')::date AS day,
           extract(hour FROM created_at AT TIME ZONE 'Asia/Jakarta')::int AS hour,
           coalesce(nullif(utm_source, ''),
                    CASE WHEN referrer_host IS NULL OR referrer_host = '' THEN 'direct' ELSE referrer_host END) AS source
      FROM site_events
     WHERE created_at >= _from AND created_at < _to
  ),
  clicks AS (
    SELECT id, cs_name, utm_campaign, utm_source, clicked_at,
           (clicked_at AT TIME ZONE 'Asia/Jakarta')::date AS day,
           extract(hour FROM clicked_at AT TIME ZONE 'Asia/Jakarta')::int AS hour
      FROM whatsapp_clicks
     WHERE clicked_at >= _from AND clicked_at < _to
  ),
  calc AS (
    SELECT id, utm_campaign, utm_source, (created_at AT TIME ZONE 'Asia/Jakarta')::date AS day
      FROM umroh_calculator_leads
     WHERE created_at >= _from AND created_at < _to
  ),
  conv AS (
    SELECT c.id, c.cs_id, c.click_id, wc.utm_campaign, wc.cs_name
      FROM whatsapp_conversions c
      LEFT JOIN whatsapp_clicks wc ON wc.id = c.click_id
     WHERE c.converted_at >= _from AND c.converted_at < _to
  ),
  -- Spend rows cover a period; count only the share that falls inside the range.
  spend AS (
    SELECT campaign_name, platform,
           amount * greatest(0, least(period_end::date, (_to AT TIME ZONE 'Asia/Jakarta')::date - 1)
                                 - greatest(period_start::date, (_from AT TIME ZONE 'Asia/Jakarta')::date) + 1)
                  / greatest(period_end::date - period_start::date + 1, 1) AS amount_in_range
      FROM campaign_spend
     WHERE period_start::date < (_to AT TIME ZONE 'Asia/Jakarta')::date
       AND period_end::date >= (_from AT TIME ZONE 'Asia/Jakarta')::date
  ),
  days AS (
    SELECT generate_series((_from AT TIME ZONE 'Asia/Jakarta')::date,
                           ((_to AT TIME ZONE 'Asia/Jakarta') - interval '1 second')::date,
                           interval '1 day')::date AS day
  )
  SELECT jsonb_build_object(
    'range', jsonb_build_object('from', _from, 'to', _to, 'days', round(v_days)),
    'tracking_since', (SELECT min(created_at) FROM site_events),

    'kpis', jsonb_build_object(
      'visitors', (SELECT count(DISTINCT visitor_id) FROM ev),
      'sessions', (SELECT count(DISTINCT session_id) FROM ev),
      'page_views', (SELECT count(*) FROM ev WHERE event = 'page_view'),
      'package_views', (SELECT count(*) FROM ev WHERE event = 'view_content'),
      'package_viewers', (SELECT count(DISTINCT visitor_id) FROM ev WHERE event = 'view_content'),
      'add_to_cart', (SELECT count(*) FROM ev WHERE event = 'add_to_cart'),
      'cart_visitors', (SELECT count(DISTINCT visitor_id) FROM ev WHERE event = 'add_to_cart'),
      'site_leads', (SELECT count(*) FROM ev WHERE event = 'lead'),
      'lead_visitors', (SELECT count(DISTINCT visitor_id) FROM ev WHERE event = 'lead'),
      'whatsapp_clicks', (SELECT count(*) FROM clicks),
      'calculator_leads', (SELECT count(*) FROM calc),
      'conversions', (SELECT count(*) FROM conv),
      'bookings_created', (SELECT count(*) FROM bookings WHERE created_at >= _from AND created_at < _to),
      'bookings_paid', (SELECT count(DISTINCT bp.booking_id) FROM booking_payments bp
                         WHERE bp.status = 'settled' AND bp.paid_at >= _from AND bp.paid_at < _to),
      'revenue', (SELECT coalesce(sum(bp.amount), 0) FROM booking_payments bp
                   WHERE bp.status = 'settled' AND bp.paid_at >= _from AND bp.paid_at < _to),
      'ad_spend', (SELECT coalesce(round(sum(amount_in_range)), 0) FROM spend)
    ),

    'daily', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'day', d.day,
        'visitors', (SELECT count(DISTINCT visitor_id) FROM ev WHERE ev.day = d.day),
        'page_views', (SELECT count(*) FROM ev WHERE ev.day = d.day AND event = 'page_view'),
        'add_to_cart', (SELECT count(*) FROM ev WHERE ev.day = d.day AND event = 'add_to_cart'),
        'whatsapp_clicks', (SELECT count(*) FROM clicks WHERE clicks.day = d.day),
        'calculator_leads', (SELECT count(*) FROM calc WHERE calc.day = d.day)
      ) ORDER BY d.day), '[]'::jsonb)
      FROM days d
    ),

    'funnel', jsonb_build_array(
      jsonb_build_object('step', 'visit', 'people', (SELECT count(DISTINCT visitor_id) FROM ev)),
      jsonb_build_object('step', 'view_package', 'people', (SELECT count(DISTINCT visitor_id) FROM ev WHERE event = 'view_content')),
      jsonb_build_object('step', 'add_to_cart', 'people', (SELECT count(DISTINCT visitor_id) FROM ev WHERE event = 'add_to_cart')),
      jsonb_build_object('step', 'lead', 'people', (SELECT count(DISTINCT visitor_id) FROM ev WHERE event = 'lead'))
    ),

    'sources', (
      SELECT coalesce(jsonb_agg(s ORDER BY (s->>'visitors')::int DESC), '[]'::jsonb) FROM (
        SELECT jsonb_build_object(
                 'source', source,
                 'visitors', count(DISTINCT visitor_id),
                 'leads', count(DISTINCT visitor_id) FILTER (WHERE event = 'lead')) AS s
          FROM ev GROUP BY source ORDER BY count(DISTINCT visitor_id) DESC LIMIT 12
      ) x
    ),

    'campaigns', (
      SELECT coalesce(jsonb_agg(c ORDER BY (c->>'spend')::numeric DESC, (c->>'whatsapp_clicks')::int DESC), '[]'::jsonb) FROM (
        SELECT jsonb_build_object(
                 'campaign', name,
                 'visitors', (SELECT count(DISTINCT visitor_id) FROM ev WHERE ev.utm_campaign = name),
                 'whatsapp_clicks', (SELECT count(*) FROM clicks WHERE clicks.utm_campaign = name),
                 'calculator_leads', (SELECT count(*) FROM calc WHERE calc.utm_campaign = name),
                 'conversions', (SELECT count(*) FROM conv WHERE conv.utm_campaign = name),
                 'spend', (SELECT coalesce(round(sum(amount_in_range)), 0) FROM spend WHERE spend.campaign_name = name)
               ) AS c
          FROM (
            SELECT utm_campaign AS name FROM ev WHERE utm_campaign IS NOT NULL AND utm_campaign <> ''
            UNION SELECT utm_campaign FROM clicks WHERE utm_campaign IS NOT NULL AND utm_campaign <> ''
            UNION SELECT utm_campaign FROM calc WHERE utm_campaign IS NOT NULL AND utm_campaign <> ''
            UNION SELECT campaign_name FROM spend
          ) names
          LIMIT 30
      ) x
    ),

    'top_packages', (
      SELECT coalesce(jsonb_agg(p ORDER BY (p->>'views')::int DESC), '[]'::jsonb) FROM (
        SELECT jsonb_build_object(
                 'package_id', ev.package_id,
                 'name', max(pk.package_name),
                 'departure_date', max(pk.departure_date),
                 'views', count(*) FILTER (WHERE event = 'view_content'),
                 'viewers', count(DISTINCT visitor_id) FILTER (WHERE event = 'view_content'),
                 'add_to_cart', count(*) FILTER (WHERE event = 'add_to_cart'),
                 'leads', count(*) FILTER (WHERE event = 'lead')) AS p
          FROM ev LEFT JOIN packages pk ON pk.id = ev.package_id
         WHERE ev.package_id IS NOT NULL
         GROUP BY ev.package_id
         ORDER BY count(*) FILTER (WHERE event = 'view_content') DESC
         LIMIT 10
      ) x
    ),

    'top_pages', (
      SELECT coalesce(jsonb_agg(p ORDER BY (p->>'views')::int DESC), '[]'::jsonb) FROM (
        SELECT jsonb_build_object('path', path, 'views', count(*), 'visitors', count(DISTINCT visitor_id)) AS p
          FROM ev WHERE event = 'page_view'
         GROUP BY path ORDER BY count(*) DESC LIMIT 10
      ) x
    ),

    'lead_buttons', (
      SELECT coalesce(jsonb_agg(b ORDER BY (b->>'leads')::int DESC), '[]'::jsonb) FROM (
        SELECT jsonb_build_object('source', coalesce(lead_source, 'lainnya'), 'leads', count(*),
                                  'people', count(DISTINCT visitor_id)) AS b
          FROM ev WHERE event = 'lead' GROUP BY coalesce(lead_source, 'lainnya')
      ) x
    ),

    'devices', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('device', device, 'visitors', n) ORDER BY n DESC), '[]'::jsonb) FROM (
        SELECT coalesce(device, 'unknown') AS device, count(DISTINCT visitor_id) AS n FROM ev GROUP BY 1
      ) x
    ),

    'cs', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('cs', cs_name, 'clicks', n,
               'conversions', (SELECT count(*) FROM conv WHERE conv.cs_name = x.cs_name)) ORDER BY n DESC), '[]'::jsonb)
        FROM (SELECT cs_name, count(*) AS n FROM clicks GROUP BY cs_name) x
    ),

    'hours', (
      SELECT jsonb_agg(jsonb_build_object(
               'hour', h,
               'visitors', (SELECT count(DISTINCT visitor_id) FROM ev WHERE ev.hour = h),
               'whatsapp_clicks', (SELECT count(*) FROM clicks WHERE clicks.hour = h)) ORDER BY h)
        FROM generate_series(0, 23) h
    ),

    'short_links', (
      SELECT coalesce(jsonb_agg(l ORDER BY (l->>'clicks')::int DESC), '[]'::jsonb) FROM (
        SELECT jsonb_build_object('code', sl.short_code, 'title', sl.title, 'clicks', count(c.id)) AS l
          FROM short_link_clicks c JOIN short_links sl ON sl.id = c.link_id
         WHERE c.clicked_at >= _from AND c.clicked_at < _to
         GROUP BY sl.id, sl.short_code, sl.title
         ORDER BY count(c.id) DESC LIMIT 10
      ) x
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_analytics_summary(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_analytics_summary(timestamptz, timestamptz) TO authenticated;
