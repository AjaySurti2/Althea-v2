/*
  # Optimize RLS Policies - Part 2: Medical & Analytics Tables
  
  1. Tables Optimized (Part 2)
    - lab_reports
    - test_results
    - health_metrics
    - health_insights
    - ai_summaries
    - reminders
    
  2. Performance Gain
    - Reduces auth.uid() evaluations from per-row to per-query
    - Critical for medical data tables with potentially millions of rows
    - Improves query response time by orders of magnitude
*/

-- ============================================
-- LAB_REPORTS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view own lab reports" ON lab_reports;
DROP POLICY IF EXISTS "Users can insert own lab reports" ON lab_reports;
DROP POLICY IF EXISTS "Users can update own lab reports" ON lab_reports;
DROP POLICY IF EXISTS "Users can delete own lab reports" ON lab_reports;

CREATE POLICY "Users can view own lab reports"
  ON lab_reports FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own lab reports"
  ON lab_reports FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own lab reports"
  ON lab_reports FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own lab reports"
  ON lab_reports FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ============================================
-- TEST_RESULTS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view own test results" ON test_results;
DROP POLICY IF EXISTS "Users can insert own test results" ON test_results;
DROP POLICY IF EXISTS "Users can update own test results" ON test_results;
DROP POLICY IF EXISTS "Users can delete own test results" ON test_results;

CREATE POLICY "Users can view own test results"
  ON test_results FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own test results"
  ON test_results FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own test results"
  ON test_results FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own test results"
  ON test_results FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ============================================
-- HEALTH_METRICS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view own health metrics" ON health_metrics;
DROP POLICY IF EXISTS "Users can insert own health metrics" ON health_metrics;

CREATE POLICY "Users can view own health metrics"
  ON health_metrics FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own health metrics"
  ON health_metrics FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ============================================
-- HEALTH_INSIGHTS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view own health insights" ON health_insights;
DROP POLICY IF EXISTS "Users can insert own health insights" ON health_insights;

CREATE POLICY "Users can view own health insights"
  ON health_insights FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own health insights"
  ON health_insights FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ============================================
-- AI_SUMMARIES TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view own AI summaries" ON ai_summaries;
DROP POLICY IF EXISTS "Users can insert own AI summaries" ON ai_summaries;

CREATE POLICY "Users can view own AI summaries"
  ON ai_summaries FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own AI summaries"
  ON ai_summaries FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ============================================
-- REMINDERS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view own reminders" ON reminders;
DROP POLICY IF EXISTS "Users can insert own reminders" ON reminders;
DROP POLICY IF EXISTS "Users can update own reminders" ON reminders;

CREATE POLICY "Users can view own reminders"
  ON reminders FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own reminders"
  ON reminders FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own reminders"
  ON reminders FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);