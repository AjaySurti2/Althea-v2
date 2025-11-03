/*
  # Add Missing Foreign Key Indexes for Performance
  
  1. Performance Issue
    - Foreign keys without indexes cause slow JOIN operations
    - Query optimizer cannot efficiently filter by foreign key values
    - This is critical for tables with many rows
    
  2. Indexes Added
    - ai_summaries: session_id, user_id
    - family_audit_log: family_member_id
    - family_health_trends: source_session_id
    - health_insights: family_member_id
    - health_metrics: family_member_id, session_id
    - leads: converted_to_user_id
    - parsed_documents: file_id
    - reminders: family_member_id
    - report_access_log: user_id
    - report_pdfs: session_id, user_id
    - report_questions: user_id
    - sessions: family_member_id
    
  3. Impact
    - Faster JOIN operations
    - Improved query planning
    - Better scalability as data grows
*/

-- ai_summaries indexes
CREATE INDEX IF NOT EXISTS idx_ai_summaries_session_id 
  ON ai_summaries(session_id);

CREATE INDEX IF NOT EXISTS idx_ai_summaries_user_id 
  ON ai_summaries(user_id);

-- family_audit_log indexes
CREATE INDEX IF NOT EXISTS idx_family_audit_log_family_member_id 
  ON family_audit_log(family_member_id);

-- family_health_trends indexes
CREATE INDEX IF NOT EXISTS idx_family_health_trends_source_session_id 
  ON family_health_trends(source_session_id);

-- health_insights indexes
CREATE INDEX IF NOT EXISTS idx_health_insights_family_member_id 
  ON health_insights(family_member_id);

-- health_metrics indexes
CREATE INDEX IF NOT EXISTS idx_health_metrics_family_member_id 
  ON health_metrics(family_member_id);

CREATE INDEX IF NOT EXISTS idx_health_metrics_session_id 
  ON health_metrics(session_id);

-- leads indexes
CREATE INDEX IF NOT EXISTS idx_leads_converted_to_user_id 
  ON leads(converted_to_user_id);

-- parsed_documents indexes
CREATE INDEX IF NOT EXISTS idx_parsed_documents_file_id 
  ON parsed_documents(file_id);

-- reminders indexes
CREATE INDEX IF NOT EXISTS idx_reminders_family_member_id 
  ON reminders(family_member_id);

-- report_access_log indexes
CREATE INDEX IF NOT EXISTS idx_report_access_log_user_id 
  ON report_access_log(user_id);

-- report_pdfs indexes
CREATE INDEX IF NOT EXISTS idx_report_pdfs_session_id 
  ON report_pdfs(session_id);

CREATE INDEX IF NOT EXISTS idx_report_pdfs_user_id 
  ON report_pdfs(user_id);

-- report_questions indexes
CREATE INDEX IF NOT EXISTS idx_report_questions_user_id 
  ON report_questions(user_id);

-- sessions indexes
CREATE INDEX IF NOT EXISTS idx_sessions_family_member_id 
  ON sessions(family_member_id);