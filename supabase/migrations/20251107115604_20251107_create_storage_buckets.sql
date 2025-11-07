/*
  # Create Storage Buckets for Medical Files and Reports
  
  1. Buckets Created
    - medical-files: For user-uploaded medical documents (PDFs, images)
    - health-reports: For AI-generated PDF reports
    
  2. Security
    - RLS policies for user-specific access
    - File type restrictions (MIME types)
    - File size limits
    - Users can only access their own files
*/

-- Create medical-files bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'medical-files',
  'medical-files',
  false,
  52428800, -- 50MB limit
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/heic',
    'image/heif'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Create health-reports bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'health-reports',
  'health-reports',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for medical-files bucket
CREATE POLICY "Users can upload their own medical files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'medical-files' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view their own medical files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'medical-files' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update their own medical files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'medical-files' AND
    (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'medical-files' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own medical files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'medical-files' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage policies for health-reports bucket
CREATE POLICY "Users can upload their own health reports"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'health-reports' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view their own health reports"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'health-reports' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own health reports"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'health-reports' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Service role can manage all files (for Edge Functions)
CREATE POLICY "Service role can manage all medical files"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'medical-files');

CREATE POLICY "Service role can manage all health reports"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'health-reports');