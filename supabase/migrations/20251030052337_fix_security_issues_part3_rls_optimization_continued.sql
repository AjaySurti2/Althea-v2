/*
  # Fix Security Issues - Part 3: RLS Policy Optimization (Continued)

  Continues optimizing RLS policies for remaining tables.

  ## Changes
  - Update RLS policies for health_metrics, reminders, ai_summaries
  - Update RLS policies for health_insights, patients, lab_reports, test_results
  - Update RLS policies for health_reports, report_questions, report_access_log
  - Update RLS policies for family_health_trends, family_audit_log
*/

-- health_metrics table policies
DROP POLICY IF EXISTS "Users can view own health metrics" ON public.health_metrics;
DROP POLICY IF EXISTS "Users can insert own health metrics" ON public.health_metrics;

CREATE POLICY "Users can view own health metrics"
  ON public.health_metrics FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own health metrics"
  ON public.health_metrics FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- reminders table policies
DROP POLICY IF EXISTS "Users can view own reminders" ON public.reminders;
DROP POLICY IF EXISTS "Users can insert own reminders" ON public.reminders;
DROP POLICY IF EXISTS "Users can update own reminders" ON public.reminders;

CREATE POLICY "Users can view own reminders"
  ON public.reminders FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own reminders"
  ON public.reminders FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own reminders"
  ON public.reminders FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ai_summaries table policies
DROP POLICY IF EXISTS "Users can view own AI summaries" ON public.ai_summaries;
DROP POLICY IF EXISTS "Users can insert own AI summaries" ON public.ai_summaries;

CREATE POLICY "Users can view own AI summaries"
  ON public.ai_summaries FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own AI summaries"
  ON public.ai_summaries FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- health_insights table policies
DROP POLICY IF EXISTS "Users can view own health insights" ON public.health_insights;
DROP POLICY IF EXISTS "Users can create own health insights" ON public.health_insights;

CREATE POLICY "Users can view own health insights"
  ON public.health_insights FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can create own health insights"
  ON public.health_insights FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- patients table policies
DROP POLICY IF EXISTS "Users can view own patients" ON public.patients;
DROP POLICY IF EXISTS "Users can insert own patients" ON public.patients;
DROP POLICY IF EXISTS "Users can update own patients" ON public.patients;

CREATE POLICY "Users can view own patients"
  ON public.patients FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own patients"
  ON public.patients FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own patients"
  ON public.patients FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- lab_reports table policies
DROP POLICY IF EXISTS "Users can view own lab reports" ON public.lab_reports;
DROP POLICY IF EXISTS "Users can insert own lab reports" ON public.lab_reports;
DROP POLICY IF EXISTS "Users can update own lab reports" ON public.lab_reports;

CREATE POLICY "Users can view own lab reports"
  ON public.lab_reports FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own lab reports"
  ON public.lab_reports FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own lab reports"
  ON public.lab_reports FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));