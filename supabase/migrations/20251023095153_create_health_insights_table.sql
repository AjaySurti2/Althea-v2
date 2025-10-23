/*
  # Create Health Insights Table

  1. New Tables
    - `health_insights`
      - `id` (uuid, primary key)
      - `session_id` (uuid, references sessions)
      - `user_id` (uuid, references auth.users)
      - `insights_data` (jsonb) - AI-generated health insights
      - `tone` (text) - communication tone used
      - `language_level` (text) - language complexity level
      - `metadata` (jsonb) - additional metadata
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `health_insights` table
    - Add policy for users to read their own insights
    - Add policy for users to create their own insights
*/

CREATE TABLE IF NOT EXISTS health_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insights_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  tone text DEFAULT 'conversational',
  language_level text DEFAULT 'simple_terms',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE health_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own health insights"
  ON health_insights
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own health insights"
  ON health_insights
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_health_insights_session ON health_insights(session_id);
CREATE INDEX IF NOT EXISTS idx_health_insights_user ON health_insights(user_id);
