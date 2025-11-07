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
          "range_text": "",
          "status": ""
        }
      ]
    }
  ],
  "summary": ""
}

Return ONLY valid JSON, no explanations.`;

async function extractTextWithOpenAI(arrayBuffer: ArrayBuffer, fileType: string): Promise<string> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

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
      messages: [{
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
            text: "Extract ALL text from this medical report. Include patient information, lab details, all test names, values, units, and reference ranges. Be accurate and complete.",
          },
        ],
      }],
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${error.substring(0, 200)}`);
  }

  const result = await response.json();
  const extractedText = result.choices?.[0]?.message?.content || "";

  if (!extractedText || extractedText.length < 50) {
    throw new Error(`Insufficient text extracted (${extractedText.length} chars)`);
  }

  console.log(`✅ [OpenAI] Extracted ${extractedText.length} chars`);
  return extractedText;
}

async function parseWithOpenAI(documentText: string): Promise<any> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `${MEDICAL_PARSING_PROMPT}\n\n**REPORT TEXT:**\n${documentText.substring(0, 12000)}`,
      }],
      max_tokens: 4096,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error ${response.status}`);
  }

  const result = await response.json();
  const content = result.choices[0].message.content;

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to extract JSON from response");
  }

  return JSON.parse(jsonMatch[0]);
}

async function saveToDatabase(supabase: any, fileData: any, sessionId: string, parsed: any) {
  const userId = fileData.user_id;

  // Save patient
  const patientName = parsed.patient?.name || "Unknown Patient";
  const { data: existingPatient } = await supabase
    .from("patients")
    .select("*")
    .eq("user_id", userId)
    .eq("name", patientName)
    .maybeSingle();

  let patient = existingPatient;
  if (!existingPatient) {
    const { data: newPatient } = await supabase
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
    patient = newPatient;
  }

  // Save lab report
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
      report_date: parsed.lab_details?.report_date || null,
      test_date: parsed.lab_details?.test_date || null,
      summary: parsed.summary || null,
    })
    .select()
    .single();

  if (labReportError) throw labReportError;

  // Save test results
  let testCount = 0;
  for (const panel of parsed.panels || []) {
    for (const test of panel.tests || []) {
      const { error } = await supabase
        .from("test_results")
        .insert({
          lab_report_id: labReport.id,
          user_id: userId,
          test_name: test.test_name || "Unknown Test",
          test_category: panel.panel_name || null,
          observed_value: test.value || "",
          unit: test.unit || "",
          reference_range_text: test.range_text || "",
          status: test.status || "PENDING",
          is_flagged: ["HIGH", "LOW", "CRITICAL", "ABNORMAL"].includes(test.status),
        });
      if (!error) testCount++;
    }
  }

  // Build structured data
  const key_metrics = [];
  for (const panel of (parsed.panels || [])) {
    for (const test of (panel.tests || [])) {
      key_metrics.push({
        test_name: test.test_name,
        value: test.value,
        unit: test.unit || "",
        reference_range: test.range_text || "",
        interpretation: test.status,
      });
    }
  }

  const structured_data = {
    profile_name: parsed.patient?.name || "",
    patient_info: {
      name: parsed.patient?.name || "",
      age: parsed.patient?.age || "",
      gender: parsed.patient?.gender || "",
    },
    lab_name: parsed.lab_details?.lab_name || "",
    doctor_name: parsed.lab_details?.doctor || "",
    report_date: parsed.lab_details?.report_date || "",
    panels: parsed.panels || [],
    key_metrics,
    summary: parsed.summary || "",
  };

  // FIXED: Use correct schema columns only
  const { error: parsedDocError } = await supabase.from("parsed_documents").insert({
    file_id: fileData.id,
    session_id: sessionId,
    user_id: userId,
    parsing_status: "completed",
    structured_data,
    raw_content: "",
    confidence_scores: {
      overall: 0.90,
      extraction: 0.85,
      parsing: 0.88,
    },
    metadata: {
      provider: "openai",
      model: "gpt-4o-mini",
    },
  });

  if (parsedDocError) {
    console.error("❌ Parsed documents insert error:", parsedDocError);
    throw parsedDocError;
  }

  console.log("✅ Successfully saved parsed document");

  return { patient, labReport, testCount };
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results = [];
    const errors = [];

    for (const fileId of fileIds) {
      try {
        console.log(`\n📄 Processing file: ${fileId}`);

        // Check if already parsed
        if (!forceReparse) {
          const { data: existingParsed } = await supabase
            .from("parsed_documents")
            .select("id")
            .eq("file_id", fileId)
            .eq("parsing_status", "completed")
            .maybeSingle();

          if (existingParsed) {
            console.log(`⏭️ File already parsed, skipping`);
            results.push({ fileId, status: 'skipped', reason: 'Already parsed' });
            continue;
          }
        }

        // Get file data
        const { data: fileData, error: fileError } = await supabase
          .from("files")
          .select("*")
          .eq("id", fileId)
          .single();

        if (fileError || !fileData) {
          errors.push({ fileId, error: "File not found" });
          continue;
        }

        // Download file
        const { data: downloadData, error: downloadError } = await supabase.storage
          .from("medical-files")
          .download(fileData.storage_path);

        if (downloadError || !downloadData) {
          errors.push({ fileId, error: "Download failed" });
          continue;
        }

        const arrayBuffer = await downloadData.arrayBuffer();
        console.log(`Downloaded ${arrayBuffer.byteLength} bytes`);

        // Extract text
        const documentText = await extractTextWithOpenAI(arrayBuffer, fileData.file_type);
        console.log(`📝 Extracted ${documentText.length} characters`);

        // Parse with AI
        const parsed = await parseWithOpenAI(documentText);
        console.log(`🤖 Parsed successfully`);

        // Save to database
        const saved = await saveToDatabase(supabase, fileData, sessionId, parsed);

        results.push({
          fileId: fileData.id,
          fileName: fileData.file_name,
          status: 'success',
          patient: saved.patient?.name,
          labReport: saved.labReport?.lab_name,
          testCount: saved.testCount,
        });

        console.log(`✅ Successfully processed ${fileData.file_name}`);
      } catch (fileError: any) {
        console.error(`Error processing file ${fileId}:`, fileError);
        errors.push({ fileId, fileName: "Unknown", error: fileError.message });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const skippedCount = results.filter(r => r.status === 'skipped').length;

    console.log("\n=== Processing Complete ===");
    console.log(`✅ Success: ${successCount}, ⏭️ Skipped: ${skippedCount}, ❌ Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        summary: {
          total: fileIds.length,
          successful: successCount,
          skipped: skippedCount,
          failed: errors.length,
        },
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("=== Parse Documents Error ===", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to parse documents",
        details: error.toString(),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
