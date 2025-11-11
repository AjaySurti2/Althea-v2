/*
  # Add Missing Foreign Key Indexes

  1. Performance Improvements
    - Add indexes for all unindexed foreign keys
    - Improves JOIN performance and referential integrity checks
    - Critical for query optimization

  2. Tables Updated
    - family_audit_log: user_id
    - family_health_trends: family_member_id, user_id
    - health_insights: parent_insight_id, report_id, user_id
    - health_reports: insight_id, session_id, user_id
    - lab_reports: file_id, patient_id
    - patients: user_id

  3. Security
    - Better query performance = better DoS protection
    - Indexed foreign keys prevent slow queries
*/

-- Family Audit Log
CREATE INDEX IF NOT EXISTS idx_family_audit_log_user_id_fk 
  ON public.family_audit_log(user_id);

-- Family Health Trends
CREATE INDEX IF NOT EXISTS idx_family_health_trends_family_member_id_fk 
  ON public.family_health_trends(family_member_id);

CREATE INDEX IF NOT EXISTS idx_family_health_trends_user_id_fk 
  ON public.family_health_trends(user_id);

-- Health Insights
CREATE INDEX IF NOT EXISTS idx_health_insights_parent_insight_id_fk 
  ON public.health_insights(parent_insight_id);

CREATE INDEX IF NOT EXISTS idx_health_insights_report_id_fk 
  ON public.health_insights(report_id);

CREATE INDEX IF NOT EXISTS idx_health_insights_user_id_fk 
  ON public.health_insights(user_id);

-- Health Reports
CREATE INDEX IF NOT EXISTS idx_health_reports_insight_id_fk 
  ON public.health_reports(insight_id);

CREATE INDEX IF NOT EXISTS idx_health_reports_session_id_fk 
  ON public.health_reports(session_id);

CREATE INDEX IF NOT EXISTS idx_health_reports_user_id_fk 
  ON public.health_reports(user_id);

-- Lab Reports
CREATE INDEX IF NOT EXISTS idx_lab_reports_file_id_fk 
  ON public.lab_reports(file_id);

CREATE INDEX IF NOT EXISTS idx_lab_reports_patient_id_fk 
  ON public.lab_reports(patient_id);

-- Patients
CREATE INDEX IF NOT EXISTS idx_patients_user_id_fk 
  ON public.patients(user_id);
