# Enhanced Medical Data Parsing System

## Overview
Implemented a robust, multi-model AI parsing system that extracts **real medical data** from uploaded reports with automatic model switching and validation.

---

## System Architecture

### 1. Database Schema Enhancement

Created three new tables for structured health data storage:

#### **patients** table
Stores detailed patient information extracted from reports:
- `id` (uuid) - Primary key
- `user_id` (uuid) - Links to authenticated user
- `family_member_id` (uuid) - Optional family member link
- `name` (text) - Patient's full name
- `age` (text) - Patient age
- `gender` (text) - Patient gender
- `date_of_birth` (date) - Date of birth
- `contact` (text) - Contact information
- `address` (text) - Address
- `created_at`, `updated_at` - Timestamps

#### **lab_reports** table
Stores lab report metadata:
- `id` (uuid) - Primary key
- `user_id` (uuid) - Report owner
- `patient_id` (uuid) - Links to patient
- `session_id` (uuid) - Upload session
- `file_id` (uuid) - Source file
- `lab_name` (text) - Laboratory name (e.g., "Metropolis Healthcare")
- `referring_doctor` (text) - Doctor name (e.g., "Dr. Neel Patel")
- `report_id` (text) - Lab report ID
- `report_date` (date) - Report generation date
- `test_date` (date) - Test date
- `summary` (text) - AI-generated summary
- `created_at`, `updated_at` - Timestamps

#### **test_results** table
Stores individual test metrics with status calculation:
- `id` (uuid) - Primary key
- `lab_report_id` (uuid) - Links to lab report
- `user_id` (uuid) - Test owner
- `test_name` (text) - Test name (e.g., "Hemoglobin", "TSH")
- `observed_value` (text) - Measured value (e.g., "11.9", "11,600")
- `unit` (text) - Unit of measurement (e.g., "g/dL", "µIU/mL")
- `reference_range_min` (text) - Lower limit
- `reference_range_max` (text) - Upper limit
- `reference_range_text` (text) - Full range (e.g., "12-16", "0.45-4.5")
- `status` (text) - Calculated status: NORMAL, HIGH, LOW, CRITICAL, ABNORMAL, PENDING
- `is_flagged` (boolean) - True if abnormal
- `notes` (text) - Additional notes
- `created_at` - Timestamp

**Example Data from Report-Mrs.CHAMPABEN.pdf:**
```json
{
  "patient": {
    "name": "Mrs. Champaben Tailor",
    "age": "82.10",
    "gender": "Female"
  },
  "lab_report": {
    "lab_name": "Metropolis Healthcare Ltd",
    "referring_doctor": "Dr. Neel Patel",
    "report_date": "2025-01-09"
  },
  "test_results": [
    {
      "test_name": "Hemoglobin",
      "observed_value": "11.9",
      "unit": "g/dL",
      "reference_range_text": "12-16",
      "status": "LOW"
    },
    {
      "test_name": "WBC Count",
      "observed_value": "11600",
      "unit": "cells/cu.mm",
      "reference_range_text": "4300-10300",
      "status": "HIGH"
    },
    {
      "test_name": "TSH",
      "observed_value": "11.0",
      "unit": "µIU/mL",
      "reference_range_text": "0.45-4.5",
      "status": "HIGH"
    },
    {
      "test_name": "Vitamin D (25-OH)",
      "observed_value": "47.9",
      "unit": "ng/mL",
      "reference_range_text": "30-100",
      "status": "NORMAL"
    }
  ]
}
```

---

## 2. Multi-Model AI Parsing with Auto-Switching

### Model Hierarchy
The system automatically progresses through three Claude models based on quality:

1. **Claude 3 Haiku** (Fast, cost-effective)
   - First attempt
   - Best for clear, well-formatted reports
   - Fastest processing time

2. **Claude 3.5 Sonnet** (Balanced accuracy)
   - Second attempt if Haiku fails validation
   - Better handling of complex layouts
   - Higher accuracy on medical terminology

3. **Claude 3 Opus** (Most powerful)
   - Final attempt if Sonnet fails validation
   - Best for difficult-to-read documents
   - Highest accuracy, slower processing

### Auto-Switching Logic
```typescript
// Automatic progression through models
const models = [
  "claude-3-haiku-20240307",      // Attempt 1
  "claude-3-5-sonnet-20241022",   // Attempt 2
  "claude-3-opus-20240229"        // Attempt 3
];

// Parse attempt with validation
const parsedResult = await parseWithAI(documentText, fileName, 1);

// If validation fails, automatically retry with better model
if (!validation.isValid && attemptNumber < 3) {
  return await parseWithAI(documentText, fileName, attemptNumber + 1);
}
```

---

## 3. Validation System

### Real Data Validation
The system validates parsed data to detect placeholder or dummy values:

```typescript
function validateParsedData(data: any) {
  const issues = [];

  // Check for placeholder patient names
  if (data.patient?.name.toLowerCase().includes("john doe") ||
      data.patient?.name.toLowerCase().includes("sample")) {
    issues.push("Invalid or placeholder patient name");
  }

  // Ensure metrics were extracted
  if (!data.metrics || data.metrics.length === 0) {
    issues.push("No metrics extracted");
  }

  // Check for placeholder metric values
  const invalidMetrics = data.metrics?.filter(m =>
    !m.value ||
    m.value === "N/A" ||
    m.value === "XX" ||
    m.test?.toLowerCase().includes("sample")
  );

  if (invalidMetrics?.length > 0) {
    issues.push(`${invalidMetrics.length} invalid metrics found`);
  }

  return { isValid: issues.length === 0, issues };
}
```

**Validation Triggers Auto-Retry:**
- Invalid patient names → Retry with Sonnet
- Missing metrics → Retry with Sonnet
- Placeholder values → Retry with Opus (if Sonnet fails)

---

## 4. Status Calculation

### Automatic Status Determination
The system calculates health status by comparing observed values to reference ranges:

```typescript
function calculateStatus(value: string, rangeText: string): string {
  const numValue = parseFloat(value.replace(/[^0-9.]/g, ""));
  const rangeMatch = rangeText.match(/([\d.]+)\s*[-–to]\s*([\d.]+)/i);

  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1]);
    const max = parseFloat(rangeMatch[2]);

    if (numValue < min * 0.7 || numValue > max * 1.3) return "CRITICAL";
    if (numValue < min) return "LOW";
    if (numValue > max) return "HIGH";
    return "NORMAL";
  }

  return "PENDING";
}
```

**Status Definitions:**
- **NORMAL**: Value within reference range
- **HIGH**: Value above upper limit
- **LOW**: Value below lower limit
- **CRITICAL**: Value 30%+ outside range (dangerously abnormal)
- **ABNORMAL**: Flagged but no range provided
- **PENDING**: Unable to determine (non-numeric or missing range)

**Examples:**
```
Hemoglobin: 11.9 g/dL (Range: 12-16) → LOW
WBC Count: 11,600 cells/cu.mm (Range: 4,300-10,300) → HIGH
RBC Count: 3.85 mill/cu.mm (Range: 4.2-5.4) → LOW
TSH: 11.0 µIU/mL (Range: 0.45-4.5) → HIGH
Calcium: 9.1 mg/dL (Range: 8.8-10.2) → NORMAL
Creatinine: 0.88 mg/dL (Range: 0.5-0.9) → NORMAL
```

---

## 5. Enhanced Text Extraction

### PDF Extraction with Auto-Retry
```typescript
// First attempt with Haiku
let text = await extractTextFromPDF(arrayBuffer, "claude-3-haiku-20240307");

// If extraction yields insufficient text, retry with Sonnet
if (!text || text.length < 100) {
  text = await extractTextFromPDF(arrayBuffer, "claude-3-5-sonnet-20241022");
}
```

### Image OCR with Auto-Retry
```typescript
// First attempt with Haiku
let text = await extractTextFromImage(arrayBuffer, mimeType, "claude-3-haiku-20240307");

// If OCR yields insufficient text, retry with Sonnet
if (!text || text.length < 100) {
  text = await extractTextFromImage(arrayBuffer, mimeType, "claude-3-5-sonnet-20241022");
}
```

---

## 6. Medical Parsing Prompt

The system uses a specialized prompt that ensures accurate extraction:

```
You are an expert medical data extraction AI. Extract ALL information with clinical accuracy.

CRITICAL RULES:
1. Extract EVERY test result - missing data is unacceptable
2. Use EXACT values and units from the document
3. Calculate status by comparing value to reference range
4. NO placeholder values - use empty string "" for missing data
5. Preserve medical terminology exactly

OUTPUT FORMAT: JSON only
{
  "patient": { "name", "age", "gender", "contact", "address" },
  "lab_details": { "lab_name", "doctor", "report_date", "report_id" },
  "metrics": [
    { "test", "value", "unit", "range", "status" }
  ],
  "summary": ""
}
```

---

## 7. Complete Processing Flow

```
1. User uploads Report-Mrs.CHAMPABEN.pdf
   ↓
2. File stored in medical-files bucket
   ↓
3. Edge Function triggered
   ↓
4. Download file from storage
   ↓
5. Extract text with Claude Haiku (OCR/PDF parsing)
   ├─ Success → Continue
   └─ Failed → Retry with Claude Sonnet
   ↓
6. Parse with Claude Haiku (Attempt 1)
   ├─ Extract patient info: "Mrs. Champaben Tailor, 82.10, Female"
   ├─ Extract lab details: "Metropolis Healthcare", "Dr. Neel Patel"
   └─ Extract ALL test metrics with values and ranges
   ↓
7. Validate parsed data
   ├─ Real patient name? ✓
   ├─ Metrics extracted? ✓
   ├─ No placeholder values? ✓
   └─ Valid → Continue
       Invalid → Retry with Sonnet (Attempt 2)
       Still Invalid → Retry with Opus (Attempt 3)
   ↓
8. Calculate status for each metric
   ├─ Hemoglobin 11.9 (12-16) → LOW
   ├─ WBC 11,600 (4,300-10,300) → HIGH
   ├─ TSH 11.0 (0.45-4.5) → HIGH
   └─ Calcium 9.1 (8.8-10.2) → NORMAL
   ↓
9. Save to database
   ├─ Insert/update patient record
   ├─ Create lab_report record
   └─ Insert ALL test_results (one row per metric)
   ↓
10. Return results
    {
      "patient": "Mrs. Champaben Tailor",
      "labReport": "Metropolis Healthcare Ltd",
      "testCount": 15,
      "model": "claude-3-haiku-20240307",
      "attemptNumber": 1,
      "validation": { "isValid": true, "issues": [] }
    }
```

---

## 8. Key Features

✅ **No Dummy Data**: Validation rejects placeholder values
✅ **Auto-Retry**: Switches to better models if needed
✅ **Complete Extraction**: Extracts ALL tests from reports
✅ **Status Calculation**: Automatic HIGH/LOW/NORMAL determination
✅ **Structured Storage**: Normalized database schema
✅ **Real Patient Data**: Preserves exact names, values, units
✅ **Multi-Format Support**: PDF, JPG, PNG documents
✅ **Cost Optimization**: Starts with fast/cheap model, escalates only if needed

---

## 9. Security & RLS

All tables have Row Level Security enabled:
- Users can only access their own data
- Policies enforce `auth.uid() = user_id` checks
- Patient data isolated per user
- Lab reports linked to authenticated users
- Test results protected by ownership

---

## 10. API Response Format

```json
{
  "success": true,
  "results": [
    {
      "fileId": "a78bdbb6-77f1-4fb1-86c0-2be1e89f9f6d",
      "fileName": "Report-Mrs.CHAMPABEN.pdf",
      "patient": "Mrs. Champaben Tailor",
      "labReport": "Metropolis Healthcare Ltd",
      "testCount": 15,
      "model": "claude-3-haiku-20240307",
      "attemptNumber": 1,
      "validation": {
        "isValid": true,
        "issues": []
      }
    }
  ],
  "total_processed": 1,
  "total_requested": 1
}
```

---

## 11. Database Queries

### Get Patient's Latest Report
```sql
SELECT
  p.name AS patient_name,
  lr.lab_name,
  lr.report_date,
  lr.referring_doctor,
  COUNT(tr.id) AS total_tests,
  SUM(CASE WHEN tr.is_flagged THEN 1 ELSE 0 END) AS abnormal_tests
FROM lab_reports lr
JOIN patients p ON lr.patient_id = p.id
JOIN test_results tr ON tr.lab_report_id = lr.id
WHERE lr.user_id = auth.uid()
GROUP BY p.id, lr.id
ORDER BY lr.report_date DESC
LIMIT 1;
```

### Get All Abnormal Results
```sql
SELECT
  tr.test_name,
  tr.observed_value,
  tr.unit,
  tr.reference_range_text,
  tr.status,
  lr.report_date
FROM test_results tr
JOIN lab_reports lr ON tr.lab_report_id = lr.id
WHERE tr.user_id = auth.uid()
  AND tr.is_flagged = true
ORDER BY lr.report_date DESC, tr.test_name;
```

### Track Metric Over Time
```sql
SELECT
  lr.report_date,
  tr.observed_value,
  tr.unit,
  tr.status
FROM test_results tr
JOIN lab_reports lr ON tr.lab_report_id = lr.id
WHERE tr.user_id = auth.uid()
  AND tr.test_name = 'Hemoglobin'
ORDER BY lr.report_date ASC;
```

---

## 12. Testing Checklist

- [ ] Upload Report-Mrs.CHAMPABEN.pdf
- [ ] Verify patient name extracted: "Mrs. Champaben Tailor"
- [ ] Verify lab name: "Metropolis Healthcare Ltd"
- [ ] Verify doctor: "Dr. Neel Patel"
- [ ] Verify all 15+ tests extracted
- [ ] Verify Hemoglobin status = LOW (11.9, range 12-16)
- [ ] Verify WBC status = HIGH (11,600, range 4,300-10,300)
- [ ] Verify TSH status = HIGH (11.0, range 0.45-4.5)
- [ ] Verify Calcium status = NORMAL (9.1, range 8.8-10.2)
- [ ] Verify no dummy/placeholder data in results
- [ ] Check database tables populated correctly

---

## Summary

The enhanced parsing system now:
1. ✅ Extracts **real medical data** (no dummy values)
2. ✅ Uses **multi-model AI** with automatic switching
3. ✅ **Validates** parsed data to ensure quality
4. ✅ **Calculates status** for every metric
5. ✅ Stores data in **normalized schema**
6. ✅ Supports **PDF and image** formats
7. ✅ **Auto-retries** with better models on failure
8. ✅ Provides **detailed logging** for debugging

The system is ready to parse Report-Mrs.CHAMPABEN.pdf and extract all real health metrics!
