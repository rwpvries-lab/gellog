-- Applied via Supabase MCP on 2026-06-01 (apply_migration: flavour_smart_save_upsert).
-- This file is committed for repo parity only — it is already live on the database.
--
-- Smart-save: promote an owner's custom tokens into the global flavours catalogue,
-- keyed by normalised flavour name. Conflict rule:
--   * no catalogue row yet        -> insert, this owner becomes the global default
--   * seed/generated/system row   -> promote it to owner_defined with this owner's tokens
--   * an owner_defined row exists  -> KEEP it; the new owner's choice stays on their salon row only
CREATE OR REPLACE FUNCTION public.upsert_owner_flavour_catalogue(
  p_name          text,
  p_base_token    text,
  p_drizzle_token text DEFAULT 'none',
  p_crumble_token text DEFAULT 'none'
)
RETURNS TABLE(action text, flavour_id uuid, source text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  norm     text;
  existing RECORD;
  v_slug   text;
  v_id     uuid;
BEGIN
  IF p_name IS NULL OR btrim(p_name) = '' OR p_base_token IS NULL THEN
    RETURN QUERY SELECT 'noop'::text, NULL::uuid, NULL::text;
    RETURN;
  END IF;

  norm := public.normalize_flavour_name(p_name);

  SELECT f.id, f.source INTO existing
  FROM public.flavours f
  WHERE f.name_normalized = norm
  ORDER BY (f.source = 'owner_defined') DESC, f.created_at ASC
  LIMIT 1;

  -- Conflict: another owner already owns the global default for this name. Leave it.
  IF FOUND AND existing.source = 'owner_defined' THEN
    RETURN QUERY SELECT 'kept_existing'::text, existing.id, 'owner_defined'::text;
    RETURN;
  END IF;

  -- A seed/generated/system row exists -> promote it to the owner-defined default.
  IF FOUND THEN
    UPDATE public.flavours
       SET base_token    = p_base_token,
           drizzle_token = COALESCE(p_drizzle_token, 'none'),
           crumble_token = COALESCE(p_crumble_token, 'none'),
           source        = 'owner_defined',
           is_active     = true
     WHERE id = existing.id;
    RETURN QUERY SELECT 'promoted'::text, existing.id, 'owner_defined'::text;
    RETURN;
  END IF;

  -- No catalogue row yet -> this owner becomes the global default.
  v_slug := btrim(regexp_replace(norm, '[^a-z0-9]+', '-', 'g'), '-');
  IF v_slug = '' THEN v_slug := 'flavour'; END IF;
  IF EXISTS (SELECT 1 FROM public.flavours WHERE slug = v_slug) THEN
    v_slug := v_slug || '-' || left(replace(gen_random_uuid()::text, '-', ''), 6);
  END IF;

  BEGIN
    INSERT INTO public.flavours
      (name, slug, name_en, base_token, drizzle_token, crumble_token, source, is_active)
    VALUES
      (btrim(p_name), v_slug, btrim(p_name), p_base_token,
       COALESCE(p_drizzle_token, 'none'), COALESCE(p_crumble_token, 'none'),
       'owner_defined', true)
    RETURNING id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    -- Race: another owner inserted the same name first. Treat as kept_existing.
    SELECT f.id INTO v_id
    FROM public.flavours f
    WHERE f.name_normalized = norm AND f.source = 'owner_defined'
    LIMIT 1;
    RETURN QUERY SELECT 'kept_existing'::text, v_id, 'owner_defined'::text;
    RETURN;
  END;

  RETURN QUERY SELECT 'created'::text, v_id, 'owner_defined'::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_owner_flavour_catalogue(text, text, text, text) TO authenticated;
