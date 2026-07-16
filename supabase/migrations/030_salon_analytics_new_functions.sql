-- New salon dashboard analytics functions. Same hardening convention as
-- 029_salon_analytics_owner_tier_gating.sql: SECURITY DEFINER,
-- SET search_path = '', schema-qualified references, owner+tier check
-- folded into the WHERE clause so unauthorized calls return zero rows.

-- Flavour performance table -- Basic+. Superset of salon_top_flavours
-- (no LIMIT 10) for the dedicated dashboard table widget.
CREATE OR REPLACE FUNCTION public.salon_flavour_performance(p_place_id text)
RETURNS TABLE(flavour_name text, log_count bigint, avg_rating numeric)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    lf.flavour_name,
    COUNT(*) AS log_count,
    ROUND(AVG(icl.overall_rating), 2) AS avg_rating
  FROM public.log_flavours lf
  JOIN public.ice_cream_logs icl ON icl.id = lf.log_id
  WHERE icl.salon_place_id = p_place_id
    AND public.salon_owner_tier_ok(p_place_id, 'basic')
  GROUP BY lf.flavour_name
  ORDER BY log_count DESC
  LIMIT 50;
$$;

-- New vs returning visitors per month -- Pro. A visitor's first calendar
-- month with a log at this salon counts as "new"; any later month counts
-- as "returning". Each user counted once per month regardless of visit count.
CREATE OR REPLACE FUNCTION public.salon_visitor_recurrence(p_place_id text)
RETURNS TABLE(month text, new_visitors bigint, returning_visitors bigint)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  WITH first_visit AS (
    SELECT icl.user_id, MIN(DATE_TRUNC('month', icl.visited_at)) AS first_month
    FROM public.ice_cream_logs icl
    WHERE icl.salon_place_id = p_place_id
    GROUP BY icl.user_id
  ),
  monthly AS (
    SELECT DATE_TRUNC('month', icl.visited_at) AS month_ts, icl.user_id
    FROM public.ice_cream_logs icl
    WHERE icl.salon_place_id = p_place_id
    GROUP BY DATE_TRUNC('month', icl.visited_at), icl.user_id
  )
  SELECT
    TO_CHAR(m.month_ts, 'YYYY-MM') AS month,
    COUNT(*) FILTER (WHERE fv.first_month = m.month_ts) AS new_visitors,
    COUNT(*) FILTER (WHERE fv.first_month <> m.month_ts) AS returning_visitors
  FROM monthly m
  JOIN first_visit fv ON fv.user_id = m.user_id
  WHERE public.salon_owner_tier_ok(p_place_id, 'pro')
  GROUP BY m.month_ts
  ORDER BY m.month_ts ASC;
$$;

-- Day-of-week visit distribution -- Pro. Returns Postgres EXTRACT(DOW)
-- convention (0=Sun..6=Sat) -- day-name formatting is left to the client to
-- avoid depending on server locale, matching the existing convention in
-- src/lib/salonPeakGrid.ts (SQL_DOW_TO_GRID_ROW).
CREATE OR REPLACE FUNCTION public.salon_dow_distribution(p_place_id text)
RETURNS TABLE(dow int, visits bigint)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    EXTRACT(DOW FROM icl.visited_at)::int AS dow,
    COUNT(*) AS visits
  FROM public.ice_cream_logs icl
  WHERE icl.salon_place_id = p_place_id
    AND public.salon_owner_tier_ok(p_place_id, 'pro')
  GROUP BY EXTRACT(DOW FROM icl.visited_at)
  ORDER BY dow ASC;
$$;

-- Rating distribution (1-5 histogram) -- Pro. Always returns all 5 buckets
-- (zero-filled) when authorized, via LEFT JOIN against generate_series;
-- the WHERE clause gates the whole joined result so unauthorized calls
-- still come back empty rather than 5 zero-rows.
CREATE OR REPLACE FUNCTION public.salon_rating_histogram(p_place_id text)
RETURNS TABLE(rating int, count bigint)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT gs.rating, COALESCE(counts.count, 0) AS count
  FROM generate_series(1, 5) AS gs(rating)
  LEFT JOIN (
    SELECT icl.overall_rating AS rating, COUNT(*) AS count
    FROM public.ice_cream_logs icl
    WHERE icl.salon_place_id = p_place_id
    GROUP BY icl.overall_rating
  ) counts ON counts.rating = gs.rating
  WHERE public.salon_owner_tier_ok(p_place_id, 'pro')
  ORDER BY gs.rating ASC;
$$;

-- Vitrine conversion -- Pro. % of this salon's logs whose flavour name
-- (case/whitespace-insensitive) matches one of the salon's current vitrine
-- flavour names.
CREATE OR REPLACE FUNCTION public.salon_vitrine_conversion(p_place_id text)
RETURNS TABLE(total_logs bigint, vitrine_matched_logs bigint, conversion_pct numeric)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  WITH salon_logs AS (
    SELECT icl.id AS log_id
    FROM public.ice_cream_logs icl
    WHERE icl.salon_place_id = p_place_id
  ),
  vitrine_names AS (
    SELECT DISTINCT LOWER(TRIM(vf.name)) AS name_key
    FROM public.vitrine_flavours vf
    WHERE vf.salon_place_id = p_place_id
  ),
  matched AS (
    SELECT DISTINCT lf.log_id
    FROM public.log_flavours lf
    JOIN salon_logs sl ON sl.log_id = lf.log_id
    JOIN vitrine_names vn ON vn.name_key = LOWER(TRIM(lf.flavour_name))
  )
  SELECT
    (SELECT COUNT(*) FROM salon_logs) AS total_logs,
    (SELECT COUNT(*) FROM matched) AS vitrine_matched_logs,
    CASE WHEN (SELECT COUNT(*) FROM salon_logs) > 0
      THEN ROUND((SELECT COUNT(*) FROM matched)::numeric / (SELECT COUNT(*) FROM salon_logs) * 100, 1)
      ELSE 0
    END AS conversion_pct
  WHERE public.salon_owner_tier_ok(p_place_id, 'pro');
$$;

REVOKE ALL ON FUNCTION public.salon_flavour_performance(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.salon_flavour_performance(text) TO authenticated;

REVOKE ALL ON FUNCTION public.salon_visitor_recurrence(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.salon_visitor_recurrence(text) TO authenticated;

REVOKE ALL ON FUNCTION public.salon_dow_distribution(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.salon_dow_distribution(text) TO authenticated;

REVOKE ALL ON FUNCTION public.salon_rating_histogram(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.salon_rating_histogram(text) TO authenticated;

REVOKE ALL ON FUNCTION public.salon_vitrine_conversion(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.salon_vitrine_conversion(text) TO authenticated;
