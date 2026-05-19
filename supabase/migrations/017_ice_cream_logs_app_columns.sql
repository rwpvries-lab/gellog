-- Columns used by inserts/selects (feed, submit, detail) but not added in earlier migrations.
-- Without these, PostgREST rejects queries listing unknown column names.

ALTER TABLE public.ice_cream_logs
  ADD COLUMN IF NOT EXISTS salon_address text,
  ADD COLUMN IF NOT EXISTS salon_city text,
  ADD COLUMN IF NOT EXISTS vessel text,
  ADD COLUMN IF NOT EXISTS weather_uv_index numeric;
