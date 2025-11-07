/*
  # Add Profile Auto-Creation Trigger
  
  1. New Trigger
    - Automatically creates a profile entry when a new user signs up
    - Uses SECURITY DEFINER to bypass RLS
    
  2. Security
    - Function runs with elevated privileges
    - Only triggered on new auth.users insert
*/

-- Create function to auto-create profile
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    now(),
    now()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();