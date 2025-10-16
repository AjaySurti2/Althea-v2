/*
  # Create Storage Buckets for Medical Files and Reports

  ## Critical Issue Identified
  - Storage buckets `medical-files` and `report-pdfs` do not exist in database
  - Application code references these buckets causing "Bucket not found" errors
  - Previous migrations containing bucket creation were not executed on this instance

  ## Root Cause Analysis
  - Migration files exist but buckets table is empty
  - Frontend code (UploadWorkflow.tsx:104, TotalReports.tsx:88, DocumentReview.tsx:58) 
    all reference 'medical-files' bucket
  - Supabase storage.from() calls fail when bucket doesn't exist

  ## Solution
  This migration creates:
  1. **medical-files bucket** - For user-uploaded medical documents (private)
  2. **report-pdfs bucket** - For generated PDF reports (private)
  3. **Storage RLS policies** - Secure user-specific access

  ## Security
  - Both buckets are private (public = false)
  - RLS policies ensure users can only access their own files
  - File paths use user_id for isolation: {user_id}/{session_id}/{filename}

  ## Verification
  After applying, verify with:
  - SELECT * FROM storage.buckets;
  - SELECT * FROM pg_policies WHERE schemaname = 'storage';
*/

-- ============================================================================
-- STEP 1: CREATE STORAGE BUCKETS
-- ============================================================================

-- Create medical-files bucket for user uploads
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

-- Create report-pdfs bucket for generated reports
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'report-pdfs',
  'report-pdfs',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'text/html']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf', 'text/html'];

-- ============================================================================
-- STEP 2: CREATE RLS POLICIES FOR MEDICAL-FILES BUCKET
-- ============================================================================

-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload medical files to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'medical-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read their own files
CREATE POLICY "Users can read own medical files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'medical-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own files
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

-- Allow users to delete their own files
CREATE POLICY "Users can delete own medical files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'medical-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- STEP 3: CREATE RLS POLICIES FOR REPORT-PDFS BUCKET
-- ============================================================================

-- Allow authenticated users to upload reports to their own folder
CREATE POLICY "Users can upload reports to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'report-pdfs' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read their own reports
CREATE POLICY "Users can read own reports"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'report-pdfs' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own reports
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

-- Allow users to delete their own reports
CREATE POLICY "Users can delete own reports"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'report-pdfs' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- STEP 4: VERIFICATION
-- ============================================================================

-- Verify buckets were created
DO $$
DECLARE
  medical_bucket_exists BOOLEAN;
  report_bucket_exists BOOLEAN;
  medical_policies_count INTEGER;
  report_policies_count INTEGER;
BEGIN
  -- Check if buckets exist
  SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'medical-files') 
    INTO medical_bucket_exists;
  SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'report-pdfs') 
    INTO report_bucket_exists;
  
  -- Count policies
  SELECT COUNT(*) INTO medical_policies_count
  FROM pg_policies 
  WHERE schemaname = 'storage' 
    AND tablename = 'objects'
    AND policyname LIKE '%medical%';
    
  SELECT COUNT(*) INTO report_policies_count
  FROM pg_policies 
  WHERE schemaname = 'storage' 
    AND tablename = 'objects'
    AND policyname LIKE '%report%';
  
  -- Report results
  RAISE NOTICE '=== Storage Bucket Creation Summary ===';
  RAISE NOTICE 'medical-files bucket exists: %', medical_bucket_exists;
  RAISE NOTICE 'report-pdfs bucket exists: %', report_bucket_exists;
  RAISE NOTICE 'Medical files policies created: %', medical_policies_count;
  RAISE NOTICE 'Report policies created: %', report_policies_count;
  RAISE NOTICE 'Total policies: %', medical_policies_count + report_policies_count;
  
  -- Raise error if buckets not created
  IF NOT medical_bucket_exists OR NOT report_bucket_exists THEN
    RAISE EXCEPTION 'Failed to create storage buckets';
  END IF;
END $$;
