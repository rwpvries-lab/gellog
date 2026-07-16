-- Salon dashboard redesign: owner-configurable dashboard layout + public page
-- theme, plus a pinned "signature flavours" row on the vitrine.
-- dashboard_layout / page_theme: null = default (no customization yet).

ALTER TABLE public.salon_profiles
  ADD COLUMN IF NOT EXISTS dashboard_layout jsonb,
  ADD COLUMN IF NOT EXISTS page_theme jsonb;

ALTER TABLE public.vitrine_flavours
  ADD COLUMN IF NOT EXISTS is_signature boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS signature_position integer;

-- No new RLS needed: salon_profiles_update_claim already lets an owner update
-- any column on their own row, and vitrine_flavours_update_owner already lets
-- an owner update any column on their own salon's flavours.
