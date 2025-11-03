/*
  # Optimize RLS Policies - Part 1: Core Tables
  
  1. Performance Issue
    - Direct auth.uid() calls are evaluated for EVERY row
    - This causes severe performance degradation at scale
    - Using (SELECT auth.uid()) evaluates once per query
    
  2. Tables Optimized (Part 1)
    - profiles
    - family_members
    - sessions
    - files
    - parsed_documents
    - patients
    
  3. Pattern Applied
    - Replace: auth.uid() = user_id
    - With: (SELECT auth.uid()) = user_id
    - This reduces function calls from O(n) to O(1)
*/

-- ============================================
-- PROFILES TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);

-- ============================================
-- FAMILY_MEMBERS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view own family members" ON family_members;
DROP POLICY IF EXISTS "Users can insert own family members" ON family_members;
DROP POLICY IF EXISTS "Users can update own family members" ON family_members;
DROP POLICY IF EXISTS "Users can delete own family members" ON family_members;

CREATE POLICY "Users can view own family members"
  ON family_members FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own family members"
  ON family_members FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own family members"
  ON family_members FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own family members"
  ON family_members FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ============================================
-- SESSIONS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON sessions;

CREATE POLICY "Users can view own sessions"
  ON sessions FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own sessions"
  ON sessions FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own sessions"
  ON sessions FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ============================================
-- FILES TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view own files" ON files;
DROP POLICY IF EXISTS "Users can insert own files" ON files;

CREATE POLICY "Users can view own files"
  ON files FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own files"
  ON files FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ============================================
-- PARSED_DOCUMENTS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view own parsed documents" ON parsed_documents;
DROP POLICY IF EXISTS "Users can insert own parsed documents" ON parsed_documents;
DROP POLICY IF EXISTS "Users can update own parsed documents" ON parsed_documents;

CREATE POLICY "Users can view own parsed documents"
  ON parsed_documents FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own parsed documents"
  ON parsed_documents FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own parsed documents"
  ON parsed_documents FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ============================================
-- PATIENTS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view own patients" ON patients;
DROP POLICY IF EXISTS "Users can insert own patients" ON patients;
DROP POLICY IF EXISTS "Users can update own patients" ON patients;
DROP POLICY IF EXISTS "Users can delete own patients" ON patients;

CREATE POLICY "Users can view own patients"
  ON patients FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own patients"
  ON patients FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own patients"
  ON patients FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own patients"
  ON patients FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);