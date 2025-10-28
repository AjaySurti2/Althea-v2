/*
  # Health Report Generation and Storage System

  1. New Tables
    - `health_reports`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `session_id` (uuid, references sessions)
      - `report_type` (text) - 'genetic_analysis', 'comprehensive', 'follow_up'
      - `report_version` (integer) - Version number for updates
      - `report_data` (jsonb) - Structured report content
      - `storage_path` (text) - Path to PDF in storage
      - `file_size` (bigint) - File size in bytes
      - `generated_at` (timestamptz)
      - `created_at` (timestamptz)
    
    - `report_questions`
      - `id` (uuid, primary key)
      - `report_id` (uuid, references health_reports)
      - `user_id` (uuid, references auth.users)
      - `question_text` (text)
      - `priority` (text) - 'high', 'medium', 'low'
      - `category` (text) - 'genetic', 'lifestyle', 'follow_up'
      - `clinical_context` (text)
      - `sort_order` (integer)
      - `created_at` (timestamptz)
    
    - `report_access_log`
      - `id` (uuid, primary key)
      - `report_id` (uuid, references health_reports)
      - `user_id` (uuid, references auth.users)
      - `action` (text) - 'generated', 'viewed', 'downloaded', 'shared'
      - `ip_address` (text)
      - `user_agent` (text)
      - `accessed_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Users can only access their own reports
    - Comprehensive audit trail for HIPAA compliance
*/

-- Health Reports Table
CREATE TABLE IF NOT EXISTS health_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  report_type text NOT NULL DEFAULT 'comprehensive',
  report_version integer NOT NULL DEFAULT 1,
  report_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  storage_path text,
  file_size bigint,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT report_type_check CHECK (report_type IN ('genetic_analysis', 'comprehensive', 'follow_up'))
);

-- Report Questions Table
CREATE TABLE IF NOT EXISTS report_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES health_reports(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  priority text NOT NULL DEFAULT 'medium',
  category text NOT NULL DEFAULT 'general',
  clinical_context text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT priority_check CHECK (priority IN ('high', 'medium', 'low')),
  CONSTRAINT category_check CHECK (category IN ('genetic', 'lifestyle', 'follow_up', 'general'))
);

-- Report Access Log Table
CREATE TABLE IF NOT EXISTS report_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES health_reports(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  ip_address text,
  user_agent text,
  accessed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT action_check CHECK (action IN ('generated', 'viewed', 'downloaded', 'shared', 'deleted'))
);

-- Enable RLS
ALTER TABLE health_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_access_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for health_reports
CREATE POLICY "Users can view own health reports"
  ON health_reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own health reports"
  ON health_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own health reports"
  ON health_reports
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for report_questions
CREATE POLICY "Users can view own report questions"
  ON report_questions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own report questions"
  ON report_questions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for report_access_log
CREATE POLICY "Users can view own access logs"
  ON report_access_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own access logs"
  ON report_access_log
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_health_reports_user_id ON health_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_health_reports_session_id ON health_reports(session_id);
CREATE INDEX IF NOT EXISTS idx_health_reports_generated_at ON health_reports(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_questions_report_id ON report_questions(report_id);
CREATE INDEX IF NOT EXISTS idx_report_questions_priority ON report_questions(priority, sort_order);
CREATE INDEX IF NOT EXISTS idx_report_access_log_report_id ON report_access_log(report_id);
CREATE INDEX IF NOT EXISTS idx_report_access_log_accessed_at ON report_access_log(accessed_at DESC);