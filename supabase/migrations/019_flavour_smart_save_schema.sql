-- Applied via Supabase MCP on 2026-06-01 (apply_migration: flavour_smart_save_schema).
-- This file is committed for repo parity only — it is already live on the database.
--
-- Smart-save schema: normalised flavour-name key + provenance, so an owner's custom
-- tokens can be promoted to the global catalogue keyed by name.

-- Immutable unaccent wrapper: unaccent() is only STABLE, but a generated column
-- and index require IMMUTABLE.
CREATE OR REPLACE FUNCTION public.immutable_unaccent(text)
RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;

-- Canonical flavour-name normaliser: accent-fold + lowercase + collapse whitespace
-- so 'Crème Brûlée' / 'creme brulee' and 'Mango Yogurt' / 'mango yogurt' collapse.
CREATE OR REPLACE FUNCTION public.normalize_flavour_name(text)
RETURNS text
LANGUAGE sql IMMUTABLE STRICT
AS $$ SELECT regexp_replace(lower(btrim(public.immutable_unaccent($1))), '\s+', ' ', 'g') $$;

-- Provenance vocabulary for catalogue rows. Existing rows are 'system' (legacy seed);
-- keep it valid and label future generic inserts as 'seed'.
ALTER TABLE public.flavours ALTER COLUMN source SET DEFAULT 'seed';
ALTER TABLE public.flavours DROP CONSTRAINT IF EXISTS flavours_source_check;
ALTER TABLE public.flavours
  ADD CONSTRAINT flavours_source_check
  CHECK (source IN ('system', 'seed', 'generated', 'owner_defined'));

-- Normalised-name key used by smart-save lookups.
ALTER TABLE public.flavours
  ADD COLUMN IF NOT EXISTS name_normalized text
  GENERATED ALWAYS AS (public.normalize_flavour_name(name)) STORED;

-- At most one owner-defined global default per normalised name (seeds may dup freely).
CREATE UNIQUE INDEX IF NOT EXISTS flavours_owner_defined_name_uidx
  ON public.flavours (name_normalized)
  WHERE source = 'owner_defined';

CREATE INDEX IF NOT EXISTS flavours_name_normalized_idx
  ON public.flavours (name_normalized);
