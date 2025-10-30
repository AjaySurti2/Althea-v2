# Diagnostic Guide: Empty Parsed Data Fields

## Issue
The ParsedDataReview screen shows empty fields for:
- Profile Name
- Report Date
- Lab / Doctor Name

## Possible Causes

### 1. Data Not Extracted
The PDF text extraction succeeded, but the AI parsing failed to identify medical report data.

### 2. Data Structure Mismatch
The data exists but is stored in a different structure than the UI expects.

### 3. Validation Failed
The extracted data failed validation checks (e.g., placeholder names like "John Doe").

## Diagnostic Steps

### Step 1: Check Browser Console
Open your browser's Developer Tools (F12) and look for console logs that show:
- "Successfully loaded parsed documents: X"
- "Parsed documents query result:"
- Any error messages

### Step 2: Check Database Directly

Run this query in your Supabase SQL Editor to see the raw data:

```sql
-- Get the most recent session and its parsed documents
SELECT
  pd.id,
  pd.file_id,
  pd.parsing_status,
  pd.structured_data,
  pd.metadata,
  pd.created_at,
  f.file_name,
  s.id as session_id
FROM parsed_documents pd
JOIN files f ON f.id = pd.file_id
JOIN sessions s ON s.id = pd.session_id
ORDER BY pd.created_at DESC
LIMIT 5;
```

### Step 3: Check File Processing Status

```sql
-- Check if files were processed successfully
SELECT
  fps.file_id,
  fps.file_name,
  fps.file_type,
  fps.status,
  fps.progress,
  fps.error_message,
  fps.extraction_model,
  fps.processing_duration_ms
FROM file_processing_status fps
ORDER BY fps.created_at DESC
LIMIT 10;
```

### Step 4: Analyze structured_data Field

The `structured_data` JSONB field should contain:

```json
{
  "profile_name": "Patient Name",
  "patient_info": {
    "name": "Patient Name",
    "age": "30",
    "gender": "Male"
  },
  "lab_name": "Lab Name",
  "doctor_name": "Dr. Name",
  "report_date": "2024-01-01",
  "dates": {
    "test_date": "2024-01-01",
    "report_date": "2024-01-01"
  },
  "key_metrics": [
    {
      "test_name": "Hemoglobin",
      "value": "14.5",
      "unit": "g/dL",
      "reference_range": "13-17",
      "interpretation": "NORMAL"
    }
  ],
  "panels": [],
  "summary": ""
}
```

## Common Issues and Solutions

### Issue 1: Empty structured_data
**Symptom**: `structured_data` is `{}` or `null`
**Cause**: AI parsing failed or returned invalid JSON
**Solution**: Check Edge Function logs for parsing errors

### Issue 2: Placeholder Data Rejected
**Symptom**: `structured_data` exists but fields are empty in UI
**Cause**: Validation rejected placeholder values like "John Doe"
**Solution**: Check `metadata.validation.issues` for validation failures

### Issue 3: Wrong Field Names
**Symptom**: Data exists but different field names
**Cause**: Edge Function used different schema version
**Solution**: Update Edge Function or UI to match schema

## Check Edge Function Logs

1. Go to Supabase Dashboard
2. Navigate to Edge Functions
3. Select `parse-medical-report`
4. View Real-time Logs
5. Look for:
   - "Extracted X characters from PDF"
   - "Raw AI Response"
   - Validation errors
   - Any API errors

## Expected Log Output

### Successful Parsing:
```
📄 Extracting text from PDF: r n agarwal.pdf
✅ Extracted 1234 characters from PDF
🤖 Parsing attempt 1 for r n agarwal.pdf
📋 Raw AI Response (attempt 1):
{
  "patient": {...},
  "lab_details": {...},
  "panels": [...]
}
✅ Created patient: R N Agarwal
✅ Created lab report: 12345
✅ Inserted 15 test results
```

### Failed Parsing:
```
❌ PDF text extraction error: Insufficient text extracted (25 chars)
```
or
```
⚠️ Validation failed (attempt 1): ["Invalid or placeholder patient name"]
```

## Next Steps Based on Findings

### If structured_data is completely empty:
1. Check if OPENAI_API_KEY is configured correctly
2. Review Edge Function logs for extraction/parsing errors
3. Verify PDF is not password-protected or corrupted
4. Try converting PDF to image format

### If structured_data contains placeholder values:
1. The PDF might not contain a real medical report
2. The PDF image quality might be too poor
3. Try with a different medical report PDF

### If structured_data has data but UI shows empty:
1. Field names mismatch between Edge Function and UI
2. Re-deploy Edge Function with latest code
3. Check ParsedDataReview component conditional rendering logic

## Manual Testing

You can manually test the extraction by checking what the Edge Function received:

```sql
-- Check what text was cached during extraction
SELECT
  file_name,
  extracted_text,
  extraction_model,
  error_message
FROM file_processing_status
WHERE session_id = 'YOUR_SESSION_ID'
ORDER BY created_at DESC;
```

The `extracted_text` field shows the first 1000 characters that were extracted from your PDF.

## Quick Fix: Re-upload the Document

If the issue persists:
1. Click "Back" to return to upload screen
2. Upload a different medical report (try an image format first)
3. Or convert your PDF to PNG/JPEG and retry
4. Ensure the document contains clear, readable text

## Contact Information

If none of these steps resolve the issue, provide:
1. The output of the SQL queries above (without sensitive patient data)
2. Browser console logs
3. Edge Function logs from Supabase Dashboard
4. Screenshot of the empty review screen

This will help identify whether the issue is with:
- PDF extraction
- AI parsing
- Data validation
- UI rendering
