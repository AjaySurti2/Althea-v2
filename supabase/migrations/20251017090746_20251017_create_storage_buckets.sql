/*
  # Create Storage Buckets for Medical Files and Reports

  1. Storage Buckets
    - medical-files: User-uploaded medical documents (50MB limit)
    - report-pdfs: Generated PDF reports (10MB limit)
    
  2. Security
    - Private buckets (public = false)
    - RLS policies for user-specific access
    - File paths: {user_id}/{session_id}/{filename}
    
  3. Allowed File Types
    - Medical files: PDF, JPG, PNG, DOCX, TXT
    - Reports: PDF, HTML
*/

-- Create medical-files bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'medical-files',
  'medical-files',
  false,
  52428800, -- 50MB
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

-- Create report-pdfs bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'report-pdfs',
  'report-pdfs',
  false,
  10485760, -- 10MB
  ARRAY['application/pdf', 'text/html']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf', 'text/html'];

-- Medical files bucket policies
CREATE POLICY "Users can upload medical files to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'medical-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can read own medical files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'medical-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own medical files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'medical-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'medical-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own medical files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'medical-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Report PDFs bucket policies
CREATE POLICY "Users can upload reports to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'report-pdfs' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can read own reports"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'report-pdfs' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own reports"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'report-pdfs' 
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'report-pdfs' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own reports"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'report-pdfs' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);