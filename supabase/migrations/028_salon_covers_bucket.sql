-- New public bucket for salon public-page cover photos (Basic+ feature).
-- Deliberately a separate bucket from salon-logos: different aspect ratio /
-- size expectations, and a clean place to add correct owner-scoped RLS
-- (salon-logos currently has no INSERT/UPDATE/DELETE policies at all --
-- left untouched per instructions; not this bucket's concern).

INSERT INTO storage.buckets (id, name, public)
VALUES ('salon-covers', 'salon-covers', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read salon covers" ON storage.objects;
CREATE POLICY "Public read salon covers"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'salon-covers');

-- Path convention: {place_id}/{timestamp}.webp -- storage.foldername(name)
-- returns the path segments before the filename, so [1] is the place_id.
DROP POLICY IF EXISTS "Owners insert own salon cover" ON storage.objects;
CREATE POLICY "Owners insert own salon cover"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'salon-covers'
  AND EXISTS (
    SELECT 1 FROM public.salon_profiles sp
    WHERE sp.place_id = (storage.foldername(name))[1]
      AND sp.is_claimed = true
      AND sp.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Owners update own salon cover" ON storage.objects;
CREATE POLICY "Owners update own salon cover"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'salon-covers'
  AND EXISTS (
    SELECT 1 FROM public.salon_profiles sp
    WHERE sp.place_id = (storage.foldername(name))[1]
      AND sp.is_claimed = true
      AND sp.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Owners delete own salon cover" ON storage.objects;
CREATE POLICY "Owners delete own salon cover"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'salon-covers'
  AND EXISTS (
    SELECT 1 FROM public.salon_profiles sp
    WHERE sp.place_id = (storage.foldername(name))[1]
      AND sp.is_claimed = true
      AND sp.owner_id = auth.uid()
  )
);
