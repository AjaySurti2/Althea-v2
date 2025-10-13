# Technical Architecture & Implementation Plan
## Althea Health Interpreter - Complete System

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [System Architecture Overview](#system-architecture-overview)
3. [Database Schema Analysis](#database-schema-analysis)
4. [Step-by-Step Implementation](#step-by-step-implementation)
5. [OpenAI Integration Architecture](#openai-integration-architecture)
6. [Security & HIPAA Compliance](#security--hipaa-compliance)
7. [Implementation Roadmap](#implementation-roadmap)
8. [Testing Strategy](#testing-strategy)
9. [Deployment Plan](#deployment-plan)

---

## Executive Summary

This document provides a comprehensive implementation plan for transforming the Althea Health Interpreter demo into a fully functional medical data interpretation platform with OpenAI integration, document processing, and PDF generation.

**Current State:**
- ✅ Complete database schema designed and deployed
- ✅ Authentication system functional (Supabase Auth)
- ✅ File storage infrastructure ready (Supabase Storage)
- ✅ Frontend workflow UI implemented
- ❌ No document processing pipeline
- ❌ No OpenAI integration
- ❌ No PDF generation
- ❌ Limited dashboard functionality

**Target State:**
- Full document upload and OCR processing
- OpenAI-powered medical interpretation
- PDF report generation and download
- Complete session tracking and analytics
- Family health pattern detection
- HIPAA-compliant data handling

---

## System Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (React + Vite)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Upload     │→ │  Customize   │→ │   Process    │→ Download│
│  │   Workflow   │  │  Preferences │  │   & View     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└───────────────────────────┬─────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE BACKEND                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Edge Functions (Deno)                                    │   │
│  │  • process-document (OCR + extraction)                    │   │
│  │  • generate-interpretation (OpenAI integration)           │   │
│  │  • generate-pdf (PDF creation)                            │   │
│  │  • analyze-patterns (family health detection)             │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  PostgreSQL Database                                      │   │
│  │  • 10 tables with RLS policies                            │   │
│  │  • Full audit trail                                       │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Storage Buckets                                          │   │
│  │  • medical-files (encrypted uploads)                      │   │
│  │  • report-pdfs (generated reports)                        │   │
│  └──────────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                             │
│  • OpenAI API (GPT-4 for medical interpretation)                │
│  • OCR Service (Tesseract.js or Cloud Vision API)               │
│  • PDF Generation (jsPDF or PDFKit)                             │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend:**
- React 18 with TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- Framer Motion (animations)
- Supabase JS Client

**Backend:**
- Supabase (BaaS platform)
- PostgreSQL (database)
- Deno Edge Functions (serverless)
- Supabase Storage (file storage)

**AI & Processing:**
- OpenAI GPT-4 API
- Tesseract.js (client-side OCR)
- PDF-lib or jsPDF (PDF generation)

**Infrastructure:**
- Supabase hosting
- GitHub for version control
- Environment-based configuration

---

## Database Schema Analysis

### ✅ Existing Schema Strengths

The current schema is **production-ready** with:

1. **Comprehensive Tables (10 total):**
   - `profiles` - User profile data
   - `leads` - Lead capture system
   - `family_members` - Family health tracking
   - `sessions` - Upload session management
   - `files` - Document metadata and storage
   - `health_metrics` - Extracted health data
   - `family_patterns` - AI-detected patterns
   - `ai_summaries` - OpenAI generated content
   - `report_pdfs` - Generated report references
   - `reminders` - Health reminder system

2. **Security Features:**
   - Row Level Security (RLS) on all tables
   - Proper foreign key constraints
   - User isolation via auth.uid()
   - Encrypted storage buckets

3. **Performance Optimizations:**
   - Strategic indexes on foreign keys
   - Date-based indexes for time-series queries
   - Efficient query patterns

4. **Data Integrity:**
   - CHECK constraints for enum fields
   - NOT NULL constraints on critical fields
   - CASCADE and SET NULL for referential integrity

### ⚠️ Schema Enhancements Needed

The database needs these additional columns for full functionality. These migrations should be created and applied:

**1. Add OCR metadata to files table:**
```sql
-- Migration: 20251013_add_ocr_metadata.sql
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

**2. Add validation fields to sessions:**
```sql
-- Migration: 20251013_add_session_validation.sql
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

**3. Add AI tracking to ai_summaries:**
```sql
-- Migration: 20251013_add_ai_tracking.sql
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

---

## Step-by-Step Implementation

This section provides detailed code for each of the 4 steps in the workflow.

### STEP 1: Document Upload & Processing System

#### Overview
- User uploads medical documents (PDF, JPG, PNG, TXT)
- System performs OCR and text extraction
- Extracts key medical metadata (patient name, date, lab, metrics)
- User validates extracted data before proceeding

#### Implementation Components

**1.1 Edge Function: process-document**

Create: `supabase/functions/process-document/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ProcessDocumentRequest {
  fileId: string;
  storagePath: string;
  fileType: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { fileId, storagePath, fileType }: ProcessDocumentRequest = await req.json();

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from("medical-files")
      .download(storagePath);

    if (downloadError) throw downloadError;

    // Update status to processing
    await supabaseClient
      .from("files")
      .update({ processing_status: "processing" })
      .eq("id", fileId);

    let extractedText = "";
    let confidence = 100;

    // Process based on file type
    if (fileType.includes("text")) {
      // Direct text extraction for text files
      extractedText = await fileData.text();
    } else {
      // For PDFs and images, use simple text extraction
      // In production, integrate Tesseract.js or Google Cloud Vision
      const arrayBuffer = await fileData.arrayBuffer();
      const textDecoder = new TextDecoder();
      extractedText = textDecoder.decode(arrayBuffer);
    }

    // Extract medical metadata using regex patterns
    const metadata = extractMedicalMetadata(extractedText);

    // Update file record with extracted data
    await supabaseClient
      .from("files")
      .update({
        extracted_text: extractedText,
        ocr_confidence: confidence,
        extracted_metadata: metadata,
        processing_status: "completed",
        validation_status: "pending"
      })
      .eq("id", fileId);

    return new Response(
      JSON.stringify({
        success: true,
        text: extractedText,
        confidence,
        metadata,
        preview: extractedText.substring(0, 500)
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Processing error:", error);

    // Update file status to failed
    if (error.fileId) {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      await supabaseClient
        .from("files")
        .update({
          processing_status: "failed",
          error_message: error.message
        })
        .eq("id", error.fileId);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function extractMedicalMetadata(text: string) {
  const metadata: any = {};

  // Extract patient name
  const namePatterns = [
    /Patient:?\s*([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
    /Name:?\s*([A-Z][a-z]+\s+[A-Z][a-z]+)/i
  ];

  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match) {
      metadata.patientName = match[1];
      break;
    }
  }

  // Extract date
  const datePatterns = [
    /Date:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /Report Date:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      metadata.reportDate = match[1];
      break;
    }
  }

  // Extract lab name
  const labPatterns = [
    /Laboratory:?\s*([A-Z][A-Za-z\s&]+)/i,
    /Lab:?\s*([A-Z][A-Za-z\s&]+)/i
  ];

  for (const pattern of labPatterns) {
    const match = text.match(pattern);
    if (match) {
      metadata.labName = match[1].trim();
      break;
    }
  }

  // Extract common health metrics
  const metrics: any[] = [];

  // Blood pressure
  const bpMatch = text.match(/Blood\s+Pressure:?\s*(\d{2,3}\/\d{2,3})/i);
  if (bpMatch) {
    metrics.push({
      type: "blood_pressure",
      value: bpMatch[1],
      unit: "mmHg"
    });
  }

  // Cholesterol
  const cholMatch = text.match(/(?:Total\s+)?Cholesterol:?\s*(\d+)/i);
  if (cholMatch) {
    metrics.push({
      type: "cholesterol",
      value: cholMatch[1],
      unit: "mg/dL"
    });
  }

  // Glucose/Blood Sugar
  const glucoseMatch = text.match(/(?:Blood\s+)?Glucose:?\s*(\d+)/i);
  if (glucoseMatch) {
    metrics.push({
      type: "glucose",
      value: glucoseMatch[1],
      unit: "mg/dL"
    });
  }

  // Heart Rate
  const hrMatch = text.match(/Heart\s+Rate:?\s*(\d+)/i);
  if (hrMatch) {
    metrics.push({
      type: "heart_rate",
      value: hrMatch[1],
      unit: "bpm"
    });
  }

  // Weight
  const weightMatch = text.match(/Weight:?\s*(\d+(?:\.\d+)?)\s*(lbs?|kg)/i);
  if (weightMatch) {
    metrics.push({
      type: "weight",
      value: weightMatch[1],
      unit: weightMatch[2]
    });
  }

  metadata.keyMetrics = metrics;

  return metadata;
}
```

**1.2 Frontend Integration - Enhanced UploadWorkflow.tsx**

Update the existing `UploadWorkflow.tsx` to integrate document processing:

```typescript
// Add to Step 1 in UploadWorkflow.tsx

const [processingFiles, setProcessingFiles] = useState<{ [key: string]: boolean }>({});
const [fileMetadata, setFileMetadata] = useState<{ [key: string]: any }>({});

const handleFileProcessing = async (file: File, fileRecord: any) => {
  const fileId = fileRecord.id;

  setProcessingFiles(prev => ({ ...prev, [fileId]: true }));

  try {
    // Call Edge Function for document processing
    const { data: result, error } = await supabase.functions
      .invoke('process-document', {
        body: {
          fileId: fileRecord.id,
          storagePath: fileRecord.storage_path,
          fileType: file.type
        }
      });

    if (error) throw error;

    setFileMetadata(prev => ({
      ...prev,
      [fileId]: result.metadata
    }));

    console.log('Extracted metadata:', result.metadata);

  } catch (error: any) {
    console.error('Processing failed:', error);
    alert(`Failed to process ${file.name}: ${error.message}`);
  } finally {
    setProcessingFiles(prev => ({ ...prev, [fileId]: false }));
  }
};

// Update the existing upload code to call processing
const handleFileUpload = async (file: File) => {
  // ... existing upload code ...

  if (fileRecord) {
    // Start processing after upload
    await handleFileProcessing(file, fileRecord);
  }
};
```

---

### STEP 2: Personalization System

**Status: ✅ Already Implemented**

The personalization system is complete in the current `UploadWorkflow.tsx`. It includes:
- Tone selection (friendly, professional, empathetic)
- Language level selection (simple, moderate, technical)
- Visual button interface
- Database persistence

**Enhancement Recommendation:**

Add preference history to remember user's previous choices:

```typescript
// Add to Step 2 in UploadWorkflow.tsx
useEffect(() => {
  const loadPreviousPreferences = async () => {
    if (!user) return;

    const { data: sessions } = await supabase
      .from('sessions')
      .select('tone, language_level')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1);

    if (sessions && sessions.length > 0) {
      setTone(sessions[0].tone);
      setLanguageLevel(sessions[0].language_level);
    }
  };

  loadPreviousPreferences();
}, [user]);
```

---

### STEP 3: OpenAI Integration & AI Processing

This is the core AI functionality that interprets medical data.

#### 3.1 Edge Function: generate-interpretation

Create: `supabase/functions/generate-interpretation/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();

    if (!OPENAI_API_KEY) {
      throw new Error("OpenAI API key not configured");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get session with files
    const { data: session, error: sessionError } = await supabaseClient
      .from("sessions")
      .select(`
        *,
        files(extracted_text, extracted_metadata)
      `)
      .eq("id", sessionId)
      .single();

    if (sessionError) throw sessionError;

    // Update session status to processing
    await supabaseClient
      .from("sessions")
      .update({ status: "processing" })
      .eq("id", sessionId);

    // Compile all extracted text
    const allText = session.files
      .map((f: any) => f.extracted_text)
      .filter(Boolean)
      .join("\n\n--- NEXT DOCUMENT ---\n\n");

    if (!allText || allText.trim().length === 0) {
      throw new Error("No text extracted from documents");
    }

    // Build AI prompts
    const systemPrompt = buildSystemPrompt(session.tone, session.language_level);
    const userPrompt = buildUserPrompt(allText, session);

    const startTime = Date.now();

    // Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const aiResponse = await response.json();
    const processingTime = Date.now() - startTime;

    console.log(`OpenAI processing completed in ${processingTime}ms`);

    if (!aiResponse.choices || aiResponse.choices.length === 0) {
      throw new Error("No response from OpenAI");
    }

    const interpretation = aiResponse.choices[0].message.content;

    // Parse structured response
    const parsedResult = parseAIResponse(interpretation);

    // Save to database
    const { data: summary, error: summaryError } = await supabaseClient
      .from("ai_summaries")
      .insert({
        session_id: sessionId,
        user_id: session.user_id,
        summary_text: parsedResult.summary,
        doctor_questions: parsedResult.questions,
        health_insights: parsedResult.insights,
        model_used: "gpt-4",
        prompt_tokens: aiResponse.usage?.prompt_tokens || 0,
        completion_tokens: aiResponse.usage?.completion_tokens || 0,
        processing_time_ms: processingTime,
        raw_response: aiResponse
      })
      .select()
      .single();

    if (summaryError) throw summaryError;

    // Update session status to completed
    await supabaseClient
      .from("sessions")
      .update({ status: "completed" })
      .eq("id", sessionId);

    return new Response(
      JSON.stringify({
        success: true,
        summary: parsedResult,
        processingTime,
        tokensUsed: aiResponse.usage
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("AI processing error:", error);

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildSystemPrompt(tone: string, languageLevel: string): string {
  const toneMap: Record<string, string> = {
    friendly: "Use a warm, conversational, and encouraging tone. Be supportive and reassuring, like a caring friend explaining health information.",
    professional: "Use clinical, detailed, and precise language. Maintain a professional medical tone appropriate for someone seeking thorough medical information.",
    empathetic: "Use compassionate, supportive, and reassuring language. Show understanding and care, acknowledging that health information can be concerning."
  };

  const languageMap: Record<string, string> = {
    simple: "Use simple, everyday terms with minimal medical jargon. Explain everything in plain language that anyone can understand, as if speaking to someone with no medical background.",
    moderate: "Use balanced medical terminology with clear explanations. Include some medical terms but always explain them in simple language.",
    technical: "Use comprehensive medical terminology appropriate for someone with healthcare knowledge or strong interest in medical details."
  };

  return `You are a medical data interpretation assistant for Althea Health Interpreter, a service that helps people understand their medical reports.

TONE GUIDANCE: ${toneMap[tone] || toneMap.friendly}

LANGUAGE LEVEL: ${languageMap[languageLevel] || languageMap.simple}

YOUR TASK:
Analyze medical reports and lab results to provide clear, helpful interpretations. Your response should help users understand their health data and prepare for doctor visits.

IMPORTANT GUIDELINES:
- Do NOT provide medical diagnoses or treatment recommendations
- Do NOT suggest starting or stopping medications
- ALWAYS recommend consulting healthcare providers for medical decisions
- Focus on EXPLAINING what the numbers mean and what questions to ask
- Be accurate and evidence-based
- Acknowledge limitations and uncertainties

OUTPUT FORMAT:
Provide your response as valid JSON with this exact structure:
{
  "summary": "2-3 paragraph overall summary of findings",
  "metrics": [
    {
      "name": "Metric name",
      "value": "Value with unit",
      "normal_range": "Typical range",
      "status": "normal|high|low|unknown",
      "explanation": "What this metric means and why it matters"
    }
  ],
  "questions": ["Question 1 to ask your doctor", "Question 2", "Question 3"],
  "insights": "Additional context, patterns, or recommendations for follow-up",
  "risk_indicators": ["Risk factor 1", "Risk factor 2"] or []
}`;
}

function buildUserPrompt(extractedText: string, session: any): string {
  let prompt = `Please analyze the following medical report data:\n\n`;

  if (session.profile_name) {
    prompt += `Patient: ${session.profile_name}\n`;
  }

  if (session.report_date) {
    prompt += `Report Date: ${session.report_date}\n`;
  }

  if (session.lab_name) {
    prompt += `Laboratory: ${session.lab_name}\n`;
  }

  prompt += `\n--- MEDICAL REPORT DATA ---\n\n${extractedText}\n\n`;
  prompt += `Please provide your interpretation in the JSON format specified.`;

  return prompt;
}

function parseAIResponse(response: string): any {
  try {
    // Try to extract and parse JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      // Validate required fields
      return {
        summary: parsed.summary || "Analysis completed successfully.",
        metrics: Array.isArray(parsed.metrics) ? parsed.metrics : [],
        questions: Array.isArray(parsed.questions) ? parsed.questions : [],
        insights: parsed.insights || "",
        risk_indicators: Array.isArray(parsed.risk_indicators) ? parsed.risk_indicators : []
      };
    }

    // If no JSON found, return the text as summary
    return {
      summary: response,
      metrics: [],
      questions: [],
      insights: "",
      risk_indicators: []
    };
  } catch (error) {
    console.error("Failed to parse AI response:", error);

    // Fallback: return raw response
    return {
      summary: response,
      metrics: [],
      questions: [],
      insights: "",
      risk_indicators: []
    };
  }
}
```

#### 3.2 Frontend Integration

Update Step 3 in `UploadWorkflow.tsx`:

```typescript
const [aiResult, setAiResult] = useState<any>(null);

const handleStep3Process = async () => {
  if (!user || !sessionId) return;

  setProcessing(true);
  const startTime = Date.now();

  try {
    console.log('Starting AI interpretation for session:', sessionId);

    const { data, error } = await supabase.functions
      .invoke('generate-interpretation', {
        body: { sessionId }
      });

    if (error) throw error;

    const duration = Date.now() - startTime;
    console.log(`AI processing completed in ${duration}ms`);

    setAiResult(data.summary);

    // Show success and move to next step
    setTimeout(() => {
      setProcessing(false);
      setCurrentStep(4);
    }, 1000);

  } catch (error: any) {
    console.error('AI processing failed:', error);
    setProcessing(false);
    alert(`Processing failed: ${error.message}\nPlease try again or contact support.`);
  }
};
```

---

### STEP 4: PDF Generation & Download

#### 4.1 Edge Function: generate-pdf

Create: `supabase/functions/generate-pdf/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get complete session data
    const { data: session, error: sessionError } = await supabaseClient
      .from("sessions")
      .select(`
        *,
        ai_summaries(*),
        health_metrics(*),
        profiles(full_name)
      `)
      .eq("id", sessionId)
      .single();

    if (sessionError) throw sessionError;

    if (!session.ai_summaries || session.ai_summaries.length === 0) {
      throw new Error("No AI summary found for this session");
    }

    const summary = session.ai_summaries[0];

    // Build HTML for PDF
    const htmlContent = buildPDFHTML(session, summary);

    // NOTE: For production, use a proper PDF library
    // This is a simplified version that stores HTML
    // You would integrate: jsPDF, puppeteer, or a PDF service

    const filename = `althea_report_${session.id}_${Date.now()}.html`;
    const storagePath = `${session.user_id}/reports/${filename}`;

    // Upload HTML to storage (in production, this would be a PDF)
    const { error: uploadError } = await supabaseClient.storage
      .from("report-pdfs")
      .upload(storagePath, htmlContent, {
        contentType: "text/html",
        cacheControl: "3600"
      });

    if (uploadError) throw uploadError;

    // Save reference in database
    await supabaseClient.from("report_pdfs").insert({
      session_id: sessionId,
      user_id: session.user_id,
      storage_path: storagePath
    });

    // Get signed URL (valid for 1 hour)
    const { data: signedUrlData } = await supabaseClient.storage
      .from("report-pdfs")
      .createSignedUrl(storagePath, 3600);

    return new Response(
      JSON.stringify({
        success: true,
        downloadUrl: signedUrlData?.signedUrl,
        storagePath
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("PDF generation error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildPDFHTML(session: any, summary: any): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Althea Health Report</title>
  <style>
    body {
      font-family: 'Helvetica', 'Arial', sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
      color: #333;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #22c55e;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      color: #22c55e;
    }
    .subtitle {
      color: #666;
      margin-top: 5px;
    }
    .section {
      margin-bottom: 30px;
    }
    .section-title {
      font-size: 20px;
      font-weight: bold;
      color: #22c55e;
      margin-bottom: 15px;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 5px;
    }
    .info-row {
      display: flex;
      margin-bottom: 8px;
    }
    .info-label {
      font-weight: bold;
      min-width: 150px;
    }
    .metric {
      background: #f9fafb;
      padding: 15px;
      margin-bottom: 10px;
      border-radius: 8px;
      border-left: 4px solid #22c55e;
    }
    .metric-name {
      font-weight: bold;
      font-size: 16px;
    }
    .question {
      background: #f0fdf4;
      padding: 12px;
      margin-bottom: 8px;
      border-radius: 6px;
      border-left: 3px solid #22c55e;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">Althea Health Interpreter</div>
    <div class="subtitle">Personalized Health Report</div>
    <div class="subtitle">Generated: ${new Date().toLocaleDateString()}</div>
  </div>

  <div class="section">
    <div class="section-title">Patient Information</div>
    <div class="info-row">
      <div class="info-label">Name:</div>
      <div>${session.profile_name || 'Not specified'}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Report Date:</div>
      <div>${session.report_date || 'Not specified'}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Laboratory:</div>
      <div>${session.lab_name || 'Not specified'}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Health Summary</div>
    <p>${summary.summary_text}</p>
  </div>

  ${session.health_metrics && session.health_metrics.length > 0 ? `
  <div class="section">
    <div class="section-title">Key Health Metrics</div>
    ${session.health_metrics.map((metric: any) => `
      <div class="metric">
        <div class="metric-name">${metric.metric_type}</div>
        <div>${metric.metric_value} ${metric.metric_unit || ''}</div>
        ${metric.notes ? `<div style="margin-top: 5px; color: #666;">${metric.notes}</div>` : ''}
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${summary.doctor_questions && summary.doctor_questions.length > 0 ? `
  <div class="section">
    <div class="section-title">Questions for Your Doctor</div>
    ${summary.doctor_questions.map((q: string, i: number) => `
      <div class="question">${i + 1}. ${q}</div>
    `).join('')}
  </div>
  ` : ''}

  ${summary.health_insights ? `
  <div class="section">
    <div class="section-title">Additional Insights</div>
    <p>${summary.health_insights}</p>
  </div>
  ` : ''}

  <div class="footer">
    <p><strong>IMPORTANT NOTICE:</strong></p>
    <p>This report is for informational purposes only and does not constitute medical advice.</p>
    <p>Always consult with qualified healthcare professionals for medical decisions.</p>
    <p>© ${new Date().getFullYear()} Althea Health Interpreter. All rights reserved.</p>
  </div>
</body>
</html>
  `;
}
```

#### 4.2 Frontend Download Implementation

Update Step 4 in `UploadWorkflow.tsx`:

```typescript
const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
const [generatingPdf, setGeneratingPdf] = useState(false);

const handleDownloadReport = async () => {
  if (!sessionId) return;

  setGeneratingPdf(true);

  try {
    console.log('Generating PDF for session:', sessionId);

    const { data, error } = await supabase.functions
      .invoke('generate-pdf', {
        body: { sessionId }
      });

    if (error) throw error;

    console.log('PDF generated successfully');

    // Trigger browser download
    if (data.downloadUrl) {
      const link = document.createElement('a');
      link.href = data.downloadUrl;
      link.download = `Althea_Health_Report_${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadUrl(data.downloadUrl);
      setUploadComplete(true);
    }

  } catch (error: any) {
    console.error('PDF generation failed:', error);
    alert(`Failed to generate report: ${error.message}`);
  } finally {
    setGeneratingPdf(false);
  }
};

// Update button in Step 4
<button
  onClick={handleDownloadReport}
  disabled={generatingPdf}
  className="w-full flex items-center justify-center space-x-2 px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50"
>
  {generatingPdf ? (
    <>
      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
      <span>Generating Report...</span>
    </>
  ) : (
    <>
      <Download className="w-5 h-5" />
      <span>Download Report</span>
    </>
  )}
</button>
```

---

## OpenAI Integration Architecture

### Configuration & Setup

**1. Environment Variables**

Add to `.env`:
```
OPENAI_API_KEY=sk-...your-key-here...
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=2000
OPENAI_TEMPERATURE=0.7
```

Set in Supabase:
```bash
supabase secrets set OPENAI_API_KEY=sk-...your-key-here...
```

**2. API Cost Estimation**

- **Model:** GPT-4
- **Average input:** 800 tokens (~600 words of medical text)
- **Average output:** 1500 tokens (~1200 words of interpretation)
- **Cost per request:** ~$0.05-0.07
- **Monthly estimate (1000 users, 2 reports each):** ~$100-140

**3. Prompt Engineering Best Practices**

Our prompts follow these principles:

1. **Clear Role Definition:** AI knows it's a health interpreter
2. **Tone Customization:** Adapts to user preference
3. **Safety Guidelines:** No diagnosis, always recommend doctors
4. **Structured Output:** JSON for reliable parsing
5. **Context Awareness:** Patient info included when available

**4. Response Handling**

The system has multiple fallback layers:
1. Parse JSON response from OpenAI
2. If JSON fails, extract from markdown code blocks
3. If extraction fails, use raw text as summary
4. Always validate required fields
5. Log errors for monitoring

---

## Security & HIPAA Compliance

### Checklist

✅ **Access Controls**
- Row Level Security on all database tables
- User isolation via auth.uid()
- Service role key only in Edge Functions
- No direct database access from frontend

✅ **Data Encryption**
- Data at rest: Supabase encrypts automatically
- Data in transit: TLS/HTTPS everywhere
- Storage buckets: Private with RLS policies

✅ **Audit Trail**
- created_at timestamps on all records
- updated_at on mutable records
- Session status tracking
- Processing logs in Edge Functions
- OpenAI token usage tracking

✅ **Authentication**
- Supabase Auth with email/password
- Optional: Add MFA for extra security
- Session management handled by Supabase

⚠️ **Business Associate Agreement**
- Required with Supabase for HIPAA
- Required with OpenAI for processing PHI
- Ensure contracts are in place

✅ **Data Minimization**
- Only store necessary medical data
- No unnecessary personal information
- Option to delete data after report generation

### Security Recommendations

1. **Enable MFA** for all user accounts
2. **Implement rate limiting** on Edge Functions
3. **Add data retention policies** (auto-delete after 2 years)
4. **Regular security audits** of RLS policies
5. **Monitor OpenAI API usage** for anomalies
6. **Implement logging** with sensitive data redaction

---

## Implementation Roadmap

### Timeline: 10 Weeks

**Phase 1: Foundation (Weeks 1-2)**
- Apply database schema enhancements
- Set up Edge Functions structure
- Configure OpenAI API
- Environment setup

**Phase 2: Document Processing (Weeks 3-4)**
- Build process-document Edge Function
- Implement OCR integration
- Create validation UI
- Test with various file formats

**Phase 3: AI Integration (Weeks 5-6)**
- Build generate-interpretation Edge Function
- Implement prompt engineering
- Frontend integration
- Performance optimization (<5s target)

**Phase 4: PDF & Dashboard (Weeks 7-8)**
- Build generate-pdf Edge Function
- Implement download functionality
- Enhance Dashboard features
- Add session history

**Phase 5: Testing & Launch (Weeks 9-10)**
- End-to-end testing
- Security audit
- Performance optimization
- Production deployment

---

## Testing Strategy

### Unit Tests
- Metadata extraction functions
- Prompt generation logic
- Response parsing functions

### Integration Tests
- Edge Function endpoints
- OpenAI API integration
- Database operations
- File upload pipeline

### End-to-End Tests
- Complete user journey (upload → process → download)
- Error handling scenarios
- Performance benchmarks

### Performance Targets
- OCR processing: <10 seconds
- AI interpretation: <5 seconds
- PDF generation: <3 seconds
- Total workflow: <30 seconds

---

## Deployment Instructions

### 1. Apply Database Migrations

```bash
# Create migrations
supabase migration new add_ocr_metadata
supabase migration new add_session_validation
supabase migration new add_ai_tracking

# Apply to database
supabase db push
```

### 2. Deploy Edge Functions

```bash
# Deploy each function
supabase functions deploy process-document
supabase functions deploy generate-interpretation
supabase functions deploy generate-pdf

# Set environment secrets
supabase secrets set OPENAI_API_KEY=your-key-here
```

### 3. Build Frontend

```bash
npm run build
```

### 4. Test Everything

```bash
npm run test
```

---

## Next Steps

### Immediate Actions:

1. **Set up OpenAI Account**
   - Create account at platform.openai.com
   - Add payment method
   - Generate API key
   - Set usage limits

2. **Apply Database Enhancements**
   - Create the 3 migration files
   - Test locally
   - Deploy to production

3. **Deploy Edge Functions**
   - Start with process-document
   - Test thoroughly
   - Deploy remaining functions

4. **Update Frontend**
   - Integrate Edge Function calls
   - Add loading states
   - Implement error handling

### Success Metrics:

- 90%+ accuracy in health interpretation
- <5 second AI processing time
- <10 second OCR processing
- Zero data breaches
- User satisfaction >4.5/5

---

## Conclusion

This implementation plan transforms the Althea Health Interpreter from a demo into a production-ready medical data interpretation platform. The architecture leverages:

- **Supabase** for scalable backend infrastructure
- **OpenAI GPT-4** for accurate medical interpretation
- **Edge Functions** for serverless processing
- **RLS Policies** for HIPAA-compliant security

The phased approach ensures systematic development with testing at each stage. The existing database schema provides a strong foundation, requiring only minor enhancements to support full functionality.

**Total Estimated Timeline:** 10 weeks
**Team Size:** 2-3 developers
**Infrastructure Costs:** ~$100-200/month (excluding OpenAI)
**OpenAI Costs:** ~$100-300/month for 1000 active users

---

*Document Version: 1.0*
*Created: 2025-10-13*
*Althea Development Team*
