/*
  # Fix Schema Misalignments - Critical Bug Fixes

  ## Issues Identified

  ### 1. Profile Table Missing Fields
  - **CRITICAL**: `date_of_birth` field referenced in frontend but not in database
  - Frontend (ProfileModal.tsx line 14, 22, 39) expects `date_of_birth` field
  - TypeScript type definition (supabase.ts line 18) expects `date_of_birth`
  - Database schema only has: id, full_name, company_name, phone, created_at, updated_at

  ### 2. Upload Workflow Schema Mismatch
  - Code references tables that don't exist in current schema:
    - `sessions` table (UploadWorkflow.tsx line 85)
    - `files` table (UploadWorkflow.tsx line 109)
    - `parsed_documents` table (UploadWorkflow.tsx line 194)
    - `family_members` table (defined in types but not in DB)
    - `leads` table (defined in types but not in DB)
  - Current schema has: documents, parsing_jobs, parsed_data (different structure)

  ### 3. Console Errors Analysis
  From the screenshot errors:
  - "INSUFFICIENT_SCOPES" GraphQL error for avatar query
  - 400/404 errors trying to access GitHub API endpoints
  - Token scope issues: has ['repo', 'user:email'], needs ['read:org']
  
  These errors are related to GitHub integration, not database issues.
  The actual database errors are likely hidden behind these API errors.

  ## Solutions Implemented

  ### A. Add Missing Fields to Profiles Table
  - Add `date_of_birth` as DATE type (nullable)
  - Add additional profile fields for completeness

  ### B. Create Missing Tables for Upload Workflow
  - Create `sessions` table to track upload sessions
  - Create `files` table to track individual file uploads
  - Create `parsed_documents` table for parsed document data
  - Create `family_members` table for family health tracking
  - Create `leads` table for marketing/conversion tracking

  ### C. Add Proper Indexes and RLS
  - All new tables have RLS enabled
  - Proper indexes for performance
  - Restrictive policies for data security

  ## Migration Steps
  1. Alter profiles table to add missing fields
  2. Create all missing tables
  3. Set up proper relationships
  4. Enable RLS and create policies
  5. Add performance indexes
*/

-- ============================================================================
-- STEP 1: FIX PROFILES TABLE
-- ============================================================================

-- Add date_of_birth field that's expected by the frontend
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'date_of_birth'
  ) THEN
    ALTER TABLE profiles ADD COLUMN date_of_birth DATE;
  END IF;
END $$;

-- Add additional useful profile fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'bio'
  ) THEN
    ALTER TABLE profiles ADD COLUMN bio TEXT;
  END IF;
END $$;

-- ============================================================================
-- STEP 2: CREATE MISSING TABLES FOR UPLOAD WORKFLOW
-- ============================================================================

-- Leads table (for conversion tracking)
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  source text DEFAULT 'website' NOT NULL,
  converted_to_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Family members table
CREATE TABLE IF NOT EXISTS family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  relationship text NOT NULL,
  date_of_birth date,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Sessions table for upload workflow
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  family_member_id uuid REFERENCES family_members(id) ON DELETE SET NULL,
  tone text CHECK (tone IN ('friendly', 'professional', 'empathetic')) DEFAULT 'friendly' NOT NULL,
  language_level text CHECK (language_level IN ('simple', 'moderate', 'technical')) DEFAULT 'simple' NOT NULL,
  status text CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Files table for tracking uploaded files
CREATE TABLE IF NOT EXISTS files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL,
  extracted_text text,
  validation_status text CHECK (validation_status IN ('pending', 'validated', 'rejected')) DEFAULT 'pending' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Parsed documents table (different from parsed_data)
CREATE TABLE IF NOT EXISTS parsed_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  file_id uuid REFERENCES files(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  structured_data jsonb DEFAULT '{}'::jsonb NOT NULL,
  parsing_status text CHECK (parsing_status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending' NOT NULL,
  confidence_score decimal(5,2) CHECK (confidence_score >= 0 AND confidence_score <= 100),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Health metrics table
CREATE TABLE IF NOT EXISTS health_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  family_member_id uuid REFERENCES family_members(id) ON DELETE CASCADE,
  metric_type text NOT NULL,
  metric_value text NOT NULL,
  metric_unit text,
  recorded_date date NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Family patterns table
CREATE TABLE IF NOT EXISTS family_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pattern_type text NOT NULL,
  affected_members text[] DEFAULT ARRAY[]::text[] NOT NULL,
  risk_level text CHECK (risk_level IN ('low', 'moderate', 'high')) DEFAULT 'low' NOT NULL,
  description text NOT NULL,
  detected_at timestamptz DEFAULT now() NOT NULL
);

-- AI summaries table
CREATE TABLE IF NOT EXISTS ai_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  summary_text text NOT NULL,
  doctor_questions text[] DEFAULT ARRAY[]::text[] NOT NULL,
  health_insights text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Report PDFs table
CREATE TABLE IF NOT EXISTS report_pdfs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  storage_path text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Reminders table
CREATE TABLE IF NOT EXISTS reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  family_member_id uuid REFERENCES family_members(id) ON DELETE CASCADE,
  reminder_type text CHECK (reminder_type IN ('checkup', 'medication', 'test', 'followup')) NOT NULL,
  title text NOT NULL,
  description text,
  due_date date NOT NULL,
  completed boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================================================
-- STEP 3: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Leads indexes
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_converted_user ON leads(converted_to_user_id);

-- Family members indexes
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON family_members(user_id);

-- Sessions indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);

-- Files indexes
CREATE INDEX IF NOT EXISTS idx_files_session_id ON files(session_id);
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);

-- Parsed documents indexes
CREATE INDEX IF NOT EXISTS idx_parsed_documents_session_id ON parsed_documents(session_id);
CREATE INDEX IF NOT EXISTS idx_parsed_documents_file_id ON parsed_documents(file_id);
CREATE INDEX IF NOT EXISTS idx_parsed_documents_user_id ON parsed_documents(user_id);

-- Health metrics indexes
CREATE INDEX IF NOT EXISTS idx_health_metrics_session_id ON health_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_health_metrics_user_id ON health_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_health_metrics_recorded_date ON health_metrics(recorded_date DESC);

-- Family patterns indexes
CREATE INDEX IF NOT EXISTS idx_family_patterns_user_id ON family_patterns(user_id);

-- AI summaries indexes
CREATE INDEX IF NOT EXISTS idx_ai_summaries_session_id ON ai_summaries(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_summaries_user_id ON ai_summaries(user_id);

-- Report PDFs indexes
CREATE INDEX IF NOT EXISTS idx_report_pdfs_session_id ON report_pdfs(session_id);
CREATE INDEX IF NOT EXISTS idx_report_pdfs_user_id ON report_pdfs(user_id);

-- Reminders indexes
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_due_date ON reminders(due_date);
CREATE INDEX IF NOT EXISTS idx_reminders_completed ON reminders(completed);

-- ============================================================================
-- STEP 4: ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE parsed_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_pdfs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 5: CREATE RLS POLICIES
-- ============================================================================

-- Leads policies (admin only for now, but authenticated can insert)
CREATE POLICY "Authenticated users can create leads"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view leads they created"
  ON leads FOR SELECT
  TO authenticated
  USING (converted_to_user_id = auth.uid());

-- Family members policies
CREATE POLICY "Users can view own family members"
  ON family_members FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own family members"
  ON family_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own family members"
  ON family_members FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own family members"
  ON family_members FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Sessions policies
CREATE POLICY "Users can view own sessions"
  ON sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Files policies
CREATE POLICY "Users can view own files"
  ON files FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own files"
  ON files FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own files"
  ON files FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own files"
  ON files FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Parsed documents policies
CREATE POLICY "Users can view own parsed documents"
  ON parsed_documents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own parsed documents"
  ON parsed_documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own parsed documents"
  ON parsed_documents FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own parsed documents"
  ON parsed_documents FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Health metrics policies
CREATE POLICY "Users can view own health metrics"
  ON health_metrics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own health metrics"
  ON health_metrics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own health metrics"
  ON health_metrics FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own health metrics"
  ON health_metrics FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Family patterns policies
CREATE POLICY "Users can view own family patterns"
  ON family_patterns FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own family patterns"
  ON family_patterns FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own family patterns"
  ON family_patterns FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own family patterns"
  ON family_patterns FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- AI summaries policies
CREATE POLICY "Users can view own AI summaries"
  ON ai_summaries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI summaries"
  ON ai_summaries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Report PDFs policies
CREATE POLICY "Users can view own report PDFs"
  ON report_pdfs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own report PDFs"
  ON report_pdfs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Reminders policies
CREATE POLICY "Users can view own reminders"
  ON reminders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reminders"
  ON reminders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reminders"
  ON reminders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reminders"
  ON reminders FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 6: ADD TRIGGERS FOR AUTO-UPDATING TIMESTAMPS
-- ============================================================================

-- Sessions trigger
CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Parsed documents trigger
CREATE TRIGGER update_parsed_documents_updated_at
    BEFORE UPDATE ON parsed_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
