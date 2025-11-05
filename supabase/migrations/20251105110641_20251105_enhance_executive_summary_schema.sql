/*
  # Enhanced Executive Summary Schema

  1. Changes
    - Add enhanced_summary JSONB column to health_insights table for structured executive summary data
    - Add overall_health_status field for quick status assessment
    - Add timestamp for executive summary generation
    - Create index for improved query performance

  2. Structure of enhanced_summary JSONB
    {
      "overall_health_status": "requires_attention|good|excellent|concerning",
      "body_response_pattern": "Physiological analysis text",
      "positive_signs": ["Positive finding 1", "Positive finding 2"],
      "health_story_context": "Personalized context narrative",
      "generated_at": "timestamp"
    }

  3. Purpose
    - Support enhanced, descriptive executive summaries
    - Enable structured health status tracking
    - Improve personalization and context
    - Facilitate better patient understanding
*/

-- Add enhanced summary column to health_insights table
ALTER TABLE health_insights
ADD COLUMN IF NOT EXISTS enhanced_summary JSONB DEFAULT '{}'::jsonb;

-- Add overall health status enum field
DO $$ BEGIN
  CREATE TYPE health_status_enum AS ENUM ('excellent', 'good', 'requires_attention', 'concerning');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE health_insights
ADD COLUMN IF NOT EXISTS overall_health_status health_status_enum DEFAULT 'good';

-- Add executive summary metadata
ALTER TABLE health_insights
ADD COLUMN IF NOT EXISTS executive_summary_generated_at timestamptz;

-- Create index for faster retrieval of enhanced summaries
CREATE INDEX IF NOT EXISTS idx_health_insights_enhanced_summary
ON health_insights USING gin (enhanced_summary);

-- Create index for health status filtering
CREATE INDEX IF NOT EXISTS idx_health_insights_health_status
ON health_insights (overall_health_status);

-- Add comment for documentation
COMMENT ON COLUMN health_insights.enhanced_summary IS 'Structured executive summary with overall_health_status, body_response_pattern, positive_signs, and health_story_context';
COMMENT ON COLUMN health_insights.overall_health_status IS 'Quick assessment of overall health status for filtering and alerts';