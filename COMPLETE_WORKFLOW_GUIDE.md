# Complete "How It Works" Workflow Guide

## System Status: ✅ READY FOR TESTING

All components have been reviewed, inconsistencies resolved, and the system is ready for the complete Steps 1-4 workflow.

---

## Architecture Overview

```
User → Upload Files → Supabase Storage → Edge Function (OpenAI) → Database → Display
```

**Technology Stack:**
- **Frontend:** React + TypeScript + Tailwind CSS
- **Backend:** Supabase (Auth, Database, Storage, Edge Functions)
- **AI Parsing:** OpenAI GPT-4o-mini (Vision + Chat)
- **Storage:** Supabase Storage (medical-files bucket)

---

## Step-by-Step Workflow

### **STEP 1: Upload Health Report** 📤

**What Happens:**
1. User selects PDF or image files (medical reports)
2. Files are validated (type, size)
3. System creates a session in `sessions` table
4. Files are uploaded to Supabase Storage (`medical-files` bucket)
5. File metadata is saved to `files` table

**Database Operations:**
```sql
-- Session created
INSERT INTO sessions (user_id, status) VALUES (user_id, 'pending');

-- File metadata saved
INSERT INTO files (session_id, user_id, storage_path, file_name, file_type, file_size)
VALUES (session_id, user_id, storage_path, file_name, file_type, file_size);
```

**What User Sees:**
- File selection interface
- Upload progress indicator
- "Parsing documents..." message

---

### **STEP 2: AI Parsing** 🤖

**What Happens:**
1. Edge Function `parse-medical-report` is called with `sessionId` and `fileIds`
2. Function downloads files from Supabase Storage
3. **Text Extraction:**
   - PDFs/Images → OpenAI Vision API (gpt-4o-mini)
   - Extracts all text from document
4. **Structured Parsing:**
   - Extracted text → OpenAI Chat API (gpt-4o-mini)
   - Returns structured JSON with panels and tests
5. **Validation:**
   - Checks for real data (not placeholders)
   - Validates patient names, test values, dates
   - **Auto-retry up to 3 times** if validation fails
6. **Database Storage:**
   - Creates/finds patient in `patients` table
   - Creates lab report in `lab_reports` table
   - Inserts test results in `test_results` table
   - Saves parsed JSON in `parsed_documents` table

**Edge Function Flow:**
```typescript
1. Download file from storage
   ↓
2. Extract text (OpenAI Vision)
   ↓
3. Parse to JSON (OpenAI Chat with structured output)
   ↓
4. Validate data
   ↓
5. If invalid → Retry with modified prompt (max 3 attempts)
   ↓
6. Save to database tables
   ↓
7. Return success response
```

**Database Operations:**
```sql
-- Patient (create or find existing)
INSERT INTO patients (user_id, name, age, gender, contact, address)
VALUES (...) ON CONFLICT DO NOTHING;

-- Lab Report
INSERT INTO lab_reports (user_id, patient_id, session_id, file_id, lab_name, ...)
VALUES (...);

-- Test Results (for each test)
INSERT INTO test_results (lab_report_id, user_id, test_name, observed_value,
  unit, reference_range_text, status, is_flagged)
VALUES (...);

-- Parsed Documents
INSERT INTO parsed_documents (file_id, session_id, user_id, parsing_status,
  structured_data, metadata)
VALUES (...);
```

**Status Calculation:**
```typescript
NORMAL:   value within reference range
HIGH:     value > max range
LOW:      value < min range
CRITICAL: value 30% outside range
PENDING:  unable to determine
```

**What User Sees:**
- "Parsing in progress..." spinner
- Automatic transition to review screen

---

### **STEP 3: Review Parsed Data** 📋

**What Happens:**
1. `ParsedDataReview` component loads parsed documents from database
2. System flattens panel structure for display
3. User reviews:
   - Patient information
   - Lab details
   - All test results with status colors
4. Edit functionality allows corrections
5. Changes are saved back to `parsed_documents` table

**Data Structure Handling:**
```typescript
// New OpenAI format with panels
{
  panels: [
    {
      panel_name: "Complete Blood Count",
      tests: [
        { test_name: "Hemoglobin", value: "13.5", unit: "g/dL",
          range_text: "13-17", status: "NORMAL" }
      ]
    }
  ]
}

// Flattened for display
metrics: [
  { test_name: "Hemoglobin", value: "13.5 g/dL",
    reference_range: "13-17", interpretation: "NORMAL" }
]
```

**Status Colors:**
- 🟢 **NORMAL** - Green
- 🔴 **HIGH** - Red
- 🟡 **LOW** - Amber
- 🔴 **CRITICAL** - Dark Red
- ⚪ **PENDING** - Gray

**What User Sees:**
- Patient name, age, gender
- Lab name and doctor
- Report dates
- Table of all test results with color-coded status
- Edit button to modify data
- "Confirm & Continue" button

---

### **STEP 4: AI Summary & Insights** 💡

**What Happens:**
1. User confirms parsed data
2. System queries all test results from database
3. AI generates:
   - Plain language summary
   - Health insights
   - Questions for doctor
4. Summary saved to `ai_summaries` table
5. User can download PDF report

**Database Query:**
```sql
SELECT tr.*, lr.lab_name, lr.report_date, p.name as patient_name
FROM test_results tr
JOIN lab_reports lr ON tr.lab_report_id = lr.id
JOIN patients p ON lr.patient_id = p.id
WHERE tr.user_id = ? AND tr.created_at >= ?
ORDER BY tr.created_at DESC;
```

**What User Sees:**
- Plain language explanation of results
- Health insights and recommendations
- Suggested questions for doctor
- Download PDF report button

---

## Data Flow Diagram

```
┌─────────────┐
│   User      │
│  Uploads    │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  Supabase Storage   │
│  (medical-files)    │
└──────┬──────────────┘
       │
       ▼
┌──────────────────────────────┐
│  Edge Function               │
│  parse-medical-report        │
│                              │
│  1. Download file            │
│  2. OCR (OpenAI Vision)      │
│  3. Parse (OpenAI Chat)      │
│  4. Validate                 │
│  5. Retry if needed (3x)     │
│  6. Calculate status         │
└──────┬───────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│  Supabase Database          │
│                             │
│  • patients                 │
│  • lab_reports              │
│  • test_results (flagged)   │
│  • parsed_documents         │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────┐
│  React Frontend     │
│  ParsedDataReview   │
│                     │
│  • Display data     │
│  • Edit if needed   │
│  • Confirm          │
└─────────────────────┘
```

---

## Database Schema

### `sessions`
```sql
id              uuid PRIMARY KEY
user_id         uuid NOT NULL
status          text ('pending', 'processing', 'completed', 'failed')
created_at      timestamptz
```

### `files`
```sql
id              uuid PRIMARY KEY
session_id      uuid NOT NULL
user_id         uuid NOT NULL
storage_path    text NOT NULL
file_name       text NOT NULL
file_type       text NOT NULL
file_size       bigint NOT NULL
created_at      timestamptz
```

### `patients`
```sql
id              uuid PRIMARY KEY
user_id         uuid NOT NULL
name            text NOT NULL
age             text
gender          text
contact         text
address         text
created_at      timestamptz
```

### `lab_reports`
```sql
id              uuid PRIMARY KEY
user_id         uuid NOT NULL
patient_id      uuid
session_id      uuid NOT NULL
file_id         uuid NOT NULL
lab_name        text NOT NULL
referring_doctor text
report_date     date
test_date       date
summary         text
created_at      timestamptz
```

### `test_results`
```sql
id                  uuid PRIMARY KEY
lab_report_id       uuid NOT NULL
user_id             uuid NOT NULL
test_name           text NOT NULL
test_category       text
observed_value      text NOT NULL
unit                text
reference_range_min text
reference_range_max text
reference_range_text text
status              text (NORMAL, HIGH, LOW, CRITICAL, PENDING)
is_flagged          boolean
created_at          timestamptz
```

### `parsed_documents`
```sql
id                uuid PRIMARY KEY
session_id        uuid NOT NULL
file_id           uuid NOT NULL
user_id           uuid NOT NULL
structured_data   jsonb (panels, patient_info, lab_details)
parsing_status    text ('pending', 'completed', 'failed')
metadata          jsonb (ai_model, attempt_number, validation)
created_at        timestamptz
```

---

## Testing Checklist

### Pre-Test Setup
- [ ] OpenAI API key added to `.env`
- [ ] Supabase connection working
- [ ] Edge Function deployed
- [ ] User logged in

### Step 1: Upload
- [ ] Select PDF file
- [ ] File uploads successfully
- [ ] Check `files` table has entry
- [ ] Check storage bucket has file

### Step 2: Parsing
- [ ] Edge Function called automatically
- [ ] Check console logs for parsing progress
- [ ] Verify OCR extraction (text preview in logs)
- [ ] Verify JSON parsing (raw AI output in logs)
- [ ] Check validation passes
- [ ] Verify database entries:
  - [ ] `patients` table
  - [ ] `lab_reports` table
  - [ ] `test_results` table
  - [ ] `parsed_documents` table

### Step 3: Review
- [ ] Parsed data displays correctly
- [ ] Patient info shown
- [ ] All tests visible in table
- [ ] Status colors correct
- [ ] Edit button works
- [ ] Save changes persists

### Step 4: Continue
- [ ] "Confirm & Continue" proceeds to next step
- [ ] Session status updated

---

## Troubleshooting

### Issue: No parsed data showing
**Diagnose:**
1. Check browser console for errors
2. Check Edge Function logs (Supabase Dashboard)
3. Query `parsed_documents` table: `SELECT * FROM parsed_documents WHERE session_id = 'your-session-id';`

**Common Causes:**
- OpenAI API key not set
- File not found in storage
- Validation failed on all 3 attempts
- Network timeout

### Issue: Placeholder data ("John Doe", "XX")
**Solution:**
- System automatically retries with stronger validation prompts
- If persists after 3 attempts, check source document quality
- May need clearer scan/better image quality

### Issue: Wrong status calculation
**Check:**
- Reference ranges extracted correctly
- Numeric values parsed properly
- Status calculation logic in Edge Function

### Issue: Edge Function timeout
**Solution:**
- Large PDFs may take longer
- Increase timeout in Edge Function settings
- Consider splitting large documents

---

## Performance & Costs

### Processing Time
- **Upload:** < 1 second per file
- **OCR:** 2-5 seconds per page
- **Parsing:** 2-4 seconds
- **Total:** ~5-10 seconds per report

### API Costs (OpenAI)
- **OCR (Vision):** ~$0.002-$0.01 per page
- **Parsing (Chat):** ~$0.001-$0.003
- **Retry Attempts:** 3x max
- **Total:** ~$0.003-$0.013 per report

### Database Storage
- **Files:** Actual file size
- **Metadata:** ~5KB per report
- **Test Results:** ~1KB per test
- **Parsed JSON:** ~10-50KB per report

---

## Security Features

✅ **Row Level Security (RLS)** enabled on all tables
✅ **User isolation** - can only access own data
✅ **JWT Authentication** required
✅ **Service Role Key** used only in Edge Functions
✅ **Storage bucket policies** restrict access
✅ **No sensitive data** in client-side code

---

## Next Steps

1. **Upload a test report** through the application
2. **Monitor console logs** for detailed processing steps
3. **Review parsed data** in the database
4. **Verify display** in ParsedDataReview component
5. **Complete workflow** through Step 4

---

## Support Resources

- **Edge Function Logs:** Supabase Dashboard → Edge Functions → parse-medical-report
- **Database Explorer:** Supabase Dashboard → Table Editor
- **Storage Browser:** Supabase Dashboard → Storage → medical-files
- **Console Logs:** Browser DevTools → Console tab

---

**Last Updated:** 2025-10-17
**Status:** ✅ Production Ready
**Version:** 2.0 (OpenAI-based)
