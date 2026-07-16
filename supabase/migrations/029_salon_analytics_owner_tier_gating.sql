-- Hardens the salon analytics RPCs added in 007_salon_analytics_rpcs.sql.
--
-- Before this migration these were plain LANGUAGE sql STABLE functions with
-- no owner or tier check baked in -- gating happened only in the Next.js
-- server component that called them (app/salon/[place_id]/dashboard/page.tsx),
-- which only ever calls them when the signed-in owner's tier qualifies.
-- Confirmed via repo-wide grep that no other caller exists today. But because
-- Postgres functions are exposed over PostgREST by default, any authenticated
-- client could call these directly for ANY place_id and bypass that gate
-- entirely -- there was no check inside the function itself.
--
-- Fix: SECURITY DEFINER + SET search_path = '' (schema-qualified refs only,
-- per Postgres security best practice for definer functions) + an internal
-- owner-and-tier check via salon_owner_tier_ok(). Unauthorized calls now
-- return an empty result set rather than an error, so they fail closed
-- without leaking whether the place_id exists or what tier it's on.

CREATE OR REPLACE FUNCTION public.salon_owner_tier_ok(p_place_id text, p_min_tier text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.salon_profiles sp
    WHERE sp.place_id = p_place_id
      AND sp.is_claimed = true
      AND sp.owner_id = auth.uid()
      AND (
        CASE sp.salon_subscription_tier WHEN 'pro' THEN 2 WHEN 'basic' THEN 1 ELSE 0 END
      ) >= (
        CASE p_min_tier WHEN 'pro' THEN 2 WHEN 'basic' THEN 1 ELSE 0 END
      )
  );
$$;

REVOKE ALL ON FUNCTION public.salon_owner_tier_ok(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.salon_owner_tier_ok(text, text) TO authenticated;

-- Visits by week -- Basic+
CREATE OR REPLACE FUNCTION public.salon_visits_by_week(p_place_id text, p_since timestamptz)
RETURNS TABLE(week date, visits bigint)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    DATE_TRUNC('week', icl.visited_at)::date AS week,
    COUNT(*) AS visits
  FROM public.ice_cream_logs icl
  WHERE icl.salon_place_id = p_place_id
    AND icl.visited_at >= p_since
    AND public.salon_owner_tier_ok(p_place_id, 'basic')
  GROUP BY DATE_TRUNC('week', icl.visited_at)
  ORDER BY week ASC;
$$;

-- Top 10 flavours logged at a salon -- Basic+
CREATE OR REPLACE FUNCTION public.salon_top_flavours(p_place_id text)
RETURNS TABLE(flavour_name text, count bigint, avg_rating numeric)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    lf.flavour_name,
    COUNT(*) AS count,
    ROUND(AVG(icl.overall_rating), 2) AS avg_rating
  FROM public.log_flavours lf
  JOIN public.ice_cream_logs icl ON icl.id = lf.log_id
  WHERE icl.salon_place_id = p_place_id
    AND public.salon_owner_tier_ok(p_place_id, 'basic')
  GROUP BY lf.flavour_name
  ORDER BY count DESC
  LIMIT 10;
$$;

-- Weather conditions when people visit a salon -- Basic+
CREATE OR REPLACE FUNCTION public.salon_weather_stats(p_place_id text)
RETURNS TABLE(weather_condition text, visits bigint)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    weather_condition,
    COUNT(*) AS visits
  FROM public.ice_cream_logs icl
  WHERE icl.salon_place_id = p_place_id
    AND weather_condition IS NOT NULL
    AND public.salon_owner_tier_ok(p_place_id, 'basic')
  GROUP BY weather_condition
  ORDER BY visits DESC
  LIMIT 5;
$$;

-- Monthly average rating trend for a salon -- Pro only
CREATE OR REPLACE FUNCTION public.salon_monthly_ratings(p_place_id text)
RETURNS TABLE(month text, avg_rating numeric)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    TO_CHAR(DATE_TRUNC('month', visited_at), 'YYYY-MM') AS month,
    ROUND(AVG(overall_rating), 2) AS avg_rating
  FROM public.ice_cream_logs icl
  WHERE icl.salon_place_id = p_place_id
    AND overall_rating IS NOT NULL
    AND public.salon_owner_tier_ok(p_place_id, 'pro')
  GROUP BY DATE_TRUNC('month', visited_at)
  ORDER BY DATE_TRUNC('month', visited_at) ASC;
$$;

REVOKE ALL ON FUNCTION public.salon_visits_by_week(text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.salon_visits_by_week(text, timestamptz) TO authenticated;

REVOKE ALL ON FUNCTION public.salon_top_flavours(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.salon_top_flavours(text) TO authenticated;

REVOKE ALL ON FUNCTION public.salon_weather_stats(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.salon_weather_stats(text) TO authenticated;

REVOKE ALL ON FUNCTION public.salon_monthly_ratings(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.salon_monthly_ratings(text) TO authenticated;
