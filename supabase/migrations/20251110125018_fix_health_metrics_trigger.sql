/*
  # Fix health_metrics Auto-Population Trigger

  1. Problem
    - Trigger was trying to insert family_member_id with patient_id value
    - patient_id references patients table, but family_member_id references family_members table
    - This caused foreign key constraint violation

  2. Solution
    - Set family_member_id to NULL for now (individual patient results)
    - Keep the rest of the logic intact
    - Future enhancement: Link to family_members if needed

  3. Changes
    - Updated populate_health_metrics_from_test_results() function
    - Removed invalid family_member_id assignment
*/

-- Drop and recreate the trigger function with fix
CREATE OR REPLACE FUNCTION populate_health_metrics_from_test_results()
RETURNS TRIGGER AS $$
BEGIN
  -- Extract numeric values from test results and store as health metrics
  -- Only process if the test result has a numeric value

  -- Attempt to extract numeric value from observed_value
  IF NEW.observed_value ~ '^[0-9]+\.?[0-9]*$' THEN
    -- Insert into health_metrics if not already exists
    INSERT INTO health_metrics (
      session_id,
      user_id,
      family_member_id,  -- Set to NULL for now, as patient_id != family_member_id
      metric_type,
      metric_value,
      metric_unit,
      recorded_date,
      notes,
      created_at
    )
    SELECT
      lr.session_id,
      NEW.user_id,
      NULL,  -- Fixed: Set to NULL instead of patient_id
      NEW.test_name,
      NEW.observed_value,
      NEW.unit,
      COALESCE(lr.report_date, CURRENT_DATE),
      CASE
        WHEN NEW.is_flagged THEN 'Abnormal: ' || NEW.status
        ELSE 'Normal range'
      END,
      NOW()
    FROM lab_reports lr
    WHERE lr.id = NEW.lab_report_id
    ON CONFLICT DO NOTHING;

    RAISE NOTICE '[Auto-Population] Created health_metric for test: %', NEW.test_name;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;