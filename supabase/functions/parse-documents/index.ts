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
  customization: {
    tone?: string;
    language?: string;
    focusAreas?: string[];
  };
}

const MEDICAL_PARSING_PROMPT = `You are an expert medical data extraction AI. Extract ALL information with clinical accuracy.

**CRITICAL RULES:**
1. Extract EVERY test result - missing data is unacceptable
2. Use EXACT values and units from the document
3. Calculate status by comparing value to reference range:
   - "NORMAL" = within range
   - "HIGH" = above upper limit
   - "LOW" = below lower limit
   - "CRITICAL" = dangerously abnormal
4. NO placeholder values - use empty string "" for missing data
5. Preserve medical terminology exactly

**OUTPUT FORMAT (JSON only, no markdown):**
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
    "report_date": "",
    "test_date": "",
    "report_id": ""
  },
  "metrics": [
    {
      "test": "",
      "value": "",
      "unit": "",
      "range": "",
      "status": ""
    }
  ],
  "summary": ""
}

**EXAMPLES:**
- Hemoglobin 11.9 g/dL (12-16) → status: "LOW"
- WBC 11600 cells/cu.mm (4300-10300) → status: "HIGH"
- TSH 11.0 µIU/mL (0.45-4.5) → status: "HIGH"
- Calcium 9.1 mg/dL (8.8-10.2) → status: "NORMAL"

Return ONLY valid JSON, no explanations.`;

async function extractTextFromPDF(arrayBuffer: ArrayBuffer, model: string = "claude-3-haiku-20240307"): Promise<string> {
  const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicApiKey) {
    console.error("❌ ANTHROPIC_API_KEY not found in environment");
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  try {
    console.log(`📄 Converting PDF to base64 (${arrayBuffer.byteLength} bytes)...`);

    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binary += String.fromCharCode(...chunk);
    }
    const base64Pdf = btoa(binary);

    console.log(`✅ Base64 conversion complete (${base64Pdf.length} chars)`);

    console.log(`🤖 Calling Anthropic API with ${model}...`);
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        messages: [{
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64Pdf,
              },
            },
            {
              type: "text",
              text: "Extract ALL text from this medical report PDF. Include patient details, lab information, ALL test results with values, units, and reference ranges. Preserve exact formatting and numbers.",
            },
          ],
        }],
      }),
    });

    console.log(`📡 Anthropic API response status: ${response.status}`);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`❌ PDF extraction failed (${model}): ${response.status}`);
      console.error(`Error details: ${errorBody}`);
      throw new Error(`Anthropic API error ${response.status}: ${errorBody.substring(0, 200)}`);
    }

    const result = await response.json();
    const text = result.content?.[0]?.text || "";

    if (!text || text.length < 20) {
      console.error(`⚠️ Extracted text too short: ${text.length} chars`);
      console.error(`Text preview: "${text}"`);
      throw new Error(`Insufficient text extracted (${text.length} chars) - document may be empty or corrupted`);
    }

    if (text.length < 100) {
      console.warn(`⚠️ Warning: Extracted text is very short (${text.length} chars): "${text}"`);
    }

    console.log(`✅ PDF extracted with ${model}: ${text.length} chars`);
    console.log(`Text preview: ${text.substring(0, 200)}...`);
    return text;
  } catch (error: any) {
    console.error("❌ PDF extraction error:", error.message || error);
    throw error;
  }
}

async function extractTextFromImage(arrayBuffer: ArrayBuffer, mimeType: string, model: string = "claude-3-haiku-20240307"): Promise<string> {
  const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicApiKey) {
    console.error("❌ ANTHROPIC_API_KEY not found in environment");
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  try {
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binary += String.fromCharCode(...chunk);
    }
    const base64Image = btoa(binary);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType || "image/jpeg",
                data: base64Image,
              },
            },
            {
              type: "text",
              text: "Extract ALL text from this medical report image. Include patient info, ALL test names, observed values, units, and reference ranges exactly as shown.",
            },
          ],
        }],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`❌ Image OCR failed (${model}): ${response.status}`);
      console.error(`Error details: ${errorBody}`);
      throw new Error(`Anthropic API error ${response.status}: ${errorBody.substring(0, 200)}`);
    }

    const result = await response.json();
    const text = result.content?.[0]?.text || "";

    if (!text || text.length < 20) {
      console.error(`⚠️ Extracted text too short: ${text.length} chars`);
      console.error(`Text preview: "${text}"`);
      throw new Error(`Insufficient text extracted (${text.length} chars) - image may be blank or unreadable`);
    }

    if (text.length < 100) {
      console.warn(`⚠️ Warning: Extracted text is very short (${text.length} chars): "${text}"`);
    }

    console.log(`✅ Image OCR with ${model}: ${text.length} chars`);
    console.log(`Text preview: ${text.substring(0, 200)}...`);
    return text;
  } catch (error: any) {
    console.error("❌ Image OCR error:", error.message || error);
    throw error;
  }
}

function validateParsedData(data: any): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (!data.patient?.name || data.patient.name.toLowerCase().includes("john doe") || data.patient.name.toLowerCase().includes("sample")) {
    issues.push("Invalid or placeholder patient name");
  }

  if (!data.metrics || data.metrics.length === 0) {
    issues.push("No metrics extracted");
  }

  const invalidMetrics = data.metrics?.filter((m: any) =>
    !m.value ||
    m.value === "N/A" ||
    m.value === "XX" ||
    m.test?.toLowerCase().includes("sample") ||
    m.test?.toLowerCase().includes("test name")
  );

  if (invalidMetrics?.length > 0) {
    issues.push(`${invalidMetrics.length} invalid/placeholder metrics found`);
  }

  return {
    isValid: issues.length === 0,
    issues
  };
}

async function parseWithAI(documentText: string, fileName: string, attemptNumber: number = 1): Promise<any> {
  const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");

  if (!anthropicApiKey) {
    console.error("❌ ANTHROPIC_API_KEY not configured");
    throw new Error("API key not configured");
  }

  if (!documentText || documentText.length < 20) {
    console.error("❌ Insufficient text for parsing");
    throw new Error(`Insufficient text for parsing (${documentText?.length || 0} chars)`);
  }

  if (documentText.length < 100) {
    console.warn(`⚠️ Warning: Very short text for parsing (${documentText.length} chars)`);
  }

  const models = [
    "claude-3-haiku-20240307",
    "claude-3-5-sonnet-20240620",
    "claude-3-opus-20240229"
  ];

  const model = models[Math.min(attemptNumber - 1, models.length - 1)];
  console.log(`🤖 Parsing attempt ${attemptNumber} with ${model}`);
  console.log(`📄 Text preview: ${documentText.substring(0, 400)}...`);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        temperature: 0.1,
        messages: [{
          role: "user",
          content: `${MEDICAL_PARSING_PROMPT}\n\n**REPORT TEXT:**\n${documentText.substring(0, 12000)}`,
        }],
      }),
    });

    if (!response.ok) {
      console.error(`API error: ${response.status}`);
      throw new Error(`API returned ${response.status}`);
    }

    const result = await response.json();
    const content = result.content[0].text;

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("❌ No JSON found in response");
      throw new Error("Failed to extract JSON");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    console.log(`✅ Parsed with ${model}`);
    console.log(`Patient: ${parsed.patient?.name}`);
    console.log(`Metrics: ${parsed.metrics?.length || 0}`);

    const validation = validateParsedData(parsed);

    if (!validation.isValid) {
      console.warn(`⚠️ Validation issues:`, validation.issues);

      if (attemptNumber < 3) {
        console.log(`🔄 Retrying with better model...`);
        return await parseWithAI(documentText, fileName, attemptNumber + 1);
      }
    }

    return {
      parsed,
      model,
      attemptNumber,
      validation
    };
  } catch (error) {
    console.error(`❌ Parsing error with ${model}:`, error);

    if (attemptNumber < 3) {
      console.log(`🔄 Retrying with better model...`);
      return await parseWithAI(documentText, fileName, attemptNumber + 1);
    }

    throw error;
  }
}

function calculateStatus(value: string, rangeText: string): string {
  if (!value || !rangeText) return "PENDING";

  const numValue = parseFloat(value.replace(/[^0-9.]/g, ""));
  if (isNaN(numValue)) return "PENDING";

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

async function saveStructuredData(supabase: any, fileData: any, sessionId: string, parsedResult: any) {
  const { parsed, model, attemptNumber } = parsedResult;
  const userId = fileData.user_id;

  const patientName = parsed.patient?.name || "Unknown Patient";

  const { data: existingPatient } = await supabase
    .from("patients")
    .select("*")
    .eq("user_id", userId)
    .eq("name", patientName)
    .maybeSingle();

  let patient = existingPatient;

  if (!existingPatient) {
    const patientData = {
      user_id: userId,
      name: patientName,
      age: parsed.patient?.age || null,
      gender: parsed.patient?.gender || null,
      contact: parsed.patient?.contact || null,
      address: parsed.patient?.address || null,
    };

    const { data: newPatient, error: patientError } = await supabase
      .from("patients")
      .insert(patientData)
      .select()
      .single();

    if (patientError) {
      console.error("Patient insert error:", patientError);
    } else {
      patient = newPatient;
    }
  }

  const labReportData = {
    user_id: userId,
    patient_id: patient?.id,
    session_id: sessionId,
    file_id: fileData.id,
    lab_name: parsed.lab_details?.lab_name || "Unknown Lab",
    referring_doctor: parsed.lab_details?.doctor || null,
    report_id: parsed.lab_details?.report_id || null,
    report_date: parsed.lab_details?.report_date || null,
    test_date: parsed.lab_details?.test_date || null,
    summary: parsed.summary || null,
  };

  const { data: labReport, error: labReportError } = await supabase
    .from("lab_reports")
    .insert(labReportData)
    .select()
    .single();

  if (labReportError) {
    console.error("Lab report insert error:", labReportError);
    throw labReportError;
  }

  const testResults = (parsed.metrics || []).map((metric: any) => ({
    lab_report_id: labReport.id,
    user_id: userId,
    test_name: metric.test || "Unknown Test",
    observed_value: metric.value || "",
    unit: metric.unit || "",
    reference_range_text: metric.range || "",
    status: metric.status || calculateStatus(metric.value, metric.range),
    is_flagged: ["HIGH", "LOW", "CRITICAL", "ABNORMAL"].includes(metric.status),
  }));

  if (testResults.length > 0) {
    const { error: resultsError } = await supabase
      .from("test_results")
      .insert(testResults);

    if (resultsError) {
      console.error("Test results insert error:", resultsError);
    } else {
      console.log(`✅ Inserted ${testResults.length} test results`);
    }
  }

  const structured_data = {
    profile_name: parsed.patient?.name || "",
    patient_info: parsed.patient || {},
    report_date: parsed.lab_details?.report_date || "",
    lab_name: parsed.lab_details?.lab_name || "",
    doctor_name: parsed.lab_details?.doctor || "",
    key_metrics: (parsed.metrics || []).map((m: any) => ({
      test_name: m.test || "",
      value: m.value || "",
      unit: m.unit || "",
      reference_range: m.range || "",
      interpretation: m.status || ""
    })),
    summary: parsed.summary || "",
  };

  await supabase.from("parsed_documents").insert({
    file_id: fileData.id,
    session_id: sessionId,
    user_id: userId,
    parsing_status: "completed",
    raw_content: "",
    structured_data,
    confidence_scores: {
      overall: 0.95,
      extraction: 0.93,
      parsing: 0.96,
    },
    metadata: {
      ai_model: model,
      attempt_number: attemptNumber,
      file_type: fileData.file_type,
    },
  });

  return {
    patient,
    labReport,
    testCount: testResults.length,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    console.log("=== Parse Documents Request Started ===");
    const { sessionId, fileIds, customization }: ParseRequest = await req.json();

    if (!sessionId || !fileIds || fileIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing sessionId and fileIds" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }}
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results = [];
    const errors = [];

    for (const fileId of fileIds) {
      try {
        console.log(`\n📄 Processing file: ${fileId}`);

        const { data: fileData, error: fileError } = await supabase
          .from("files")
          .select("*")
          .eq("id", fileId)
          .single();

        if (fileError || !fileData) {
          errors.push({ fileId, error: "File not found" });
          continue;
        }

        console.log(`File: ${fileData.file_name}, Type: ${fileData.file_type}`);

        const { data: downloadData, error: downloadError } = await supabase.storage
          .from("medical-files")
          .download(fileData.storage_path);

        if (downloadError || !downloadData) {
          console.error("Download failed:", downloadError);
          errors.push({ fileId, error: "Download failed" });
          continue;
        }

        const arrayBuffer = await downloadData.arrayBuffer();
        console.log(`Downloaded ${arrayBuffer.byteLength} bytes`);

        let documentText = "";
        try {
          if (fileData.file_type === "application/pdf") {
            try {
              documentText = await extractTextFromPDF(arrayBuffer);
            } catch (error: any) {
              console.log(`⚠️ Haiku failed, retrying with Sonnet: ${error.message}`);
              documentText = await extractTextFromPDF(arrayBuffer, "claude-3-5-sonnet-20240620");
            }
          } else if (fileData.file_type.startsWith("image/")) {
            try {
              documentText = await extractTextFromImage(arrayBuffer, fileData.file_type);
            } catch (error: any) {
              console.log(`⚠️ Haiku failed, retrying with Sonnet: ${error.message}`);
              documentText = await extractTextFromImage(arrayBuffer, fileData.file_type, "claude-3-5-sonnet-20240620");
            }
          }
        } catch (extractError: any) {
          console.error(`❌ All extraction attempts failed: ${extractError.message}`);
          errors.push({ fileId, error: `Text extraction failed: ${extractError.message}` });
          continue;
        }

        if (!documentText || documentText.length < 20) {
          console.error(`❌ Extracted text too short: ${documentText.length} chars`);
          console.error(`Text preview: "${documentText}"`);
          errors.push({
            fileId,
            fileName: fileData.file_name,
            error: `Text extraction failed - insufficient content (${documentText.length} chars). The document may be blank, corrupted, or contain only images without text.`
          });
          continue;
        }

        if (documentText.length < 100) {
          console.warn(`⚠️ Warning: Very short document (${documentText.length} chars)`);
        }

        console.log(`📝 Extracted ${documentText.length} characters`);

        const parsedResult = await parseWithAI(documentText, fileData.file_name);
        const saved = await saveStructuredData(supabase, fileData, sessionId, parsedResult);

        results.push({
          fileId: fileData.id,
          fileName: fileData.file_name,
          patient: saved.patient?.name,
          labReport: saved.labReport?.lab_name,
          testCount: saved.testCount,
          model: parsedResult.model,
          attemptNumber: parsedResult.attemptNumber,
          validation: parsedResult.validation,
        });

        console.log(`✅ Successfully processed ${fileData.file_name}`);
      } catch (fileError: any) {
        console.error(`Error processing file ${fileId}:`, fileError);
        errors.push({ fileId, error: fileError.message });
      }
    }

    console.log("\n=== Processing Complete ===");
    console.log(`Success: ${results.length}, Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        total_processed: results.length,
        total_requested: fileIds.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }}
    );
  } catch (error: any) {
    console.error("=== Parse Documents Error ===", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to parse documents",
        details: error.toString(),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }}
    );
  }
});