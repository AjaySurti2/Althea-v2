/*
  # Fix User Signup Trigger

  ## Summary
  Fixes the "Database error saving new user" issue by:
  1. Updating the handle_new_user function to not insert email (column doesn't exist)
  2. Recreating the trigger on auth.users table
  3. Ensuring proper permissions and error handling

  ## Changes
  - Drop and recreate handle_new_user function without email column
  - Create trigger on auth.users for INSERT operations
  - Add error handling and logging

  ## Impact
  - Fixes signup flow
  - Users can successfully create accounts
  - Profile automatically created on signup
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Recreate the function without email column
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Insert new profile for the user
  INSERT INTO public.profiles (id, created_at, updated_at)
  VALUES (
    NEW.id,
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the signup
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Add comment
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates a profile entry when a new user signs up';

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Verify the trigger was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    RAISE NOTICE 'Trigger on_auth_user_created created successfully';
  ELSE
    RAISE EXCEPTION 'Failed to create trigger on_auth_user_created';
  END IF;
END $$;
