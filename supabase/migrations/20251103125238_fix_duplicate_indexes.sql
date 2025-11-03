/*
  # Fix Duplicate Indexes

  ## Summary
  Removes duplicate indexes that provide identical functionality, keeping only the most
  comprehensive version of each index.

  ## Duplicate Indexes Fixed

  ### parsed_documents table
  - **Keeping**: idx_parsed_docs_session_status_date (more comprehensive, includes date)
  - **Removing**: idx_parsed_docs_session_status (duplicate, subset of above)
  
  ### test_results table
  - **Keeping**: idx_test_results_user_report_flagged (more comprehensive, includes flagged status)
  - **Removing**: idx_test_results_user_report (duplicate, subset of above)

  ## Impact
  - Reduces storage overhead
  - Eliminates redundant index maintenance
  - Keeps more useful composite indexes
  - No performance degradation (keeping better indexes)

  ## Safety
  - Kept the more comprehensive indexes
  - All query patterns still covered
  - Can recreate if needed
*/

-- Remove duplicate index from parsed_documents
-- Keeping idx_parsed_docs_session_status_date as it's more comprehensive
DROP INDEX IF EXISTS idx_parsed_docs_session_status;

-- Remove duplicate index from test_results
-- Keeping idx_test_results_user_report_flagged as it's more comprehensive
DROP INDEX IF EXISTS idx_test_results_user_report;
