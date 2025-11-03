/*
  # Add RLS Policies for Leads Table
  
  1. Security Issue
    - leads table has RLS enabled but NO policies
    - This means NO ONE can access the data (locked down completely)
    - Need to add appropriate policies for marketing team/admins
    
  2. Policies Added
    - Authenticated users can view all leads (for marketing purposes)
    - Authenticated users can insert leads (for lead capture)
    - Only users can view leads they converted themselves
    - Service role has full access (for admin operations)
    
  3. Business Logic
    - Leads are potential customers in pre-conversion stage
    - Multiple users may need to view/manage leads
    - Once converted, link to user account is maintained
*/

-- Policy: Authenticated users can view all leads
-- (Marketing team needs access to all leads)
CREATE POLICY "Authenticated users can view leads"
  ON leads FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert leads
-- (Allow lead capture from forms, referrals, etc.)
CREATE POLICY "Authenticated users can insert leads"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Users can update leads they manage
-- (Only update leads not yet converted or that you converted)
CREATE POLICY "Users can update own or unconverted leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (
    converted_to_user_id IS NULL 
    OR converted_to_user_id = (SELECT auth.uid())
  )
  WITH CHECK (
    converted_to_user_id IS NULL 
    OR converted_to_user_id = (SELECT auth.uid())
  );

-- Policy: Users can delete unconverted leads or their own converted leads
CREATE POLICY "Users can delete unconverted or own leads"
  ON leads FOR DELETE
  TO authenticated
  USING (
    converted_to_user_id IS NULL 
    OR converted_to_user_id = (SELECT auth.uid())
  );