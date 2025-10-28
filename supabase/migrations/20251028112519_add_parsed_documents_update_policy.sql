/*
  # Add Update Policy for Parsed Documents

  1. Changes
    - Add policy to allow users to update their own parsed documents
    - This enables the edit functionality in ParsedDataReview component

  2. Security
    - Users can only update their own documents (auth.uid() = user_id)
    - Both USING and WITH CHECK clauses ensure security
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'parsed_documents'
    AND policyname = 'Users can update own parsed documents'
  ) THEN
    CREATE POLICY "Users can update own parsed documents"
      ON parsed_documents
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;