-- Applied via Supabase MCP on 2026-06-01 (apply_migration: resolve_flavour_tokens_owner_aware).
-- This file is committed for repo parity only — it is already live on the database.
--
-- resolve_flavour_tokens v2: accent/case/whitespace-insensitive exact match that prefers
-- owner_defined rows (tier 1), and returns the catalogue row's provenance so the UI can
-- label community suggestions. Falls back to compound parser, then fuzzy trigram, then
-- neutral cream. CASCADE drops the two dependent views; they are recreated unchanged below.
DROP FUNCTION IF EXISTS public.resolve_flavour_tokens(text) CASCADE;

CREATE FUNCTION public.resolve_flavour_tokens(input text)
RETURNS TABLE(
  flavour_id        uuid,
  base_token        text,
  drizzle_token     text,
  crumble_token     text,
  canonical_name_en text,
  canonical_name_nl text,
  canonical_name_it text,
  source            text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $function$
DECLARE
  cleaned text;
  norm    text;
  frow    RECORD;
  ctokens RECORD;
BEGIN
  IF input IS NULL OR trim(input) = '' THEN
    RETURN QUERY SELECT NULL::uuid, 'cream'::text, 'none'::text, 'none'::text,
                        NULL::text, NULL::text, NULL::text, NULL::text;
    RETURN;
  END IF;

  cleaned := lower(trim(regexp_replace(input, '^[^a-zA-Z]+', '')));
  norm    := public.normalize_flavour_name(input);

  IF cleaned = '' THEN
    RETURN QUERY SELECT NULL::uuid, 'cream'::text, 'none'::text, 'none'::text,
                        NULL::text, NULL::text, NULL::text, NULL::text;
    RETURN;
  END IF;

  -- LAYER 1: normalised exact match across name + multilingual names + slug.
  -- Owner-defined catalogue rows win ties (tier 1).
  SELECT f.id, f.base_token, f.drizzle_token, f.crumble_token,
         f.name_en, f.name_nl, f.name_it, f.source INTO frow
  FROM public.flavours f
  WHERE f.is_active = true AND f.base_token IS NOT NULL
    AND (
         f.name_normalized = norm
      OR public.normalize_flavour_name(f.name_en) = norm
      OR public.normalize_flavour_name(f.name_nl) = norm
      OR public.normalize_flavour_name(f.name_it) = norm
      OR f.slug = cleaned
    )
  ORDER BY (f.source = 'owner_defined') DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT frow.id, frow.base_token,
                        COALESCE(frow.drizzle_token, 'none'),
                        COALESCE(frow.crumble_token, 'none'),
                        frow.name_en, frow.name_nl, frow.name_it, frow.source;
    RETURN;
  END IF;

  -- LAYER 2: compound word parser
  SELECT c.base_token, c.drizzle_token, c.crumble_token INTO ctokens
  FROM public.parse_compound_flavour(input) c
  WHERE c.base_token IS NOT NULL;

  IF FOUND THEN
    RETURN QUERY SELECT NULL::uuid, ctokens.base_token,
                        COALESCE(ctokens.drizzle_token, 'none'),
                        COALESCE(ctokens.crumble_token, 'none'),
                        NULL::text, NULL::text, NULL::text, 'compound'::text;
    RETURN;
  END IF;

  -- LAYER 3: fuzzy trigram match (pg_trgm similarity > 0.5)
  SELECT ranked.id, ranked.base_token, ranked.drizzle_token, ranked.crumble_token,
         ranked.name_en, ranked.name_nl, ranked.name_it, ranked.source INTO frow
  FROM (
    SELECT f2.id, f2.base_token, f2.drizzle_token, f2.crumble_token,
           f2.name_en, f2.name_nl, f2.name_it, f2.source,
      greatest(
        similarity(lower(coalesce(f2.name_en, '')), cleaned),
        similarity(lower(coalesce(f2.name_nl, '')), cleaned),
        similarity(lower(coalesce(f2.name_it, '')), cleaned)
      ) AS sim
    FROM public.flavours f2
    WHERE f2.is_active = true AND f2.base_token IS NOT NULL
  ) ranked
  WHERE ranked.sim > 0.5
  ORDER BY ranked.sim DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT frow.id, frow.base_token,
                        COALESCE(frow.drizzle_token, 'none'),
                        COALESCE(frow.crumble_token, 'none'),
                        frow.name_en, frow.name_nl, frow.name_it, frow.source;
    RETURN;
  END IF;

  -- LAYER 4: default neutral cream
  RETURN QUERY SELECT NULL::uuid, 'cream'::text, 'none'::text, 'none'::text,
                      NULL::text, NULL::text, NULL::text, NULL::text;
END;
$function$;

-- Recreate dependent views (output unchanged; alias list extended with `source`).
CREATE VIEW public.log_flavours_resolved AS
 SELECT lf.id AS log_flavour_id,
    lf.log_id,
    lf.flavour_name AS input_name,
    lf.rating_stars AS rating,
    lf.tags,
    lf.texture AS rating_texture,
    lf.originality AS rating_originality,
    lf.intensity AS rating_intensity,
    lf.presentation AS rating_presentation,
    rf.flavour_id,
    f.slug AS flavour_slug,
    rf.canonical_name_en,
    rf.canonical_name_nl,
    rf.canonical_name_it,
    rf.base_token,
    rf.drizzle_token,
    rf.crumble_token,
    f.category
   FROM log_flavours lf
     CROSS JOIN LATERAL resolve_flavour_tokens(lf.flavour_name)
       rf(flavour_id, base_token, drizzle_token, crumble_token,
          canonical_name_en, canonical_name_nl, canonical_name_it, source)
     LEFT JOIN flavours f ON f.id = rf.flavour_id;

CREATE VIEW public.vitrine_flavours_resolved AS
 SELECT vf.id AS vitrine_flavour_id,
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
    vf.is_vegan
   FROM vitrine_flavours vf
     CROSS JOIN LATERAL resolve_flavour_tokens(vf.name)
       rf(flavour_id, base_token, drizzle_token, crumble_token,
          canonical_name_en, canonical_name_nl, canonical_name_it, source)
     LEFT JOIN flavours f ON f.id = rf.flavour_id;
