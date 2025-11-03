/*
  # Remove Unused Indexes - Part 4

  ## Summary
  Removes remaining unused indexes from lab reports, test results, and files tables.

  ## Indexes Removed (Part 4)
  - idx_files_session_user (files table)
  - idx_patients_user_id (patients table)
  - idx_lab_reports_patient_id (lab_reports table)
  - idx_lab_reports_file_id (lab_reports table)
  - idx_lab_reports_report_date (lab_reports table)
  - idx_lab_reports_user_session (lab_reports table)
  - idx_lab_reports_session_user_date (lab_reports table)
  - idx_test_results_status (test_results table)
  - idx_test_results_is_flagged (test_results table)
  - idx_health_reports_session_id (health_reports table)
  - idx_health_reports_generated_at (health_reports table)

  ## Impact
  - Completes unused index removal
  - Optimizes database operations
  - Maintains only actively used indexes
*/

-- Drop unused indexes from files
DROP INDEX IF EXISTS idx_files_session_user;

-- Drop unused indexes from patients
DROP INDEX IF EXISTS idx_patients_user_id;

-- Drop unused indexes from lab_reports
DROP INDEX IF EXISTS idx_lab_reports_patient_id;
DROP INDEX IF EXISTS idx_lab_reports_file_id;
DROP INDEX IF EXISTS idx_lab_reports_report_date;
DROP INDEX IF EXISTS idx_lab_reports_user_session;
DROP INDEX IF EXISTS idx_lab_reports_session_user_date;

-- Drop unused indexes from test_results
DROP INDEX IF EXISTS idx_test_results_status;
DROP INDEX IF EXISTS idx_test_results_is_flagged;

-- Drop unused indexes from health_reports
DROP INDEX IF EXISTS idx_health_reports_session_id;
DROP INDEX IF EXISTS idx_health_reports_generated_at;
