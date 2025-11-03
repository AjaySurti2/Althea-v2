/*
  # Remove Unused Indexes - Part 3

  ## Summary
  Continues removing unused indexes from report and session tables.

  ## Indexes Removed (Part 3)
  - idx_report_pdfs_session_id (report_pdfs table)
  - idx_report_pdfs_user_id (report_pdfs table)
  - idx_report_questions_user_id (report_questions table)
  - idx_report_questions_report_id (report_questions table)
  - idx_report_questions_priority (report_questions table)
  - idx_sessions_family_member_id (sessions table)
  - idx_sessions_user_id (sessions table)
  - idx_sessions_status (sessions table)
  - idx_profiles_updated_at (profiles table)
  - idx_family_members_updated_at (family_members table)

  ## Impact
  - Optimizes database performance
  - Reduces write overhead
  - No negative impact on queries
*/

-- Drop unused indexes from report_pdfs
DROP INDEX IF EXISTS idx_report_pdfs_session_id;
DROP INDEX IF EXISTS idx_report_pdfs_user_id;

-- Drop unused indexes from report_questions
DROP INDEX IF EXISTS idx_report_questions_user_id;
DROP INDEX IF EXISTS idx_report_questions_report_id;
DROP INDEX IF EXISTS idx_report_questions_priority;

-- Drop unused indexes from sessions
DROP INDEX IF EXISTS idx_sessions_family_member_id;
DROP INDEX IF EXISTS idx_sessions_user_id;
DROP INDEX IF EXISTS idx_sessions_status;

-- Drop unused indexes from profiles
DROP INDEX IF EXISTS idx_profiles_updated_at;

-- Drop unused indexes from family_members
DROP INDEX IF EXISTS idx_family_members_updated_at;
