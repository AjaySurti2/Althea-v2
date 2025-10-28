/*
  # Enhance Profiles Table with Additional User Information

  1. Changes to profiles table
    - Add gender (text) - nullable
    - Add address (text) - nullable for user location
    - Ensure phone and date_of_birth already exist
    
  2. Security
    - No changes to RLS policies (already configured)
*/

-- Add new columns to profiles table
DO $$
BEGIN
  -- Add gender column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'gender'
  ) THEN
    ALTER TABLE profiles ADD COLUMN gender text;
  END IF;

  -- Add address column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'address'
  ) THEN
    ALTER TABLE profiles ADD COLUMN address text;
  END IF;
END $$;