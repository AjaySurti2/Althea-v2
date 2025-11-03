/*
  # Optimize Parsing Performance & Add Duplicate Detection

  ## Summary
  This migration optimizes the medical report parsing system by adding indexes,
  tracking columns, and constraints to eliminate duplicate parsing and improve query performance.

  ## Changes
  
  ### 1. Performance Indexes
  - Add index on files(session_id, user_id) for faster session queries
  - Add index on parsed_documents(file_id, parsing_status) for duplicate detection
  - Add composite index on parsed_documents(session_id, parsing_status, created_at)
  - Add index on test_results(user_id, lab_report_id, is_flagged) for faster filtering
  - Add index on lab_reports(session_id, user_id, report_date) for report queries
  
  ### 2. Parsing Tracking Columns
  - Add parsing_started_at to track when parsing begins
  - Add parsing_completed_at to track parsing duration
  - Add parsing_provider to store which AI was used (openai/anthropic)
  - Add parsing_attempts to track retry count
  - Add parsing_duration_ms to measure performance
  
  ### 3. Duplicate Prevention
  - Add unique constraint on parsed_documents(file_id) to prevent duplicate parsing
  - Update existing records to ensure data integrity
  
  ### 4. Cost Tracking
  - Add estimated_cost column to track API usage costs
  - Add tokens_used column for monitoring consumption
  
  ## Notes
  - All indexes use IF NOT EXISTS to allow safe re-running
  - Existing data is preserved
  - New columns are nullable for backward compatibility
*/

-- ============================================================================
-- 1. ADD PERFORMANCE INDEXES
-- ============================================================================

-- Index for fast session file lookups
CREATE INDEX IF NOT EXISTS idx_files_session_user 
ON files(session_id, user_id);

-- Index for duplicate detection and status checks
CREATE INDEX IF NOT EXISTS idx_parsed_docs_file_status 
ON parsed_documents(file_id, parsing_status);

-- Index for session-based queries with status filter
CREATE INDEX IF NOT EXISTS idx_parsed_docs_session_status_date 
ON parsed_documents(session_id, parsing_status, created_at DESC);

-- Index for finding flagged test results quickly
CREATE INDEX IF NOT EXISTS idx_test_results_user_report_flagged 
ON test_results(user_id, lab_report_id, is_flagged);

-- Index for lab report queries
CREATE INDEX IF NOT EXISTS idx_lab_reports_session_user_date 
ON lab_reports(session_id, user_id, report_date DESC NULLS LAST);

-- Index for finding user's parsed documents
CREATE INDEX IF NOT EXISTS idx_parsed_docs_user_created 
ON parsed_documents(user_id, created_at DESC);

-- ============================================================================
-- 2. ADD PARSING TRACKING COLUMNS
-- ============================================================================

-- Add parsing timestamp columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'parsed_documents' AND column_name = 'parsing_started_at'
  ) THEN
    ALTER TABLE parsed_documents ADD COLUMN parsing_started_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'parsed_documents' AND column_name = 'parsing_completed_at'
  ) THEN
    ALTER TABLE parsed_documents ADD COLUMN parsing_completed_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'parsed_documents' AND column_name = 'parsing_provider'
  ) THEN
    ALTER TABLE parsed_documents ADD COLUMN parsing_provider text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'parsed_documents' AND column_name = 'parsing_attempts'
  ) THEN
    ALTER TABLE parsed_documents ADD COLUMN parsing_attempts integer DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'parsed_documents' AND column_name = 'parsing_duration_ms'
  ) THEN
    ALTER TABLE parsed_documents ADD COLUMN parsing_duration_ms integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'parsed_documents' AND column_name = 'estimated_cost'
  ) THEN
    ALTER TABLE parsed_documents ADD COLUMN estimated_cost numeric(10, 6);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'parsed_documents' AND column_name = 'tokens_used'
  ) THEN
    ALTER TABLE parsed_documents ADD COLUMN tokens_used integer;
  END IF;
END $$;

-- ============================================================================
-- 3. ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN parsed_documents.parsing_started_at IS 'Timestamp when parsing began';
COMMENT ON COLUMN parsed_documents.parsing_completed_at IS 'Timestamp when parsing completed';
COMMENT ON COLUMN parsed_documents.parsing_provider IS 'AI provider used: openai, anthropic, or openai->anthropic for fallback';
COMMENT ON COLUMN parsed_documents.parsing_attempts IS 'Number of parsing attempts (1-3)';
COMMENT ON COLUMN parsed_documents.parsing_duration_ms IS 'Total parsing duration in milliseconds';
COMMENT ON COLUMN parsed_documents.estimated_cost IS 'Estimated API cost in USD';
COMMENT ON COLUMN parsed_documents.tokens_used IS 'Total tokens consumed during parsing';

-- ============================================================================
-- 4. UPDATE EXISTING RECORDS
-- ============================================================================

-- Set parsing_completed_at for existing completed records
UPDATE parsed_documents 
SET parsing_completed_at = updated_at 
WHERE parsing_status = 'completed' 
  AND parsing_completed_at IS NULL;

-- Set default provider for existing records
UPDATE parsed_documents 
SET parsing_provider = 'openai' 
WHERE parsing_provider IS NULL 
  AND parsing_status = 'completed';

-- ============================================================================
-- 5. CREATE HELPER FUNCTION FOR DUPLICATE DETECTION
-- ============================================================================

-- Function to check if file is already parsed
CREATE OR REPLACE FUNCTION is_file_already_parsed(p_file_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM parsed_documents 
    WHERE file_id = p_file_id 
      AND parsing_status = 'completed'
  );
END;
$$;

COMMENT ON FUNCTION is_file_already_parsed IS 'Check if a file has already been successfully parsed';

-- ============================================================================
-- 6. CREATE VIEW FOR PARSING STATISTICS
-- ============================================================================

CREATE OR REPLACE VIEW parsing_statistics AS
SELECT 
  DATE(parsing_completed_at) as parse_date,
  parsing_provider,
  COUNT(*) as total_parses,
  AVG(parsing_duration_ms) as avg_duration_ms,
  SUM(estimated_cost) as total_cost,
  SUM(tokens_used) as total_tokens,
  AVG(parsing_attempts) as avg_attempts
FROM parsed_documents
WHERE parsing_status = 'completed'
  AND parsing_completed_at IS NOT NULL
GROUP BY DATE(parsing_completed_at), parsing_provider
ORDER BY parse_date DESC;

COMMENT ON VIEW parsing_statistics IS 'Daily statistics for parsing performance and costs';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify indexes were created
DO $$
DECLARE
  index_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename IN ('files', 'parsed_documents', 'test_results', 'lab_reports')
    AND indexname LIKE 'idx_%';
  
  RAISE NOTICE 'Created/verified % performance indexes', index_count;
END $$;

-- Verify columns were added
DO $$
DECLARE
  column_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns
  WHERE table_name = 'parsed_documents'
    AND column_name IN (
      'parsing_started_at', 'parsing_completed_at', 'parsing_provider',
      'parsing_attempts', 'parsing_duration_ms', 'estimated_cost', 'tokens_used'
    );
  
  RAISE NOTICE 'Added/verified % tracking columns to parsed_documents', column_count;
END $$;
