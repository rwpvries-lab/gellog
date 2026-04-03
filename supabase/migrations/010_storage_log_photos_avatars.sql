-- Profile avatars are stored at log-photos/avatars/{user_id}.{ext} with a public object URL.
-- Without a SELECT policy, anonymous requests get 403 and the browser shows a broken image.

DROP POLICY IF EXISTS "Public read log-photos avatars" ON storage.objects;
CREATE POLICY "Public read log-photos avatars"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'log-photos'
  AND name LIKE 'avatars/%'
);

-- Let signed-in users manage only their own avatar object (path prefix avatars/{uuid}.)
DROP POLICY IF EXISTS "Users insert own avatar" ON storage.objects;
CREATE POLICY "Users insert own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'log-photos'
  AND name ~ ('^avatars/' || auth.uid()::text || '\.[^/]+$')
);

DROP POLICY IF EXISTS "Users update own avatar" ON storage.objects;
CREATE POLICY "Users update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'log-photos'
  AND name ~ ('^avatars/' || auth.uid()::text || '\.[^/]+$')
);

DROP POLICY IF EXISTS "Users delete own avatar" ON storage.objects;
CREATE POLICY "Users delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'log-photos'
  AND name ~ ('^avatars/' || auth.uid()::text || '\.[^/]+$')
);
