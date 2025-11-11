/*
  # Fix detect_family_health_patterns Function Search Path

  1. Issue
    - Multiple function overloads exist
    - One version has SECURITY DEFINER with mutable search_path
    - This is a security vulnerability

  2. Solution
    - Drop the problematic no-argument overload
    - Keep the secure version with explicit search_path
    - Ensure only SECURITY INVOKER functions exist

  3. Security Impact
    - Eliminates search path exploitation vulnerability
    - Maintains function functionality
    - Uses safe execution context
*/

-- Drop the old SECURITY DEFINER version without arguments
DROP FUNCTION IF EXISTS public.detect_family_health_patterns() CASCADE;

-- Ensure the secure version exists and is properly configured
DROP FUNCTION IF EXISTS public.detect_family_health_patterns(uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.detect_family_health_patterns(p_user_id uuid)
RETURNS TABLE (
  pattern_type text,
  description text,
  affected_members jsonb
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Detect health patterns across family members for the given user
  -- This analyzes health_metrics and family_health_trends tables
  
  RETURN QUERY
  SELECT 
    fht.trend_type::text as pattern_type,
    fht.description::text,
    jsonb_agg(
      jsonb_build_object(
        'family_member_id', fht.family_member_id,
        'detected_at', fht.detected_at
      )
    ) as affected_members
  FROM public.family_health_trends fht
  WHERE fht.user_id = p_user_id
    AND fht.detected_at >= NOW() - interval '90 days'
  GROUP BY fht.trend_type, fht.description;
END;
$$;

COMMENT ON FUNCTION public.detect_family_health_patterns(uuid) IS 
  'Detects health patterns across family members. Uses SECURITY INVOKER with immutable search_path for security.';
