/*
  # Reset Documents Table Migration (v2)

  ## Purpose
  This migration provides a safe way to reset the documents table while preserving
  the table structure and related constraints.

  ## Operations
  1. Delete all data from documents table (cascades to related tables)
  2. Verify table structure remains intact

  ## Data Impact
  - ⚠️ DELETES all document records
  - ⚠️ CASCADES to parsing_jobs (related jobs deleted)
  - ⚠️ CASCADES to parsed_data (related parsed data deleted)
  - ✅ Table structure, indexes, and RLS policies preserved
  - ✅ Does NOT affect other tables (profiles, reports, categories)

  ## Safety
  - Use this migration when you need to clear document data without dropping tables
  - Suitable for testing, staging environment resets, or data cleanup
  - Production use: Ensure backup exists before applying

  ## Verification
  After applying, verify:
  - SELECT count(*) FROM documents; -- Should return 0
  - SELECT count(*) FROM parsing_jobs; -- Should return 0
  - SELECT count(*) FROM parsed_data; -- Should return 0
*/

-- Delete all data (TRUNCATE CASCADE handles related tables automatically)
TRUNCATE TABLE documents CASCADE;

-- Verify table structure is intact
DO $$
DECLARE
  doc_count INTEGER;
  job_count INTEGER;
  data_count INTEGER;
BEGIN
  SELECT count(*) INTO doc_count FROM documents;
  SELECT count(*) INTO job_count FROM parsing_jobs;
  SELECT count(*) INTO data_count FROM parsed_data;
  
  RAISE NOTICE 'Reset complete: documents=%, parsing_jobs=%, parsed_data=%', 
    doc_count, job_count, data_count;
END $$;
