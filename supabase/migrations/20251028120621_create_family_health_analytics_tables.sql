/*
  # Create Family Health Analytics and Audit Tables

  1. New Tables
    - family_health_trends: Track health metrics over time per family member
    - family_audit_log: Audit trail for all family data operations
    
  2. Indexes
    - Performance indexes for analytics queries
    - Time-series indexes for trend analysis
    
  3. Security
    - RLS enabled on all tables
    - Users can only access their own family data
*/

-- Family Health Trends table for time-series analytics
CREATE TABLE IF NOT EXISTS family_health_trends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_member_id uuid REFERENCES family_members(id) ON DELETE CASCADE,
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  metric_unit text,
  recorded_date date NOT NULL,
  source_session_id uuid REFERENCES sessions(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Family Audit Log table for tracking all operations
CREATE TABLE IF NOT EXISTS family_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_member_id uuid REFERENCES family_members(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('create', 'update', 'delete', 'view')),
  entity_type text NOT NULL CHECK (entity_type IN ('family_member', 'session', 'health_data', 'profile')),
  entity_id uuid,
  changes_made jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_family_health_trends_user_id ON family_health_trends(user_id);
CREATE INDEX IF NOT EXISTS idx_family_health_trends_member_id ON family_health_trends(family_member_id);
CREATE INDEX IF NOT EXISTS idx_family_health_trends_recorded_date ON family_health_trends(recorded_date DESC);
CREATE INDEX IF NOT EXISTS idx_family_health_trends_metric_name ON family_health_trends(metric_name);

CREATE INDEX IF NOT EXISTS idx_family_audit_log_user_id ON family_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_family_audit_log_member_id ON family_audit_log(family_member_id);
CREATE INDEX IF NOT EXISTS idx_family_audit_log_created_at ON family_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_family_audit_log_action ON family_audit_log(action);

-- Enable RLS
ALTER TABLE family_health_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for family_health_trends
CREATE POLICY "Users can view own family health trends"
  ON family_health_trends
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own family health trends"
  ON family_health_trends
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own family health trends"
  ON family_health_trends
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own family health trends"
  ON family_health_trends
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for family_audit_log
CREATE POLICY "Users can view own audit logs"
  ON family_audit_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create audit logs"
  ON family_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);