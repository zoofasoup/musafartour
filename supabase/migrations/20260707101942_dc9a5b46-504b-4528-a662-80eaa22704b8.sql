CREATE OR REPLACE FUNCTION public.create_calculator_lead(_lead jsonb)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _token text;
BEGIN
  INSERT INTO public.umroh_calculator_leads (
    name,
    whatsapp,
    companion_name,
    mode,
    monthly_saving,
    target_timeframe_months,
    selected_package,
    calculated_monthly_target,
    calculated_daily_target,
    pilgrim_count,
    existing_savings,
    recommended_package_id,
    recommended_tier,
    daily_target,
    months_to_departure,
    status,
    utm_source,
    utm_medium,
    utm_campaign,
    fbclid,
    ctwa_clid,
    event_id,
    result_data,
    referrer,
    user_agent
  )
  VALUES (
    left(trim(_lead->>'name'), 100),
    left(trim(_lead->>'whatsapp'), 20),
    nullif(left(trim(coalesce(_lead->>'companion_name', '')), 100), ''),
    CASE WHEN _lead->>'mode' IN ('A', 'B') THEN _lead->>'mode' ELSE 'A' END,
    GREATEST(coalesce((_lead->>'monthly_saving')::numeric, 0), 0),
    NULLIF(_lead->>'target_timeframe_months', '')::integer,
    NULLIF(left(coalesce(_lead->>'selected_package', ''), 120), ''),
    NULLIF(_lead->>'calculated_monthly_target', '')::numeric,
    NULLIF(_lead->>'calculated_daily_target', '')::numeric,
    LEAST(GREATEST(coalesce((_lead->>'pilgrim_count')::integer, 1), 1), 20),
    GREATEST(coalesce((_lead->>'existing_savings')::numeric, 0), 0),
    NULLIF(_lead->>'recommended_package_id', '')::uuid,
    NULLIF(left(coalesce(_lead->>'recommended_tier', ''), 60), ''),
    NULLIF(_lead->>'daily_target', '')::numeric,
    NULLIF(_lead->>'months_to_departure', '')::integer,
    'NEW',
    NULLIF(left(coalesce(_lead->>'utm_source', ''), 100), ''),
    NULLIF(left(coalesce(_lead->>'utm_medium', ''), 100), ''),
    NULLIF(left(coalesce(_lead->>'utm_campaign', ''), 100), ''),
    NULLIF(left(coalesce(_lead->>'fbclid', ''), 200), ''),
    NULLIF(left(coalesce(_lead->>'ctwa_clid', ''), 200), ''),
    NULLIF(left(coalesce(_lead->>'event_id', ''), 100), ''),
    _lead->'result_data',
    NULLIF(left(coalesce(_lead->>'referrer', ''), 500), ''),
    NULLIF(left(coalesce(_lead->>'user_agent', ''), 500), '')
  )
  RETURNING share_token INTO _token;

  RETURN _token;
END;
$$;

REVOKE ALL ON FUNCTION public.create_calculator_lead(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_calculator_lead(jsonb) TO anon, authenticated, service_role;