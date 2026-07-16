-- Adds the new is_signature / signature_position columns (027 migration) to
-- vitrine_flavours_resolved so the public salon page can render a pinned
-- "signature flavours" row (Pro Page Appearance feature) without a second
-- query. CREATE OR REPLACE VIEW with an appended column list preserves the
-- view's existing grants (anon/authenticated SELECT) -- no DROP VIEW needed.
--
-- Note: the local 015_vitrine_flavours_resolved_view.sql migration file
-- predates several since-applied-but-not-committed changes (the
-- resolve_flavour_tokens-based join and is_exclusive/is_brand_new/is_vegan
-- columns) -- this migration is written against the view's current actual
-- shape in the database, confirmed via execute_sql, not against the stale
-- local file. Pre-existing repo/DB drift, not introduced by this migration.

CREATE OR REPLACE VIEW public.vitrine_flavours_resolved AS
SELECT
  vf.id AS vitrine_flavour_id,
  vf.salon_place_id,
  vf.name AS input_name,
  vf.colour AS legacy_colour,
  vf.is_visible,
  vf.display_started_at,
  vf.total_display_seconds,
  rf.flavour_id,
  f.slug AS flavour_slug,
  rf.canonical_name_en,
  rf.canonical_name_nl,
  rf.canonical_name_it,
  COALESCE(vf.base_token, rf.base_token) AS base_token,
  COALESCE(vf.drizzle_token, rf.drizzle_token) AS drizzle_token,
  COALESCE(vf.crumble_token, rf.crumble_token) AS crumble_token,
  f.category,
  vf.is_exclusive,
  vf.is_brand_new,
  vf.is_vegan,
  vf.is_signature,
  vf.signature_position
FROM public.vitrine_flavours vf
CROSS JOIN LATERAL public.resolve_flavour_tokens(vf.name) AS rf(
  flavour_id, base_token, drizzle_token, crumble_token,
  canonical_name_en, canonical_name_nl, canonical_name_it, source
)
LEFT JOIN public.flavours f ON f.id = rf.flavour_id;
