/*
  # Add Automatic Profile Creation Trigger
  
  1. Function Created
    - handle_new_user() function to create profiles automatically
    
  2. Trigger Created
    - on_auth_user_created trigger fires after user signup
    - Automatically creates a profile entry in the profiles table
    
  3. Security
    - Function runs with SECURITY DEFINER to bypass RLS
    - Only operates on newly created users
*/

-- Function to automatically create a profile for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Trigger to create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();