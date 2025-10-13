# Quick Start Guide - Althea Health Interpreter
## Getting Started with Full Implementation

This guide provides immediate next steps to begin implementing the full system.

---

## Prerequisites

Before starting, ensure you have:

- ✅ Supabase project set up (already done)
- ✅ Database schema deployed (already done)
- ✅ Authentication working (already done)
- ✅ Frontend workflow UI complete (already done)
- ⬜ OpenAI API account
- ⬜ OpenAI API key
- ⬜ Supabase CLI installed

---

## Step 1: OpenAI Setup (10 minutes)

### 1.1 Create OpenAI Account

1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up or log in
3. Navigate to **API Keys** section
4. Click **Create new secret key**
5. Copy the key (starts with `sk-`)
6. Save it securely (you'll need it in Step 2)

### 1.2 Set Usage Limits

1. Go to **Billing** → **Usage limits**
2. Set a monthly limit (recommended: $50 for testing)
3. Add payment method
4. Enable email alerts at 50% and 90% usage

---

## Step 2: Database Enhancements (15 minutes)

### 2.1 Create Migration Files

Run these commands in your terminal:

```bash
cd /tmp/cc-agent/58526634/project

# Create migration files
supabase migration new add_ocr_metadata
supabase migration new add_session_validation
supabase migration new add_ai_tracking
```

### 2.2 Add Migration Content

**File: `supabase/migrations/[timestamp]_add_ocr_metadata.sql`**

```sql
-- Add OCR metadata columns to files table
ALTER TABLE files ADD COLUMN IF NOT EXISTS
  extracted_metadata jsonb DEFAULT '{}';

ALTER TABLE files ADD COLUMN IF NOT EXISTS
  ocr_confidence decimal(5,2);

ALTER TABLE files ADD COLUMN IF NOT EXISTS
  processing_status text DEFAULT 'pending'
  CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed'));

ALTER TABLE files ADD COLUMN IF NOT EXISTS
  error_message text;
```

**File: `supabase/migrations/[timestamp]_add_session_validation.sql`**

```sql
-- Add validation fields to sessions
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS
  profile_name text;

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS
  report_date date;

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS
  lab_name text;

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS
  validation_status text DEFAULT 'pending'
  CHECK (validation_status IN ('pending', 'validated', 'skipped'));

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS
  key_metrics jsonb DEFAULT '[]';
```

**File: `supabase/migrations/[timestamp]_add_ai_tracking.sql`**

```sql
-- Add AI tracking to ai_summaries
ALTER TABLE ai_summaries ADD COLUMN IF NOT EXISTS
  model_used text DEFAULT 'gpt-4';

ALTER TABLE ai_summaries ADD COLUMN IF NOT EXISTS
  prompt_tokens integer;

ALTER TABLE ai_summaries ADD COLUMN IF NOT EXISTS
  completion_tokens integer;

ALTER TABLE ai_summaries ADD COLUMN IF NOT EXISTS
  processing_time_ms integer;

ALTER TABLE ai_summaries ADD COLUMN IF NOT EXISTS
  raw_response jsonb;
```

### 2.3 Apply Migrations

```bash
# Push migrations to database
supabase db push

# Verify changes
supabase db diff
```

---

## Step 3: Create Edge Functions (20 minutes)

### 3.1 Set Up Functions Directory

```bash
# Create Edge Functions
supabase functions new process-document
supabase functions new generate-interpretation
supabase functions new generate-pdf
```

### 3.2 Add Function Code

Copy the code from `TECHNICAL_IMPLEMENTATION_PLAN.md` for each function:

1. **process-document** (Section: STEP 1.2)
2. **generate-interpretation** (Section: STEP 3.1)
3. **generate-pdf** (Section: STEP 4.1)

### 3.3 Deploy Functions

```bash
# Deploy all functions
supabase functions deploy process-document
supabase functions deploy generate-interpretation
supabase functions deploy generate-pdf

# Set OpenAI API key
supabase secrets set OPENAI_API_KEY=sk-your-key-here
```

---

## Step 4: Test Edge Functions (15 minutes)

### 4.1 Test process-document

```bash
# Test locally first
supabase functions serve process-document

# In another terminal, test the function
curl -i --location --request POST 'http://localhost:54321/functions/v1/process-document' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "fileId": "test-file-id",
    "storagePath": "test-path",
    "fileType": "text/plain"
  }'
```

### 4.2 Test generate-interpretation

```bash
# Test OpenAI integration
curl -i --location --request POST 'http://localhost:54321/functions/v1/generate-interpretation' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "sessionId": "existing-session-id"
  }'
```

### 4.3 Monitor Logs

```bash
# Watch function logs
supabase functions logs process-document --tail
supabase functions logs generate-interpretation --tail
```

---

## Step 5: Update Frontend (30 minutes)

### 5.1 Install Dependencies

```bash
npm install
```

### 5.2 Update UploadWorkflow.tsx

The current `UploadWorkflow.tsx` needs these enhancements:

**Add to Step 1 (File Upload):**

```typescript
// After successful file upload, trigger processing
const { data: processResult, error: processError } = await supabase.functions
  .invoke('process-document', {
    body: {
      fileId: fileRecord.id,
      storagePath: fileRecord.storage_path,
      fileType: file.type
    }
  });

if (processError) {
  console.error('Processing failed:', processError);
  // Still allow user to continue
}
```

**Update Step 3 (AI Processing):**

```typescript
const handleStep3Process = async () => {
  setProcessing(true);

  try {
    const { data: aiResult, error: aiError } = await supabase.functions
      .invoke('generate-interpretation', {
        body: { sessionId }
      });

    if (aiError) throw aiError;

    console.log('AI interpretation:', aiResult);
    setCurrentStep(4);

  } catch (error: any) {
    alert(`Processing failed: ${error.message}`);
  } finally {
    setProcessing(false);
  }
};
```

**Update Step 4 (Download):**

```typescript
const handleDownloadReport = async () => {
  setGeneratingPdf(true);

  try {
    const { data: pdfResult, error: pdfError } = await supabase.functions
      .invoke('generate-pdf', {
        body: { sessionId }
      });

    if (pdfError) throw pdfError;

    // Trigger download
    if (pdfResult.downloadUrl) {
      const link = document.createElement('a');
      link.href = pdfResult.downloadUrl;
      link.download = `Althea_Report_${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

  } catch (error: any) {
    alert(`PDF generation failed: ${error.message}`);
  } finally {
    setGeneratingPdf(false);
  }
};
```

---

## Step 6: Test End-to-End (20 minutes)

### 6.1 Run Development Server

```bash
npm run dev
```

### 6.2 Test Complete Flow

1. **Sign in** to the application
2. **Click "Get Started"** or "Choose Files"
3. **Upload a test file** (create a simple text file with medical data)
4. **Verify file processing** (check browser console for logs)
5. **Set preferences** (tone and language level)
6. **Trigger AI processing** (watch for <5 second response)
7. **Generate and download PDF**

### 6.3 Check Database

```bash
# Verify session was created
supabase db sql "SELECT * FROM sessions ORDER BY created_at DESC LIMIT 1;"

# Verify AI summary was saved
supabase db sql "SELECT * FROM ai_summaries ORDER BY created_at DESC LIMIT 1;"

# Check file processing status
supabase db sql "SELECT file_name, processing_status FROM files ORDER BY created_at DESC LIMIT 5;"
```

---

## Step 7: Monitor & Optimize (Ongoing)

### 7.1 Set Up Monitoring

**Monitor OpenAI Usage:**
- Check [platform.openai.com/usage](https://platform.openai.com/usage)
- Set up billing alerts
- Track costs per request

**Monitor Supabase:**
- Database queries in Supabase Dashboard
- Edge Function logs
- Storage usage

### 7.2 Performance Optimization

**If AI processing is slow (>5s):**
- Check OpenAI API status
- Consider using GPT-3.5-turbo for simple reports
- Reduce max_tokens if responses are too long
- Add caching for common interpretations

**If OCR is slow (>10s):**
- Optimize file size limits
- Consider cloud OCR service (Google Vision, Azure)
- Add progress indicators for large files

---

## Troubleshooting

### Common Issues

**1. "OpenAI API key not configured"**
```bash
# Verify secret is set
supabase secrets list

# Re-set if needed
supabase secrets set OPENAI_API_KEY=sk-your-key-here
```

**2. "No text extracted from documents"**
- Check file upload was successful
- Verify file is readable text or has OCR
- Check process-document logs for errors

**3. "PDF generation failed"**
- Ensure session has AI summary
- Check session ID is valid
- Verify storage bucket permissions

**4. CORS errors**
- Verify corsHeaders in Edge Functions
- Check Edge Function deployment
- Test with Postman first

### Debug Commands

```bash
# Check database connection
supabase status

# View real-time logs
supabase functions logs --tail

# Test database query
supabase db sql "SELECT * FROM sessions LIMIT 1;"

# Check storage buckets
supabase storage ls medical-files
```

---

## Cost Estimates

### OpenAI API Costs

**Per Request:**
- Input tokens: ~800 tokens × $0.00003 = $0.024
- Output tokens: ~1500 tokens × $0.00006 = $0.090
- **Total per interpretation: ~$0.11**

**Monthly Costs:**
- 100 users, 2 reports each = 200 requests
- 200 × $0.11 = **$22/month**

- 1000 users, 2 reports each = 2000 requests
- 2000 × $0.11 = **$220/month**

### Supabase Costs

**Free Tier Includes:**
- 500MB database
- 1GB file storage
- 2GB bandwidth
- Edge Functions (generous limits)

**Pro Plan ($25/month) includes:**
- 8GB database
- 100GB storage
- 250GB bandwidth
- More Edge Function invocations

---

## Next Steps

### Week 1 Goals:
- ✅ Set up OpenAI account
- ✅ Apply database migrations
- ✅ Deploy Edge Functions
- ✅ Test basic functionality

### Week 2 Goals:
- ⬜ Enhance error handling
- ⬜ Add loading states
- ⬜ Implement validation UI
- ⬜ Test with real medical documents

### Week 3-4 Goals:
- ⬜ Improve OCR accuracy
- ⬜ Optimize AI prompts
- ⬜ Build PDF template
- ⬜ Add dashboard features

---

## Support Resources

**Documentation:**
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

**Community:**
- Supabase Discord
- OpenAI Developer Forum
- Stack Overflow

**Monitoring:**
- OpenAI Usage Dashboard
- Supabase Project Dashboard
- Browser DevTools Console

---

## Success Checklist

Before moving to production:

- [ ] All Edge Functions deployed and tested
- [ ] Database migrations applied
- [ ] OpenAI API working (<5s response)
- [ ] File upload and processing working
- [ ] PDF generation working
- [ ] Error handling implemented
- [ ] Loading states added
- [ ] Security audit completed
- [ ] Performance optimized
- [ ] Documentation updated
- [ ] User testing completed
- [ ] Monitoring setup
- [ ] Backup strategy in place
- [ ] HIPAA compliance verified

---

## Getting Help

If you encounter issues:

1. Check the troubleshooting section above
2. Review Edge Function logs: `supabase functions logs`
3. Check browser console for frontend errors
4. Verify database state with SQL queries
5. Test Edge Functions with curl/Postman first
6. Review `TECHNICAL_IMPLEMENTATION_PLAN.md` for detailed code

---

*Quick Start Guide Version: 1.0*
*Last Updated: 2025-10-13*
*Estimated Setup Time: 2-3 hours*
