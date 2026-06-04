-- Applied via Supabase MCP on 2026-06-02 (apply_migration: populate_log_flavour_tokens_compound_fallback).
-- This file is committed for repo parity only — it is already live on the database.
--
-- populate_log_flavour_tokens: when a log_flavour has no canonical_flavour_id (e.g. a
-- compound "X yogurt" flavour), the trigger previously left base/drizzle/crumble null,
-- so the feed rendered a plain cream scoop with no swirl. Add an ELSE branch that falls
-- back to resolve_flavour_tokens(flavour_name) — the same owner-aware resolver (021) used
-- at read time — so the compound parser's tokens are persisted on INSERT/UPDATE. The
-- canonical_flavour_id branch is authoritative and unchanged.
CREATE OR REPLACE FUNCTION public.populate_log_flavour_tokens()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.canonical_flavour_id IS NOT NULL THEN
    SELECT
      f.base_token,
      f.drizzle_token,
      f.crumble_token,
      f.name_en,
      f.name_nl,
      f.name_it
    INTO
      NEW.base_token,
      NEW.drizzle_token,
      NEW.crumble_token,
      NEW.canonical_name_en,
      NEW.canonical_name_nl,
      NEW.canonical_name_it
    FROM public.flavours f
    WHERE f.id = NEW.canonical_flavour_id;
  ELSE
    SELECT
      r.base_token,
      r.drizzle_token,
      r.crumble_token,
      r.canonical_name_en,
      r.canonical_name_nl,
      r.canonical_name_it
    INTO
      NEW.base_token,
      NEW.drizzle_token,
      NEW.crumble_token,
      NEW.canonical_name_en,
      NEW.canonical_name_nl,
      NEW.canonical_name_it
    FROM public.resolve_flavour_tokens(NEW.flavour_name) r
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$function$;
