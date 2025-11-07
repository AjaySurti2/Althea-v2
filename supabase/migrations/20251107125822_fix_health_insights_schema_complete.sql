/*
  # Fix Health Insights Schema Mismatch - Complete Resolution

  1. Problem
    - health_insights table has old schema (insight_type, insight_text, severity, actionable)
    - Edge Function expects new schema (greeting, executive_summary, detailed_findings, etc.)
    - health_reports table doesn't exist, causing foreign key error
    - Causing error: "Could not find the 'detailed_findings' column"

  2. Solution
    - Create health_reports table first (needed for foreign key)
    - Drop and recreate health_insights with correct schema
    - Add all necessary columns for AI-generated insights
    - Restore RLS policies and indexes

  3. Schema Structure
    - Core fields: id, session_id, user_id
    - Content fields: greeting, executive_summary, next_steps, disclaimer
    - JSONB fields: detailed_findings, trend_analysis, family_patterns
    - Array fields: doctor_questions
    - Preference fields: tone, language_level
    - Versioning: regeneration_count, parent_insight_id
    - Caching: report_id, report_storage_path, report_generated_at
    - Timestamps: created_at, updated_at

  4. Security
    - Enable RLS on both tables
    - Add policies for authenticated user access
*/

-- Step 1: Create health_reports table (needed for foreign key)
CREATE TABLE IF NOT EXISTS health_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE,
  insight_id uuid,
  title text NOT NULL,
  report_type text DEFAULT 'health_insight',
  storage_path text,
  file_size bigint,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on health_reports
ALTER TABLE health_reports ENABLE ROW LEVEL SECURITY;

-- Health reports policies
CREATE POLICY "Users can view own health reports"
  ON health_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own health reports"
  ON health_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own health reports"
  ON health_reports FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for health_reports
CREATE INDEX IF NOT EXISTS idx_health_reports_user_id ON health_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_health_reports_session_id ON health_reports(session_id);
CREATE INDEX IF NOT EXISTS idx_health_reports_insight_id ON health_reports(insight_id);

-- Step 2: Drop existing health_insights table and recreate with correct schema
DROP TABLE IF EXISTS health_insights CASCADE;

-- Create health_insights table with correct schema
CREATE TABLE health_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Content fields
  greeting text,
  executive_summary text,
  next_steps text,
  disclaimer text,
  
  -- JSONB fields for structured data
  detailed_findings jsonb DEFAULT '[]'::jsonb,
  trend_analysis jsonb DEFAULT '[]'::jsonb,
  family_patterns jsonb DEFAULT '[]'::jsonb,
  
  -- Array field for questions
  doctor_questions text[] DEFAULT ARRAY[]::text[],
  
  -- User preferences
  tone varchar(50) DEFAULT 'friendly',
  language_level varchar(50) DEFAULT 'simple',
  
  -- Versioning fields
  regeneration_count integer DEFAULT 0,
  parent_insight_id uuid REFERENCES health_insights(id) ON DELETE SET NULL,
  
  -- Report caching fields for performance
  report_id uuid REFERENCES health_reports(id) ON DELETE SET NULL,
  report_storage_path text,
  report_generated_at timestamptz,
  
  -- Timestamps
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_health_insights_session_id ON health_insights(session_id);
CREATE INDEX IF NOT EXISTS idx_health_insights_user_id ON health_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_health_insights_parent_id ON health_insights(parent_insight_id);
CREATE INDEX IF NOT EXISTS idx_health_insights_report_id ON health_insights(report_id);
CREATE INDEX IF NOT EXISTS idx_health_insights_session_report ON health_insights(session_id, report_id) WHERE report_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_health_insights_created_at ON health_insights(created_at DESC);

-- Enable RLS
ALTER TABLE health_insights ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users
CREATE POLICY "Users can view own health insights"
  ON health_insights FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own health insights"
  ON health_insights FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own health insights"
  ON health_insights FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_health_insights_updated_at
  BEFORE UPDATE ON health_insights
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add foreign key to health_reports.insight_id now that health_insights exists
ALTER TABLE health_reports 
  ADD CONSTRAINT health_reports_insight_id_fkey 
  FOREIGN KEY (insight_id) 
  REFERENCES health_insights(id) 
  ON DELETE SET NULL;