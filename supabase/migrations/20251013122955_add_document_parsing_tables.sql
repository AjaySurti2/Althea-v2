/*
  # Add Document Parsing and Preview Tables

  1. New Tables
    - `parsed_documents`
      - `id` (uuid, primary key)
      - `file_id` (uuid, foreign key to files table)
      - `session_id` (uuid, references sessions)
      - `user_id` (uuid, references auth.users)
      - `parsing_status` (text: pending, processing, completed, failed)
      - `raw_content` (jsonb, extracted raw content)
      - `structured_data` (jsonb, organized extracted data)
      - `confidence_scores` (jsonb, parsing confidence by section)
      - `metadata` (jsonb, document metadata)
      - `error_message` (text, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `parsing_previews`
      - `id` (uuid, primary key)
      - `session_id` (uuid, references sessions)
      - `user_id` (uuid, references auth.users)
      - `parsed_documents` (jsonb array, all parsed docs in session)
      - `preview_status` (text: pending_approval, approved, rejected)
      - `user_feedback` (text, nullable)
      - `approved_at` (timestamptz, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users to manage their own data
    - Add policies for reading own parsed documents
    - Add policies for updating preview status

  3. Indexes
    - Index on session_id for fast session-based queries
    - Index on parsing_status for filtering
    - Index on user_id for user-specific queries
*/

-- Create parsed_documents table
CREATE TABLE IF NOT EXISTS parsed_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid REFERENCES files(id) ON DELETE CASCADE,
  session_id uuid NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  parsing_status text NOT NULL DEFAULT 'pending' CHECK (parsing_status IN ('pending', 'processing', 'completed', 'failed')),
  raw_content jsonb DEFAULT '{}'::jsonb,
  structured_data jsonb DEFAULT '{}'::jsonb,
  confidence_scores jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create parsing_previews table
CREATE TABLE IF NOT EXISTS parsing_previews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  parsed_documents jsonb DEFAULT '[]'::jsonb,
  preview_status text NOT NULL DEFAULT 'pending_approval' CHECK (preview_status IN ('pending_approval', 'approved', 'rejected')),
  user_feedback text,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE parsed_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE parsing_previews ENABLE ROW LEVEL SECURITY;

-- Policies for parsed_documents

-- Users can view their own parsed documents
CREATE POLICY "Users can view own parsed documents"
  ON parsed_documents
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own parsed documents
CREATE POLICY "Users can insert own parsed documents"
  ON parsed_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own parsed documents
CREATE POLICY "Users can update own parsed documents"
  ON parsed_documents
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own parsed documents
CREATE POLICY "Users can delete own parsed documents"
  ON parsed_documents
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for parsing_previews

-- Users can view their own parsing previews
CREATE POLICY "Users can view own parsing previews"
  ON parsing_previews
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own parsing previews
CREATE POLICY "Users can insert own parsing previews"
  ON parsing_previews
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own parsing previews
CREATE POLICY "Users can update own parsing previews"
  ON parsing_previews
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own parsing previews
CREATE POLICY "Users can delete own parsing previews"
  ON parsing_previews
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_parsed_documents_session_id ON parsed_documents(session_id);
CREATE INDEX IF NOT EXISTS idx_parsed_documents_user_id ON parsed_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_parsed_documents_status ON parsed_documents(parsing_status);
CREATE INDEX IF NOT EXISTS idx_parsed_documents_file_id ON parsed_documents(file_id);

CREATE INDEX IF NOT EXISTS idx_parsing_previews_session_id ON parsing_previews(session_id);
CREATE INDEX IF NOT EXISTS idx_parsing_previews_user_id ON parsing_previews(user_id);
CREATE INDEX IF NOT EXISTS idx_parsing_previews_status ON parsing_previews(preview_status);

-- Updated_at trigger function (reuse if exists, create if not)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_parsed_documents_updated_at ON parsed_documents;
CREATE TRIGGER update_parsed_documents_updated_at
  BEFORE UPDATE ON parsed_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_parsing_previews_updated_at ON parsing_previews;
CREATE TRIGGER update_parsing_previews_updated_at
  BEFORE UPDATE ON parsing_previews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();