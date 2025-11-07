/*
  # Create Health Insights and Reports System

  1. New Tables
    - health_insights: AI-generated health insights
    - health_reports: Health report metadata
    - user_insight_preferences: User preferences for tone/language
    - report_generation_history: Track report generations
    
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated user access only
    
  3. Indexes
    - Performance optimization for frequently queried columns
*/

-- Health insights table
CREATE TABLE IF NOT EXISTS health_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  greeting text,
  executive_summary text,
  detailed_findings jsonb DEFAULT '[]'::jsonb,
  trend_analysis jsonb DEFAULT '[]'::jsonb,
  family_patterns jsonb DEFAULT '[]'::jsonb,
  doctor_questions text[] DEFAULT ARRAY[]::text[],
  next_steps text,
  disclaimer text,
  tone varchar(50) DEFAULT 'friendly',
  language_level varchar(50) DEFAULT 'simple',
  regeneration_count integer DEFAULT 0,
  parent_insight_id uuid REFERENCES health_insights(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Health reports table
CREATE TABLE IF NOT EXISTS health_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE,
  insight_id uuid REFERENCES health_insights(id) ON DELETE SET NULL,
  title text NOT NULL,
  report_type text DEFAULT 'health_insight',
  storage_path text,
  file_size bigint,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- User insight preferences table
CREATE TABLE IF NOT EXISTS user_insight_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tone varchar(50) NOT NULL DEFAULT 'friendly',
  language_level varchar(50) NOT NULL DEFAULT 'simple',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Report generation history table
CREATE TABLE IF NOT EXISTS report_generation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES health_reports(id) ON DELETE CASCADE,
  insight_id uuid REFERENCES health_insights(id) ON DELETE SET NULL,
  tone varchar(50) NOT NULL,
  language_level varchar(50) NOT NULL,
  generated_at timestamptz DEFAULT now(),
  download_count integer DEFAULT 0,
  last_downloaded_at timestamptz
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_health_insights_session_id ON health_insights(session_id);
CREATE INDEX IF NOT EXISTS idx_health_insights_user_id ON health_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_health_insights_parent_id ON health_insights(parent_insight_id);
CREATE INDEX IF NOT EXISTS idx_health_reports_user_id ON health_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_health_reports_session_id ON health_reports(session_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_insight_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_report_history_report_id ON report_generation_history(report_id);

-- Enable RLS
ALTER TABLE health_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_insight_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_generation_history ENABLE ROW LEVEL SECURITY;

-- Health insights policies
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

-- User preferences policies
CREATE POLICY "Users can view own preferences"
  ON user_insight_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON user_insight_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_insight_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Report history policies
CREATE POLICY "Users can view own report history"
  ON report_generation_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM health_reports
      WHERE health_reports.id = report_id
      AND health_reports.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert report history"
  ON report_generation_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM health_reports
      WHERE health_reports.id = report_id
      AND health_reports.user_id = auth.uid()
    )
  );

-- Add triggers
CREATE TRIGGER update_health_insights_updated_at
  BEFORE UPDATE ON health_insights
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_insight_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();