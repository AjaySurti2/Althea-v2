/*
  # Add Address Column to Profiles Table

  ## Summary
  Adds the missing 'address' column to the profiles table to fix the
  "Could not find the 'address' column of 'profiles' in the schema cache" error.

  ## Changes
  - Add `address` column (text, nullable) to profiles table
  - Column is nullable to allow existing profiles without addresses
  
  ## Notes
  - Safe to run on existing data
  - No data loss
  - Backward compatible
*/

-- Add address column to profiles table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'address'
  ) THEN
    ALTER TABLE profiles ADD COLUMN address text;
    
    COMMENT ON COLUMN profiles.address IS 'User''s physical address or location';
    
    RAISE NOTICE 'Added address column to profiles table';
  ELSE
    RAISE NOTICE 'Address column already exists in profiles table';
  END IF;
END $$;
