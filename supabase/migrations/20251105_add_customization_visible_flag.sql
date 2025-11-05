/*
  # Add Customization Visibility Flag

  1. Schema Changes
    - Add `customization_visible` column to `user_insight_preferences` table
    - Defaults to false (simplified mode)
    - When set to true, enables full customization UI

  2. Purpose
    - Allow easy re-enablement of tone/language customization features
    - System-wide feature toggle without code changes
    - Maintains backward compatibility with existing preferences

  3. Usage
    - False (default): Simplified mode - auto-apply friendly/simple defaults
    - True: Full customization mode - show all preference controls
*/

-- Add customization_visible flag to user_insight_preferences
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_insight_preferences' AND column_name = 'customization_visible'
  ) THEN
    ALTER TABLE user_insight_preferences
    ADD COLUMN customization_visible BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add index for feature flag lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_customization_visible
  ON user_insight_preferences(user_id, customization_visible)
  WHERE customization_visible = true;

-- Add comment for documentation
COMMENT ON COLUMN user_insight_preferences.customization_visible IS
  'Feature flag: false = simplified mode (auto-defaults), true = full customization UI enabled';
