/*
  # File Processing Status Tracking System

  1. New Tables
    - `file_processing_status`
      - Tracks individual file processing state and progress
      - Enables retry and resume capabilities
      - Stores processing metadata and errors

    - `session_processing_summary`
      - Tracks session-level processing state
      - Provides quick overview of batch processing
      - Enables continuation and retry logic

  2. Security
    - Enable RLS on both tables
    - Users can only access their own processing status
    - Policies for select, insert, update operations

  3. Indexes
    - Optimize queries by session_id and file_id
    - Index on status for filtering
    - Index on timestamps for sorting

  4. Functions
    - Trigger to update session summary when file status changes
    - Helper function to calculate session progress
*/

-- Create processing status enum
DO $$ BEGIN
  CREATE TYPE processing_status AS ENUM (
    'pending',
    'downloading',
    'extracting',
    'parsing',
    'saving',
    'completed',
    'failed',
    'timeout'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Table: file_processing_status
CREATE TABLE IF NOT EXISTS file_processing_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Processing state
  status processing_status NOT NULL DEFAULT 'pending',
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),

  -- Timing information
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  processing_duration_ms INTEGER,

  -- Retry information
  attempt_number INTEGER NOT NULL DEFAULT 1 CHECK (attempt_number > 0),
  max_retry_attempts INTEGER NOT NULL DEFAULT 3,
  is_retryable BOOLEAN NOT NULL DEFAULT true,

  -- Error details
  error_code TEXT,
  error_message TEXT,
  error_details JSONB,

  -- Processing metadata
  file_name TEXT,
  file_type TEXT,
  file_size_bytes BIGINT,

  -- Cached data for retry
  extracted_text TEXT,
  extraction_model TEXT,
  parsing_metadata JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Indexes
  CONSTRAINT unique_file_session UNIQUE (file_id, session_id)
);

-- Table: session_processing_summary
CREATE TABLE IF NOT EXISTS session_processing_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- File counts
  total_files INTEGER NOT NULL DEFAULT 0 CHECK (total_files >= 0),
  pending_files INTEGER NOT NULL DEFAULT 0 CHECK (pending_files >= 0),
  processing_files INTEGER NOT NULL DEFAULT 0 CHECK (processing_files >= 0),
  completed_files INTEGER NOT NULL DEFAULT 0 CHECK (completed_files >= 0),
  failed_files INTEGER NOT NULL DEFAULT 0 CHECK (failed_files >= 0),

  -- Progress tracking
  overall_progress INTEGER NOT NULL DEFAULT 0 CHECK (overall_progress >= 0 AND overall_progress <= 100),

  -- Status tracking
  session_status TEXT NOT NULL DEFAULT 'pending',

  -- Timing information
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  total_processing_time_ms INTEGER,

  -- Timeout handling
  timed_out BOOLEAN NOT NULL DEFAULT false,
  timeout_threshold_ms INTEGER DEFAULT 120000,

  -- Continuation for resume
  continuation_token TEXT,
  can_resume BOOLEAN NOT NULL DEFAULT false,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_file_processing_status_session
  ON file_processing_status(session_id);

CREATE INDEX IF NOT EXISTS idx_file_processing_status_user
  ON file_processing_status(user_id);

CREATE INDEX IF NOT EXISTS idx_file_processing_status_file
  ON file_processing_status(file_id);

CREATE INDEX IF NOT EXISTS idx_file_processing_status_status
  ON file_processing_status(status);

CREATE INDEX IF NOT EXISTS idx_file_processing_status_created
  ON file_processing_status(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_session_processing_summary_session
  ON session_processing_summary(session_id);

CREATE INDEX IF NOT EXISTS idx_session_processing_summary_user
  ON session_processing_summary(user_id);

CREATE INDEX IF NOT EXISTS idx_session_processing_summary_status
  ON session_processing_summary(session_status);

-- Enable Row Level Security
ALTER TABLE file_processing_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_processing_summary ENABLE ROW LEVEL SECURITY;

-- RLS Policies for file_processing_status

-- Users can view their own file processing status
CREATE POLICY "Users can view own file processing status"
  ON file_processing_status
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own file processing status
CREATE POLICY "Users can insert own file processing status"
  ON file_processing_status
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own file processing status
CREATE POLICY "Users can update own file processing status"
  ON file_processing_status
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role can manage all file processing status
CREATE POLICY "Service role can manage all file processing status"
  ON file_processing_status
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for session_processing_summary

-- Users can view their own session processing summary
CREATE POLICY "Users can view own session processing summary"
  ON session_processing_summary
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own session processing summary
CREATE POLICY "Users can insert own session processing summary"
  ON session_processing_summary
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own session processing summary
CREATE POLICY "Users can update own session processing summary"
  ON session_processing_summary
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role can manage all session processing summaries
CREATE POLICY "Service role can manage all session processing summaries"
  ON session_processing_summary
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to update session summary when file status changes
CREATE OR REPLACE FUNCTION update_session_processing_summary()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INTEGER;
  v_pending INTEGER;
  v_processing INTEGER;
  v_completed INTEGER;
  v_failed INTEGER;
  v_progress INTEGER;
  v_session_status TEXT;
BEGIN
  -- Count files by status for this session
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'pending'),
    COUNT(*) FILTER (WHERE status IN ('downloading', 'extracting', 'parsing', 'saving')),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status IN ('failed', 'timeout'))
  INTO
    v_total,
    v_pending,
    v_processing,
    v_completed,
    v_failed
  FROM file_processing_status
  WHERE session_id = NEW.session_id;

  -- Calculate overall progress
  v_progress := CASE
    WHEN v_total = 0 THEN 0
    ELSE ((v_completed + v_failed) * 100 / v_total)
  END;

  -- Determine session status
  v_session_status := CASE
    WHEN v_completed = v_total THEN 'completed'
    WHEN v_failed = v_total THEN 'failed'
    WHEN v_processing > 0 THEN 'processing'
    WHEN v_pending > 0 THEN 'pending'
    ELSE 'completed'
  END;

  -- Update or insert session summary
  INSERT INTO session_processing_summary (
    session_id,
    user_id,
    total_files,
    pending_files,
    processing_files,
    completed_files,
    failed_files,
    overall_progress,
    session_status,
    updated_at
  ) VALUES (
    NEW.session_id,
    NEW.user_id,
    v_total,
    v_pending,
    v_processing,
    v_completed,
    v_failed,
    v_progress,
    v_session_status,
    NOW()
  )
  ON CONFLICT (session_id) DO UPDATE SET
    total_files = v_total,
    pending_files = v_pending,
    processing_files = v_processing,
    completed_files = v_completed,
    failed_files = v_failed,
    overall_progress = v_progress,
    session_status = v_session_status,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- Trigger to automatically update session summary
DROP TRIGGER IF EXISTS trigger_update_session_processing_summary ON file_processing_status;
CREATE TRIGGER trigger_update_session_processing_summary
  AFTER INSERT OR UPDATE ON file_processing_status
  FOR EACH ROW
  EXECUTE FUNCTION update_session_processing_summary();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger for file_processing_status updated_at
DROP TRIGGER IF EXISTS trigger_file_processing_status_updated_at ON file_processing_status;
CREATE TRIGGER trigger_file_processing_status_updated_at
  BEFORE UPDATE ON file_processing_status
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for session_processing_summary updated_at
DROP TRIGGER IF EXISTS trigger_session_processing_summary_updated_at ON session_processing_summary;
CREATE TRIGGER trigger_session_processing_summary_updated_at
  BEFORE UPDATE ON session_processing_summary
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Helper function to get processing progress for a session
CREATE OR REPLACE FUNCTION get_session_processing_progress(p_session_id UUID)
RETURNS TABLE (
  session_id UUID,
  total_files INTEGER,
  completed_files INTEGER,
  failed_files INTEGER,
  processing_files INTEGER,
  overall_progress INTEGER,
  session_status TEXT,
  files JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sps.session_id,
    sps.total_files,
    sps.completed_files,
    sps.failed_files,
    sps.processing_files,
    sps.overall_progress,
    sps.session_status,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'fileId', fps.file_id,
          'fileName', fps.file_name,
          'fileType', fps.file_type,
          'status', fps.status,
          'progress', fps.progress,
          'error', fps.error_message,
          'processingTime', fps.processing_duration_ms,
          'attemptNumber', fps.attempt_number
        )
        ORDER BY fps.created_at
      )
      FROM file_processing_status fps
      WHERE fps.session_id = p_session_id
    ) as files
  FROM session_processing_summary sps
  WHERE sps.session_id = p_session_id;
END;
$$;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION update_session_processing_summary() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_updated_at_column() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_session_processing_progress(UUID) TO authenticated, service_role;