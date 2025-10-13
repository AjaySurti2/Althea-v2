# Document Management System Design
## Althea Health Interpreter - Multi-Step Process with Session-Based Document Tracking

---

## 📋 Executive Summary

This document provides a comprehensive design for implementing a robust document management system that integrates seamlessly with the existing 4-step upload workflow. The system enables session-based document tracking, review pages, dashboard management, and complete CRUD operations for medical documents.

**Key Features:**
- Session-based document grouping (up to 5 documents per session)
- Document review page with preview and management capabilities
- Dashboard "Total Reports" view with all sessions and documents
- Secure file storage with proper naming conventions
- Real-time upload progress tracking
- Comprehensive document management (view, download, delete)

---

## 🏗️ System Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    STEP 1: DOCUMENT UPLOAD                       │
│                                                                  │
│  1. Generate unique session ID                                  │
│  2. User uploads files (max 5)                                  │
│  3. Validate file types and sizes                               │
│  4. Store with naming: user_ID/session_ID/filename              │
│  5. Track upload progress                                       │
│  6. Save metadata to database                                   │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│              DOCUMENT REVIEW PAGE (New Component)                │
│                                                                  │
│  • Display all documents in current session                     │
│  • Show: filename, timestamp, size, type                        │
│  • Preview supported formats                                    │
│  • Delete with confirmation                                     │
│  • Dynamic document count                                       │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│            STEP 2-4: CONTINUE NORMAL WORKFLOW                    │
│                                                                  │
│  Step 2: Customize preferences                                  │
│  Step 3: AI processing                                          │
│  Step 4: Download report                                        │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│          DASHBOARD: TOTAL REPORTS VIEW (Enhanced)                │
│                                                                  │
│  • List all user sessions                                       │
│  • Show session metadata (date, document count, status)         │
│  • Expand to view all documents in session                      │
│  • Download individual documents                                │
│  • Delete documents or entire sessions                          │
│  • Filter and search capabilities                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 💾 Database Schema

### Existing Schema Enhancement

The current `files` table already supports this system. We just need to add a few fields:

```sql
-- Migration: enhance_file_management.sql

-- Add upload progress tracking
ALTER TABLE files ADD COLUMN IF NOT EXISTS
  upload_progress integer DEFAULT 100;

-- Add file preview metadata
ALTER TABLE files ADD COLUMN IF NOT EXISTS
  preview_url text;

-- Add display order for multiple files
ALTER TABLE files ADD COLUMN IF NOT EXISTS
  display_order integer DEFAULT 0;

-- Add soft delete support
ALTER TABLE files ADD COLUMN IF NOT EXISTS
  deleted_at timestamptz;

-- Update sessions table for document count
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
  IF TG_OP = 'INSERT' THEN
    UPDATE sessions
    SET document_count = document_count + 1
    WHERE id = NEW.session_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.deleted_at IS NOT NULL) THEN
    UPDATE sessions
    SET document_count = document_count - 1
    WHERE id = COALESCE(NEW.session_id, OLD.session_id);
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

-- Add constraint for max 5 files per session
CREATE OR REPLACE FUNCTION check_max_files_per_session()
RETURNS TRIGGER AS $$
DECLARE
  file_count integer;
BEGIN
  SELECT COUNT(*) INTO file_count
  FROM files
  WHERE session_id = NEW.session_id
    AND deleted_at IS NULL;

  IF file_count >= 5 THEN
    RAISE EXCEPTION 'Maximum 5 files allowed per session';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_max_files ON files;
CREATE TRIGGER trigger_check_max_files
BEFORE INSERT ON files
FOR EACH ROW
EXECUTE FUNCTION check_max_files_per_session();
```

### Data Model

```typescript
// Enhanced File interface
interface FileRecord {
  id: string;
  session_id: string;
  user_id: string;
  storage_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
  upload_progress: number;
  preview_url?: string;
  display_order: number;
  extracted_text?: string;
  validation_status: 'pending' | 'validated' | 'rejected';
  processing_status?: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  deleted_at?: string;
}

// Enhanced Session interface
interface SessionRecord {
  id: string;
  user_id: string;
  document_count: number;
  tone: string;
  language_level: string;
  status: string;
  profile_name?: string;
  report_date?: string;
  created_at: string;
  updated_at: string;
}
```

---

## 🎨 User Interface Components

### 1. Enhanced Upload Step (Step 1)

**File: `src/components/UploadWorkflow.tsx` - Step 1 Enhancement**

```typescript
// Enhanced file upload with validation and progress tracking

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/jpg',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

interface FileWithProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  error?: string;
  fileRecord?: any;
}

const [filesWithProgress, setFilesWithProgress] = useState<FileWithProgress[]>([]);
const [sessionId, setSessionId] = useState<string | null>(null);

const validateFile = (file: File): string | null => {
  // Check file count
  if (filesWithProgress.length >= MAX_FILES) {
    return `Maximum ${MAX_FILES} files allowed per session`;
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`;
  }

  // Check file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'File type not supported. Please upload PDF, JPG, PNG, TXT, or DOCX files.';
  }

  // Check duplicate names
  if (filesWithProgress.some(f => f.file.name === file.name)) {
    return 'A file with this name already exists in this session';
  }

  return null;
};

const handleFileSelection = (selectedFiles: FileList | null) => {
  if (!selectedFiles) return;

  const validFiles: FileWithProgress[] = [];
  const errors: string[] = [];

  Array.from(selectedFiles).forEach(file => {
    const error = validateFile(file);
    if (error) {
      errors.push(`${file.name}: ${error}`);
    } else {
      validFiles.push({
        file,
        progress: 0,
        status: 'pending'
      });
    }
  });

  if (errors.length > 0) {
    alert(`Some files were not added:\n${errors.join('\n')}`);
  }

  if (validFiles.length > 0) {
    setFilesWithProgress(prev => [...prev, ...validFiles]);
  }
};

const createSession = async () => {
  if (!user) return null;

  try {
    const { data: session, error } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        tone,
        language_level: languageLevel,
        status: 'pending',
        document_count: 0
      })
      .select()
      .single();

    if (error) throw error;
    return session.id;
  } catch (error: any) {
    console.error('Session creation failed:', error);
    throw error;
  }
};

const uploadFileWithProgress = async (
  fileWithProgress: FileWithProgress,
  sessionId: string,
  index: number
) => {
  const { file } = fileWithProgress;

  try {
    // Update status to uploading
    updateFileStatus(index, { status: 'uploading', progress: 0 });

    // Generate storage path
    const filePath = `${user.id}/${sessionId}/${file.name}`;

    // Upload to Supabase Storage with progress tracking
    const { error: uploadError } = await supabase.storage
      .from('medical-files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        onUploadProgress: (progress) => {
          const percent = Math.round((progress.loaded / progress.total) * 100);
          updateFileStatus(index, { progress: percent });
        }
      });

    if (uploadError) throw uploadError;

    // Create file record in database
    const { data: fileRecord, error: dbError } = await supabase
      .from('files')
      .insert({
        session_id: sessionId,
        user_id: user.id,
        storage_path: filePath,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        display_order: index,
        upload_progress: 100,
        validation_status: 'pending'
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // Update status to complete
    updateFileStatus(index, {
      status: 'complete',
      progress: 100,
      fileRecord
    });

  } catch (error: any) {
    console.error('Upload failed:', error);
    updateFileStatus(index, {
      status: 'error',
      error: error.message
    });
  }
};

const updateFileStatus = (
  index: number,
  updates: Partial<FileWithProgress>
) => {
  setFilesWithProgress(prev =>
    prev.map((f, i) => (i === index ? { ...f, ...updates } : f))
  );
};

const handleUploadAll = async () => {
  if (!user || filesWithProgress.length === 0) return;

  setProcessing(true);

  try {
    // Create session first
    const newSessionId = await createSession();
    if (!newSessionId) throw new Error('Failed to create session');

    setSessionId(newSessionId);

    // Upload all files with progress tracking
    await Promise.all(
      filesWithProgress.map((fileWithProgress, index) =>
        uploadFileWithProgress(fileWithProgress, newSessionId, index)
      )
    );

    // Check if all uploads succeeded
    const allSuccess = filesWithProgress.every(f => f.status === 'complete');

    if (allSuccess) {
      // Move to document review page
      setCurrentStep(1.5); // New intermediate step for review
    } else {
      alert('Some files failed to upload. Please retry or remove failed files.');
    }

  } catch (error: any) {
    alert(`Upload process failed: ${error.message}`);
  } finally {
    setProcessing(false);
  }
};

const handleRemoveFile = (index: number) => {
  const fileToRemove = filesWithProgress[index];

  if (fileToRemove.status === 'uploading') {
    alert('Cannot remove file while uploading. Please wait for upload to complete.');
    return;
  }

  setFilesWithProgress(prev => prev.filter((_, i) => i !== index));
};
```

**UI Component for File List with Progress:**

```tsx
<div className="space-y-3">
  <div className="flex items-center justify-between mb-2">
    <h3 className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
      Selected Files ({filesWithProgress.length}/{MAX_FILES})
    </h3>
    {filesWithProgress.length > 0 && (
      <button
        onClick={handleUploadAll}
        disabled={processing || filesWithProgress.some(f => f.status === 'uploading')}
        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
      >
        {processing ? 'Uploading...' : 'Upload All'}
      </button>
    )}
  </div>

  {filesWithProgress.map((fileWithProgress, index) => (
    <div
      key={index}
      className={`p-4 rounded-lg border ${
        darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <FileText className={`w-5 h-5 mt-1 ${
            fileWithProgress.status === 'complete' ? 'text-green-500' :
            fileWithProgress.status === 'error' ? 'text-red-500' :
            fileWithProgress.status === 'uploading' ? 'text-blue-500' :
            'text-gray-400'
          }`} />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium truncate ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {fileWithProgress.file.name}
            </p>
            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {(fileWithProgress.file.size / 1024 / 1024).toFixed(2)} MB •{' '}
              {fileWithProgress.file.type.split('/')[1].toUpperCase()}
            </p>

            {/* Progress Bar */}
            {fileWithProgress.status === 'uploading' && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                    Uploading...
                  </span>
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                    {fileWithProgress.progress}%
                  </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${fileWithProgress.progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Status Messages */}
            {fileWithProgress.status === 'complete' && (
              <p className="text-xs text-green-600 mt-1 flex items-center">
                <CheckCircle className="w-3 h-3 mr-1" /> Upload complete
              </p>
            )}

            {fileWithProgress.status === 'error' && (
              <p className="text-xs text-red-600 mt-1">
                Error: {fileWithProgress.error}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={() => handleRemoveFile(index)}
          disabled={fileWithProgress.status === 'uploading'}
          className={`ml-2 p-1 rounded hover:bg-red-500/20 text-red-500 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  ))}
</div>
```

---

### 2. Document Review Page (New Component)

**File: `src/components/DocumentReview.tsx`**

```typescript
import React, { useState, useEffect } from 'react';
import { FileText, Download, Trash2, Eye, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DocumentReviewProps {
  sessionId: string;
  darkMode: boolean;
  onContinue: () => void;
  onBack: () => void;
}

export const DocumentReview: React.FC<DocumentReviewProps> = ({
  sessionId,
  darkMode,
  onContinue,
  onBack
}) => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [previewDocument, setPreviewDocument] = useState<any | null>(null);

  useEffect(() => {
    loadDocuments();
  }, [sessionId]);

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('session_id', sessionId)
        .is('deleted_at', null)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (fileId: string) => {
    try {
      const doc = documents.find(d => d.id === fileId);
      if (!doc) return;

      // Soft delete: set deleted_at timestamp
      const { error } = await supabase
        .from('files')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', fileId);

      if (error) throw error;

      // Remove from Supabase Storage
      await supabase.storage
        .from('medical-files')
        .remove([doc.storage_path]);

      // Reload documents
      await loadDocuments();
      setDeleteConfirm(null);

    } catch (error: any) {
      alert(`Failed to delete document: ${error.message}`);
    }
  };

  const handleDownload = async (doc: any) => {
    try {
      const { data, error } = await supabase.storage
        .from('medical-files')
        .createSignedUrl(doc.storage_path, 3600);

      if (error) throw error;

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error: any) {
      alert(`Failed to download: ${error.message}`);
    }
  };

  const handlePreview = async (doc: any) => {
    if (doc.file_type.startsWith('image/') || doc.file_type === 'application/pdf') {
      try {
        const { data, error } = await supabase.storage
          .from('medical-files')
          .createSignedUrl(doc.storage_path, 3600);

        if (error) throw error;

        setPreviewDocument({ ...doc, previewUrl: data.signedUrl });
      } catch (error: any) {
        alert(`Failed to load preview: ${error.message}`);
      }
    } else {
      alert('Preview not available for this file type');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Review Your Documents
        </h2>
        <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
          Review, preview, or remove documents before proceeding
        </p>
      </div>

      {/* Document Count Alert */}
      {documents.length === 0 && (
        <div className={`p-4 rounded-lg flex items-start space-x-3 ${
          darkMode ? 'bg-amber-900/20 border border-amber-800' : 'bg-amber-50 border border-amber-200'
        }`}>
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className={`font-medium ${darkMode ? 'text-amber-400' : 'text-amber-800'}`}>
              No documents uploaded
            </p>
            <p className={`text-sm mt-1 ${darkMode ? 'text-amber-400/80' : 'text-amber-700'}`}>
              Please go back and upload at least one document to continue.
            </p>
          </div>
        </div>
      )}

      {/* Document List */}
      <div className="space-y-3">
        {documents.map((doc, index) => (
          <div
            key={doc.id}
            className={`p-4 rounded-xl border transition-all ${
              darkMode
                ? 'bg-gray-800 border-gray-700 hover:border-gray-600'
                : 'bg-white border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4 flex-1">
                {/* File Icon */}
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  darkMode ? 'bg-green-500/20' : 'bg-green-50'
                }`}>
                  <FileText className="w-6 h-6 text-green-600" />
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <h3 className={`text-lg font-semibold truncate ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {doc.file_name}
                  </h3>

                  <div className={`flex items-center space-x-4 mt-1 text-sm ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    <span>
                      {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                    </span>
                    <span>•</span>
                    <span>
                      {doc.file_type.split('/')[1].toUpperCase()}
                    </span>
                    <span>•</span>
                    <span>
                      {new Date(doc.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Document Number */}
                  <div className={`inline-block mt-2 px-2 py-1 rounded text-xs font-medium ${
                    darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                  }`}>
                    Document {index + 1} of {documents.length}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2 ml-4">
                {/* Preview Button */}
                {(doc.file_type.startsWith('image/') || doc.file_type === 'application/pdf') && (
                  <button
                    onClick={() => handlePreview(doc)}
                    className={`p-2 rounded-lg transition-colors ${
                      darkMode
                        ? 'hover:bg-gray-700 text-gray-400 hover:text-white'
                        : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                    }`}
                    title="Preview"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                )}

                {/* Download Button */}
                <button
                  onClick={() => handleDownload(doc)}
                  className={`p-2 rounded-lg transition-colors ${
                    darkMode
                      ? 'hover:bg-gray-700 text-gray-400 hover:text-white'
                      : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                  }`}
                  title="Download"
                >
                  <Download className="w-5 h-5" />
                </button>

                {/* Delete Button */}
                {deleteConfirm === doc.id ? (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className={`px-3 py-1 text-sm rounded ${
                        darkMode
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(doc.id)}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-500/20 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all ${
            darkMode
              ? 'bg-gray-700 text-white hover:bg-gray-600'
              : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
          }`}
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Upload</span>
        </button>

        <button
          onClick={onContinue}
          disabled={documents.length === 0}
          className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>Continue to Customize</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      {/* Preview Modal */}
      {previewDocument && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewDocument(null)}
        >
          <div
            className="max-w-4xl w-full bg-white dark:bg-gray-800 rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {previewDocument.file_name}
              </h3>
              <button
                onClick={() => setPreviewDocument(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 max-h-[70vh] overflow-auto">
              {previewDocument.file_type.startsWith('image/') ? (
                <img
                  src={previewDocument.previewUrl}
                  alt={previewDocument.file_name}
                  className="w-full h-auto"
                />
              ) : previewDocument.file_type === 'application/pdf' ? (
                <iframe
                  src={previewDocument.previewUrl}
                  className="w-full h-[60vh]"
                  title={previewDocument.file_name}
                />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
```

---

### 3. Dashboard "Total Reports" View

**File: `src/components/TotalReports.tsx`**

```typescript
import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Trash2,
  ChevronDown,
  ChevronRight,
  Calendar,
  Filter,
  Search,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface TotalReportsProps {
  darkMode: boolean;
}

export const TotalReports: React.FC<TotalReportsProps> = ({ darkMode }) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'file' | 'session'; id: string } | null>(null);

  useEffect(() => {
    loadSessions();
  }, [user]);

  const loadSessions = async () => {
    if (!user) return;

    try {
      const { data: sessionsData, error } = await supabase
        .from('sessions')
        .select(`
          *,
          files(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter out soft-deleted files
      const processedSessions = sessionsData?.map(session => ({
        ...session,
        files: session.files.filter((f: any) => !f.deleted_at)
      })) || [];

      setSessions(processedSessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSessionExpansion = (sessionId: string) => {
    setExpandedSessions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  };

  const handleDeleteFile = async (fileId: string, storagePath: string) => {
    try {
      // Soft delete in database
      const { error: dbError } = await supabase
        .from('files')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', fileId);

      if (dbError) throw dbError;

      // Delete from storage
      await supabase.storage
        .from('medical-files')
        .remove([storagePath]);

      // Reload sessions
      await loadSessions();
      setDeleteConfirm(null);
    } catch (error: any) {
      alert(`Failed to delete file: ${error.message}`);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      const session = sessions.find(s => s.id === sessionId);
      if (!session) return;

      // Delete all files in the session
      for (const file of session.files) {
        await supabase.storage
          .from('medical-files')
          .remove([file.storage_path]);
      }

      // Soft delete all file records
      await supabase
        .from('files')
        .update({ deleted_at: new Date().toISOString() })
        .eq('session_id', sessionId);

      // Delete session
      await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId);

      // Reload sessions
      await loadSessions();
      setDeleteConfirm(null);
    } catch (error: any) {
      alert(`Failed to delete session: ${error.message}`);
    }
  };

  const handleDownloadFile = async (storagePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('medical-files')
        .createSignedUrl(storagePath, 3600);

      if (error) throw error;

      if (data?.signedUrl) {
        const link = document.createElement('a');
        link.href = data.signedUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error: any) {
      alert(`Failed to download: ${error.message}`);
    }
  };

  // Filter sessions
  const filteredSessions = sessions.filter(session => {
    // Filter by status
    if (filterStatus !== 'all' && session.status !== filterStatus) {
      return false;
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSession =
        session.profile_name?.toLowerCase().includes(searchLower) ||
        session.lab_name?.toLowerCase().includes(searchLower);

      const matchesFile = session.files.some((file: any) =>
        file.file_name.toLowerCase().includes(searchLower)
      );

      return matchesSession || matchesFile;
    }

    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Total Reports
        </h2>
        <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
          View and manage all your health report sessions
        </p>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
            darkMode ? 'text-gray-400' : 'text-gray-500'
          }`} />
          <input
            type="text"
            placeholder="Search sessions or files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
              darkMode
                ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
            }`}
          />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <Filter className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
            darkMode ? 'text-gray-400' : 'text-gray-500'
          }`} />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={`pl-10 pr-8 py-2 rounded-lg border appearance-none ${
              darkMode
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Sessions List */}
      {filteredSessions.length === 0 ? (
        <div className={`text-center py-12 rounded-xl ${
          darkMode ? 'bg-gray-800' : 'bg-gray-50'
        }`}>
          <FileText className={`w-16 h-16 mx-auto mb-4 ${
            darkMode ? 'text-gray-600' : 'text-gray-400'
          }`} />
          <p className={`text-lg font-medium mb-2 ${
            darkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            {searchTerm || filterStatus !== 'all' ? 'No sessions match your filters' : 'No sessions yet'}
          </p>
          <p className={darkMode ? 'text-gray-500' : 'text-gray-600'}>
            {searchTerm || filterStatus !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Upload your first health report to get started'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSessions.map((session) => (
            <div
              key={session.id}
              className={`rounded-xl border overflow-hidden transition-all ${
                darkMode
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-white border-gray-200'
              }`}
            >
              {/* Session Header */}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => toggleSessionExpansion(session.id)}
                        className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors`}
                      >
                        {expandedSessions.has(session.id) ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </button>

                      <div>
                        <h3 className={`text-lg font-semibold ${
                          darkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {session.profile_name || 'Health Report Session'}
                        </h3>
                        <div className={`flex items-center space-x-3 mt-1 text-sm ${
                          darkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          <span className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {new Date(session.created_at).toLocaleDateString()}
                          </span>
                          <span>•</span>
                          <span>
                            {session.files.length} {session.files.length === 1 ? 'document' : 'documents'}
                          </span>
                          <span>•</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            session.status === 'completed'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : session.status === 'processing'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                              : session.status === 'failed'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {session.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Session Actions */}
                  {deleteConfirm?.type === 'session' && deleteConfirm.id === session.id ? (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleDeleteSession(session.id)}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                      >
                        Confirm Delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className={`px-3 py-1 text-sm rounded ${
                          darkMode
                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm({ type: 'session', id: session.id })}
                      className="p-2 rounded-lg text-red-500 hover:bg-red-500/20 transition-colors"
                      title="Delete entire session"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded Documents */}
              {expandedSessions.has(session.id) && (
                <div className={`border-t px-4 py-3 space-y-2 ${
                  darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
                }`}>
                  {session.files.length === 0 ? (
                    <div className="text-center py-4">
                      <AlertCircle className={`w-8 h-8 mx-auto mb-2 ${
                        darkMode ? 'text-gray-600' : 'text-gray-400'
                      }`} />
                      <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                        No documents in this session
                      </p>
                    </div>
                  ) : (
                    session.files.map((file: any) => (
                      <div
                        key={file.id}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          darkMode ? 'bg-gray-800' : 'bg-white'
                        }`}
                      >
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <FileText className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${
                              darkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                              {file.file_name}
                            </p>
                            <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                              {(file.file_size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          {/* Download Button */}
                          <button
                            onClick={() => handleDownloadFile(file.storage_path, file.file_name)}
                            className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors`}
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {/* Delete Button */}
                          {deleteConfirm?.type === 'file' && deleteConfirm.id === file.id ? (
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => handleDeleteFile(file.id, file.storage_path)}
                                className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className={`px-2 py-1 text-xs rounded ${
                                  darkMode
                                    ? 'bg-gray-700 text-gray-300'
                                    : 'bg-gray-200 text-gray-700'
                                }`}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm({ type: 'file', id: file.id })}
                              className="p-2 rounded text-red-500 hover:bg-red-500/20 transition-colors"
                              title="Delete file"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
          <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Total Sessions
          </p>
          <p className={`text-2xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {sessions.length}
          </p>
        </div>

        <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
          <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Total Documents
          </p>
          <p className={`text-2xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {sessions.reduce((sum, s) => sum + s.files.length, 0)}
          </p>
        </div>

        <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
          <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Completed
          </p>
          <p className={`text-2xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {sessions.filter(s => s.status === 'completed').length}
          </p>
        </div>
      </div>
    </div>
  );
};
```

---

## 🔄 Integration Points

### 1. Update UploadWorkflow.tsx

Add the document review step between Step 1 and Step 2:

```typescript
// In UploadWorkflow.tsx

import { DocumentReview } from './DocumentReview';

// Add new state for review step
const [showReview, setShowReview] = useState(false);

// Modify step navigation
const handleStep1Complete = () => {
  setShowReview(true);
};

const handleReviewContinue = () => {
  setShowReview(false);
  setCurrentStep(2);
};

const handleReviewBack = () => {
  setShowReview(false);
  // Stay on step 1
};

// In the render logic
if (showReview && sessionId) {
  return (
    <DocumentReview
      sessionId={sessionId}
      darkMode={darkMode}
      onContinue={handleReviewContinue}
      onBack={handleReviewBack}
    />
  );
}
```

### 2. Update Dashboard.tsx

Add the Total Reports tab:

```typescript
// In Dashboard.tsx

import { TotalReports } from './TotalReports';

// Update tabs array
const tabs = [
  { id: 'upload' as const, label: 'New Upload', icon: Upload },
  { id: 'reports' as const, label: 'Total Reports', icon: FileText }, // NEW
  { id: 'history' as const, label: 'Health History', icon: TrendingUp },
  { id: 'patterns' as const, label: 'Family Patterns', icon: Users },
  { id: 'reminders' as const, label: 'Reminders', icon: Calendar },
];

// In the content rendering
{activeTab === 'reports' && <TotalReports darkMode={darkMode} />}
```

---

## 🔒 Security Considerations

### File Storage Security

**Storage Path Structure:**
```
medical-files/
  {user_id}/
    {session_id}/
      {filename}
```

**Benefits:**
- Easy user isolation
- Session-based organization
- Simple cleanup operations
- RLS policy enforcement

### RLS Policies

Already implemented in the existing schema:

```sql
-- Users can only access their own files
CREATE POLICY "Users can view own files"
  ON files FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Storage policies
CREATE POLICY "Users can view own medical files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'medical-files' AND (storage.foldername(name))[1] = auth.uid()::text);
```

---

## 📋 Implementation Checklist

### Phase 1: Database Enhancements
- [ ] Apply `enhance_file_management.sql` migration
- [ ] Test trigger functions
- [ ] Verify RLS policies
- [ ] Test max files constraint

### Phase 2: Enhanced Upload (Step 1)
- [ ] Add file validation logic
- [ ] Implement upload progress tracking
- [ ] Create session on first upload
- [ ] Update UI with progress bars
- [ ] Add file removal capability
- [ ] Test with various file types

### Phase 3: Document Review Page
- [ ] Create DocumentReview component
- [ ] Implement document listing
- [ ] Add preview functionality
- [ ] Add download functionality
- [ ] Add delete with confirmation
- [ ] Test soft delete behavior

### Phase 4: Dashboard Integration
- [ ] Create TotalReports component
- [ ] Implement session listing
- [ ] Add expand/collapse functionality
- [ ] Implement search and filters
- [ ] Add document management actions
- [ ] Test with multiple sessions

### Phase 5: Testing
- [ ] Test complete upload workflow
- [ ] Test document review flow
- [ ] Test dashboard document management
- [ ] Test file deletion (soft delete)
- [ ] Test session deletion
- [ ] Test RLS policies
- [ ] Test with max file limits
- [ ] Performance testing

---

## 🎯 Success Criteria

**Functional:**
- ✅ Max 5 documents per session enforced
- ✅ Unique session ID generation
- ✅ File validation working
- ✅ Upload progress visible
- ✅ Document review page functional
- ✅ Dashboard shows all sessions
- ✅ Document download working
- ✅ Document deletion working (soft delete)
- ✅ Proper access control (RLS)

**User Experience:**
- ✅ Clear file upload feedback
- ✅ Easy document management
- ✅ Intuitive navigation
- ✅ Responsive on all devices
- ✅ Fast loading times

**Security:**
- ✅ User data isolation
- ✅ Secure file storage
- ✅ Proper authentication
- ✅ RLS policies enforced

---

## 📊 User Flow Diagram

```
START
  ↓
[User clicks "Get Started"]
  ↓
[Step 1: Upload Documents]
  ├─ Generate session ID
  ├─ Validate files (type, size, count)
  ├─ Upload with progress tracking
  └─ Store metadata in database
  ↓
[Document Review Page] ← NEW
  ├─ Display all uploaded documents
  ├─ Preview option
  ├─ Download option
  ├─ Delete option
  └─ Confirm or go back
  ↓
[Step 2: Customize Preferences]
  ↓
[Step 3: AI Processing]
  ↓
[Step 4: Download Report]
  ↓
[Dashboard: Total Reports View]
  ├─ View all sessions
  ├─ Expand to see documents
  ├─ Download individual files
  └─ Delete files or sessions
  ↓
END
```

---

## 🚀 Next Steps

1. **Apply database migration** for enhancements
2. **Create DocumentReview component**
3. **Create TotalReports component**
4. **Update UploadWorkflow integration**
5. **Update Dashboard integration**
6. **Test complete flow**
7. **Deploy to production**

---

*Document Version: 1.0*
*Last Updated: 2025-10-13*
*Implementation Time: 2-3 days*
*Complexity: Medium*
