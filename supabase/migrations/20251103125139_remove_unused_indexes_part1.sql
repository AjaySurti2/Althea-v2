/*
  # Remove Unused Indexes - Part 1

  ## Summary
  Removes unused indexes that have never been used in production to improve database performance
  and reduce storage overhead. This is part 1 of removing unused indexes.

  ## Indexes Removed (Part 1)
  - idx_ai_summaries_session_id (ai_summaries table)
  - idx_ai_summaries_user_id (ai_summaries table)
  - idx_family_audit_log_family_member_id (family_audit_log table)
  - idx_family_audit_log_user_id (family_audit_log table)
  - idx_family_health_trends_source_session_id (family_health_trends table)
  - idx_family_health_trends_user_id (family_health_trends table)
  - idx_family_health_trends_member_id (family_health_trends table)
  - idx_health_insights_family_member_id (health_insights table)
  - idx_health_insights_user_id (health_insights table)
  - idx_health_insights_report_id (health_insights table)

  ## Impact
  - Reduces index maintenance overhead on writes
  - Frees up storage space
  - No performance impact as indexes were unused
  
  ## Safety
  - Safe to remove as indexes have not been used
  - Can be recreated if needed in the future
*/

-- Drop unused indexes from ai_summaries
DROP INDEX IF EXISTS idx_ai_summaries_session_id;
DROP INDEX IF EXISTS idx_ai_summaries_user_id;

-- Drop unused indexes from family_audit_log
DROP INDEX IF EXISTS idx_family_audit_log_family_member_id;
DROP INDEX IF EXISTS idx_family_audit_log_user_id;

-- Drop unused indexes from family_health_trends
DROP INDEX IF EXISTS idx_family_health_trends_source_session_id;
DROP INDEX IF EXISTS idx_family_health_trends_user_id;
DROP INDEX IF EXISTS idx_family_health_trends_member_id;

-- Drop unused indexes from health_insights
DROP INDEX IF EXISTS idx_health_insights_family_member_id;
DROP INDEX IF EXISTS idx_health_insights_user_id;
DROP INDEX IF EXISTS idx_health_insights_report_id;
