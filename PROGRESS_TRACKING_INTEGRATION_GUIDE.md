# Progress Tracking Integration Guide

## Visual Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    MEDICAL REPORT PROCESSING                     │
└─────────────────────────────────────────────────────────────────┘

USER UPLOADS 5 PNG FILES
         ↓
    ┌────────┐
    │ File 1 │ → Pending → Uploading → Uploaded → Parsing → ✅ Parsed
    └────────┘              [████████░░] 80%
    
    ┌────────┐
    │ File 2 │ → Pending → Uploading → Uploaded → Parsing → ✅ Parsed
    └────────┘              [██████████] 100%
    
    ┌────────┐
    │ File 3 │ → Pending → Uploading → Uploaded → Parsing → ✅ Parsed
    └────────┘              [██████████] 100%
    
    ┌────────┐
    │ File 4 │ → Pending → Uploading → Uploaded → Parsing → ❌ Failed
    └────────┘              [░░░░░░░░░░] 0%
                                 ↓
                            [Retry] [Skip]
    
    ┌────────┐
    │ File 5 │ → Pending → Uploading → Uploaded → ⏸️ Paused
    └────────┘              [████░░░░░░] 40%
                                 ↓
                            [Resume]

Overall Progress: [███████░░░] 75%
Est. Time: ~1m 30s remaining
```

## Component Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  UploadWorkflow.tsx (Parent)                                 │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  State Management                                      │  │
│  │  • fileProgress: Array<FileProgress>                   │  │
│  │  • overallProgress: number (0-100)                     │  │
│  │  • estimatedTimeRemaining: number (seconds)            │  │
│  │  • isPaused: boolean                                   │  │
│  │  • uploadedFileIds: string[]                           │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  FileProcessingProgress (Child Component)              │  │
│  │  Props:                                                 │  │
│  │  • files: fileProgress                                 │  │
│  │  • darkMode: boolean                                   │  │
│  │  • onRetry: (fileId) => void                           │  │
│  │  • onSkip: (fileId) => void                            │  │
│  │  • onPause: () => void                                 │  │
│  │  • onResume: () => void                                │  │
│  │  • isPaused: boolean                                   │  │
│  │  • overallProgress: number                             │  │
│  │  • estimatedTimeRemaining: number                      │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

## State Flow Diagram

```
                    INITIAL STATE
                         │
                         ↓
              User selects 5 files
                         │
                         ↓
              Initialize fileProgress[]
        [pending, pending, pending, pending, pending]
                         │
                         ↓
              ┌──────────────────┐
              │ UPLOAD PHASE     │
              │ (50% of progress)│
              └──────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ↓              ↓              ↓
    File 1: uploading  File 2: pending  File 3: pending
        [█████░░░░░]
          │
          ↓
    File 1: uploaded  File 2: uploading  File 3: pending
        [██████████]      [████░░░░░░]
                                │
                                ↓
                         All files uploaded
                         overallProgress: 50%
                                │
                                ↓
              ┌──────────────────┐
              │ PARSING PHASE    │
              │ (50% of progress)│
              └──────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ↓              ↓              ↓
    File 1: parsing   File 2: parsing  File 3: pending
        [██████░░░░]    [███░░░░░░░]
          │              │
          ↓              ↓
    File 1: ✅ parsed   File 2: ❌ failed  File 3: parsing
        [██████████]     [░░░░░░░░░░]      [█████░░░░░]
          │              │                  │
          │         [Retry] [Skip]          ↓
          │              │            File 3: ✅ parsed
          │              ↓                  │
          │         File 2: parsing         │
          │             [█████░░░░░]        │
          │              │                  │
          └──────────────┴──────────────────┘
                         │
                         ↓
                  ALL COMPLETE
             overallProgress: 100%
                Success: 4/5
                Failed: 0/5
                Skipped: 1/5
```

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     ERROR SCENARIOS                         │
└─────────────────────────────────────────────────────────────┘

1. JSON PARSING ERROR
   ─────────────────
   AI Response: {patient: 'John', age: 35}  (unquoted keys)
        ↓
   JSON.parse() throws error
        ↓
   Catch error → Apply fixes:
        • Replace ' with "
        • Quote unquoted keys
        • Remove trailing commas
        ↓
   Retry JSON.parse()
        ↓
   ✅ Success → Continue
   OR
   ❌ Fail → Mark file as failed, show error

2. STATUS CONSTRAINT VIOLATION
   ────────────────────────────
   AI Response: status: "ELEVATED"
        ↓
   normalizeStatus("ELEVATED")
        ↓
   Check direct match: NO
        ↓
   Check fuzzy match: "ELEVATED" → "HIGH"
        ↓
   Return "HIGH"
        ↓
   ✅ Insert to database succeeds

3. NETWORK ERROR
   ─────────────
   fetch() to edge function fails
        ↓
   Catch error
        ↓
   Check error type:
        • Connection timeout → Retry with backoff
        • 404 → Edge function not deployed
        • 500 → Server error → Show detailed log
        ↓
   Display user-friendly message
        ↓
   Offer retry option

4. PARTIAL SUCCESS
   ───────────────
   5 files: 3 succeed, 2 fail
        ↓
   Show summary:
        "3/5 files processed successfully"
        "2 files failed"
        ↓
   For each failed file:
        • Show error message
        • Offer [Retry] button
        • Offer [Skip] button
        ↓
   User can:
        • Retry failed files individually
        • Skip and continue with 3 successful
        • Retry all failed at once
```

## Integration Checklist

### Phase 1: Core Fixes (✅ COMPLETE)
- [✅] Fix JSON parsing with auto-repair
- [✅] Add status normalization function
- [✅] Update parse-medical-report edge function
- [✅] Test with malformed JSON
- [✅] Test with invalid status values

### Phase 2: Progress Tracking Component (✅ COMPLETE)
- [✅] Create FileProcessingProgress.tsx
- [✅] Add file status tracking
- [✅] Add progress bars
- [✅] Add time estimation
- [✅] Add pause/resume buttons
- [✅] Add retry/skip buttons
- [✅] Add success/error details
- [✅] Build and verify

### Phase 3: Integration (📋 READY FOR IMPLEMENTATION)
- [ ] Add state to UploadWorkflow
- [ ] Update handleUploadFiles with progress tracking
- [ ] Add handleParseFilesWithProgress function
- [ ] Add handleRetryFile function
- [ ] Add handleSkipFile function
- [ ] Render FileProcessingProgress component
- [ ] Test complete workflow with 5 files
- [ ] Test retry functionality
- [ ] Test skip functionality
- [ ] Test pause/resume functionality

### Phase 4: Testing (📋 PENDING)
- [ ] Test with 1 file (success)
- [ ] Test with 5 files (all success)
- [ ] Test with 5 files (partial failure)
- [ ] Test with invalid JSON response
- [ ] Test with invalid status values
- [ ] Test pause during upload
- [ ] Test pause during parsing
- [ ] Test resume after pause
- [ ] Test retry failed file
- [ ] Test skip failed file
- [ ] Test with slow network
- [ ] Test with network interruption

---

## Code Snippets for Integration

### 1. Initialize Progress on File Selection
```typescript
// In handleStep1Next()
const initialProgress = files.map((file, index) => ({
  fileId: `temp-${index}`,
  fileName: file.name,
  status: 'pending' as const,
  stage: 'Waiting...',
  progress: 0,
}));
setFileProgress(initialProgress);
```

### 2. Update Progress During Upload
```typescript
// During file upload loop
for (let i = 0; i < files.length; i++) {
  const tempId = `temp-${i}`;
  
  // Start uploading
  updateFileProgress(tempId, {
    status: 'uploading',
    stage: 'Uploading file...',
    progress: 0,
  });
  
  // Upload to storage...
  
  // Complete
  updateFileProgress(tempId, {
    fileId: actualFileId,
    status: 'uploaded',
    stage: 'Upload complete',
    progress: 100,
  });
  
  // Update overall
  setOverallProgress((i + 1) / files.length * 50);
}
```

### 3. Parse with Progress Tracking
```typescript
const handleParseFilesWithProgress = async (
  sessionId: string,
  fileIds: string[],
  startTime: number
) => {
  const { data: { session } } = await supabase.auth.getSession();
  
  for (let i = 0; i < fileIds.length; i++) {
    if (isPaused) {
      // Wait for resume
      await waitForResume();
    }
    
    const fileId = fileIds[i];
    
    try {
      // Update status to parsing
      updateFileProgress(fileId, {
        status: 'parsing',
        stage: 'Analyzing with AI...',
        progress: 10,
      });
      
      // Call edge function
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: { ... },
        body: JSON.stringify({
          sessionId,
          fileIds: [fileId], // Parse one at a time for progress
          forceReparse: false,
        }),
      });
      
      // Update progress
      updateFileProgress(fileId, {
        progress: 50,
        stage: 'Extracting data...',
      });
      
      const result = await response.json();
      
      if (result.errors && result.errors.length > 0) {
        throw new Error(result.errors[0].reason);
      }
      
      // Success!
      const fileResult = result.results[0];
      updateFileProgress(fileId, {
        status: 'parsed',
        stage: 'Completed',
        progress: 100,
        details: {
          testCount: fileResult.testCount,
          patient: fileResult.patient,
          lab: fileResult.labReport,
        },
      });
      
      // Update overall progress
      const parseProgress = 50 + ((i + 1) / fileIds.length * 50);
      setOverallProgress(parseProgress);
      
      // Update time estimate
      const elapsed = (Date.now() - startTime) / 1000;
      const avg = elapsed / (i + 1);
      const remaining = fileIds.length - (i + 1);
      setEstimatedTimeRemaining(Math.round(avg * remaining));
      
    } catch (error: any) {
      // Handle error
      updateFileProgress(fileId, {
        status: 'failed',
        stage: 'Parse failed',
        progress: 0,
        error: error.message,
      });
    }
  }
  
  setParsingInProgress(false);
  setShowParsedDataReview(true);
};
```

### 4. Retry Failed File
```typescript
const handleRetryFile = async (fileId: string) => {
  // Reset file status
  updateFileProgress(fileId, {
    status: 'parsing',
    stage: 'Retrying...',
    progress: 0,
    error: undefined,
  });
  
  try {
    // Call edge function for single file
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: { ... },
      body: JSON.stringify({
        sessionId,
        fileIds: [fileId],
        forceReparse: true, // Force reparse
      }),
    });
    
    const result = await response.json();
    
    // Update with success
    updateFileProgress(fileId, {
      status: 'parsed',
      stage: 'Completed',
      progress: 100,
      details: { ... },
    });
    
  } catch (error: any) {
    // Update with error
    updateFileProgress(fileId, {
      status: 'failed',
      stage: 'Retry failed',
      error: error.message,
    });
  }
};
```

### 5. Skip Failed File
```typescript
const handleSkipFile = (fileId: string) => {
  updateFileProgress(fileId, {
    status: 'skipped',
    stage: 'Skipped by user',
    progress: 0,
  });
  
  // Recalculate overall progress
  const completed = fileProgress.filter(f => 
    f.status === 'parsed' || f.status === 'skipped'
  ).length;
  setOverallProgress((completed / fileProgress.length) * 100);
};
```

### 6. Render Progress Component
```tsx
{parsingInProgress && fileProgress.length > 0 && (
  <div className="mb-6">
    <FileProcessingProgress
      files={fileProgress}
      darkMode={darkMode}
      onRetry={handleRetryFile}
      onSkip={handleSkipFile}
      onPause={() => setIsPaused(true)}
      onResume={() => setIsPaused(false)}
      isPaused={isPaused}
      overallProgress={overallProgress}
      estimatedTimeRemaining={estimatedTimeRemaining}
    />
  </div>
)}
```

---

## Testing Commands

```bash
# Build project
npm run build

# Check for TypeScript errors
npm run typecheck

# Start dev server (if needed)
npm run dev
```

---

## Summary

**Status**: ✅ Core fixes complete, UI component ready
**Next**: Integrate progress component into UploadWorkflow
**Estimated Integration Time**: 30-45 minutes
**Testing Time**: 15-30 minutes

**All critical errors (JSON parsing, status validation) are fixed and deployed.**
**Progress tracking UI is built and ready for integration.**
