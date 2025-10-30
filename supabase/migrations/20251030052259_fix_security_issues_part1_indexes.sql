/*
  # Fix Security Issues - Part 1: Missing Foreign Key Indexes

  This migration adds indexes for all foreign key columns that are missing them,
  which significantly improves query performance for JOIN operations and foreign key lookups.

  ## Changes
  - Add indexes for unindexed foreign keys across all tables
  - Improves query performance for foreign key constraints
  - Reduces database load on JOIN operations
*/

-- ai_summaries table indexes
CREATE INDEX IF NOT EXISTS idx_ai_summaries_session_id ON public.ai_summaries(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_summaries_user_id ON public.ai_summaries(user_id);

-- family_health_trends table indexes
CREATE INDEX IF NOT EXISTS idx_family_health_trends_source_session_id ON public.family_health_trends(source_session_id);

-- family_patterns table indexes
CREATE INDEX IF NOT EXISTS idx_family_patterns_user_id ON public.family_patterns(user_id);

-- health_metrics table indexes
CREATE INDEX IF NOT EXISTS idx_health_metrics_family_member_id ON public.health_metrics(family_member_id);
CREATE INDEX IF NOT EXISTS idx_health_metrics_session_id ON public.health_metrics(session_id);

-- leads table indexes
CREATE INDEX IF NOT EXISTS idx_leads_converted_to_user_id ON public.leads(converted_to_user_id);

-- parsed_documents table indexes
CREATE INDEX IF NOT EXISTS idx_parsed_documents_file_id ON public.parsed_documents(file_id);

-- reminders table indexes
CREATE INDEX IF NOT EXISTS idx_reminders_family_member_id ON public.reminders(family_member_id);

-- report_access_log table indexes
CREATE INDEX IF NOT EXISTS idx_report_access_log_user_id ON public.report_access_log(user_id);

-- report_pdfs table indexes
CREATE INDEX IF NOT EXISTS idx_report_pdfs_session_id ON public.report_pdfs(session_id);
CREATE INDEX IF NOT EXISTS idx_report_pdfs_user_id ON public.report_pdfs(user_id);

-- report_questions table indexes
CREATE INDEX IF NOT EXISTS idx_report_questions_user_id ON public.report_questions(user_id);

-- sessions table indexes
CREATE INDEX IF NOT EXISTS idx_sessions_family_member_id ON public.sessions(family_member_id);