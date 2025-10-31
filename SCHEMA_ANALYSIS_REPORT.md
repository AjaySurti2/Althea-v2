# Database Schema Analysis Report
**Date:** October 31, 2025
**Project:** Althea - Personal Health Interpreter
**Database:** Supabase PostgreSQL

---

## Executive Summary

Complete database schema review performed to ensure alignment between Supabase database and application codebase. Analysis identified **critical missing columns** in two tables that would cause runtime errors.

**Status:** CRITICAL DISCREPANCIES FOUND - Immediate restoration required

---

## 1. Current Database State

### Tables Present (11 total)
1. profiles
2. leads
3. family_members
4. sessions
5. files
6. parsed_documents
7. health_metrics
8. family_patterns
9. ai_summaries
10. report_pdfs
11. reminders

### Storage Buckets (2 total)
- medical-files (50MB limit, PDF/Images/Docs)
- report-pdfs (10MB limit, PDF/HTML)

### RLS Policies
All tables have RLS enabled with appropriate SELECT/INSERT/UPDATE policies for authenticated users.

---

## 2. Schema Discrepancies Identified

### CRITICAL: Missing Columns

#### Table: `profiles`
**Expected columns from TypeScript type (supabase.ts:15-26):**
```typescript
type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;        // ❌ MISSING
  address: string | null;        // ❌ MISSING
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}
```

**Current database columns:**
- id
- full_name
- company_name (extra, not in TS type)
- phone
- date_of_birth
- avatar_url
- bio
- created_at
- updated_at

**Missing:** `gender`, `address`
**Extra:** `company_name`

---

#### Table: `family_members`
**Expected columns from TypeScript type (supabase.ts:37-50):**
```typescript
type FamilyMember = {
  id: string;
  user_id: string;
  name: string;
  relationship: string;
  date_of_birth: string | null;
  gender: string | null;               // ❌ MISSING
  age: number | null;                  // ❌ MISSING
  existing_conditions: string[];       // ❌ MISSING
  allergies: string[];                 // ❌ MISSING
  medical_history_notes: string | null; // ❌ MISSING
  created_at: string;
  updated_at: string;                  // ❌ MISSING
}
```

**Current database columns:**
- id
- user_id
- name
- relationship
- date_of_birth
- created_at

**Missing:** `gender`, `age`, `existing_conditions`, `allergies`, `medical_history_notes`, `updated_at`

---

### Missing RLS Policies

The following tables are missing UPDATE/DELETE policies:

1. **family_members** - Missing UPDATE and DELETE policies
2. **family_patterns** - Missing all policies (SELECT, INSERT, UPDATE, DELETE)
3. **report_pdfs** - Missing all policies
4. **parsed_documents** - Missing UPDATE policy
5. **leads** - Missing all policies (may be intentional if admin-only)

---

### Missing Triggers

**family_members** table:
- Missing `updated_at` trigger (requires column to be added first)

---

## 3. Impact Assessment

### High Priority (Immediate Action Required)

1. **family_members missing columns** - Application code expects these fields:
   - Components: `FamilyDetailsCapture.tsx`, `FamilyMembers.tsx`
   - API: `familyApi.ts`
   - **Impact:** Runtime errors when creating/displaying family member profiles

2. **profiles missing gender/address** - Expected by:
   - Components: `ProfileModal.tsx`, `EnhancedProfileModal.tsx`
   - API: `profileApi.ts`
   - **Impact:** Profile management features will fail

### Medium Priority

3. **Missing RLS UPDATE/DELETE policies** - Users cannot modify existing records
4. **Missing triggers** - Timestamps won't auto-update

### Low Priority

5. **Extra column (company_name)** - Unused but harmless

---

## 4. Root Cause Analysis

**Issue:** Migration files were applied incompletely or in wrong order.

**Evidence:**
- Latest migration (20251028) contains enhanced schema
- Database reflects older base schema (20251028_112326)
- Enhanced family_members columns from migration 20251028_120535 NOT applied
- Enhanced profiles columns from migration 20251028_120555 NOT applied

**Failed Migrations:**
1. `20251028120535_enhance_family_members_table.sql`
2. `20251028120555_enhance_profiles_table.sql`

---

## 5. Restoration Plan

### Phase 1: Add Missing Columns (CRITICAL)

#### Step 1.1: Enhance profiles table
```sql
-- Add missing columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS address text;

-- Remove unused column (optional)
-- ALTER TABLE profiles DROP COLUMN IF EXISTS company_name;
```

#### Step 1.2: Enhance family_members table
```sql
-- Add missing columns to family_members
ALTER TABLE family_members
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS age integer,
  ADD COLUMN IF NOT EXISTS existing_conditions text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS allergies text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS medical_history_notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now() NOT NULL;

-- Add trigger for auto-updating updated_at
CREATE TRIGGER update_family_members_updated_at
  BEFORE UPDATE ON family_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Phase 2: Add Missing RLS Policies (HIGH)

#### Step 2.1: Family members policies
```sql
CREATE POLICY "Users can update own family members"
  ON family_members FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own family members"
  ON family_members FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

#### Step 2.2: Parsed documents policy
```sql
CREATE POLICY "Users can update own parsed documents"
  ON parsed_documents FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

#### Step 2.3: Family patterns policies
```sql
CREATE POLICY "Users can view own family patterns"
  ON family_patterns FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own family patterns"
  ON family_patterns FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own family patterns"
  ON family_patterns FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own family patterns"
  ON family_patterns FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

#### Step 2.4: Report PDFs policies
```sql
CREATE POLICY "Users can view own report PDFs"
  ON report_pdfs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own report PDFs"
  ON report_pdfs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own report PDFs"
  ON report_pdfs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

### Phase 3: Verification Queries

```sql
-- Verify profiles columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verify family_members columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'family_members' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verify all RLS policies
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

-- Count policies per table
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
```

---

## 6. Rollback Scripts (Safety)

```sql
-- Rollback profiles changes
ALTER TABLE profiles
  DROP COLUMN IF EXISTS gender,
  DROP COLUMN IF EXISTS address;

-- Rollback family_members changes
DROP TRIGGER IF EXISTS update_family_members_updated_at ON family_members;

ALTER TABLE family_members
  DROP COLUMN IF EXISTS gender,
  DROP COLUMN IF EXISTS age,
  DROP COLUMN IF EXISTS existing_conditions,
  DROP COLUMN IF EXISTS allergies,
  DROP COLUMN IF EXISTS medical_history_notes,
  DROP COLUMN IF EXISTS updated_at;

-- Rollback policies (example)
DROP POLICY IF EXISTS "Users can update own family members" ON family_members;
DROP POLICY IF EXISTS "Users can delete own family members" ON family_members;
-- ... (repeat for all new policies)
```

---

## 7. Recommendations to Prevent Future Issues

1. **Migration Management:**
   - Use sequential numbering for migrations
   - Never skip migrations during deployment
   - Implement migration status tracking

2. **Testing:**
   - Validate schema after each migration
   - Run type checking against database schema
   - Use automated schema comparison tools

3. **Documentation:**
   - Keep schema documentation in sync with code
   - Document all manual database changes
   - Maintain changelog for schema modifications

4. **Deployment Process:**
   - Use `supabase db push` for consistent migrations
   - Implement CI/CD pipeline for database changes
   - Test migrations in staging before production

5. **Code-First Approach:**
   - Generate TypeScript types from database schema
   - Use tools like `supabase gen types typescript`
   - Validate types against database regularly

---

## 8. Summary

**Current Status:** Database schema partially migrated, causing potential runtime errors.

**Required Actions:**
1. Add 2 missing columns to `profiles` table
2. Add 6 missing columns to `family_members` table
3. Add 13 missing RLS policies across 4 tables
4. Add 1 missing trigger for `family_members`

**Estimated Time:** 10-15 minutes for execution + 5 minutes verification

**Risk Level:** Low (IF executed correctly with provided scripts)

**Data Integrity:** No existing data will be lost or modified

---

## Next Steps

Execute restoration scripts in the following order:
1. Phase 1: Add missing columns (CRITICAL)
2. Phase 2: Add missing RLS policies (HIGH)
3. Phase 3: Run verification queries
4. Build and test application

**Ready to proceed with restoration?**
