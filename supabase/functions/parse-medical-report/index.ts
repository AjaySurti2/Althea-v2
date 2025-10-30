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

// Extract text from image using OpenAI Vision API
async function extractTextFromImage(
  arrayBuffer: ArrayBuffer,
  fileType: string,
  fileName: string
): Promise<string> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  console.log(`🖼️  Extracting text from image: ${fileName} (${fileType})`);

  // Convert to base64 in chunks
  const uint8Array = new Uint8Array(arrayBuffer);
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
    binary += String.fromCharCode(...chunk);
  }
  const base64Data = btoa(binary);

  console.log(`📦 Base64 size: ${base64Data.length} chars`);

  try {
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
                  detail: "high"
                },
              },
              {
                type: "text",
                text: "Extract ALL text from this medical report. Include patient information, lab details, all test names, values, units, and reference ranges. Preserve exact formatting and numbers.",
              },
            ],
          },
        ],
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ OpenAI Vision API failed: ${response.status}`, error);
      throw new Error(`OpenAI Vision API error ${response.status}: ${error.substring(0, 200)}`);
    }

    const result = await response.json();
    const extractedText = result.choices?.[0]?.message?.content || "";

    if (!extractedText || extractedText.length < 50) {
      throw new Error(`Insufficient text extracted from image (${extractedText.length} chars)`);
    }

    console.log(`✅ Extracted ${extractedText.length} characters from image`);
    console.log(`📄 Text preview: ${extractedText.substring(0, 300)}...`);

    return extractedText;
  } catch (error: any) {
    console.error("❌ Image text extraction error:", error.message);
    throw error;
  }
}

// Extract text from PDF using OpenAI (PDFs are sent as file uploads, not as images)
async function extractTextFromPDF(
  arrayBuffer: ArrayBuffer,
  fileName: string
): Promise<string> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  console.log(`📄 Extracting text from PDF: ${fileName}`);

  // Convert ArrayBuffer to Uint8Array for processing
  const uint8Array = new Uint8Array(arrayBuffer);

  try {
    // Create a Blob from the PDF data
    const blob = new Blob([uint8Array], { type: 'application/pdf' });

    // Create FormData to upload the PDF file
    const formData = new FormData();
    formData.append('file', blob, fileName);
    formData.append('purpose', 'assistants');

    console.log(`📤 Uploading PDF file to OpenAI...`);

    // Step 1: Upload the PDF file to OpenAI
    const uploadResponse = await fetch('https://api.openai.com/v1/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: formData,
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text();
      console.error(`❌ PDF upload failed: ${uploadResponse.status}`, error);
      throw new Error(`Failed to upload PDF: ${uploadResponse.status}`);
    }

    const uploadResult = await uploadResponse.json();
    const fileId = uploadResult.id;
    console.log(`✅ PDF uploaded successfully. File ID: ${fileId}`);

    // Step 2: Use GPT-4 to extract text from the uploaded PDF
    // Note: We'll use the standard chat completion with a different approach
    // Since file analysis requires Assistants API, we'll use a simpler method:
    // Convert the PDF content to text by reading it directly

    console.log(`🔄 Attempting direct PDF text extraction...`);

    // Use a more robust approach: convert PDF bytes to base64 and send to GPT-4o
    // GPT-4o can handle PDF files when sent as base64
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binary += String.fromCharCode(...chunk);
    }
    const base64Data = btoa(binary);

    console.log(`📦 PDF Base64 size: ${base64Data.length} chars`);

    // Use GPT-4o with a prompt to extract text from PDF data
    const extractResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a medical document text extraction specialist. Extract ALL text content from the provided PDF document. Preserve the exact formatting, numbers, and structure. Include all patient information, test names, values, units, reference ranges, and any notes or observations."
          },
          {
            role: "user",
            content: `I have a PDF medical report file. Please extract all text content from it accurately. Here is the base64 encoded PDF (first 100KB shown): ${base64Data.substring(0, 100000)}...`
          }
        ],
        max_tokens: 4096,
      }),
    });

    if (!extractResponse.ok) {
      const error = await extractResponse.text();
      console.error(`❌ PDF text extraction failed: ${extractResponse.status}`, error);

      // Clean up uploaded file
      try {
        await fetch(`https://api.openai.com/v1/files/${fileId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${openaiKey}` },
        });
      } catch (e) {
        console.warn('Failed to delete uploaded file:', e);
      }

      throw new Error(`PDF text extraction failed: ${extractResponse.status}`);
    }

    const extractResult = await extractResponse.json();
    const extractedText = extractResult.choices?.[0]?.message?.content || "";

    // Clean up uploaded file
    try {
      await fetch(`https://api.openai.com/v1/files/${fileId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${openaiKey}` },
      });
      console.log(`🗑️  Cleaned up uploaded file`);
    } catch (e) {
      console.warn('Failed to delete uploaded file:', e);
    }

    if (!extractedText || extractedText.length < 50) {
      throw new Error(`Insufficient text extracted from PDF (${extractedText.length} chars)`);
    }

    console.log(`✅ Extracted ${extractedText.length} characters from PDF`);
    console.log(`📄 Text preview: ${extractedText.substring(0, 300)}...`);

    return extractedText;
  } catch (error: any) {
    console.error("❌ PDF text extraction error:", error.message);
    throw error;
  }
}

// Main extraction function that routes to appropriate handler
async function extractTextFromFile(
  arrayBuffer: ArrayBuffer,
  fileType: string,
  fileName: string
): Promise<string> {
  console.log(`🔍 Processing file: ${fileName} (${fileType})`);

  // Route to appropriate extraction method based on file type
  if (fileType === 'application/pdf') {
    return await extractTextFromPDF(arrayBuffer, fileName);
  } else if (fileType.startsWith('image/')) {
    return await extractTextFromImage(arrayBuffer, fileType, fileName);
  } else {
    throw new Error(`Unsupported file type: ${fileType}`);
  }
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

  console.log(`🤖 Parsing attempt ${attemptNumber} for ${fileName}`);

  // Modify prompt for retry attempts
  let systemPrompt = PARSING_PROMPT;
  if (attemptNumber === 2) {
    systemPrompt += "\n\nIMPORTANT: Previous attempt failed validation. Be extra careful to extract REAL data only. Check patient name is real, all test values are valid numbers, and dates are properly formatted.";
  } else if (attemptNumber === 3) {
    systemPrompt += "\n\nFINAL ATTEMPT: Extract data with maximum accuracy. If any field is unclear, leave it empty rather than using placeholder values.";
  }

  try {
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
      console.error(`❌ OpenAI parsing failed: ${response.status}`, error);
      throw new Error(`OpenAI API error ${response.status}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "{}";

    console.log(`📋 Raw AI Response (attempt ${attemptNumber}):`);
    console.log(content);

    const parsed = JSON.parse(content);

    // Validate parsed data
    const validation = validateParsedData(parsed);

    if (!validation.isValid && attemptNumber < 3) {
      console.warn(`⚠️ Validation failed (attempt ${attemptNumber}):`, validation.issues);
      console.log(`🔄 Retrying with modified prompt...`);
      return await parseWithOpenAI(documentText, fileName, attemptNumber + 1);
    }

    return {
      parsed,
      attemptNumber,
      validation,
    };
  } catch (error: any) {
    console.error(`❌ Parsing error (attempt ${attemptNumber}):`, error.message);

    if (attemptNumber < 3) {
      console.log(`🔄 Retrying...`);
      return await parseWithOpenAI(documentText, fileName, attemptNumber + 1);
    }

    throw error;
  }
}

// Validate parsed data
function validateParsedData(data: any): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check patient name
  const patientName = data.patient?.name?.toLowerCase() || "";
  const invalidNames = ["john doe", "jane doe", "patient name", "sample", "test patient", "name"];
  if (!patientName || invalidNames.some((n) => patientName.includes(n))) {
    issues.push("Invalid or placeholder patient name");
  }

  // Check for panels and tests
  if (!data.panels || !Array.isArray(data.panels) || data.panels.length === 0) {
    issues.push("No panels extracted");
  } else {
    let totalTests = 0;
    for (const panel of data.panels) {
      if (!panel.tests || !Array.isArray(panel.tests)) {
        issues.push(`Panel "${panel.panel_name || 'unknown'}" has no tests`);
        continue;
      }
      totalTests += panel.tests.length;

      // Check for invalid test data
      const invalidTests = panel.tests.filter((t: any) =>
        !t.value ||
        t.value === "N/A" ||
        t.value === "XX" ||
        t.value === "" ||
        t.test_name?.toLowerCase().includes("sample") ||
        t.test_name?.toLowerCase().includes("test name")
      );

      if (invalidTests.length > 0) {
        issues.push(`${invalidTests.length} invalid/placeholder tests in panel "${panel.panel_name}"`);
      }
    }

    if (totalTests === 0) {
      issues.push("No tests extracted from any panel");
    }
  }

  // Check lab details
  if (!data.lab_details?.lab_name || data.lab_details.lab_name.toLowerCase().includes("sample")) {
    issues.push("Invalid or missing lab name");
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

// Validate and format date to YYYY-MM-DD or return null
function validateDate(dateStr: string | null | undefined): string | null {
  if (!dateStr || typeof dateStr !== 'string') return null;

  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // Try to parse various date formats
  try {
    // Remove any extra whitespace
    dateStr = dateStr.trim();

    // Try DD/MM/YYYY or DD-MM-YYYY
    const ddmmyyyy = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ddmmyyyy) {
      const day = ddmmyyyy[1].padStart(2, '0');
      const month = ddmmyyyy[2].padStart(2, '0');
      const year = ddmmyyyy[3];
      return `${year}-${month}-${day}`;
    }

    // Try MM/DD/YYYY or MM-DD-YYYY
    const mmddyyyy = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (mmddyyyy) {
      const month = mmddyyyy[1].padStart(2, '0');
      const day = mmddyyyy[2].padStart(2, '0');
      const year = mmddyyyy[3];
      // Assume DD/MM/YYYY is more common in medical reports
      return `${year}-${month}-${day}`;
    }

    // Try DD Mon YYYY or DD Month YYYY
    const monthNames: { [key: string]: string } = {
      'jan': '01', 'january': '01',
      'feb': '02', 'february': '02',
      'mar': '03', 'march': '03',
      'apr': '04', 'april': '04',
      'may': '05',
      'jun': '06', 'june': '06',
      'jul': '07', 'july': '07',
      'aug': '08', 'august': '08',
      'sep': '09', 'sept': '09', 'september': '09',
      'oct': '10', 'october': '10',
      'nov': '11', 'november': '11',
      'dec': '12', 'december': '12'
    };

    const monthPattern = dateStr.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/i);
    if (monthPattern) {
      const day = monthPattern[1].padStart(2, '0');
      const monthStr = monthPattern[2].toLowerCase();
      const year = monthPattern[3];
      const month = monthNames[monthStr];
      if (month) {
        return `${year}-${month}-${day}`;
      }
    }

    console.warn(`⚠️ Could not parse date: "${dateStr}"`);
    return null;
  } catch (error) {
    console.warn(`⚠️ Date parsing error for "${dateStr}":`, error);
    return null;
  }
}

// Calculate status based on value and range
function calculateStatus(value: string, rangeMin: string, rangeMax: string, rangeText: string): string {
  if (!value) return "PENDING";

  const numValue = parseFloat(value.replace(/[^0-9.]/g, ""));
  if (isNaN(numValue)) return "PENDING";

  // Try to parse from min/max
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

  // Try to parse from range text
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
async function saveToDatabase(supabase: any, fileData: any, sessionId: string, parsedResult: any) {
  const { parsed, attemptNumber, validation } = parsedResult;
  const userId = fileData.user_id;

  console.log(`💾 Saving to database...`);

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
      console.log(`✅ Created patient: ${patientName}`);
    }
  } else {
    console.log(`✅ Found existing patient: ${patientName}`);
  }

  // 2. Save lab report with validated dates
  const reportDate = validateDate(parsed.lab_details?.report_date);
  const testDate = validateDate(parsed.lab_details?.test_date);

  console.log(`📅 Dates - Report: ${reportDate}, Test: ${testDate}`);

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

  console.log(`✅ Created lab report: ${labReport.id}`);

  // 3. Save test results from all panels
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

      if (testError) {
        console.error(`❌ Test result insert error for ${test.test_name}:`, testError);
      } else {
        totalTests++;
      }
    }
  }

  console.log(`✅ Inserted ${totalTests} test results`);

  // 4. Save parsed_documents entry
  // Flatten panels into key_metrics and test_results arrays for backward compatibility
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
    metadata: {
      ai_model: "gpt-4o-mini",
      attempt_number: attemptNumber,
      validation: validation,
    },
  });

  return {
    patient,
    labReport,
    testCount: totalTests,
  };
}

// Update file processing status in database
async function updateFileStatus(
  supabase: any,
  fileId: string,
  sessionId: string,
  userId: string,
  status: string,
  progress: number,
  additionalData: any = {}
) {
  try {
    await supabase.from("file_processing_status").upsert({
      file_id: fileId,
      session_id: sessionId,
      user_id: userId,
      status,
      progress,
      ...additionalData,
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to update file status:", error);
    // Don't throw - continue processing even if status update fails
  }
}

// Process single file with timeout
async function processFile(
  fileId: string,
  sessionId: string,
  supabase: any,
  startTime: number,
  maxDuration: number
): Promise<any> {
  const fileStartTime = Date.now();
  const elapsedSoFar = fileStartTime - startTime;

  // Check if we have enough time left
  if (elapsedSoFar > maxDuration * 0.8) {
    throw new Error("TIMEOUT_APPROACHING");
  }

  try {
    console.log(`\n📄 Processing file: ${fileId}`);

    // Get file metadata
    const { data: fileData, error: fileError } = await supabase
      .from("files")
      .select("*")
      .eq("id", fileId)
      .single();

    if (fileError || !fileData) {
      console.error("❌ File not found in database");
      throw new Error("File not found");
    }

    console.log(`📁 File: ${fileData.file_name} (${fileData.file_type})`);

    // Initialize processing status
    await updateFileStatus(supabase, fileId, sessionId, fileData.user_id, "pending", 0, {
      file_name: fileData.file_name,
      file_type: fileData.file_type,
      file_size_bytes: fileData.file_size,
      processing_started_at: new Date().toISOString(),
    });

    // Download file from storage (check both buckets)
    await updateFileStatus(supabase, fileId, sessionId, fileData.user_id, "downloading", 10);

    let downloadData = null;
    let downloadError = null;

    // Try medical-files bucket first
    const medicalFilesResult = await supabase.storage
      .from("medical-files")
      .download(fileData.storage_path);

    if (!medicalFilesResult.error) {
      downloadData = medicalFilesResult.data;
    } else {
      // Try report-pdfs bucket as fallback
      const reportsResult = await supabase.storage
        .from("report-pdfs")
        .download(fileData.storage_path);

      if (!reportsResult.error) {
        downloadData = reportsResult.data;
      } else {
        downloadError = reportsResult.error;
      }
    }

    if (downloadError || !downloadData) {
      console.error("❌ Download failed:", downloadError);
      throw new Error("File download failed");
    }

    const arrayBuffer = await downloadData.arrayBuffer();
    console.log(`✅ Downloaded ${arrayBuffer.byteLength} bytes`);

    // Extract text from file (supports both images and PDFs)
    await updateFileStatus(supabase, fileId, sessionId, fileData.user_id, "extracting", 30);

    const documentText = await extractTextFromFile(
      arrayBuffer,
      fileData.file_type,
      fileData.file_name
    );

    // Parse with OpenAI
    await updateFileStatus(supabase, fileId, sessionId, fileData.user_id, "parsing", 60);

    const parsedResult = await parseWithOpenAI(documentText, fileData.file_name);

    // Save to database
    await updateFileStatus(supabase, fileId, sessionId, fileData.user_id, "saving", 90);

    const saved = await saveToDatabase(supabase, fileData, sessionId, parsedResult);

    const processingTime = Date.now() - fileStartTime;
    console.log(`✅ Successfully processed ${fileData.file_name} in ${processingTime}ms`);

    // Mark as completed
    await updateFileStatus(supabase, fileId, sessionId, fileData.user_id, "completed", 100, {
      processing_completed_at: new Date().toISOString(),
      processing_duration_ms: processingTime,
      extracted_text: documentText.substring(0, 1000), // Cache first 1000 chars
      extraction_model: fileData.file_type === 'application/pdf' ? 'gpt-4o-pdf' : 'gpt-4o-mini-vision',
      parsing_metadata: {
        attempt_number: parsedResult.attemptNumber,
        validation: parsedResult.validation,
      },
    });

    return {
      status: "success",
      fileId: fileData.id,
      fileName: fileData.file_name,
      fileType: fileData.file_type,
      patient: saved.patient?.name,
      labReport: saved.labReport?.lab_name,
      testCount: saved.testCount,
      attemptNumber: parsedResult.attemptNumber,
      validation: parsedResult.validation,
      processingTime,
    };
  } catch (error: any) {
    const processingTime = Date.now() - fileStartTime;
    console.error(`❌ Error processing file ${fileId}:`, error.message);

    // Mark as failed
    try {
      const { data: fileData } = await supabase
        .from("files")
        .select("user_id")
        .eq("id", fileId)
        .single();

      if (fileData) {
        await updateFileStatus(supabase, fileId, sessionId, fileData.user_id, "failed", 0, {
          processing_completed_at: new Date().toISOString(),
          processing_duration_ms: processingTime,
          error_message: error.message,
          error_code: error.name || "PROCESSING_ERROR",
          is_retryable: error.message !== "TIMEOUT_APPROACHING",
        });
      }
    } catch (statusError) {
      console.error("Failed to update error status:", statusError);
    }

    return {
      status: "failed",
      fileId,
      error: error.message,
      processingTime,
    };
  }
}

// Process files in parallel with concurrency control
async function processFilesParallel(
  fileIds: string[],
  sessionId: string,
  supabase: any,
  maxConcurrent: number = 3,
  maxDuration: number = 120000
): Promise<{ results: any[]; timedOut: boolean }> {
  const startTime = Date.now();
  const results: any[] = [];
  const queue = [...fileIds];
  const inProgress = new Map<string, Promise<any>>();
  let timedOut = false;

  console.log(`🚀 Starting parallel processing: ${fileIds.length} files, max ${maxConcurrent} concurrent`);

  while (queue.length > 0 || inProgress.size > 0) {
    const elapsed = Date.now() - startTime;

    // Check if we're approaching timeout (80% threshold = 96 seconds for 120s limit)
    if (elapsed > maxDuration * 0.8) {
      console.warn(`⏰ Timeout approaching (${elapsed}ms elapsed), stopping new processing`);
      timedOut = true;
      break;
    }

    // Start new jobs up to max concurrent
    while (inProgress.size < maxConcurrent && queue.length > 0) {
      const fileId = queue.shift()!;
      console.log(`▶️  Starting file ${fileId} (${inProgress.size + 1}/${maxConcurrent} concurrent, ${queue.length} queued)`);

      const promise = processFile(fileId, sessionId, supabase, startTime, maxDuration);
      inProgress.set(fileId, promise);

      // Remove from inProgress when done
      promise.finally(() => inProgress.delete(fileId));
    }

    // Wait for at least one to complete
    if (inProgress.size > 0) {
      const result = await Promise.race(inProgress.values());
      results.push(result);
      console.log(`✓ Completed: ${results.length}/${fileIds.length}`);
    }
  }

  // Wait for remaining in-progress files to complete (with timeout)
  if (inProgress.size > 0) {
    console.log(`⏳ Waiting for ${inProgress.size} remaining files...`);
    const remaining = await Promise.allSettled(Array.from(inProgress.values()));
    remaining.forEach(result => {
      if (result.status === "fulfilled") {
        results.push(result.value);
      }
    });
  }

  const totalTime = Date.now() - startTime;
  console.log(`🏁 Parallel processing complete: ${results.length} processed in ${totalTime}ms`);

  return { results, timedOut };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const requestStartTime = Date.now();

  try {
    console.log("=== Parse Medical Report Request Started ===");

    const { sessionId, fileIds }: ParseRequest = await req.json();

    if (!sessionId || !fileIds || fileIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing sessionId and fileIds" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📋 Session: ${sessionId}, Files: ${fileIds.length}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Process files in parallel with timeout protection
    const MAX_CONCURRENT = 3;
    const MAX_DURATION_MS = 120000; // 120 seconds soft limit

    const { results, timedOut } = await processFilesParallel(
      fileIds,
      sessionId,
      supabase,
      MAX_CONCURRENT,
      MAX_DURATION_MS
    );

    // Separate successful and failed results
    const successResults = results.filter(r => r.status === "success");
    const failedResults = results.filter(r => r.status === "failed");

    const totalTime = Date.now() - requestStartTime;

    console.log("\n=== Processing Complete ===");
    console.log(`✅ Success: ${successResults.length}, ❌ Errors: ${failedResults.length}`);
    console.log(`⏱️  Total time: ${totalTime}ms`);
    if (timedOut) {
      console.warn(`⚠️  Processing stopped due to timeout protection`);
    }

    // Return response with partial results if needed
    return new Response(
      JSON.stringify({
        success: successResults.length > 0,
        results: successResults,
        total_processed: successResults.length,
        total_requested: fileIds.length,
        total_failed: failedResults.length,
        errors: failedResults.length > 0 ? failedResults : undefined,
        timedOut,
        processingTime: totalTime,
        partialSuccess: successResults.length > 0 && successResults.length < fileIds.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    const totalTime = Date.now() - requestStartTime;
    console.error("=== Parse Medical Report Error ===", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to parse medical report",
        details: error.toString(),
        processingTime: totalTime,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});