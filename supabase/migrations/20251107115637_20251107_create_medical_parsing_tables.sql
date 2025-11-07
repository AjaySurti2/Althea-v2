/*
  # Create Medical Parsing Tables
  
  1. Tables Created
    - patients: Stores patient information extracted from medical reports
    - lab_reports: Stores lab report metadata and summary information
    - test_results: Stores individual test results from lab reports
    
  2. Relationships
    - patients -> auth.users (user_id)
    - lab_reports -> patients, sessions, files
    - test_results -> lab_reports
    
  3. Security
    - RLS enabled on all tables
    - Users can only access their own data
    - Comprehensive CRUD policies
*/

-- Patients table (extracted from medical reports)
CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  age text,
  gender text,
  contact text,
  address text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Lab reports table
CREATE TABLE IF NOT EXISTS lab_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  file_id uuid REFERENCES files(id) ON DELETE CASCADE NOT NULL,
  lab_name text NOT NULL,
  referring_doctor text,
  report_id text,
  report_date date,
  test_date date,
  summary text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Test results table
CREATE TABLE IF NOT EXISTS test_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_report_id uuid REFERENCES lab_reports(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  test_name text NOT NULL,
  test_category text,
  observed_value text NOT NULL,
  unit text,
  reference_range_min text,
  reference_range_max text,
  reference_range_text text,
  status text CHECK (status IN ('NORMAL', 'HIGH', 'LOW', 'CRITICAL', 'ABNORMAL', 'PENDING')) DEFAULT 'PENDING' NOT NULL,
  is_flagged boolean DEFAULT false NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);
CREATE INDEX IF NOT EXISTS idx_lab_reports_user_id ON lab_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_lab_reports_patient_id ON lab_reports(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_reports_session_id ON lab_reports(session_id);
CREATE INDEX IF NOT EXISTS idx_lab_reports_file_id ON lab_reports(file_id);
CREATE INDEX IF NOT EXISTS idx_lab_reports_report_date ON lab_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_test_results_lab_report_id ON test_results(lab_report_id);
CREATE INDEX IF NOT EXISTS idx_test_results_user_id ON test_results(user_id);
CREATE INDEX IF NOT EXISTS idx_test_results_status ON test_results(status);
CREATE INDEX IF NOT EXISTS idx_test_results_is_flagged ON test_results(is_flagged);

-- Enable RLS
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;

-- Patients policies
CREATE POLICY "Users can view own patients" ON patients FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own patients" ON patients FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own patients" ON patients FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own patients" ON patients FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Lab reports policies
CREATE POLICY "Users can view own lab reports" ON lab_reports FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own lab reports" ON lab_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own lab reports" ON lab_reports FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own lab reports" ON lab_reports FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Test results policies
CREATE POLICY "Users can view own test results" ON test_results FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own test results" ON test_results FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own test results" ON test_results FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own test results" ON test_results FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Add update triggers
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lab_reports_updated_at BEFORE UPDATE ON lab_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();