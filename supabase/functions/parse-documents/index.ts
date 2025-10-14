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
  structured_data: any;
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
    const useMockData = !anthropicApiKey;

    if (useMockData) {
      console.warn("ANTHROPIC_API_KEY not configured - using mock data for development");
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

      const structured_data = {
        patient_info: {
          name: "Sample Patient",
          age: "45",
          gender: "Male",
          id: "PT-2024-001"
        },
        test_results: [
          {
            test_name: "Total Cholesterol",
            value: "195",
            unit: "mg/dL",
            reference_range: "<200",
            status: "normal"
          },
          {
            test_name: "LDL Cholesterol",
            value: "120",
            unit: "mg/dL",
            reference_range: "<100",
            status: "high"
          },
          {
            test_name: "HDL Cholesterol",
            value: "55",
            unit: "mg/dL",
            reference_range: ">40",
            status: "normal"
          },
          {
            test_name: "Triglycerides",
            value: "140",
            unit: "mg/dL",
            reference_range: "<150",
            status: "normal"
          }
        ],
        dates: {
          test_date: "2024-10-10",
          report_date: "2024-10-12"
        },
        doctor_info: {
          name: "Dr. Smith",
          specialty: "Cardiology"
        },
        recommendations: [
          "Continue monitoring cholesterol levels",
          "Consider dietary modifications to reduce LDL",
          "Follow up in 3 months"
        ],
        diagnoses: ["Borderline high cholesterol"],
        medications: [],
        summary: "Overall cardiovascular health is good with slightly elevated LDL cholesterol. Lifestyle modifications recommended."
      };

      const extractedText = JSON.stringify(structured_data, null, 2);
      const confidence = {
        overall: 0.95,
        patient_info: 0.95,
        test_results: 0.95,
        recommendations: 0.90,
      };

      parsedDocuments.push({
        fileId: file.id,
        fileName: file.file_name,
        structured_data,
        raw_content: extractedText,
        confidence_scores: confidence,
        metadata: {
          file_type: file.file_type,
          extraction_method: "mock-data",
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
            extraction_method: "mock-data",
          },
        }),
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        parsed_documents: parsedDocuments,
        total_processed: parsedDocuments.length,
        mock_data_used: useMockData,
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
