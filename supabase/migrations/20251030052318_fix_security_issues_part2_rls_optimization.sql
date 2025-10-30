/*
  # Fix Security Issues - Part 2: RLS Policy Optimization

  This migration optimizes RLS policies by wrapping auth.uid() calls in SELECT statements,
  preventing re-evaluation for each row and significantly improving query performance at scale.

  ## Changes
  - Update all RLS policies to use (SELECT auth.uid()) instead of auth.uid()
  - Applies to all tables with RLS policies
  - Improves performance by evaluating auth function once per query instead of per row
*/

-- profiles table policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

-- sessions table policies
DROP POLICY IF EXISTS "Users can view own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.sessions;

CREATE POLICY "Users can view own sessions"
  ON public.sessions FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own sessions"
  ON public.sessions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own sessions"
  ON public.sessions FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- files table policies
DROP POLICY IF EXISTS "Users can view own files" ON public.files;
DROP POLICY IF EXISTS "Users can insert own files" ON public.files;

CREATE POLICY "Users can view own files"
  ON public.files FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own files"
  ON public.files FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- parsed_documents table policies
DROP POLICY IF EXISTS "Users can view own parsed documents" ON public.parsed_documents;
DROP POLICY IF EXISTS "Users can insert own parsed documents" ON public.parsed_documents;
DROP POLICY IF EXISTS "Users can update own parsed documents" ON public.parsed_documents;

CREATE POLICY "Users can view own parsed documents"
  ON public.parsed_documents FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own parsed documents"
  ON public.parsed_documents FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own parsed documents"
  ON public.parsed_documents FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- family_members table policies
DROP POLICY IF EXISTS "Users can view own family members" ON public.family_members;
DROP POLICY IF EXISTS "Users can insert own family members" ON public.family_members;
DROP POLICY IF EXISTS "Users can delete own family members" ON public.family_members;
DROP POLICY IF EXISTS "Users can update own family members" ON public.family_members;

CREATE POLICY "Users can view own family members"
  ON public.family_members FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own family members"
  ON public.family_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own family members"
  ON public.family_members FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own family members"
  ON public.family_members FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));