/*
  # Add Report Caching Columns to Health Insights

  1. Changes
    - Add `report_id` column to store reference to cached report
    - Add `report_storage_path` column to store cached report storage path
    - Add `report_generated_at` timestamp for cache expiry tracking
    
  2. Purpose
    - Enable caching of generated reports to avoid regenerating on download
    - Store report reference directly in health_insights for faster lookup
*/

-- Add report caching columns to health_insights table
ALTER TABLE health_insights 
  ADD COLUMN IF NOT EXISTS report_id UUID REFERENCES health_reports(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS report_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS report_generated_at TIMESTAMPTZ;

-- Create index for faster report lookups
CREATE INDEX IF NOT EXISTS idx_health_insights_report_id ON health_insights(report_id);
CREATE INDEX IF NOT EXISTS idx_health_insights_session_report ON health_insights(session_id, report_id) WHERE report_id IS NOT NULL;
