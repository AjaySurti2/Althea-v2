/*
  # Add Remaining Foreign Key Indexes

  1. Performance Improvements
    - Add indexes for all remaining unindexed foreign keys
    - Critical for JOIN performance and referential integrity
    - Prevents slow queries on foreign key lookups

  2. Tables Updated
    - ai_summaries: session_id, user_id
    - family_audit_log: family_member_id
    - family_health_trends: source_session_id
    - health_metrics: family_member_id, session_id
    - lab_reports: user_id
    - leads: converted_to_user_id
    - reminders: family_member_id
    - report_pdfs: session_id, user_id
    - sessions: family_member_id

  3. Security Impact
    - Faster queries = better DoS protection
    - Indexed foreign keys prevent database slowdown
    - Essential for production workloads
*/

-- AI Summaries
CREATE INDEX IF NOT EXISTS idx_ai_summaries_session_id_fk 
  ON public.ai_summaries(session_id);

CREATE INDEX IF NOT EXISTS idx_ai_summaries_user_id_fk 
  ON public.ai_summaries(user_id);

-- Family Audit Log
CREATE INDEX IF NOT EXISTS idx_family_audit_log_family_member_id_fk 
  ON public.family_audit_log(family_member_id);

-- Family Health Trends
CREATE INDEX IF NOT EXISTS idx_family_health_trends_source_session_id_fk 
  ON public.family_health_trends(source_session_id);

-- Health Metrics
CREATE INDEX IF NOT EXISTS idx_health_metrics_family_member_id_fk 
  ON public.health_metrics(family_member_id);

CREATE INDEX IF NOT EXISTS idx_health_metrics_session_id_fk 
  ON public.health_metrics(session_id);

-- Lab Reports
CREATE INDEX IF NOT EXISTS idx_lab_reports_user_id_fk 
  ON public.lab_reports(user_id);

-- Leads
CREATE INDEX IF NOT EXISTS idx_leads_converted_to_user_id_fk 
  ON public.leads(converted_to_user_id);

-- Reminders
CREATE INDEX IF NOT EXISTS idx_reminders_family_member_id_fk 
  ON public.reminders(family_member_id);

-- Report PDFs
CREATE INDEX IF NOT EXISTS idx_report_pdfs_session_id_fk 
  ON public.report_pdfs(session_id);

CREATE INDEX IF NOT EXISTS idx_report_pdfs_user_id_fk 
  ON public.report_pdfs(user_id);

-- Sessions
CREATE INDEX IF NOT EXISTS idx_sessions_family_member_id_fk 
  ON public.sessions(family_member_id);
