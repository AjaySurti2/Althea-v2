/*
  # Optimize RLS Policies - Part 3: Family Analytics & Reports
  
  1. Tables Optimized (Part 3)
    - family_patterns
    - family_health_trends
    - family_audit_log
    - health_reports
    - report_questions
    - report_access_log
    - report_pdfs
    
  2. Security Maintained
    - All user access restrictions preserved
    - Only optimization applied (no logic changes)
    - Users still only access their own data
*/

-- ============================================
-- FAMILY_PATTERNS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view own family patterns" ON family_patterns;
DROP POLICY IF EXISTS "Users can insert own family patterns" ON family_patterns;

CREATE POLICY "Users can view own family patterns"
  ON family_patterns FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own family patterns"
  ON family_patterns FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ============================================
-- FAMILY_HEALTH_TRENDS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view own family health trends" ON family_health_trends;
DROP POLICY IF EXISTS "Users can insert own family health trends" ON family_health_trends;

CREATE POLICY "Users can view own family health trends"
  ON family_health_trends FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own family health trends"
  ON family_health_trends FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ============================================
-- FAMILY_AUDIT_LOG TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view own audit log" ON family_audit_log;
DROP POLICY IF EXISTS "Users can insert own audit log" ON family_audit_log;

CREATE POLICY "Users can view own audit log"
  ON family_audit_log FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own audit log"
  ON family_audit_log FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ============================================
-- HEALTH_REPORTS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view own health reports" ON health_reports;
DROP POLICY IF EXISTS "Users can create own health reports" ON health_reports;
DROP POLICY IF EXISTS "Users can update own health reports" ON health_reports;

CREATE POLICY "Users can view own health reports"
  ON health_reports FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can create own health reports"
  ON health_reports FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own health reports"
  ON health_reports FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ============================================
-- REPORT_QUESTIONS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view own report questions" ON report_questions;
DROP POLICY IF EXISTS "Users can create own report questions" ON report_questions;

CREATE POLICY "Users can view own report questions"
  ON report_questions FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can create own report questions"
  ON report_questions FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ============================================
-- REPORT_ACCESS_LOG TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view own access logs" ON report_access_log;
DROP POLICY IF EXISTS "Users can create own access logs" ON report_access_log;

CREATE POLICY "Users can view own access logs"
  ON report_access_log FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can create own access logs"
  ON report_access_log FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ============================================
-- REPORT_PDFS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view own report PDFs" ON report_pdfs;
DROP POLICY IF EXISTS "Users can insert own report PDFs" ON report_pdfs;

CREATE POLICY "Users can view own report PDFs"
  ON report_pdfs FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own report PDFs"
  ON report_pdfs FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);