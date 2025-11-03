/*
  # Add Report Caching to Health Insights

  1. Schema Changes
    - Add `report_id` column to link insights to generated reports
    - Add `report_storage_path` column to cache report location
    - Add `report_generated_at` timestamp to track when report was created

  2. Purpose
    - Eliminate duplicate report generation by caching the report reference
    - Enable direct download of previously generated reports
    - Improve performance by reusing existing reports

  3. Notes
    - Existing insights will have NULL values (report not yet generated)
    - Once a report is generated, these fields will be populated
    - Allows checking if report exists before generating new one
*/

-- Add report caching columns to health_insights table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'health_insights' AND column_name = 'report_id'
  ) THEN
    ALTER TABLE health_insights ADD COLUMN report_id uuid REFERENCES health_reports(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'health_insights' AND column_name = 'report_storage_path'
  ) THEN
    ALTER TABLE health_insights ADD COLUMN report_storage_path text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'health_insights' AND column_name = 'report_generated_at'
  ) THEN
    ALTER TABLE health_insights ADD COLUMN report_generated_at timestamptz;
  END IF;
END $$;

-- Add index for faster report lookups
CREATE INDEX IF NOT EXISTS idx_health_insights_report_id ON health_insights(report_id) WHERE report_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN health_insights.report_id IS 'Reference to generated health report (NULL if not yet generated)';
COMMENT ON COLUMN health_insights.report_storage_path IS 'Cached storage path for quick report downloads';
COMMENT ON COLUMN health_insights.report_generated_at IS 'Timestamp when the HTML report was generated';
