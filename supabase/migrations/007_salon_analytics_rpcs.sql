-- Visits by week for a salon (last N weeks)
CREATE OR REPLACE FUNCTION salon_visits_by_week(p_place_id text, p_since timestamptz)
RETURNS TABLE(week date, visits bigint)
LANGUAGE sql STABLE
AS $$
  SELECT
    DATE_TRUNC('week', visited_at)::date AS week,
    COUNT(*) AS visits
  FROM ice_cream_logs
  WHERE salon_place_id = p_place_id
    AND visited_at >= p_since
  GROUP BY DATE_TRUNC('week', visited_at)
  ORDER BY week ASC;
$$;

-- Top 10 flavours logged at a salon
CREATE OR REPLACE FUNCTION salon_top_flavours(p_place_id text)
RETURNS TABLE(flavour_name text, count bigint, avg_rating numeric)
LANGUAGE sql STABLE
AS $$
  SELECT
    lf.flavour_name,
    COUNT(*) AS count,
    ROUND(AVG(icl.overall_rating), 2) AS avg_rating
  FROM log_flavours lf
  JOIN ice_cream_logs icl ON icl.id = lf.log_id
  WHERE icl.salon_place_id = p_place_id
  GROUP BY lf.flavour_name
  ORDER BY count DESC
  LIMIT 10;
$$;

-- Weather conditions when people visit a salon
CREATE OR REPLACE FUNCTION salon_weather_stats(p_place_id text)
RETURNS TABLE(weather_condition text, visits bigint)
LANGUAGE sql STABLE
AS $$
  SELECT
    weather_condition,
    COUNT(*) AS visits
  FROM ice_cream_logs
  WHERE salon_place_id = p_place_id
    AND weather_condition IS NOT NULL
  GROUP BY weather_condition
  ORDER BY visits DESC
  LIMIT 5;
$$;

-- Monthly average rating trend for a salon
CREATE OR REPLACE FUNCTION salon_monthly_ratings(p_place_id text)
RETURNS TABLE(month text, avg_rating numeric)
LANGUAGE sql STABLE
AS $$
  SELECT
    TO_CHAR(DATE_TRUNC('month', visited_at), 'YYYY-MM') AS month,
    ROUND(AVG(overall_rating), 2) AS avg_rating
  FROM ice_cream_logs
  WHERE salon_place_id = p_place_id
    AND overall_rating IS NOT NULL
  GROUP BY DATE_TRUNC('month', visited_at)
  ORDER BY DATE_TRUNC('month', visited_at) ASC;
$$;
