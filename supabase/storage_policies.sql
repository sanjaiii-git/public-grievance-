-- =====================================================
-- STORAGE POLICIES FOR EVIDENCE BUCKET
-- =====================================================
-- PREREQUISITE: Create the 'evidence' bucket in Supabase Dashboard
-- Go to: Storage → New bucket → Name: evidence → Public: ON → Create
-- Then run this SQL in the SQL Editor
-- =====================================================

-- Allow authenticated users to upload evidence
DROP POLICY IF EXISTS "Citizens can upload evidence" ON storage.objects;
CREATE POLICY "Citizens can upload evidence"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'evidence'
        AND auth.uid() IS NOT NULL
    );

-- Allow authenticated users to view/download evidence
DROP POLICY IF EXISTS "Anyone can view evidence" ON storage.objects;
CREATE POLICY "Anyone can view evidence"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'evidence'
    );

-- Allow users to update their own uploads
DROP POLICY IF EXISTS "Users can update own evidence" ON storage.objects;
CREATE POLICY "Users can update own evidence"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'evidence'
        AND auth.uid() IS NOT NULL
    );

-- Allow users to delete their own uploads
DROP POLICY IF EXISTS "Users can delete own evidence" ON storage.objects;
CREATE POLICY "Users can delete own evidence"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'evidence'
        AND (storage.foldername(name))[1] = auth.uid()::TEXT
    );
