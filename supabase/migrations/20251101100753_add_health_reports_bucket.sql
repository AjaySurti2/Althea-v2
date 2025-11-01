/*
  # Add Health Reports Storage Bucket
  
  1. Storage Bucket
    - health-reports: Generated HTML health reports (10MB limit)
    
  2. Security
    - Private bucket (public = false)
    - RLS policies for user-specific access
    - File paths: {user_id}/{report_id}.html
    
  3. Allowed File Types
    - HTML reports: text/html
    - PDF reports: application/pdf
*/

-- Create health-reports bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'health-reports',
  'health-reports',
  false,
  10485760, -- 10MB
  ARRAY['text/html', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['text/html', 'application/pdf'];

-- Health reports bucket policies
CREATE POLICY "Users can upload health reports to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'health-reports' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can read own health reports"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'health-reports' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own health reports"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'health-reports' 
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'health-reports' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own health reports"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'health-reports' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);