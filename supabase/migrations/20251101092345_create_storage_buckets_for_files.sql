/*
  # Create Storage Buckets for Medical Files and Reports
  
  1. Storage Buckets Created
    - medical-files: For user-uploaded medical documents (50MB limit)
    - report-pdfs: For AI-generated PDF reports (10MB limit)
    
  2. Security Policies
    - All buckets are private (not publicly accessible)
    - Users can only access files in their own folders
    - File path structure: {user_id}/{session_id}/{filename}
    
  3. Allowed File Types
    - Medical files: PDF, images (JPG, PNG, WEBP), text, Word documents
    - Report PDFs: PDF and HTML files
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
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can upload medical files to own folder'
  ) THEN
    CREATE POLICY "Users can upload medical files to own folder"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'medical-files' 
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can read own medical files'
  ) THEN
    CREATE POLICY "Users can read own medical files"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'medical-files' 
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can update own medical files'
  ) THEN
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
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can delete own medical files'
  ) THEN
    CREATE POLICY "Users can delete own medical files"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'medical-files' 
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;
END $$;

-- Report PDFs bucket policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can upload reports to own folder'
  ) THEN
    CREATE POLICY "Users can upload reports to own folder"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'report-pdfs' 
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can read own reports'
  ) THEN
    CREATE POLICY "Users can read own reports"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'report-pdfs' 
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can update own reports'
  ) THEN
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
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can delete own reports'
  ) THEN
    CREATE POLICY "Users can delete own reports"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'report-pdfs' 
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;
END $$;