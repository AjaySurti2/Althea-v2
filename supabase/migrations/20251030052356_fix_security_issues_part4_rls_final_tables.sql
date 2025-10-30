/*
  # Fix Security Issues - Part 4: RLS Policy Optimization (Final Tables)

  Completes RLS optimization for all remaining tables.

  ## Changes
  - Update RLS policies for test_results, health_reports, report_questions
  - Update RLS policies for report_access_log, family_health_trends, family_audit_log
*/

-- test_results table policies
DROP POLICY IF EXISTS "Users can view own test results" ON public.test_results;
DROP POLICY IF EXISTS "Users can insert own test results" ON public.test_results;
DROP POLICY IF EXISTS "Users can update own test results" ON public.test_results;

CREATE POLICY "Users can view own test results"
  ON public.test_results FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own test results"
  ON public.test_results FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own test results"
  ON public.test_results FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- health_reports table policies
DROP POLICY IF EXISTS "Users can view own health reports" ON public.health_reports;
DROP POLICY IF EXISTS "Users can create own health reports" ON public.health_reports;
DROP POLICY IF EXISTS "Users can update own health reports" ON public.health_reports;

CREATE POLICY "Users can view own health reports"
  ON public.health_reports FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can create own health reports"
  ON public.health_reports FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own health reports"
  ON public.health_reports FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- report_questions table policies
DROP POLICY IF EXISTS "Users can view own report questions" ON public.report_questions;
DROP POLICY IF EXISTS "Users can create own report questions" ON public.report_questions;

CREATE POLICY "Users can view own report questions"
  ON public.report_questions FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can create own report questions"
  ON public.report_questions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- report_access_log table policies
DROP POLICY IF EXISTS "Users can view own access logs" ON public.report_access_log;
DROP POLICY IF EXISTS "Users can create own access logs" ON public.report_access_log;

CREATE POLICY "Users can view own access logs"
  ON public.report_access_log FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can create own access logs"
  ON public.report_access_log FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- family_health_trends table policies
DROP POLICY IF EXISTS "Users can view own family health trends" ON public.family_health_trends;
DROP POLICY IF EXISTS "Users can insert own family health trends" ON public.family_health_trends;
DROP POLICY IF EXISTS "Users can update own family health trends" ON public.family_health_trends;
DROP POLICY IF EXISTS "Users can delete own family health trends" ON public.family_health_trends;

CREATE POLICY "Users can view own family health trends"
  ON public.family_health_trends FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own family health trends"
  ON public.family_health_trends FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own family health trends"
  ON public.family_health_trends FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own family health trends"
  ON public.family_health_trends FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- family_audit_log table policies
DROP POLICY IF EXISTS "Users can view own audit logs" ON public.family_audit_log;
DROP POLICY IF EXISTS "Users can create audit logs" ON public.family_audit_log;

CREATE POLICY "Users can view own audit logs"
  ON public.family_audit_log FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can create audit logs"
  ON public.family_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));