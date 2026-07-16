-- Addresses two findings from get_advisors after 029/030, both on objects
-- introduced in this branch (pre-existing advisor findings on other objects
-- are left untouched and logged separately in SUMMARY.md):
--
-- 1. anon_security_definer_function_executable / authenticated_...:
--    REVOKE ALL ... FROM PUBLIC in 029/030 did not remove `anon`'s EXECUTE
--    grant, because this Supabase project grants EXECUTE on public-schema
--    functions to anon/authenticated/service_role directly (not only via
--    the PUBLIC pseudo-role) at creation time, and CREATE OR REPLACE
--    FUNCTION does not reset previously-granted privileges. The internal
--    salon_owner_tier_ok() check already makes anon calls return empty
--    (anon has no auth.uid()), but explicitly revoking EXECUTE from anon
--    is stricter (anon is rejected outright rather than merely getting an
--    empty result) and clears the advisor finding.
--
-- 2. public_bucket_allows_listing on salon-covers: the "Public read salon
--    covers" SELECT policy is redundant -- public buckets already serve
--    objects at /storage/v1/object/public/{bucket}/{path} without any RLS
--    check, which is the only access pattern this app uses (mirrors the
--    existing publicSalonLogoUrl()-style helper). The SELECT policy only
--    adds the ability to LIST all objects in the bucket via the storage
--    API, which isn't needed. Dropping it removes that without affecting
--    cover photo display.

REVOKE EXECUTE ON FUNCTION public.salon_owner_tier_ok(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.salon_visits_by_week(text, timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.salon_top_flavours(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.salon_weather_stats(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.salon_monthly_ratings(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.salon_flavour_performance(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.salon_visitor_recurrence(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.salon_dow_distribution(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.salon_rating_histogram(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.salon_vitrine_conversion(text) FROM anon;

DROP POLICY IF EXISTS "Public read salon covers" ON storage.objects;
