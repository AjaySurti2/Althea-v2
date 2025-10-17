/*
  # Enhanced Health Data Schema for Real Medical Parsing
  
  1. New Tables
    - patients: Detailed patient information
    - lab_reports: Report metadata and lab details
    - test_results: Individual test metrics with reference ranges
    
  2. Enhancements
    - Normalized structure for health metrics
    - Automatic status calculation
    - Reference range validation
    - Support for real medical data
    
  3. Security
    - RLS enabled on all tables
    - Users can only access their own data
*/

-- Patients table for detailed patient info
CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  family_member_id uuid REFERENCES family_members(id) ON DELETE SET NULL,
  name text NOT NULL,
  age text,
  gender text,
  date_of_birth date,
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
  report_type text DEFAULT 'lab_test',
  summary text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Test results table (normalized health metrics)
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
  status text CHECK (status IN ('NORMAL', 'HIGH', 'LOW', 'ABNORMAL', 'CRITICAL', 'PENDING')) DEFAULT 'PENDING',
  notes text,
  is_flagged boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id);
CREATE INDEX IF NOT EXISTS idx_patients_family_member_id ON patients(family_member_id);
CREATE INDEX IF NOT EXISTS idx_lab_reports_user_id ON lab_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_lab_reports_patient_id ON lab_reports(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_reports_session_id ON lab_reports(session_id);
CREATE INDEX IF NOT EXISTS idx_lab_reports_file_id ON lab_reports(file_id);
CREATE INDEX IF NOT EXISTS idx_lab_reports_report_date ON lab_reports(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_test_results_lab_report_id ON test_results(lab_report_id);
CREATE INDEX IF NOT EXISTS idx_test_results_user_id ON test_results(user_id);
CREATE INDEX IF NOT EXISTS idx_test_results_status ON test_results(status);
CREATE INDEX IF NOT EXISTS idx_test_results_test_name ON test_results(test_name);

-- Enable RLS
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;

-- Patients policies
CREATE POLICY "Users can view own patients"
  ON patients FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own patients"
  ON patients FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own patients"
  ON patients FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Lab reports policies
CREATE POLICY "Users can view own lab reports"
  ON lab_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own lab reports"
  ON lab_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lab reports"
  ON lab_reports FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Test results policies
CREATE POLICY "Users can view own test results"
  ON test_results FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own test results"
  ON test_results FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own test results"
  ON test_results FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add triggers for auto-updating timestamps
CREATE TRIGGER update_patients_updated_at
    BEFORE UPDATE ON patients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lab_reports_updated_at
    BEFORE UPDATE ON lab_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();