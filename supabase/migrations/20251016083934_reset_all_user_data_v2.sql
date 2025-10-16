/*
  # Reset All User Data Migration (v2)

  ## Purpose
  Complete data reset while preserving schema and auth users.
  Use this for full application data cleanup.

  ## Operations
  1. Clear all user-generated content
  2. Reset document categories to defaults
  3. Preserve auth.users (login credentials intact)
  4. Maintain all table structures and policies

  ## Data Impact
  - ⚠️ DELETES all profiles
  - ⚠️ DELETES all documents (and related parsing_jobs, parsed_data)
  - ⚠️ DELETES all reports
  - ⚠️ RESETS document categories to defaults
  - ✅ Preserves auth.users (users can still log in)
  - ✅ Preserves all table structures, RLS policies, indexes

  ## Use Cases
  - Complete staging environment reset
  - After major testing cycles
  - Preparing for production launch
  - Data cleanup after demos

  ## Safety
  - CRITICAL: Creates complete data wipeout
  - Users will need to re-upload all documents
  - All reports will be lost
  - Auth credentials remain valid

  ## Verification
  After applying:
  - All tables should exist with 0 records (except default categories)
  - Auth users should remain intact
  - All RLS policies should still be active
*/

-- Clear all user data (order matters due to foreign keys)
-- TRUNCATE CASCADE automatically handles dependent tables
TRUNCATE TABLE documents CASCADE;
TRUNCATE TABLE reports CASCADE;
TRUNCATE TABLE profiles CASCADE;
TRUNCATE TABLE document_categories CASCADE;

-- Restore default categories
INSERT INTO document_categories (name, description) VALUES
  ('Invoice', 'Financial invoices and billing documents'),
  ('Receipt', 'Purchase receipts and transaction records'),
  ('Contract', 'Legal contracts and agreements'),
  ('Report', 'Business reports and analytics'),
  ('Form', 'Application forms and questionnaires'),
  ('Other', 'Miscellaneous documents')
ON CONFLICT (name) DO NOTHING;

-- Verification report
DO $$
DECLARE
  profile_count INTEGER;
  doc_count INTEGER;
  job_count INTEGER;
  data_count INTEGER;
  report_count INTEGER;
  category_count INTEGER;
  user_count INTEGER;
BEGIN
  SELECT count(*) INTO profile_count FROM profiles;
  SELECT count(*) INTO doc_count FROM documents;
  SELECT count(*) INTO job_count FROM parsing_jobs;
  SELECT count(*) INTO data_count FROM parsed_data;
  SELECT count(*) INTO report_count FROM reports;
  SELECT count(*) INTO category_count FROM document_categories;
  SELECT count(*) INTO user_count FROM auth.users;
  
  RAISE NOTICE 'Complete Reset Summary:';
  RAISE NOTICE '  Profiles: %', profile_count;
  RAISE NOTICE '  Documents: %', doc_count;
  RAISE NOTICE '  Parsing Jobs: %', job_count;
  RAISE NOTICE '  Parsed Data: %', data_count;
  RAISE NOTICE '  Reports: %', report_count;
  RAISE NOTICE '  Categories: %', category_count;
  RAISE NOTICE '  Auth Users (preserved): %', user_count;
END $$;
