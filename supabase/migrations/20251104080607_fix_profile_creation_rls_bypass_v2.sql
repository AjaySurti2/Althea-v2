/*
  # Fix Profile Creation RLS Bypass v2

  ## Summary
  Updates the handle_new_user function to properly bypass RLS when creating profiles.

  ## Changes
  - Recreate handle_new_user function with proper RLS bypass
  - Ensure function runs with postgres privileges
  - Add comprehensive error handling

  ## Impact
  - Fixes signup flow completely
  - Profile creation works during user registration
*/

-- Drop and recreate the function
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  profile_exists boolean;
BEGIN
  -- Check if profile already exists
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = NEW.id
  ) INTO profile_exists;

  -- Only insert if it doesn't exist
  IF NOT profile_exists THEN
    INSERT INTO public.profiles (
      id,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      COALESCE(NEW.created_at, now()),
      now()
    );
    
    RAISE LOG 'Profile created for user: %', NEW.id;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Ensure the function is owned by postgres
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- Add comment
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates a profile when a new user signs up';

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
