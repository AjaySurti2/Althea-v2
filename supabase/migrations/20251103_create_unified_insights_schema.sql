/*
  # Unified Health Insights and Report System Schema

  1. New Tables
    - `user_insight_preferences` - Stores user's preferred tone and language level
    - `report_generation_history` - Tracks all report generations with preferences

  2. Schema Updates
    - Add `tone` and `language_level` columns to `health_insights` table
    - Add `regeneration_count` to track how many times insights were regenerated
    - Add `parent_insight_id` for tracking regenerations

  3. Security
    - Enable RLS on new tables
    - Add policies for authenticated user access only
    - Ensure users can only access their own data

  4. Indexes
    - Performance optimization for frequently queried columns
*/

-- Create user_insight_preferences table
CREATE TABLE IF NOT EXISTS user_insight_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tone VARCHAR(50) NOT NULL DEFAULT 'friendly',
  language_level VARCHAR(50) NOT NULL DEFAULT 'simple',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add columns to health_insights if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'health_insights' AND column_name = 'tone'
  ) THEN
    ALTER TABLE health_insights ADD COLUMN tone VARCHAR(50) DEFAULT 'friendly';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'health_insights' AND column_name = 'language_level'
  ) THEN
    ALTER TABLE health_insights ADD COLUMN language_level VARCHAR(50) DEFAULT 'simple';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'health_insights' AND column_name = 'regeneration_count'
  ) THEN
    ALTER TABLE health_insights ADD COLUMN regeneration_count INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'health_insights' AND column_name = 'parent_insight_id'
  ) THEN
    ALTER TABLE health_insights ADD COLUMN parent_insight_id UUID REFERENCES health_insights(id);
  END IF;
END $$;

-- Create report_generation_history table
CREATE TABLE IF NOT EXISTS report_generation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES health_reports(id) ON DELETE CASCADE,
  insight_id UUID REFERENCES health_insights(id) ON DELETE SET NULL,
  tone VARCHAR(50) NOT NULL,
  language_level VARCHAR(50) NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT now(),
  download_count INTEGER DEFAULT 0,
  last_downloaded_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id
  ON user_insight_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_user_preferences_created_at
  ON user_insight_preferences(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_insights_session_tone
  ON health_insights(session_id, tone, language_level);

CREATE INDEX IF NOT EXISTS idx_insights_parent_id
  ON health_insights(parent_insight_id);

CREATE INDEX IF NOT EXISTS idx_report_history_report_id
  ON report_generation_history(report_id);

CREATE INDEX IF NOT EXISTS idx_report_history_insight_id
  ON report_generation_history(insight_id);

-- Enable RLS on user_insight_preferences
ALTER TABLE user_insight_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_insight_preferences
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

CREATE POLICY "Users can delete own preferences"
  ON user_insight_preferences FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Enable RLS on report_generation_history
ALTER TABLE report_generation_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for report_generation_history
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

CREATE POLICY "System can update report history"
  ON report_generation_history FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM health_reports
      WHERE health_reports.id = report_id
      AND health_reports.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM health_reports
      WHERE health_reports.id = report_id
      AND health_reports.user_id = auth.uid()
    )
  );

-- Add function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for user_insight_preferences
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_insight_preferences;
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_insight_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE user_insight_preferences IS 'Stores user preferences for AI health insights tone and language level';
COMMENT ON TABLE report_generation_history IS 'Tracks all report generations with their customization preferences and download history';
COMMENT ON COLUMN health_insights.tone IS 'Tone used for insights: friendly, professional, or empathetic';
COMMENT ON COLUMN health_insights.language_level IS 'Language complexity: simple, moderate, or technical';
COMMENT ON COLUMN health_insights.regeneration_count IS 'Number of times insights were regenerated for this session';
COMMENT ON COLUMN health_insights.parent_insight_id IS 'Links to original insight if this is a regeneration';
