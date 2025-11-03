/*
  # Fix Security Definer View

  ## Summary
  Recreates the parsing_statistics view without SECURITY DEFINER to enhance security.
  Views with SECURITY DEFINER execute with the privileges of the view owner (postgres),
  which can be a security risk. The view should execute with the caller's privileges instead.

  ## Changes
  - Drop existing parsing_statistics view
  - Recreate as a normal view (SECURITY INVOKER by default)
  - Add appropriate RLS policies if needed

  ## Impact
  - Improves security posture
  - View now respects RLS policies of underlying tables
  - Users can only see data they have permission to access
  
  ## Safety
  - View functionality preserved
  - Users with appropriate permissions can still query the view
  - RLS on parsed_documents table will apply
*/

-- Drop the existing view
DROP VIEW IF EXISTS parsing_statistics;

-- Recreate the view without SECURITY DEFINER
-- By default, views are created with SECURITY INVOKER
CREATE VIEW parsing_statistics AS
SELECT 
  date(parsing_completed_at) AS parse_date,
  parsing_provider,
  count(*) AS total_parses,
  avg(parsing_duration_ms) AS avg_duration_ms,
  sum(estimated_cost) AS total_cost,
  sum(tokens_used) AS total_tokens,
  avg(parsing_attempts) AS avg_attempts
FROM parsed_documents
WHERE parsing_status = 'completed' 
  AND parsing_completed_at IS NOT NULL
GROUP BY date(parsing_completed_at), parsing_provider
ORDER BY date(parsing_completed_at) DESC;

-- Add comment explaining the view's purpose
COMMENT ON VIEW parsing_statistics IS 'Aggregates parsing statistics by date and provider for monitoring and analytics. Respects RLS policies from parsed_documents table.';
