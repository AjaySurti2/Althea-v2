/*
  # Fix Function Security: Immutable Search Paths
  
  1. Security Issue
    - Functions with mutable search_path are vulnerable to privilege escalation
    - Malicious users could manipulate function behavior
    - SECURITY DEFINER functions especially at risk
    
  2. Functions Fixed
    - update_updated_at_column: Add SET search_path = public, pg_catalog
    - handle_new_user: Add SET search_path = public, pg_catalog, auth
    
  3. Security Improvement
    - Functions now execute with fixed, predictable schema resolution
    - Prevents schema-based attacks
    - Maintains proper function isolation
*/

-- ============================================
-- FIX update_updated_at_column FUNCTION
-- ============================================

-- Drop existing function CASCADE to remove dependent triggers
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Recreate with secure search_path
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate all triggers that use this function
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parsed_documents_updated_at
  BEFORE UPDATE ON parsed_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_family_members_updated_at
  BEFORE UPDATE ON family_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lab_reports_updated_at
  BEFORE UPDATE ON lab_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_health_reports_updated_at
  BEFORE UPDATE ON health_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FIX handle_new_user FUNCTION
-- ============================================

-- Drop existing function CASCADE
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- Recreate with secure search_path
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, auth
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();