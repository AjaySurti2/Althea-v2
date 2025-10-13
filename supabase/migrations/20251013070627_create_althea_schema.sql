/*
  # Althea Health Interpreter Database Schema

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `full_name` (text)
      - `date_of_birth` (date)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `leads`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `name` (text)
      - `source` (text) - tracks where lead came from
      - `converted_to_user_id` (uuid, nullable) - links to auth.users when converted
      - `created_at` (timestamptz)
    
    - `family_members`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text)
      - `relationship` (text)
      - `date_of_birth` (date, nullable)
      - `created_at` (timestamptz)
    
    - `sessions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `family_member_id` (uuid, references family_members, nullable)
      - `tone` (text) - Friendly/Professional/Empathetic
      - `language_level` (text) - Simple/Moderate/Technical
      - `status` (text) - pending/processing/completed/failed
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `files`
      - `id` (uuid, primary key)
      - `session_id` (uuid, references sessions)
      - `user_id` (uuid, references auth.users)
      - `storage_path` (text) - path in Supabase storage
      - `file_name` (text)
      - `file_type` (text) - pdf/image/text
      - `file_size` (bigint)
      - `extracted_text` (text, nullable)
      - `validation_status` (text) - pending/validated/rejected
      - `created_at` (timestamptz)
    
    - `health_metrics`
      - `id` (uuid, primary key)
      - `session_id` (uuid, references sessions)
      - `user_id` (uuid, references auth.users)
      - `family_member_id` (uuid, references family_members, nullable)
      - `metric_type` (text) - blood_pressure, cholesterol, glucose, etc.
      - `metric_value` (text)
      - `metric_unit` (text)
      - `recorded_date` (date)
      - `notes` (text, nullable)
      - `created_at` (timestamptz)
    
    - `family_patterns`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `pattern_type` (text) - diabetes, heart_disease, etc.
      - `affected_members` (text[]) - array of family member names
      - `risk_level` (text) - low/moderate/high
      - `description` (text)
      - `detected_at` (timestamptz)
    
    - `ai_summaries`
      - `id` (uuid, primary key)
      - `session_id` (uuid, references sessions)
      - `user_id` (uuid, references auth.users)
      - `summary_text` (text)
      - `doctor_questions` (text[])
      - `health_insights` (text)
      - `created_at` (timestamptz)
    
    - `report_pdfs`
      - `id` (uuid, primary key)
      - `session_id` (uuid, references sessions)
      - `user_id` (uuid, references auth.users)
      - `storage_path` (text)
      - `created_at` (timestamptz)
    
    - `reminders`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `family_member_id` (uuid, references family_members, nullable)
      - `reminder_type` (text) - checkup, medication, test
      - `title` (text)
      - `description` (text, nullable)
      - `due_date` (date)
      - `completed` (boolean)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to access only their own data
    - Leads table has insert-only policy for public access
    
  3. Indexes
    - Add indexes for foreign keys and frequently queried columns
    
  4. Important Notes
    - All user data is isolated by user_id with strict RLS policies
    - File storage paths reference Supabase Storage buckets
    - Sessions track multi-file processing workflows
    - Family patterns automatically detected from health metrics
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name text NOT NULL,
  date_of_birth date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

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

-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  source text DEFAULT 'hero_cta',
  converted_to_user_id uuid REFERENCES auth.users,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert leads"
  ON leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view own leads"
  ON leads FOR SELECT
  TO authenticated
  USING (auth.uid() = converted_to_user_id OR auth.uid() IN (SELECT id FROM auth.users WHERE email = leads.email));

-- Create family_members table
CREATE TABLE IF NOT EXISTS family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  relationship text NOT NULL,
  date_of_birth date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

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

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  family_member_id uuid REFERENCES family_members ON DELETE SET NULL,
  tone text DEFAULT 'friendly' CHECK (tone IN ('friendly', 'professional', 'empathetic')),
  language_level text DEFAULT 'simple' CHECK (language_level IN ('simple', 'moderate', 'technical')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

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

-- Create files table
CREATE TABLE IF NOT EXISTS files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL,
  extracted_text text,
  validation_status text DEFAULT 'pending' CHECK (validation_status IN ('pending', 'validated', 'rejected')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE files ENABLE ROW LEVEL SECURITY;

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

-- Create health_metrics table
CREATE TABLE IF NOT EXISTS health_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  family_member_id uuid REFERENCES family_members ON DELETE SET NULL,
  metric_type text NOT NULL,
  metric_value text NOT NULL,
  metric_unit text,
  recorded_date date NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE health_metrics ENABLE ROW LEVEL SECURITY;

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

-- Create family_patterns table
CREATE TABLE IF NOT EXISTS family_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  pattern_type text NOT NULL,
  affected_members text[] NOT NULL,
  risk_level text DEFAULT 'moderate' CHECK (risk_level IN ('low', 'moderate', 'high')),
  description text NOT NULL,
  detected_at timestamptz DEFAULT now()
);

ALTER TABLE family_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own family patterns"
  ON family_patterns FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own family patterns"
  ON family_patterns FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create ai_summaries table
CREATE TABLE IF NOT EXISTS ai_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  summary_text text NOT NULL,
  doctor_questions text[] DEFAULT '{}',
  health_insights text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ai_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ai summaries"
  ON ai_summaries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ai summaries"
  ON ai_summaries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create report_pdfs table
CREATE TABLE IF NOT EXISTS report_pdfs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  storage_path text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE report_pdfs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own report pdfs"
  ON report_pdfs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own report pdfs"
  ON report_pdfs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create reminders table
CREATE TABLE IF NOT EXISTS reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  family_member_id uuid REFERENCES family_members ON DELETE SET NULL,
  reminder_type text NOT NULL CHECK (reminder_type IN ('checkup', 'medication', 'test', 'followup')),
  title text NOT NULL,
  description text,
  due_date date NOT NULL,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(id);
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_files_session_id ON files(session_id);
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_health_metrics_user_id ON health_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_health_metrics_session_id ON health_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_health_metrics_recorded_date ON health_metrics(recorded_date);
CREATE INDEX IF NOT EXISTS idx_family_patterns_user_id ON family_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_summaries_session_id ON ai_summaries(session_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_due_date ON reminders(due_date);

-- Create storage bucket for medical files
INSERT INTO storage.buckets (id, name, public)
VALUES ('medical-files', 'medical-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for medical files
CREATE POLICY "Users can upload own medical files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'medical-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own medical files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'medical-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own medical files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'medical-files' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Create storage bucket for reports
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-pdfs', 'report-pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for reports
CREATE POLICY "Users can upload own reports"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'report-pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own reports"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'report-pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own reports"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'report-pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);