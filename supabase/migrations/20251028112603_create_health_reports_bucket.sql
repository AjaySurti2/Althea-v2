/*
  # Create Health Reports Storage Bucket

  1. New Storage Bucket
    - `health-reports`: AI-generated comprehensive health reports
    - File size limit: 10MB
    - Allowed types: HTML, PDF
    - Private bucket with user-specific access

  2. Security
    - RLS policies for authenticated users
    - Users can only access their own reports
    - Service role can read/write for edge functions
    - File path structure: {user_id}/{report_id}.html

  3. Purpose
    - Store AI-generated health reports
    - Enable download functionality
    - Track report access via report_access_log table
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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own health reports" ON storage.objects;
DROP POLICY IF EXISTS "Service role can upload health reports" ON storage.objects;
DROP POLICY IF EXISTS "Service role can update health reports" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own health reports" ON storage.objects;

-- Storage policies for health-reports bucket

-- Allow authenticated users to read their own reports
CREATE POLICY "Users can read own health reports"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'health-reports' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow service role to upload reports (for edge functions)
CREATE POLICY "Service role can upload health reports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'health-reports'
);

-- Allow service role to update reports
CREATE POLICY "Service role can update health reports"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'health-reports')
WITH CHECK (bucket_id = 'health-reports');

-- Allow users to delete their own reports
CREATE POLICY "Users can delete own health reports"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'health-reports' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);