-- Drop existing health_insights table if it has wrong schema
DROP TABLE IF EXISTS health_insights CASCADE;

-- Recreate with correct schema
CREATE TABLE health_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insights_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  tone text DEFAULT 'conversational',
  language_level text DEFAULT 'simple_terms',
  metadata jsonb DEFAULT '{}'::jsonb,
  report_id uuid,
  report_storage_path text,
  report_generated_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE health_insights ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Users can view own health insights"
  ON health_insights
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own health insights"
  ON health_insights
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own health insights"
  ON health_insights
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_health_insights_session_id ON health_insights(session_id);
CREATE INDEX IF NOT EXISTS idx_health_insights_user_id ON health_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_health_insights_report_id ON health_insights(report_id) WHERE report_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_health_insights_created_at ON health_insights(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE health_insights IS 'Stores AI-generated health insights from medical reports';
COMMENT ON COLUMN health_insights.insights_data IS 'AI-generated insights in JSON format (summary, findings, recommendations, questions)';
COMMENT ON COLUMN health_insights.tone IS 'Communication tone used (conversational, professional, reassuring)';
COMMENT ON COLUMN health_insights.language_level IS 'Language complexity (simple_terms, educated_patient, medical_professional)';
COMMENT ON COLUMN health_insights.metadata IS 'Additional metadata (report_count, test_count, generated_at)';
COMMENT ON COLUMN health_insights.report_id IS 'Reference to generated health report (NULL if not yet generated)';
COMMENT ON COLUMN health_insights.report_storage_path IS 'Cached storage path for quick report downloads';
COMMENT ON COLUMN health_insights.report_generated_at IS 'Timestamp when the HTML report was generated';