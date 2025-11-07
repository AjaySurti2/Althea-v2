# Edge Functions Deployment Guide

**Althea Health - Supabase Edge Functions**

Complete guide for deploying and managing the 5 Edge Functions in the Althea Health application.

---

## Overview

The Althea application uses 5 Supabase Edge Functions for document processing and AI-powered health insights:

| Function | Purpose | Dependencies |
|----------|---------|--------------|
| **test-api-key** | Verify OpenAI API key | OpenAI API |
| **parse-documents** | Extract text from uploaded files | OCR libraries |
| **parse-medical-report** | Parse extracted text into structured data | OpenAI GPT-4 |
| **generate-health-insights** | Generate AI health insights | OpenAI GPT-4 |
| **generate-health-report** | Create downloadable PDF reports | Health insights data |

---

## Prerequisites

### 1. OpenAI API Key

All AI functions require an OpenAI API key with GPT-4 access.

**Get your API key:**
1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Copy the key (starts with `sk-...`)

**Set in Supabase:**

```bash
# Using Supabase CLI
supabase secrets set OPENAI_API_KEY=sk-your-api-key-here

# Or via Supabase Dashboard:
# Settings > Edge Functions > Secrets
# Add: OPENAI_API_KEY = sk-...
```

### 2. Supabase CLI

Install Supabase CLI for deployment:

```bash
npm install -g supabase
```

Login to Supabase:

```bash
supabase login
```

Link to your project:

```bash
supabase link --project-ref idyhyrpsltbpdhnmbnje
```

---

## Function Details

### 1. test-api-key

**Purpose**: Verify OpenAI API key is configured and working

**Location**: `supabase/functions/test-api-key/index.ts`

**Dependencies**:
- OpenAI API (npm:openai)

**Environment Variables**:
- `OPENAI_API_KEY` - OpenAI API key

**Usage**:
```typescript
// Frontend call
const response = await fetch(
  `${supabaseUrl}/functions/v1/test-api-key`,
  {
    headers: {
      'Authorization': `Bearer ${supabaseAnonKey}`,
    }
  }
);
const result = await response.json();
// { success: true, model: "gpt-4", message: "API key is valid" }
```

**Deploy**:
```bash
supabase functions deploy test-api-key
```

**Test**:
```bash
curl -X POST \
  'https://idyhyrpsltbpdhnmbnje.supabase.co/functions/v1/test-api-key' \
  -H 'Authorization: Bearer YOUR_ANON_KEY'
```

---

### 2. parse-documents

**Purpose**: Extract text from uploaded medical documents (PDF, images)

**Location**: `supabase/functions/parse-documents/index.ts`

**Dependencies**:
- Tesseract.js (OCR for images)
- PDF parsing libraries

**Input**:
```json
{
  "fileId": "uuid",
  "storagePath": "user_id/session_id/file.pdf",
  "sessionId": "uuid"
}
```

**Output**:
```json
{
  "success": true,
  "extractedText": "Patient Name: John Doe...",
  "metadata": {
    "pageCount": 3,
    "fileType": "pdf"
  }
}
```

**Deploy**:
```bash
supabase functions deploy parse-documents
```

**Frontend Integration**:
```typescript
const { data, error } = await supabase.functions.invoke('parse-documents', {
  body: {
    fileId: fileRecord.id,
    storagePath: fileRecord.storage_path,
    sessionId: session.id
  }
});
```

---

### 3. parse-medical-report

**Purpose**: Parse extracted text into structured medical data using AI

**Location**: `supabase/functions/parse-medical-report/index.ts`

**Dependencies**:
- OpenAI API (GPT-4)

**Environment Variables**:
- `OPENAI_API_KEY` - Required
- `SUPABASE_URL` - Auto-configured
- `SUPABASE_SERVICE_ROLE_KEY` - Auto-configured

**Input**:
```json
{
  "extractedText": "Lab Report\nPatient: John Doe\nHemoglobin: 12.5 g/dL...",
  "fileId": "uuid",
  "sessionId": "uuid"
}
```

**Output**:
```json
{
  "success": true,
  "parsedData": {
    "patientInfo": {
      "name": "John Doe",
      "age": "45",
      "gender": "Male"
    },
    "labReport": {
      "lab_name": "Quest Diagnostics",
      "report_date": "2025-11-01",
      "tests": [
        {
          "test_name": "Hemoglobin",
          "observed_value": "12.5",
          "unit": "g/dL",
          "reference_range_min": "13.5",
          "reference_range_max": "17.5",
          "status": "LOW"
        }
      ]
    }
  }
}
```

**Deploy**:
```bash
supabase functions deploy parse-medical-report
```

**Frontend Integration**:
```typescript
const { data, error } = await supabase.functions.invoke('parse-medical-report', {
  body: {
    extractedText: parsedDoc.raw_content,
    fileId: fileRecord.id,
    sessionId: session.id
  }
});
```

---

### 4. generate-health-insights

**Purpose**: Generate personalized AI health insights using Althea's system prompt

**Location**: `supabase/functions/generate-health-insights/index.ts`

**Dependencies**:
- OpenAI API (GPT-4)
- Althea system prompt (embedded in function)

**Environment Variables**:
- `OPENAI_API_KEY` - Required
- `SUPABASE_URL` - Auto-configured
- `SUPABASE_SERVICE_ROLE_KEY` - Auto-configured

**Input**:
```json
{
  "sessionId": "uuid",
  "parsedDocuments": [
    {
      "structured_data": { /* parsed medical data */ }
    }
  ],
  "userPreferences": {
    "tone": "friendly",
    "language_level": "simple"
  },
  "familyMember": {
    "name": "John Doe",
    "age": 45,
    "gender": "Male",
    "existing_conditions": ["hypertension"]
  }
}
```

**Output**:
```json
{
  "success": true,
  "insights": {
    "greeting": "Hello John!",
    "executive_summary": "Your recent blood work shows...",
    "detailed_findings": [
      {
        "category": "Blood Count",
        "findings": [
          {
            "test_name": "Hemoglobin",
            "plain_language": "Hemoglobin is the protein...",
            "result": "12.5 g/dL (Low)",
            "significance": "This indicates..."
          }
        ]
      }
    ],
    "doctor_questions": [
      "What could be causing my low hemoglobin?",
      "Do I need to take iron supplements?"
    ],
    "next_steps": "Schedule a follow-up..."
  }
}
```

**Deploy**:
```bash
supabase functions deploy generate-health-insights
```

**Frontend Integration**:
```typescript
const { data, error } = await supabase.functions.invoke('generate-health-insights', {
  body: {
    sessionId: session.id,
    parsedDocuments: documents,
    userPreferences: {
      tone: session.tone,
      language_level: session.language_level
    },
    familyMember: familyMemberData
  }
});
```

---

### 5. generate-health-report

**Purpose**: Generate downloadable PDF health reports

**Location**: `supabase/functions/generate-health-report/index.ts`

**Dependencies**:
- PDF generation library (e.g., PDFKit or similar)
- HTML to PDF converter

**Input**:
```json
{
  "insightId": "uuid",
  "reportFormat": "pdf",
  "includeCharts": true
}
```

**Output**:
```json
{
  "success": true,
  "reportId": "uuid",
  "storagePath": "user_id/report_id/health-report.pdf",
  "downloadUrl": "signed URL for download"
}
```

**Deploy**:
```bash
supabase functions deploy generate-health-report
```

**Frontend Integration**:
```typescript
const { data, error } = await supabase.functions.invoke('generate-health-report', {
  body: {
    insightId: healthInsight.id,
    reportFormat: 'pdf',
    includeCharts: true
  }
});

// Download the report
const { data: signedUrl } = await supabase.storage
  .from('health-reports')
  .createSignedUrl(data.storagePath, 3600);
```

---

## Deployment Methods

### Method 1: Deploy All Functions at Once

Create a deployment script:

```bash
#!/bin/bash
# deploy-all-functions.sh

echo "Deploying all Edge Functions..."

supabase functions deploy test-api-key
supabase functions deploy parse-documents
supabase functions deploy parse-medical-report
supabase functions deploy generate-health-insights
supabase functions deploy generate-health-report

echo "All functions deployed!"
```

Run:
```bash
chmod +x deploy-all-functions.sh
./deploy-all-functions.sh
```

### Method 2: Deploy Individual Functions

Deploy specific function:
```bash
supabase functions deploy function-name
```

With import map (if needed):
```bash
supabase functions deploy function-name --import-map supabase/functions/import_map.json
```

### Method 3: Using Supabase Dashboard

1. Go to https://supabase.com/dashboard/project/idyhyrpsltbpdhnmbnje/functions
2. Click "New Function"
3. Name: Enter function name
4. Upload: Select `supabase/functions/[function-name]/index.ts`
5. Click "Deploy"

---

## Testing Edge Functions

### Local Testing

Start local Supabase instance:
```bash
supabase start
```

Serve functions locally:
```bash
supabase functions serve
```

Serve specific function:
```bash
supabase functions serve test-api-key
```

Test with curl:
```bash
curl -X POST \
  'http://localhost:54321/functions/v1/test-api-key' \
  -H 'Authorization: Bearer YOUR_ANON_KEY'
```

### Remote Testing

Test deployed function:
```bash
curl -X POST \
  'https://idyhyrpsltbpdhnmbnje.supabase.co/functions/v1/test-api-key' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json'
```

With body:
```bash
curl -X POST \
  'https://idyhyrpsltbpdhnmbnje.supabase.co/functions/v1/parse-documents' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "fileId": "test-uuid",
    "storagePath": "test/path/file.pdf",
    "sessionId": "test-session-uuid"
  }'
```

---

## Monitoring and Debugging

### View Function Logs

Real-time logs:
```bash
supabase functions logs test-api-key --follow
```

Recent logs:
```bash
supabase functions logs test-api-key
```

All functions logs:
```bash
supabase functions logs
```

### Dashboard Monitoring

1. Go to Functions section in Supabase Dashboard
2. Click on function name
3. View logs, invocations, and errors
4. Monitor performance metrics

### Common Issues

**Issue**: "Function not found"
- **Solution**: Deploy the function first
- **Check**: `supabase functions list`

**Issue**: "OpenAI API key not configured"
- **Solution**: Set the secret: `supabase secrets set OPENAI_API_KEY=sk-...`
- **Verify**: Check Secrets in Dashboard

**Issue**: "CORS error"
- **Solution**: Ensure CORS headers are included in function response
- **Required headers**:
  ```typescript
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
  ```

**Issue**: "Timeout error"
- **Solution**: Edge Functions have 150s timeout (default 60s)
- **Increase**: Use `Deno.serve()` with timeout configuration
- **Optimize**: Break large operations into smaller chunks

---

## Environment Variables and Secrets

### Auto-configured Variables

These are automatically available in Edge Functions:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Public anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (use carefully!)

### Custom Secrets

Set custom secrets:
```bash
# Set secret
supabase secrets set SECRET_NAME=secret_value

# List secrets
supabase secrets list

# Remove secret
supabase secrets unset SECRET_NAME
```

**Required Secrets for Althea:**
```bash
supabase secrets set OPENAI_API_KEY=sk-your-key-here
```

**Optional Secrets:**
```bash
# If using other services
supabase secrets set SENDGRID_API_KEY=your-key
supabase secrets set STRIPE_SECRET_KEY=your-key
```

---

## Performance Optimization

### Function Size

Keep functions small and focused:
- Max recommended size: 10MB
- Split large functions into multiple smaller ones
- Use dynamic imports for heavy dependencies

### Cold Start Optimization

```typescript
// Initialize clients outside handler
const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY')
});

Deno.serve(async (req) => {
  // Handler code uses pre-initialized client
  const response = await openai.chat.completions.create({...});
});
```

### Caching

Implement caching for repeated operations:
```typescript
const cache = new Map();

function getCachedData(key) {
  if (cache.has(key)) {
    return cache.get(key);
  }
  // Fetch and cache
  const data = fetchData(key);
  cache.set(key, data);
  return data;
}
```

---

## Security Best Practices

### 1. Input Validation

Always validate input:
```typescript
if (!sessionId || typeof sessionId !== 'string') {
  return new Response(
    JSON.stringify({ error: 'Invalid sessionId' }),
    { status: 400 }
  );
}
```

### 2. Authentication

Verify user authentication:
```typescript
const authHeader = req.headers.get('Authorization');
if (!authHeader) {
  return new Response('Unauthorized', { status: 401 });
}

const token = authHeader.replace('Bearer ', '');
const { data: { user }, error } = await supabase.auth.getUser(token);

if (error || !user) {
  return new Response('Unauthorized', { status: 401 });
}
```

### 3. Rate Limiting

Implement rate limiting:
```typescript
const rateLimiter = new Map();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userRequests = rateLimiter.get(userId) || [];

  // Filter requests from last minute
  const recentRequests = userRequests.filter(
    (time) => now - time < 60000
  );

  if (recentRequests.length >= 10) {
    return false; // Rate limit exceeded
  }

  recentRequests.push(now);
  rateLimiter.set(userId, recentRequests);
  return true;
}
```

### 4. Error Handling

Never expose sensitive information:
```typescript
try {
  // Operation
} catch (error) {
  console.error('Error details:', error); // Log full error

  return new Response(
    JSON.stringify({ error: 'An error occurred' }), // Generic message
    { status: 500 }
  );
}
```

---

## Troubleshooting Checklist

Before deploying:
- [ ] OpenAI API key is set in Supabase secrets
- [ ] All dependencies are properly imported
- [ ] CORS headers are included in responses
- [ ] Input validation is implemented
- [ ] Error handling is in place
- [ ] Functions are tested locally

After deploying:
- [ ] Function appears in Supabase Dashboard
- [ ] Test with curl or Postman
- [ ] Check function logs for errors
- [ ] Verify database operations work
- [ ] Test with frontend integration

---

## Integration with Frontend

### Complete Workflow Example

```typescript
// Step 1: Upload file
const { data: fileData } = await supabase.storage
  .from('medical-files')
  .upload(`${userId}/${sessionId}/${file.name}`, file);

// Step 2: Create file record
const { data: fileRecord } = await supabase
  .from('files')
  .insert({
    session_id: sessionId,
    storage_path: fileData.path,
    file_name: file.name,
    file_type: file.type,
    file_size: file.size
  })
  .select()
  .single();

// Step 3: Parse document
const { data: parseResult } = await supabase.functions
  .invoke('parse-documents', {
    body: {
      fileId: fileRecord.id,
      storagePath: fileData.path,
      sessionId
    }
  });

// Step 4: Parse medical data
const { data: medicalData } = await supabase.functions
  .invoke('parse-medical-report', {
    body: {
      extractedText: parseResult.extractedText,
      fileId: fileRecord.id,
      sessionId
    }
  });

// Step 5: Generate insights
const { data: insights } = await supabase.functions
  .invoke('generate-health-insights', {
    body: {
      sessionId,
      parsedDocuments: [medicalData],
      userPreferences: {
        tone: 'friendly',
        language_level: 'simple'
      }
    }
  });

// Step 6: Generate PDF report
const { data: report } = await supabase.functions
  .invoke('generate-health-report', {
    body: {
      insightId: insights.id,
      reportFormat: 'pdf'
    }
  });
```

---

## Conclusion

Edge Functions are essential for the Althea Health application's document processing and AI capabilities. Follow this guide to:

1. Deploy all functions to your Supabase project
2. Configure required secrets (OpenAI API key)
3. Test functions locally and remotely
4. Monitor performance and logs
5. Integrate with frontend workflow

**Quick Commands:**
```bash
# Deploy all functions
./deploy-all-functions.sh

# Check function status
supabase functions list

# View logs
supabase functions logs --follow

# Test API key
curl -X POST 'https://idyhyrpsltbpdhnmbnje.supabase.co/functions/v1/test-api-key' \
  -H 'Authorization: Bearer YOUR_ANON_KEY'
```

For more information, refer to:
- Supabase Functions Docs: https://supabase.com/docs/guides/functions
- OpenAI API Docs: https://platform.openai.com/docs

---

**Last Updated**: 2025-11-07
**Functions**: 5 total
**Project**: idyhyrpsltbpdhnmbnje
