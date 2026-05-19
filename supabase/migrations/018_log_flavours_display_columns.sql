-- Optional denormalized fields for `LOG_FLAVOURS_RESOLVED_SELECT` embeds.
-- Without these, PostgREST rejects queries that list unknown column names.

ALTER TABLE public.log_flavours
  ADD COLUMN IF NOT EXISTS base_token text,
  ADD COLUMN IF NOT EXISTS drizzle_token text,
  ADD COLUMN IF NOT EXISTS crumble_token text,
  ADD COLUMN IF NOT EXISTS canonical_name_en text,
  ADD COLUMN IF NOT EXISTS canonical_name_nl text,
  ADD COLUMN IF NOT EXISTS canonical_name_it text;
