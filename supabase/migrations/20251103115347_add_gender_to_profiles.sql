/*
  # Add Gender Column to Profiles Table

  ## Summary
  Adds the missing 'gender' column to the profiles table to fix the
  "Could not find the 'gender' column of 'profiles' in the schema cache" error.

  ## Changes
  - Add `gender` column (text, nullable) to profiles table
  - Column is nullable to allow existing profiles without gender information
  
  ## Notes
  - Safe to run on existing data
  - No data loss
  - Backward compatible
  - Gender field is optional and allows values: Male, Female, Other, Prefer not to say
*/

-- Add gender column to profiles table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'gender'
  ) THEN
    ALTER TABLE profiles ADD COLUMN gender text;
    
    COMMENT ON COLUMN profiles.gender IS 'User''s gender identity (optional)';
    
    RAISE NOTICE 'Added gender column to profiles table';
  ELSE
    RAISE NOTICE 'Gender column already exists in profiles table';
  END IF;
END $$;
