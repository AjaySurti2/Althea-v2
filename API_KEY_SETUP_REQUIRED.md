# ⚠️ API Key Setup Required for Real Data Parsing

## Issue Identified

The system is showing **dummy/mock data** instead of real parsed medical data because the **Anthropic API key is not configured**.

### What's Happening:

1. When you upload a document (e.g., Mrs. Champaben's report)
2. The `parse-documents` edge function attempts to parse it
3. It checks for `ANTHROPIC_API_KEY` environment variable
4. **Key is missing** → Falls back to generating mock data:
   - Profile Name: "Sample Patient"
   - Lab: "Medical Laboratory"
   - Doctor: "Dr. Physician"
   - Generic test results (Hemoglobin, WBC, Glucose)

### Root Cause:

**File: `supabase/functions/parse-documents/index.ts` (lines 206-210)**
```typescript
if (!anthropicApiKey) {
    console.log("ANTHROPIC_API_KEY not available, using mock data");
    return generateMockData(fileName);
}
```

## ✅ Solution: Add Anthropic API Key

### Step 1: Get Your Anthropic API Key

1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (starts with `sk-ant-api...`)

### Step 2: Configure the API Key in Supabase

Since this is a **Supabase Edge Function**, you need to set the secret in Supabase, not just the local `.env` file.

#### Option A: Via Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Edge Functions**
3. Find **Secrets** section
4. Add new secret:
   - Name: `ANTHROPIC_API_KEY`
   - Value: Your Anthropic API key

#### Option B: Via Supabase CLI (if you have it installed)
```bash
supabase secrets set ANTHROPIC_API_KEY=your_actual_api_key_here
```

### Step 3: Verify the Setup

After adding the API key:

1. **Redeploy the edge function** (if needed):
   ```bash
   # The edge function should automatically pick up the new secret
   # But you may need to redeploy it
   ```

2. **Test with a new upload**:
   - Upload a medical document
   - The edge function should now extract REAL data
   - You should see Mrs. Champaben's actual information instead of "Sample Patient"

### Step 4: Clear Old Dummy Data (Optional)

If you want to clean up the dummy data from previous tests:

```sql
-- Delete all parsed documents with dummy data
DELETE FROM parsed_documents
WHERE structured_data->>'profile_name' = 'Sample Patient';

-- Or delete all data for a fresh start
DELETE FROM parsed_documents;
DELETE FROM files;
DELETE FROM sessions;
```

## Expected Behavior After Fix:

Once the API key is configured, uploading Mrs. Champaben's report will extract:

- ✅ **Patient**: Mrs. CHAMPABEN TAILOR, 82.10 Years, Female
- ✅ **Lab**: Metropolis Healthcare Ltd
- ✅ **Doctor**: Dr. NEEL PATEL
- ✅ **16 Real Test Results** with actual values
- ✅ **7 Abnormal Findings** properly identified
- ✅ **Clinical Summary** and recommendations

## How to Test:

1. Add the ANTHROPIC_API_KEY to Supabase secrets
2. Upload a new medical document
3. The system should now parse REAL data instead of dummy data
4. Check the "Parsed Data Review" screen - it should show actual extracted information

## Cost Note:

- Anthropic Claude API is a **paid service**
- Haiku model (used in this app) is cost-effective (~$0.25 per 1M input tokens)
- Each medical report parsing costs approximately $0.001-0.003
- Monitor your usage at https://console.anthropic.com/

## Questions?

If you're still seeing dummy data after adding the API key:
1. Check Supabase Edge Function logs for errors
2. Verify the secret is properly set in Supabase
3. Try redeploying the edge function
4. Check that the function has permissions to access the secret

---

**Current Status**: ❌ ANTHROPIC_API_KEY not configured
**Action Required**: Add API key to Supabase secrets for real AI-powered parsing
