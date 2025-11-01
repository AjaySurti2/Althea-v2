/*
  # Fix Missing Schema - Apply Base Schema
  
  1. Tables Created
    - profiles (user profile data)
    - leads (conversion tracking)
    - family_members (family member profiles)
    - sessions (upload workflow sessions)
    - files (uploaded files tracking)
    - parsed_documents (parsed medical documents)
    - health_metrics (health data points)
    - family_patterns (hereditary pattern detection)
    - ai_summaries (AI-generated interpretations)
    - report_pdfs (generated PDF reports)
    - reminders (health reminders)
    
  2. Security
    - RLS enabled on all tables
    - Comprehensive policies for authenticated users
    - User ownership validation on all operations
    
  3. Indexes
    - Performance indexes on frequently queried columns
    - Foreign key relationship optimization
*/

-- Create update function first
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  company_name text,
  phone text,
  date_of_birth date,
  avatar_url text,
  bio text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  source text DEFAULT 'website' NOT NULL,
  converted_to_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Family members table with all required columns
CREATE TABLE IF NOT EXISTS family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  relationship text NOT NULL,
  date_of_birth date,
  gender text,
  age integer,
  existing_conditions text[] DEFAULT ARRAY[]::text[],
  allergies text[] DEFAULT ARRAY[]::text[],
  medical_history_notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Sessions table
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

-- Files table
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

-- Parsed documents table
CREATE TABLE IF NOT EXISTS parsed_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  file_id uuid REFERENCES files(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  structured_data jsonb DEFAULT '{}'::jsonb NOT NULL,
  raw_content text,
  parsing_status text CHECK (parsing_status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending' NOT NULL,
  confidence_scores jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  error_message text,
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
  detected_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, pattern_type)
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

-- Health insights table
CREATE TABLE IF NOT EXISTS health_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  family_member_id uuid REFERENCES family_members(id) ON DELETE CASCADE,
  insight_type text NOT NULL,
  insight_text text NOT NULL,
  severity text CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'low' NOT NULL,
  actionable boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Family health trends table
CREATE TABLE IF NOT EXISTS family_health_trends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  family_member_id uuid REFERENCES family_members(id) ON DELETE CASCADE,
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  metric_unit text,
  recorded_date date NOT NULL,
  source_session_id uuid REFERENCES sessions(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Family audit log table
CREATE TABLE IF NOT EXISTS family_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  family_member_id uuid REFERENCES family_members(id) ON DELETE CASCADE,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  changes_made jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON profiles(updated_at);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_updated_at ON family_members(updated_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_files_session_id ON files(session_id);
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_parsed_documents_session_id ON parsed_documents(session_id);
CREATE INDEX IF NOT EXISTS idx_parsed_documents_user_id ON parsed_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_health_metrics_user_id ON health_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_health_insights_user_id ON health_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_health_insights_session_id ON health_insights(session_id);
CREATE INDEX IF NOT EXISTS idx_family_health_trends_user_id ON family_health_trends(user_id);
CREATE INDEX IF NOT EXISTS idx_family_health_trends_member_id ON family_health_trends(family_member_id);
CREATE INDEX IF NOT EXISTS idx_family_audit_log_user_id ON family_audit_log(user_id);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE health_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_health_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_audit_log ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Family members policies (comprehensive CRUD)
CREATE POLICY "Users can view own family members" ON family_members FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own family members" ON family_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own family members" ON family_members FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own family members" ON family_members FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Sessions policies
CREATE POLICY "Users can view own sessions" ON sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Files policies
CREATE POLICY "Users can view own files" ON files FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own files" ON files FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Parsed documents policies
CREATE POLICY "Users can view own parsed documents" ON parsed_documents FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own parsed documents" ON parsed_documents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own parsed documents" ON parsed_documents FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Health metrics policies
CREATE POLICY "Users can view own health metrics" ON health_metrics FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own health metrics" ON health_metrics FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Family patterns policies
CREATE POLICY "Users can view own family patterns" ON family_patterns FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own family patterns" ON family_patterns FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Reminders policies
CREATE POLICY "Users can view own reminders" ON reminders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reminders" ON reminders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reminders" ON reminders FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- AI summaries policies
CREATE POLICY "Users can view own AI summaries" ON ai_summaries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own AI summaries" ON ai_summaries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Health insights policies
CREATE POLICY "Users can view own health insights" ON health_insights FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own health insights" ON health_insights FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Family health trends policies
CREATE POLICY "Users can view own family health trends" ON family_health_trends FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own family health trends" ON family_health_trends FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Family audit log policies
CREATE POLICY "Users can view own audit log" ON family_audit_log FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own audit log" ON family_audit_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Report PDFs policies
CREATE POLICY "Users can view own report PDFs" ON report_pdfs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own report PDFs" ON report_pdfs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Add triggers for auto-updating timestamps
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_parsed_documents_updated_at BEFORE UPDATE ON parsed_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_family_members_updated_at BEFORE UPDATE ON family_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();