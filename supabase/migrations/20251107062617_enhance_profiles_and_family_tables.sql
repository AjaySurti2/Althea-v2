/*
  # Enhance Profiles and Family Members Tables
  
  1. Add columns to profiles
    - gender
    - address
    
  2. Add columns to family_members
    - gender
    - age
    - existing_conditions
    - allergies
    - medical_history_notes
    - updated_at
    
  3. Create family_health_analytics table
*/

-- Add columns to profiles if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'gender'
  ) THEN
    ALTER TABLE profiles ADD COLUMN gender text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'address'
  ) THEN
    ALTER TABLE profiles ADD COLUMN address text;
  END IF;
END $$;

-- Add columns to family_members if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'family_members' AND column_name = 'gender'
  ) THEN
    ALTER TABLE family_members ADD COLUMN gender text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'family_members' AND column_name = 'age'
  ) THEN
    ALTER TABLE family_members ADD COLUMN age integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'family_members' AND column_name = 'existing_conditions'
  ) THEN
    ALTER TABLE family_members ADD COLUMN existing_conditions text[] DEFAULT ARRAY[]::text[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'family_members' AND column_name = 'allergies'
  ) THEN
    ALTER TABLE family_members ADD COLUMN allergies text[] DEFAULT ARRAY[]::text[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'family_members' AND column_name = 'medical_history_notes'
  ) THEN
    ALTER TABLE family_members ADD COLUMN medical_history_notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'family_members' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE family_members ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Add update and delete policies for family_members
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'family_members' 
    AND policyname = 'Users can update own family members'
  ) THEN
    CREATE POLICY "Users can update own family members"
      ON family_members FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'family_members' 
    AND policyname = 'Users can delete own family members'
  ) THEN
    CREATE POLICY "Users can delete own family members"
      ON family_members FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create family_health_analytics table
CREATE TABLE IF NOT EXISTS family_health_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pattern_type text NOT NULL,
  affected_member_ids uuid[] DEFAULT ARRAY[]::uuid[],
  risk_level text CHECK (risk_level IN ('low', 'moderate', 'high')) DEFAULT 'low',
  description text,
  recommendations text,
  detected_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_family_health_analytics_user_id ON family_health_analytics(user_id);

-- Enable RLS
ALTER TABLE family_health_analytics ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Users can view own family health analytics"
  ON family_health_analytics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own family health analytics"
  ON family_health_analytics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Add trigger for family_members updated_at
DROP TRIGGER IF EXISTS update_family_members_updated_at ON family_members;
CREATE TRIGGER update_family_members_updated_at
  BEFORE UPDATE ON family_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();