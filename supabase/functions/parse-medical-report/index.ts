import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ParseRequest {
  sessionId: string;
  fileIds: string[];
  forceReparse?: boolean;
}

interface ParseResult {
  fileId: string;
  fileName: string;
  status: 'success' | 'skipped' | 'error';
  reason?: string;
  patient?: string;
  labReport?: string;
  testCount?: number;
  provider?: string;
  attemptNumber?: number;
  duration?: number;
  alreadyParsed?: boolean;
}

// Medical report parsing prompt
const PARSING_PROMPT = `Extract structured medical report data from the provided text.

CRITICAL INSTRUCTIONS:
1. Extract REAL data only - NO placeholder values like "John Doe", "Sample Test", "XX", etc.
2. Extract ALL test results with exact values, units, and reference ranges
3. Calculate status for each metric by comparing value to reference range:
   - "NORMAL" = within range
   - "HIGH" = above upper limit
   - "LOW" = below lower limit
   - "CRITICAL" = dangerously abnormal
4. Return ONLY valid JSON - no markdown, no explanations

OUTPUT FORMAT:
{
  "patient": {
    "name": "",
    "age": "",
    "gender": "",
    "contact": "",
    "address": ""
  },
  "lab_details": {
    "lab_name": "",
    "doctor": "",
    "report_date": "YYYY-MM-DD",
    "test_date": "YYYY-MM-DD",
    "report_id": ""
  },
  "panels": [
    {
      "panel_name": "",
      "tests": [
        {
          "test_name": "",
          "value": "",
          "unit": "",
          "range_min": "",
          "range_max": "",
          "range_text": "",
          "status": "",
          "category": ""
        }
      ]
    }
  ],
  "summary": ""
}

VALIDATION RULES:
- Patient name must be real (not "John Doe", "Patient Name", etc.)
- Test values must be numbers or specific text (not "XX", "N/A", etc.)
- Dates must be in YYYY-MM-DD format
- Status must be one of: NORMAL, HIGH, LOW, CRITICAL, PENDING
- Extract all visible test results`;

// Check if file is already parsed
async function checkAlreadyParsed(supabase: any, fileId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("parsed_documents")
    .select("id, parsing_status")
    .eq("file_id", fileId)
    .eq("parsing_status", "completed")
    .maybeSingle();

  if (error) {
    console.warn(`Error checking parsed status for ${fileId}:`, error.message);
    return false;
  }

  return !!data;
}

// Extract text from image using OpenAI (optimized for speed)
async function extractTextWithOpenAI(
  arrayBuffer: ArrayBuffer,
  fileType: string,
  fileName: string
): Promise<{ text: string; cost: number; tokens: number }> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  console.log(`🔍 [OpenAI] Extracting text from ${fileName}`);

  // Convert to base64 in chunks
  const uint8Array = new Uint8Array(arrayBuffer);
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
    binary += String.fromCharCode(...chunk);
  }
  const base64Data = btoa(binary);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${fileType};base64,${base64Data}`,
                detail: "low" // Changed from "high" to "low" for faster processing
              },
            },
            {
              type: "text",
              text: "Extract ALL text from this medical report. Include patient information, lab details, all test names, values, units, and reference ranges. Be accurate and complete.",
            },
          ],
        },
      ],
      max_tokens: 2048, // Reduced from 4096 for faster response
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${error.substring(0, 200)}`);
  }

  const result = await response.json();
  const extractedText = result.choices?.[0]?.message?.content || "";
  const usage = result.usage || {};

  // Estimate cost: gpt-4o-mini with vision
  const inputCost = (usage.prompt_tokens || 0) * 0.15 / 1_000_000;
  const outputCost = (usage.completion_tokens || 0) * 0.60 / 1_000_000;
  const totalCost = inputCost + outputCost;

  if (!extractedText || extractedText.length < 50) {
    throw new Error(`Insufficient text extracted (${extractedText.length} chars)`);
  }

  console.log(`✅ [OpenAI] Extracted ${extractedText.length} chars, $${totalCost.toFixed(4)}`);

  return {
    text: extractedText,
    cost: totalCost,
    tokens: (usage.prompt_tokens || 0) + (usage.completion_tokens || 0)
  };
}

// Extract text using Claude (fallback)
async function extractTextWithClaude(
  arrayBuffer: ArrayBuffer,
  fileType: string,
  fileName: string
): Promise<{ text: string; cost: number; tokens: number }> {
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicKey) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  console.log(`🔍 [Claude] Extracting text from ${fileName}`);

  // Convert to base64
  const uint8Array = new Uint8Array(arrayBuffer);
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
    binary += String.fromCharCode(...chunk);
  }
  const base64Data = btoa(binary);

  const mediaType = fileType.includes("png") ? "image/png" : fileType.includes("jpeg") || fileType.includes("jpg") ? "image/jpeg" : "image/webp";

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-haiku-20240307",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64Data,
              },
            },
            {
              type: "text",
              text: "Extract ALL text from this medical report. Include patient information, lab details, all test names, values, units, and reference ranges. Be accurate and complete.",
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error ${response.status}: ${error.substring(0, 200)}`);
  }

  const result = await response.json();
  const extractedText = result.content?.[0]?.text || "";
  const usage = result.usage || {};

  // Estimate cost: Claude Haiku
  const inputCost = (usage.input_tokens || 0) * 0.25 / 1_000_000;
  const outputCost = (usage.output_tokens || 0) * 1.25 / 1_000_000;
  const totalCost = inputCost + outputCost;

  if (!extractedText || extractedText.length < 50) {
    throw new Error(`Insufficient text extracted (${extractedText.length} chars)`);
  }

  console.log(`✅ [Claude] Extracted ${extractedText.length} chars, $${totalCost.toFixed(4)}`);

  return {
    text: extractedText,
    cost: totalCost,
    tokens: (usage.input_tokens || 0) + (usage.output_tokens || 0)
  };
}

// Parse extracted text with OpenAI
async function parseWithOpenAI(
  documentText: string,
  fileName: string,
  attemptNumber: number = 1
): Promise<any> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  console.log(`🤖 [OpenAI] Parsing attempt ${attemptNumber} for ${fileName}`);

  let systemPrompt = PARSING_PROMPT;
  if (attemptNumber === 2) {
    systemPrompt += "\n\nIMPORTANT: Previous attempt failed validation. Extract REAL data only. Check patient name is real, all test values are valid numbers, and dates are properly formatted.";
  } else if (attemptNumber === 3) {
    systemPrompt += "\n\nFINAL ATTEMPT: Extract data with maximum accuracy. If any field is unclear, leave it empty rather than using placeholder values.";
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Extract data from this medical report:\n\n${documentText.substring(0, 12000)}`,
        },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error ${response.status}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content || "{}";
  const usage = result.usage || {};

  const parsed = JSON.parse(content);
  const validation = validateParsedData(parsed);

  const inputCost = (usage.prompt_tokens || 0) * 0.15 / 1_000_000;
  const outputCost = (usage.completion_tokens || 0) * 0.60 / 1_000_000;
  const totalCost = inputCost + outputCost;

  if (!validation.isValid && attemptNumber < 3) {
    console.warn(`⚠️ [OpenAI] Validation failed (attempt ${attemptNumber}):`, validation.issues);
    console.log(`🔄 Retrying with modified prompt...`);
    return await parseWithOpenAI(documentText, fileName, attemptNumber + 1);
  }

  return {
    parsed,
    attemptNumber,
    validation,
    cost: totalCost,
    tokens: (usage.prompt_tokens || 0) + (usage.completion_tokens || 0),
    provider: 'openai'
  };
}

// Parse extracted text with Claude (fallback)
async function parseWithClaude(
  documentText: string,
  fileName: string,
  attemptNumber: number = 1
): Promise<any> {
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicKey) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  console.log(`🤖 [Claude] Parsing attempt ${attemptNumber} for ${fileName}`);

  let systemPrompt = PARSING_PROMPT;
  if (attemptNumber === 2) {
    systemPrompt += "\n\nIMPORTANT: Previous attempt failed validation. Extract REAL data only.";
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-haiku-20240307",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Extract data from this medical report and return ONLY valid JSON:\n\n${documentText.substring(0, 12000)}`,
        },
      ],
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error ${response.status}`);
  }

  const result = await response.json();
  const content = result.content?.[0]?.text || "{}";
  const usage = result.usage || {};

  // Extract JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  const jsonContent = jsonMatch ? jsonMatch[0] : content;
  const parsed = JSON.parse(jsonContent);
  const validation = validateParsedData(parsed);

  const inputCost = (usage.input_tokens || 0) * 0.25 / 1_000_000;
  const outputCost = (usage.output_tokens || 0) * 1.25 / 1_000_000;
  const totalCost = inputCost + outputCost;

  if (!validation.isValid && attemptNumber < 2) {
    console.warn(`⚠️ [Claude] Validation failed (attempt ${attemptNumber}):`, validation.issues);
    console.log(`🔄 Retrying...`);
    return await parseWithClaude(documentText, fileName, attemptNumber + 1);
  }

  return {
    parsed,
    attemptNumber,
    validation,
    cost: totalCost,
    tokens: (usage.input_tokens || 0) + (usage.output_tokens || 0),
    provider: 'anthropic'
  };
}

// Validate parsed data
function validateParsedData(data: any): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];

  const patientName = data.patient?.name?.toLowerCase() || "";
  const invalidNames = ["john doe", "jane doe", "patient name", "sample", "test patient", "name"];
  if (!patientName || invalidNames.some((n) => patientName.includes(n))) {
    issues.push("Invalid or placeholder patient name");
  }

  if (!data.panels || !Array.isArray(data.panels) || data.panels.length === 0) {
    issues.push("No panels extracted");
  } else {
    let totalTests = 0;
    for (const panel of data.panels) {
      if (!panel.tests || !Array.isArray(panel.tests)) {
        continue;
      }
      totalTests += panel.tests.length;

      const invalidTests = panel.tests.filter((t: any) =>
        !t.value ||
        t.value === "N/A" ||
        t.value === "XX" ||
        t.value === "" ||
        t.test_name?.toLowerCase().includes("sample")
      );

      if (invalidTests.length > 0) {
        issues.push(`${invalidTests.length} invalid tests in panel "${panel.panel_name}"`);
      }
    }

    if (totalTests === 0) {
      issues.push("No tests extracted from any panel");
    }
  }

  if (!data.lab_details?.lab_name || data.lab_details.lab_name.toLowerCase().includes("sample")) {
    issues.push("Invalid or missing lab name");
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

// Validate and format date
function validateDate(dateStr: string | null | undefined): string | null {
  if (!dateStr || typeof dateStr !== 'string') return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  try {
    dateStr = dateStr.trim();
    const ddmmyyyy = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ddmmyyyy) {
      const day = ddmmyyyy[1].padStart(2, '0');
      const month = ddmmyyyy[2].padStart(2, '0');
      const year = ddmmyyyy[3];
      return `${year}-${month}-${day}`;
    }

    return null;
  } catch {
    return null;
  }
}

// Calculate status based on value and range
function calculateStatus(value: string, rangeMin: string, rangeMax: string, rangeText: string): string {
  if (!value) return "PENDING";

  const numValue = parseFloat(value.replace(/[^0-9.]/g, ""));
  if (isNaN(numValue)) return "PENDING";

  if (rangeMin && rangeMax) {
    const min = parseFloat(rangeMin);
    const max = parseFloat(rangeMax);

    if (!isNaN(min) && !isNaN(max)) {
      if (numValue < min * 0.7 || numValue > max * 1.3) return "CRITICAL";
      if (numValue < min) return "LOW";
      if (numValue > max) return "HIGH";
      return "NORMAL";
    }
  }

  if (rangeText) {
    const rangeMatch = rangeText.match(/([\d.]+)\s*[-–to]\s*([\d.]+)/i);
    if (rangeMatch) {
      const min = parseFloat(rangeMatch[1]);
      const max = parseFloat(rangeMatch[2]);

      if (numValue < min * 0.7 || numValue > max * 1.3) return "CRITICAL";
      if (numValue < min) return "LOW";
      if (numValue > max) return "HIGH";
      return "NORMAL";
    }
  }

  return "PENDING";
}

// Save parsed data to database
async function saveToDatabase(supabase: any, fileData: any, sessionId: string, parsedResult: any, startTime: number, extractCost: number, extractTokens: number) {
  const { parsed, attemptNumber, validation, cost, tokens, provider } = parsedResult;
  const userId = fileData.user_id;
  const duration = Date.now() - startTime;
  const totalCost = (cost || 0) + extractCost;
  const totalTokens = (tokens || 0) + extractTokens;

  console.log(`💾 Saving to database (${provider}, ${duration}ms, $${totalCost.toFixed(4)})`);

  // 1. Save or get patient
  const patientName = parsed.patient?.name || "Unknown Patient";
  const { data: existingPatient } = await supabase
    .from("patients")
    .select("*")
    .eq("user_id", userId)
    .eq("name", patientName)
    .maybeSingle();

  let patient = existingPatient;

  if (!existingPatient) {
    const { data: newPatient, error: patientError } = await supabase
      .from("patients")
      .insert({
        user_id: userId,
        name: patientName,
        age: parsed.patient?.age || null,
        gender: parsed.patient?.gender || null,
        contact: parsed.patient?.contact || null,
        address: parsed.patient?.address || null,
      })
      .select()
      .single();

    if (patientError) {
      console.error("❌ Patient insert error:", patientError);
    } else {
      patient = newPatient;
    }
  }

  // 2. Save lab report
  const reportDate = validateDate(parsed.lab_details?.report_date);
  const testDate = validateDate(parsed.lab_details?.test_date);

  const { data: labReport, error: labReportError } = await supabase
    .from("lab_reports")
    .insert({
      user_id: userId,
      patient_id: patient?.id,
      session_id: sessionId,
      file_id: fileData.id,
      lab_name: parsed.lab_details?.lab_name || "Unknown Lab",
      referring_doctor: parsed.lab_details?.doctor || null,
      report_id: parsed.lab_details?.report_id || null,
      report_date: reportDate,
      test_date: testDate,
      summary: parsed.summary || null,
    })
    .select()
    .single();

  if (labReportError) {
    console.error("❌ Lab report insert error:", labReportError);
    throw labReportError;
  }

  // 3. Save test results
  let totalTests = 0;
  for (const panel of parsed.panels || []) {
    for (const test of panel.tests || []) {
      const status = test.status || calculateStatus(
        test.value,
        test.range_min,
        test.range_max,
        test.range_text
      );

      const { error: testError } = await supabase
        .from("test_results")
        .insert({
          lab_report_id: labReport.id,
          user_id: userId,
          test_name: test.test_name || "Unknown Test",
          test_category: test.category || panel.panel_name || null,
          observed_value: test.value || "",
          unit: test.unit || "",
          reference_range_min: test.range_min || null,
          reference_range_max: test.range_max || null,
          reference_range_text: test.range_text || "",
          status: status,
          is_flagged: ["HIGH", "LOW", "CRITICAL", "ABNORMAL"].includes(status),
        });

      if (!testError) {
        totalTests++;
      }
    }
  }

  // 4. Save parsed_documents entry
  const key_metrics = [];
  const test_results = [];

  for (const panel of (parsed.panels || [])) {
    for (const test of (panel.tests || [])) {
      key_metrics.push({
        test_name: test.test_name,
        value: test.value,
        unit: test.unit || "",
        reference_range: test.range_text || `${test.range_min || ""}-${test.range_max || ""}`.replace(/^-$/, ""),
        interpretation: test.status,
      });

      test_results.push({
        test_name: test.test_name,
        value: test.value,
        unit: test.unit || "",
        reference_range: test.range_text || `${test.range_min || ""}-${test.range_max || ""}`,
        status: test.status,
      });
    }
  }

  const structured_data = {
    profile_name: parsed.patient?.name || "",
    patient_info: {
      name: parsed.patient?.name || "",
      age: parsed.patient?.age || "",
      gender: parsed.patient?.gender || "",
      id: "",
    },
    lab_name: parsed.lab_details?.lab_name || "",
    doctor_name: parsed.lab_details?.doctor || "",
    doctor_info: {
      name: parsed.lab_details?.doctor || "",
      specialty: "",
    },
    dates: {
      test_date: testDate || "",
      report_date: reportDate || "",
    },
    report_date: reportDate || "",
    panels: parsed.panels || [],
    key_metrics,
    test_results,
    summary: parsed.summary || "",
  };

  await supabase.from("parsed_documents").insert({
    file_id: fileData.id,
    session_id: sessionId,
    user_id: userId,
    parsing_status: "completed",
    structured_data,
    parsing_started_at: new Date(startTime).toISOString(),
    parsing_completed_at: new Date().toISOString(),
    parsing_provider: provider,
    parsing_attempts: attemptNumber,
    parsing_duration_ms: duration,
    estimated_cost: totalCost,
    tokens_used: totalTokens,
    metadata: {
      validation: validation,
    },
  });

  return {
    patient,
    labReport,
    testCount: totalTests,
    duration,
    cost: totalCost,
  };
}

// Process single file
async function processSingleFile(
  supabase: any,
  fileId: string,
  sessionId: string,
  forceReparse: boolean
): Promise<ParseResult> {
  const startTime = Date.now();

  try {
    console.log(`\n📄 Processing file: ${fileId}`);

    // Check if already parsed
    if (!forceReparse) {
      const alreadyParsed = await checkAlreadyParsed(supabase, fileId);
      if (alreadyParsed) {
        console.log(`⏭️  File ${fileId} already parsed, skipping`);
        return {
          fileId,
          fileName: "Unknown",
          status: 'skipped',
          reason: 'Already parsed',
          alreadyParsed: true,
        };
      }
    }

    // Get file metadata
    const { data: fileData, error: fileError } = await supabase
      .from("files")
      .select("*")
      .eq("id", fileId)
      .single();

    if (fileError || !fileData) {
      throw new Error("File not found in database");
    }

    console.log(`📁 File: ${fileData.file_name} (${fileData.file_type})`);

    // Download file from storage
    let downloadData = null;
    const medicalFilesResult = await supabase.storage
      .from("medical-files")
      .download(fileData.storage_path);

    if (!medicalFilesResult.error) {
      downloadData = medicalFilesResult.data;
    } else {
      const reportsResult = await supabase.storage
        .from("report-pdfs")
        .download(fileData.storage_path);

      if (!reportsResult.error) {
        downloadData = reportsResult.data;
      } else {
        throw new Error("File download failed");
      }
    }

    const arrayBuffer = await downloadData.arrayBuffer();

    // Try OpenAI first, fallback to Claude
    let documentText = "";
    let extractCost = 0;
    let extractTokens = 0;
    let extractProvider = "openai";

    try {
      const openaiResult = await extractTextWithOpenAI(arrayBuffer, fileData.file_type, fileData.file_name);
      documentText = openaiResult.text;
      extractCost = openaiResult.cost;
      extractTokens = openaiResult.tokens;
      extractProvider = "openai";
    } catch (openaiError: any) {
      console.warn(`⚠️ OpenAI extraction failed: ${openaiError.message}`);
      console.log(`🔄 Falling back to Claude...`);

      const claudeResult = await extractTextWithClaude(arrayBuffer, fileData.file_type, fileData.file_name);
      documentText = claudeResult.text;
      extractCost = claudeResult.cost;
      extractTokens = claudeResult.tokens;
      extractProvider = "anthropic";
    }

    // Parse with same provider or fallback
    let parsedResult;
    try {
      if (extractProvider === "openai") {
        parsedResult = await parseWithOpenAI(documentText, fileData.file_name);
      } else {
        parsedResult = await parseWithClaude(documentText, fileData.file_name);
      }
    } catch (parseError: any) {
      console.warn(`⚠️ ${extractProvider} parsing failed: ${parseError.message}`);

      // Try the other provider
      if (extractProvider === "openai") {
        console.log(`🔄 Falling back to Claude for parsing...`);
        parsedResult = await parseWithClaude(documentText, fileData.file_name);
      } else {
        console.log(`🔄 Falling back to OpenAI for parsing...`);
        parsedResult = await parseWithOpenAI(documentText, fileData.file_name);
      }
    }

    // Save to database
    const saved = await saveToDatabase(supabase, fileData, sessionId, parsedResult, startTime, extractCost, extractTokens);

    console.log(`✅ Successfully processed ${fileData.file_name} in ${saved.duration}ms`);

    return {
      fileId: fileData.id,
      fileName: fileData.file_name,
      status: 'success',
      patient: saved.patient?.name,
      labReport: saved.labReport?.lab_name,
      testCount: saved.testCount,
      provider: parsedResult.provider,
      attemptNumber: parsedResult.attemptNumber,
      duration: saved.duration,
    };
  } catch (error: any) {
    console.error(`❌ Error processing file ${fileId}:`, error.message);
    return {
      fileId,
      fileName: "Unknown",
      status: 'error',
      reason: error.message,
    };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    console.log("=== Parse Medical Report Request Started ===");

    const { sessionId, fileIds, forceReparse = false }: ParseRequest = await req.json();

    if (!sessionId || !fileIds || fileIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing sessionId and fileIds" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📋 Session: ${sessionId}, Files: ${fileIds.length}, Force reparse: ${forceReparse}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Process files in parallel with Promise.all
    console.log(`🚀 Processing ${fileIds.length} files in parallel...`);
    const results = await Promise.all(
      fileIds.map(fileId => processSingleFile(supabase, fileId, sessionId, forceReparse))
    );

    const successCount = results.filter(r => r.status === 'success').length;
    const skippedCount = results.filter(r => r.status === 'skipped').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    console.log("\n=== Processing Complete ===");
    console.log(`✅ Success: ${successCount}, ⏭️  Skipped: ${skippedCount}, ❌ Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        results: results.filter(r => r.status === 'success' || r.status === 'skipped'),
        summary: {
          total: fileIds.length,
          successful: successCount,
          skipped: skippedCount,
          failed: errorCount,
        },
        errors: results.filter(r => r.status === 'error'),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("=== Parse Medical Report Error ===", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to parse medical report",
        details: error.toString(),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
