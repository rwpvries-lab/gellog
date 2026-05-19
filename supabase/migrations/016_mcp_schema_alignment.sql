-- Align published columns with MCP / product naming (weather °C, cents, hide_price,
-- canonical flavour + rating_stars + short dimension names).
-- Idempotent where possible: skips renames when target columns already exist.

-- ─── ice_cream_logs ───────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ice_cream_logs' AND column_name = 'weather_temp'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ice_cream_logs' AND column_name = 'weather_temp_c'
  ) THEN
    ALTER TABLE public.ice_cream_logs RENAME COLUMN weather_temp TO weather_temp_c;
  END IF;
END $$;

ALTER TABLE public.ice_cream_logs ADD COLUMN IF NOT EXISTS price_cents integer;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ice_cream_logs' AND column_name = 'price_paid'
  ) THEN
    UPDATE public.ice_cream_logs
    SET price_cents = ROUND(price_paid::numeric * 100)::integer
    WHERE price_paid IS NOT NULL;

    ALTER TABLE public.ice_cream_logs DROP COLUMN price_paid;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ice_cream_logs'
      AND column_name = 'price_hidden_from_others'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ice_cream_logs' AND column_name = 'hide_price'
  ) THEN
    ALTER TABLE public.ice_cream_logs RENAME COLUMN price_hidden_from_others TO hide_price;
  END IF;
END $$;

-- ─── log_flavours ─────────────────────────────────────────────────────────────

ALTER TABLE public.log_flavours
  ADD COLUMN IF NOT EXISTS canonical_flavour_id uuid REFERENCES public.flavours (id);

ALTER TABLE public.log_flavours ADD COLUMN IF NOT EXISTS tags text[];

-- Dimension columns (legacy names before rename below); skip if newer names already exist (e.g. MCP DB).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'log_flavours' AND column_name = 'texture'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'log_flavours' AND column_name = 'rating_texture'
  ) THEN
    ALTER TABLE public.log_flavours ADD COLUMN texture integer;
    ALTER TABLE public.log_flavours ADD COLUMN originality integer;
    ALTER TABLE public.log_flavours ADD COLUMN intensity integer;
    ALTER TABLE public.log_flavours ADD COLUMN presentation integer;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'log_flavours' AND column_name = 'rating'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'log_flavours' AND column_name = 'rating_stars'
  ) THEN
    ALTER TABLE public.log_flavours RENAME COLUMN rating TO rating_stars;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'log_flavours' AND column_name = 'rating_texture'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'log_flavours' AND column_name = 'texture'
  ) THEN
    ALTER TABLE public.log_flavours RENAME COLUMN rating_texture TO texture;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'log_flavours' AND column_name = 'rating_originality'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'log_flavours' AND column_name = 'originality'
  ) THEN
    ALTER TABLE public.log_flavours RENAME COLUMN rating_originality TO originality;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'log_flavours' AND column_name = 'rating_intensity'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'log_flavours' AND column_name = 'intensity'
  ) THEN
    ALTER TABLE public.log_flavours RENAME COLUMN rating_intensity TO intensity;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'log_flavours' AND column_name = 'rating_presentation'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'log_flavours' AND column_name = 'presentation'
  ) THEN
    ALTER TABLE public.log_flavours RENAME COLUMN rating_presentation TO presentation;
  END IF;
END $$;

-- RPC still groups by display label (free-text or canonical resolved in app layer).
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
