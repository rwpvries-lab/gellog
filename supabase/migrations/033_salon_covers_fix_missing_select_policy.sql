-- Fixes a real bug found during authenticated dashboard testing: cover photo
-- uploads to salon-covers failed 100% of the time with "new row violates
-- row-level security policy", even for the correct owner.
--
-- Root cause: 031_salon_dashboard_advisor_hardening.sql dropped the
-- "Public read salon covers" SELECT policy to close a get_advisors
-- public_bucket_allows_listing warning (unrestricted anon listing). That
-- policy was the ONLY SELECT policy on the bucket. Supabase's storage
-- client always performs the upload as `INSERT ... RETURNING`, and Postgres
-- RLS evaluates SELECT policies against the newly-inserted row to satisfy
-- RETURNING -- with zero SELECT policies, that implicit read has nothing to
-- match, and Postgres reports the whole statement as an RLS violation even
-- though the INSERT's own WITH CHECK passed. Confirmed by reproducing with
-- a trivial `WITH CHECK (true)` INSERT policy, which still failed until a
-- SELECT policy existed.
--
-- Fix: add a SELECT policy scoped to `authenticated` only (not `public`/
-- `anon`), which lets the upload's RETURNING clause succeed while NOT
-- reopening the original advisor concern (anonymous enumeration of every
-- file in the bucket). Public *display* of cover photos is unaffected
-- either way -- it goes through the public object URL endpoint
-- (/storage/v1/object/public/...), which bypasses RLS entirely for public
-- buckets and was never affected by this policy.

CREATE POLICY "Authenticated read own salon cover"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'salon-covers');
