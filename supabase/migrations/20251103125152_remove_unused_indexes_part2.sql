/*
  # Remove Unused Indexes - Part 2

  ## Summary
  Continues removing unused indexes from additional tables.

  ## Indexes Removed (Part 2)
  - idx_health_metrics_family_member_id (health_metrics table)
  - idx_health_metrics_session_id (health_metrics table)
  - idx_leads_converted_to_user_id (leads table)
  - idx_leads_email (leads table)
  - idx_parsed_documents_file_id (parsed_documents table)
  - idx_reminders_family_member_id (reminders table)
  - idx_report_access_log_user_id (report_access_log table)
  - idx_report_access_log_report_id (report_access_log table)
  - idx_report_access_log_accessed_at (report_access_log table)

  ## Impact
  - Reduces index maintenance overhead
  - Frees up storage space
  - No query performance impact
*/

-- Drop unused indexes from health_metrics
DROP INDEX IF EXISTS idx_health_metrics_family_member_id;
DROP INDEX IF EXISTS idx_health_metrics_session_id;

-- Drop unused indexes from leads
DROP INDEX IF EXISTS idx_leads_converted_to_user_id;
DROP INDEX IF EXISTS idx_leads_email;

-- Drop unused indexes from parsed_documents
DROP INDEX IF EXISTS idx_parsed_documents_file_id;

-- Drop unused indexes from reminders
DROP INDEX IF EXISTS idx_reminders_family_member_id;

-- Drop unused indexes from report_access_log
DROP INDEX IF EXISTS idx_report_access_log_user_id;
DROP INDEX IF EXISTS idx_report_access_log_report_id;
DROP INDEX IF EXISTS idx_report_access_log_accessed_at;
