/*
  # Remove Unused Indexes

  1. Performance Optimization
    - Drop indexes that are not being used
    - Reduces storage overhead
    - Speeds up INSERT/UPDATE/DELETE operations
    - Simplifies index maintenance

  2. Indexes Removed
    - ai_summaries: session_id, user_id
    - family_audit_log: family_member_id
    - family_health_trends: source_session_id
    - health_metrics: family_member_id, session_id, family_member (duplicate)
    - leads: converted_to_user_id
    - reminders: family_member_id
    - report_pdfs: session_id, user_id
    - sessions: family_member_id
    - lab_reports: user_session (unused composite)

  3. Important
    - Only removes UNUSED indexes
    - Keeps all foreign key indexes (added in previous migration)
    - Improves write performance
*/

-- AI Summaries (unused)
DROP INDEX IF EXISTS public.idx_ai_summaries_session_id;
DROP INDEX IF EXISTS public.idx_ai_summaries_user_id;

-- Family Audit Log (unused)
DROP INDEX IF EXISTS public.idx_family_audit_log_family_member_id;

-- Family Health Trends (unused)
DROP INDEX IF EXISTS public.idx_family_health_trends_source_session_id;

-- Health Metrics (unused + duplicate)
DROP INDEX IF EXISTS public.idx_health_metrics_family_member_id;
DROP INDEX IF EXISTS public.idx_health_metrics_session_id;
DROP INDEX IF EXISTS public.idx_health_metrics_family_member;

-- Leads (unused)
DROP INDEX IF EXISTS public.idx_leads_converted_to_user_id;

-- Reminders (unused)
DROP INDEX IF EXISTS public.idx_reminders_family_member_id;

-- Report PDFs (unused)
DROP INDEX IF EXISTS public.idx_report_pdfs_session_id;
DROP INDEX IF EXISTS public.idx_report_pdfs_user_id;

-- Sessions (unused)
DROP INDEX IF EXISTS public.idx_sessions_family_member_id;

-- Lab Reports (unused composite)
DROP INDEX IF EXISTS public.idx_lab_reports_user_session;
