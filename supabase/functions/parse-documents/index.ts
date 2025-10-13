import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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

interface ParsedData {
  fileId: string;
  fileName: string;
  structured_data: {
    patient_info?: {
      name?: string;
      age?: string;
      gender?: string;
      id?: string;
    };
    test_results?: Array<{
      test_name: string;
      value: string;
      unit?: string;
      reference_range?: string;
      status?: string;
    }>;
    dates?: {
      test_date?: string;
      report_date?: string;
    };
    doctor_info?: {
      name?: string;
      specialty?: string;
    };
    recommendations?: string[];
    diagnoses?: string[];
    medications?: string[];
    summary?: string;
  };
  raw_content: string;
  confidence_scores: {
    overall: number;
    patient_info: number;
    test_results: number;
    recommendations: number;
  };
  metadata: {
    file_type: string;
    page_count?: number;
    extraction_method: string;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured in environment");
    }

    const { sessionId, fileIds, customization }: ParseRequest = await req.json();

    if (!sessionId || !fileIds || fileIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: sessionId and fileIds" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const parsedDocuments: ParsedData[] = [];

    for (const fileId of fileIds) {
      const fileResponse = await fetch(
        `${supabaseUrl}/rest/v1/files?id=eq.${fileId}&select=*`,
        {
          headers: {
            "apikey": supabaseServiceKey,
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
        }
      );

      const files = await fileResponse.json();
      if (!files || files.length === 0) {
        console.error(`File not found: ${fileId}`);
        continue;
      }

      const file = files[0];

      const signedUrlResponse = await fetch(
        `${supabaseUrl}/storage/v1/object/sign/medical-files/${file.storage_path}`,
        {
          method: "POST",
          headers: {
            "apikey": supabaseServiceKey,
            "Authorization": `Bearer ${supabaseServiceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ expiresIn: 3600 }),
        }
      );

      const signedUrlData = await signedUrlResponse.json();
      if (!signedUrlData.signedURL) {
        console.error(`Failed to get signed URL for file: ${fileId}`);
        continue;
      }

      const fileContentResponse = await fetch(signedUrlData.signedURL);
      const fileBlob = await fileContentResponse.blob();
      const base64Content = btoa(
        String.fromCharCode(...new Uint8Array(await fileBlob.arrayBuffer()))
      );

      const mediaType = file.file_type.includes("pdf")
        ? "application/pdf"
        : file.file_type;

      const prompt = `You are a medical document analysis expert. Analyze this ${file.file_type} document and extract ALL relevant health information in a structured format.

EXTRACTION REQUIREMENTS:
1. Patient Information (name, age, gender, ID)
2. Test Results (test name, value, unit, reference range, status - normal/high/low)
3. Important Dates (test date, report date)
4. Doctor Information (name, specialty, hospital)
5. Diagnoses and conditions
6. Medications and prescriptions
7. Recommendations and follow-up instructions
8. Overall summary in ${customization.language || "English"} with ${customization.tone || "professional"} tone

IMPORTANT:
- Extract EXACT values and numbers from the document
- Preserve medical terminology
- Identify ALL test results with their units
- Note any abnormal values
- Include reference ranges when available
- Extract dates in ISO format (YYYY-MM-DD) if possible

Return ONLY a valid JSON object with this exact structure:
{
  "patient_info": {
    "name": "...",
    "age": "...",
    "gender": "...",
    "id": "..."
  },
  "test_results": [
    {
      "test_name": "...",
      "value": "...",
      "unit": "...",
      "reference_range": "...",
      "status": "normal/high/low"
    }
  ],
  "dates": {
    "test_date": "...",
    "report_date": "..."
  },
  "doctor_info": {
    "name": "...",
    "specialty": "..."
  },
  "recommendations": ["..."],
  "diagnoses": ["..."],
  "medications": ["..."],
  "summary": "..."
}`;

      const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicApiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 4096,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: mediaType,
                    data: base64Content,
                  },
                },
                {
                  type: "text",
                  text: prompt,
                },
              ],
            },
          ],
        }),
      });

      if (!claudeResponse.ok) {
        const error = await claudeResponse.text();
        console.error(`Claude API error: ${error}`);
        throw new Error(`Claude API failed: ${claudeResponse.status}`);
      }

      const claudeData = await claudeResponse.json();
      const extractedText = claudeData.content[0].text;

      let structured_data;
      try {
        const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
        structured_data = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      } catch (e) {
        console.error("Failed to parse Claude response as JSON:", e);
        structured_data = { raw_response: extractedText };
      }

      const confidence = {
        overall: 0.85,
        patient_info: structured_data.patient_info ? 0.9 : 0.5,
        test_results: structured_data.test_results?.length > 0 ? 0.9 : 0.6,
        recommendations: structured_data.recommendations?.length > 0 ? 0.85 : 0.7,
      };

      parsedDocuments.push({
        fileId: file.id,
        fileName: file.file_name,
        structured_data,
        raw_content: extractedText,
        confidence_scores: confidence,
        metadata: {
          file_type: file.file_type,
          extraction_method: "claude-3.5-sonnet",
        },
      });

      await fetch(`${supabaseUrl}/rest/v1/parsed_documents`, {
        method: "POST",
        headers: {
          "apikey": supabaseServiceKey,
          "Authorization": `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({
          file_id: file.id,
          session_id: sessionId,
          user_id: file.user_id,
          parsing_status: "completed",
          raw_content: extractedText,
          structured_data,
          confidence_scores: confidence,
          metadata: {
            file_type: file.file_type,
            extraction_method: "claude-3.5-sonnet",
          },
        }),
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        parsed_documents: parsedDocuments,
        total_processed: parsedDocuments.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Parse documents error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to parse documents",
        details: error.toString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
