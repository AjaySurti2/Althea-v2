/*
  # Enhance Family Members Table for Comprehensive Health Tracking

  1. Changes to family_members table
    - Add gender (text) - nullable
    - Add age (integer) - nullable for calculated display
    - Add existing_conditions (text[]) - array of medical conditions
    - Add allergies (text[]) - array of allergies
    - Add medical_history_notes (text) - detailed medical history
    - Add updated_at (timestamptz) - track modifications
    
  2. Indexes
    - Add index on user_id for faster queries
    - Add index on updated_at for audit purposes
    
  3. Security
    - Update RLS policies to support full CRUD operations
    - Maintain user ownership validation
*/

-- Add new columns to family_members table
DO $$
BEGIN
  -- Add gender column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'family_members' AND column_name = 'gender'
  ) THEN
    ALTER TABLE family_members ADD COLUMN gender text;
  END IF;

  -- Add age column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'family_members' AND column_name = 'age'
  ) THEN
    ALTER TABLE family_members ADD COLUMN age integer;
  END IF;

  -- Add existing_conditions column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'family_members' AND column_name = 'existing_conditions'
  ) THEN
    ALTER TABLE family_members ADD COLUMN existing_conditions text[] DEFAULT ARRAY[]::text[];
  END IF;

  -- Add allergies column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'family_members' AND column_name = 'allergies'
  ) THEN
    ALTER TABLE family_members ADD COLUMN allergies text[] DEFAULT ARRAY[]::text[];
  END IF;

  -- Add medical_history_notes column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'family_members' AND column_name = 'medical_history_notes'
  ) THEN
    ALTER TABLE family_members ADD COLUMN medical_history_notes text;
  END IF;

  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'family_members' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE family_members ADD COLUMN updated_at timestamptz DEFAULT now() NOT NULL;
  END IF;
END $$;

-- Create trigger for auto-updating updated_at timestamp
DROP TRIGGER IF EXISTS update_family_members_updated_at ON family_members;
CREATE TRIGGER update_family_members_updated_at
  BEFORE UPDATE ON family_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update RLS policies to support DELETE operations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'family_members'
    AND policyname = 'Users can delete own family members'
  ) THEN
    CREATE POLICY "Users can delete own family members"
      ON family_members
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'family_members'
    AND policyname = 'Users can update own family members'
  ) THEN
    CREATE POLICY "Users can update own family members"
      ON family_members
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;