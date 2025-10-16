/*
  # Add Missing Columns to parsed_documents Table

  ## Issue Identified
  The edge function `parse-documents` is trying to insert columns that don't exist:
  - `raw_content` - stores extracted text from documents
  - `confidence_scores` - stores confidence metrics as jsonb
  - `metadata` - stores parsing metadata
  - `error_message` - stores error details for failed parsing

  The current table only has `confidence_score` (single decimal) which doesn't match
  the edge function's expectation of `confidence_scores` (jsonb object).

  ## Solution
  Add the missing columns to align with the edge function's data structure.

  ## Verification
  After applying, the edge function should successfully insert parsed documents.
*/

-- Add missing columns to parsed_documents table
DO $$
BEGIN
  -- Add raw_content column for storing extracted text
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'parsed_documents' AND column_name = 'raw_content'
  ) THEN
    ALTER TABLE parsed_documents ADD COLUMN raw_content text;
  END IF;

  -- Add confidence_scores as jsonb (the edge function expects this format)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'parsed_documents' AND column_name = 'confidence_scores'
  ) THEN
    ALTER TABLE parsed_documents ADD COLUMN confidence_scores jsonb DEFAULT '{}'::jsonb;
  END IF;

  -- Add metadata column for storing parsing information
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'parsed_documents' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE parsed_documents ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
  END IF;

  -- Add error_message for failed parsing attempts
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'parsed_documents' AND column_name = 'error_message'
  ) THEN
    ALTER TABLE parsed_documents ADD COLUMN error_message text;
  END IF;
END $$;

-- Verify the columns were added
DO $$
DECLARE
  raw_content_exists BOOLEAN;
  confidence_scores_exists BOOLEAN;
  metadata_exists BOOLEAN;
  error_message_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'parsed_documents' AND column_name = 'raw_content'
  ) INTO raw_content_exists;

  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'parsed_documents' AND column_name = 'confidence_scores'
  ) INTO confidence_scores_exists;

  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'parsed_documents' AND column_name = 'metadata'
  ) INTO metadata_exists;

  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'parsed_documents' AND column_name = 'error_message'
  ) INTO error_message_exists;

  RAISE NOTICE '=== Column Verification ===';
  RAISE NOTICE 'raw_content exists: %', raw_content_exists;
  RAISE NOTICE 'confidence_scores exists: %', confidence_scores_exists;
  RAISE NOTICE 'metadata exists: %', metadata_exists;
  RAISE NOTICE 'error_message exists: %', error_message_exists;

  IF NOT (raw_content_exists AND confidence_scores_exists AND metadata_exists AND error_message_exists) THEN
    RAISE EXCEPTION 'Failed to add all required columns';
  END IF;
END $$;