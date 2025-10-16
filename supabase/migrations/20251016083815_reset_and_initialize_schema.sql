/*
  # Complete Database Reset and Initialization

  ## Overview
  This migration performs a complete database reset and creates a new production-ready schema
  for the Althea document management and parsing system.

  ## Reset Operations
  1. Drop all existing tables in public schema (if any)
  2. Drop all custom functions and types
  3. Clear any existing policies

  ## New Schema Structure
  
  ### Tables Created:
  
  1. **profiles** - Extended user profile information
     - id (uuid, FK to auth.users)
     - full_name (text)
     - company_name (text)
     - phone (text)
     - created_at, updated_at (timestamps)
  
  2. **documents** - Main document storage tracking
     - id (uuid, primary key)
     - user_id (uuid, FK to auth.users)
     - file_name (text)
     - file_size (bigint)
     - file_type (text)
     - storage_path (text)
     - upload_status (enum: pending, processing, completed, failed)
     - created_at, updated_at (timestamps)
  
  3. **document_categories** - Document classification
     - id (uuid, primary key)
     - name (text, unique)
     - description (text)
     - created_at (timestamp)
  
  4. **parsed_data** - Extracted document data
     - id (uuid, primary key)
     - document_id (uuid, FK to documents)
     - field_name (text)
     - field_value (text)
     - field_type (text)
     - confidence_score (decimal)
     - created_at (timestamp)
  
  5. **parsing_jobs** - Track parsing operations
     - id (uuid, primary key)
     - document_id (uuid, FK to documents)
     - status (enum: queued, processing, completed, failed)
     - started_at, completed_at (timestamps)
     - error_message (text)
     - created_at, updated_at (timestamps)
  
  6. **reports** - Generated analysis reports
     - id (uuid, primary key)
     - user_id (uuid, FK to auth.users)
     - title (text)
     - report_type (text)
     - content (jsonb)
     - generated_at (timestamp)
     - created_at (timestamp)

  ## Security Implementation
  - Row Level Security (RLS) enabled on ALL tables
  - Restrictive policies ensuring users can only access their own data
  - Authenticated-only access for all operations
  - Proper ownership checks on all policies

  ## Indexes
  - Performance indexes on foreign keys
  - Indexes on frequently queried columns
  - Composite indexes for common query patterns

  ## Important Notes
  - All timestamps use timestamptz for timezone awareness
  - UUIDs used for all primary keys with auto-generation
  - Cascade deletes configured appropriately
  - Default values set for boolean and timestamp fields
*/

-- ============================================================================
-- STEP 1: COMPLETE RESET - Drop all existing objects
-- ============================================================================

DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all tables in public schema
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
    
    -- Drop all functions in public schema
    FOR r IN (SELECT proname, oidvectortypes(proargtypes) as argtypes
              FROM pg_proc INNER JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
              WHERE pg_namespace.nspname = 'public' AND proname NOT LIKE 'pg_%')
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS public.' || quote_ident(r.proname) || '(' || r.argtypes || ') CASCADE';
    END LOOP;
    
    -- Drop all custom types in public schema
    FOR r IN (SELECT typname FROM pg_type 
              WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
              AND typname NOT LIKE 'pg_%')
    LOOP
        EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
    END LOOP;
END $$;

-- ============================================================================
-- STEP 2: CREATE CUSTOM TYPES
-- ============================================================================

CREATE TYPE upload_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE job_status AS ENUM ('queued', 'processing', 'completed', 'failed');

-- ============================================================================
-- STEP 3: CREATE TABLES
-- ============================================================================

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  company_name text,
  phone text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Document categories
CREATE TABLE IF NOT EXISTS document_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id uuid REFERENCES document_categories(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL,
  file_type text NOT NULL,
  storage_path text NOT NULL,
  upload_status upload_status DEFAULT 'pending' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Parsing jobs
CREATE TABLE IF NOT EXISTS parsing_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  status job_status DEFAULT 'queued' NOT NULL,
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Parsed data
CREATE TABLE IF NOT EXISTS parsed_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  field_name text NOT NULL,
  field_value text,
  field_type text DEFAULT 'text' NOT NULL,
  confidence_score decimal(5,2) CHECK (confidence_score >= 0 AND confidence_score <= 100),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  report_type text NOT NULL,
  content jsonb DEFAULT '{}'::jsonb NOT NULL,
  generated_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================================================
-- STEP 4: CREATE INDEXES
-- ============================================================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON profiles(updated_at);

-- Documents indexes
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_category_id ON documents(category_id);
CREATE INDEX IF NOT EXISTS idx_documents_upload_status ON documents(upload_status);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_user_status ON documents(user_id, upload_status);

-- Parsing jobs indexes
CREATE INDEX IF NOT EXISTS idx_parsing_jobs_document_id ON parsing_jobs(document_id);
CREATE INDEX IF NOT EXISTS idx_parsing_jobs_status ON parsing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_parsing_jobs_created_at ON parsing_jobs(created_at DESC);

-- Parsed data indexes
CREATE INDEX IF NOT EXISTS idx_parsed_data_document_id ON parsed_data(document_id);
CREATE INDEX IF NOT EXISTS idx_parsed_data_field_name ON parsed_data(field_name);

-- Reports indexes
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_report_type ON reports(report_type);
CREATE INDEX IF NOT EXISTS idx_reports_generated_at ON reports(generated_at DESC);

-- ============================================================================
-- STEP 5: ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE parsing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE parsed_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 6: CREATE RLS POLICIES
-- ============================================================================

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Document categories policies (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view categories"
  ON document_categories FOR SELECT
  TO authenticated
  USING (true);

-- Documents policies
CREATE POLICY "Users can view own documents"
  ON documents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
  ON documents FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Parsing jobs policies
CREATE POLICY "Users can view own parsing jobs"
  ON parsing_jobs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = parsing_jobs.document_id
      AND documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert parsing jobs for own documents"
  ON parsing_jobs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = parsing_jobs.document_id
      AND documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own parsing jobs"
  ON parsing_jobs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = parsing_jobs.document_id
      AND documents.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = parsing_jobs.document_id
      AND documents.user_id = auth.uid()
    )
  );

-- Parsed data policies
CREATE POLICY "Users can view parsed data for own documents"
  ON parsed_data FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = parsed_data.document_id
      AND documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert parsed data for own documents"
  ON parsed_data FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = parsed_data.document_id
      AND documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update parsed data for own documents"
  ON parsed_data FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = parsed_data.document_id
      AND documents.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = parsed_data.document_id
      AND documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete parsed data for own documents"
  ON parsed_data FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = parsed_data.document_id
      AND documents.user_id = auth.uid()
    )
  );

-- Reports policies
CREATE POLICY "Users can view own reports"
  ON reports FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reports"
  ON reports FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reports"
  ON reports FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 7: CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parsing_jobs_updated_at
    BEFORE UPDATE ON parsing_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 8: INSERT DEFAULT DATA
-- ============================================================================

-- Insert default document categories
INSERT INTO document_categories (name, description) VALUES
  ('Invoice', 'Financial invoices and billing documents'),
  ('Receipt', 'Purchase receipts and transaction records'),
  ('Contract', 'Legal contracts and agreements'),
  ('Report', 'Business reports and analytics'),
  ('Form', 'Application forms and questionnaires'),
  ('Other', 'Miscellaneous documents')
ON CONFLICT (name) DO NOTHING;
