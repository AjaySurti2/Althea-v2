/*
  # Add Foreign Key for Health Insights Session

  1. Changes
    - Add foreign key constraint from health_insights.session_id to sessions.id
    - This ensures data integrity between health insights and sessions

  2. Security
    - No RLS changes needed (already configured)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'health_insights_session_id_fkey'
    AND conrelid = 'health_insights'::regclass
  ) THEN
    ALTER TABLE health_insights
      ADD CONSTRAINT health_insights_session_id_fkey
      FOREIGN KEY (session_id)
      REFERENCES sessions(id)
      ON DELETE CASCADE;
  END IF;
END $$;
