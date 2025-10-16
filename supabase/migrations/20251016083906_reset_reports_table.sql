/*
  # Reset Reports Table Migration

  ## Purpose
  This migration safely clears all report data while maintaining table structure.

  ## Operations
  1. Delete all records from reports table
  2. Verify table integrity

  ## Data Impact
  - ⚠️ DELETES all report records
  - ✅ Table structure, indexes, and RLS policies preserved
  - ✅ Does NOT affect other tables

  ## Safety
  - Safe for testing and staging environment resets
  - Reports can be regenerated from source data
  - Production use: Ensure backup exists before applying

  ## Verification
  After applying, verify:
  - SELECT count(*) FROM reports; -- Should return 0
*/

-- Delete all report data
TRUNCATE TABLE reports;

-- Verify reset
DO $$
DECLARE
  report_count INTEGER;
BEGIN
  SELECT count(*) INTO report_count FROM reports;
  RAISE NOTICE 'Reset complete: reports=%', report_count;
END $$;
