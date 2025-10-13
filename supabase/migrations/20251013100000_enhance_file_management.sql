/*
  # Enhance File Management System

  1. New Columns
    - Add upload_progress to files table
    - Add preview_url to files table
    - Add display_order to files table
    - Add deleted_at for soft delete
    - Add document_count to sessions table

  2. Functions
    - update_session_document_count() - Auto-update document count
    - check_max_files_per_session() - Enforce 5 file limit

  3. Triggers
    - trigger_update_session_document_count - Update count on file changes
    - trigger_check_max_files - Validate max files before insert

  4. Indexes
    - Index for soft delete queries
*/

-- Add new columns to files table
ALTER TABLE files ADD COLUMN IF NOT EXISTS
  upload_progress integer DEFAULT 100;

ALTER TABLE files ADD COLUMN IF NOT EXISTS
  preview_url text;

ALTER TABLE files ADD COLUMN IF NOT EXISTS
  display_order integer DEFAULT 0;

ALTER TABLE files ADD COLUMN IF NOT EXISTS
  deleted_at timestamptz;

-- Add document count to sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS
  document_count integer DEFAULT 0;

-- Create index for soft delete queries
CREATE INDEX IF NOT EXISTS idx_files_deleted_at
  ON files(deleted_at)
  WHERE deleted_at IS NULL;

-- Create function to update document count
CREATE OR REPLACE FUNCTION update_session_document_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.deleted_at IS NULL THEN
    UPDATE sessions
    SET document_count = document_count + 1
    WHERE id = NEW.session_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- File was soft deleted
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      UPDATE sessions
      SET document_count = document_count - 1
      WHERE id = NEW.session_id;
    -- File was restored
    ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      UPDATE sessions
      SET document_count = document_count + 1
      WHERE id = NEW.session_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.deleted_at IS NULL THEN
      UPDATE sessions
      SET document_count = document_count - 1
      WHERE id = OLD.session_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic document count updates
DROP TRIGGER IF EXISTS trigger_update_session_document_count ON files;
CREATE TRIGGER trigger_update_session_document_count
AFTER INSERT OR UPDATE OR DELETE ON files
FOR EACH ROW
EXECUTE FUNCTION update_session_document_count();

-- Create function to check max files per session
CREATE OR REPLACE FUNCTION check_max_files_per_session()
RETURNS TRIGGER AS $$
DECLARE
  file_count integer;
BEGIN
  -- Only check on INSERT
  IF TG_OP = 'INSERT' THEN
    SELECT COUNT(*) INTO file_count
    FROM files
    WHERE session_id = NEW.session_id
      AND deleted_at IS NULL;

    IF file_count >= 5 THEN
      RAISE EXCEPTION 'Maximum 5 files allowed per session';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to check max files before insert
DROP TRIGGER IF EXISTS trigger_check_max_files ON files;
CREATE TRIGGER trigger_check_max_files
BEFORE INSERT ON files
FOR EACH ROW
EXECUTE FUNCTION check_max_files_per_session();

-- Update existing sessions with current document counts
UPDATE sessions s
SET document_count = (
  SELECT COUNT(*)
  FROM files f
  WHERE f.session_id = s.id
    AND f.deleted_at IS NULL
);
