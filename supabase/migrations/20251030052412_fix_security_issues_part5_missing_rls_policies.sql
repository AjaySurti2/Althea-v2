/*
  # Fix Security Issues - Part 5: Add Missing RLS Policies

  This migration adds RLS policies for tables that have RLS enabled but no policies,
  which would prevent any access to those tables.

  ## Changes
  - Add RLS policies for family_patterns table
  - Add RLS policies for leads table
  - Add RLS policies for report_pdfs table
*/

-- family_patterns table policies
CREATE POLICY "Users can view own family patterns"
  ON public.family_patterns FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own family patterns"
  ON public.family_patterns FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own family patterns"
  ON public.family_patterns FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own family patterns"
  ON public.family_patterns FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- leads table policies (read-only for authenticated users to check their own status)
CREATE POLICY "Users can view own lead"
  ON public.leads FOR SELECT
  TO authenticated
  USING (email = (SELECT auth.jwt()->>'email'));

CREATE POLICY "Public can insert leads"
  ON public.leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- report_pdfs table policies
CREATE POLICY "Users can view own report PDFs"
  ON public.report_pdfs FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own report PDFs"
  ON public.report_pdfs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own report PDFs"
  ON public.report_pdfs FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own report PDFs"
  ON public.report_pdfs FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));