import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface InsightsRequest {
  sessionId: string;
  tone?: string;
  languageLevel?: string;
}

const TONE_MAPPINGS = {
  professional: "formal, clinical, and precise",
  conversational: "friendly, approachable, and easy-to-understand",
  reassuring: "empathetic, comforting, and supportive",
  direct: "straightforward, concise, and factual"
};

const LANGUAGE_MAPPINGS = {
  medical_professional: "Use proper medical terminology and clinical language",
  educated_patient: "Use medical terms with brief explanations",
  simple_terms: "Avoid medical jargon, use everyday language",
  child_friendly: "Use very simple words suitable for children"
};

async function generateHealthInsights(
  labReports: any[],
  testResults: any[],
  patient: any,
  tone: string,
  languageLevel: string
): Promise<any> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const toneDescription = TONE_MAPPINGS[tone as keyof typeof TONE_MAPPINGS] || TONE_MAPPINGS.conversational;
  const languageDescription = LANGUAGE_MAPPINGS[languageLevel as keyof typeof LANGUAGE_MAPPINGS] || LANGUAGE_MAPPINGS.simple_terms;

  const systemPrompt = `You are Althea, an empathetic AI health interpreter specializing in medical report analysis.

COMMUNICATION STYLE:
- Tone: ${toneDescription}
- Language Level: ${languageDescription}

YOUR RESPONSIBILITIES:
1. Interpret medical findings in accessible language
2. Highlight key findings and abnormal values
3. Generate 3-5 relevant questions for the patient to ask their doctor
4. Identify health trends and patterns
5. Suggest actionable health recommendations
6. Assess family health risk patterns

IMPORTANT LIMITATIONS:
- Do NOT provide specific medical diagnoses
- Always recommend consulting healthcare providers
- Clearly distinguish information from medical advice
- Acknowledge urgent findings requiring immediate attention

OUTPUT FORMAT (JSON):
{
  "summary": "Brief overview of the health report",
  "key_findings": [
    {
      "category": "Blood Sugar / Heart Health / etc",
      "finding": "Description",
      "significance": "What this means",
      "action_needed": "What to do"
    }
  ],
  "abnormal_values": [
    {
      "test_name": "Test name",
      "value": "Current value",
      "normal_range": "Normal range",
      "status": "HIGH/LOW/CRITICAL",
      "explanation": "Simple explanation"
    }
  ],
  "questions_for_doctor": [
    "Question 1",
    "Question 2",
    "Question 3"
  ],
  "health_recommendations": [
    {
      "category": "Diet / Exercise / Monitoring",
      "recommendation": "Specific actionable advice",
      "priority": "high/medium/low"
    }
  ],
  "family_screening_suggestions": [
    {
      "condition": "Condition to screen for",
      "reason": "Why family should be screened",
      "who_should_screen": "Which family members"
    }
  ],
  "follow_up_timeline": "Recommended follow-up schedule",
  "urgency_flag": "none/routine/urgent/emergency"
}`;

  const reportSummary = labReports.map(report => ({
    lab: report.lab_name,
    date: report.report_date,
    doctor: report.referring_doctor
  }));

  const testSummary = testResults.map(test => ({
    test: test.test_name,
    value: test.observed_value,
    unit: test.unit,
    range: test.reference_range_text,
    status: test.status,
    category: test.test_category
  }));

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
            content: `Analyze this medical report data and provide comprehensive health insights:

PATIENT INFO:
${JSON.stringify(patient, null, 2)}

LAB REPORTS:
${JSON.stringify(reportSummary, null, 2)}

TEST RESULTS:
${JSON.stringify(testSummary, null, 2)}

Please provide your analysis in JSON format.`,
          },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`OpenAI API error: ${response.status}`, error);
      throw new Error(`Failed to generate insights: ${response.status}`);
    }

    const result = await response.json();
    const insights = JSON.parse(result.choices?.[0]?.message?.content || "{}");

    return insights;
  } catch (error: any) {
    console.error("Error generating insights:", error);
    throw error;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { sessionId, tone = "conversational", languageLevel = "simple_terms" }: InsightsRequest = await req.json();

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: "sessionId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Generating insights for session: ${sessionId}`);

    const { data: labReports, error: reportsError } = await supabase
      .from("lab_reports")
      .select("*")
      .eq("session_id", sessionId);

    if (reportsError) throw reportsError;
    if (!labReports || labReports.length === 0) {
      return new Response(
        JSON.stringify({ error: "No lab reports found for this session" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const reportIds = labReports.map(r => r.id);
    const { data: testResults, error: testsError } = await supabase
      .from("test_results")
      .select("*")
      .in("lab_report_id", reportIds)
      .order("test_category", { ascending: true });

    if (testsError) throw testsError;

    const patientId = labReports[0].patient_id;
    const { data: patient } = await supabase
      .from("patients")
      .select("*")
      .eq("id", patientId)
      .single();

    console.log(`Analyzing ${testResults?.length || 0} test results`);

    const insights = await generateHealthInsights(
      labReports,
      testResults || [],
      patient,
      tone,
      languageLevel
    );

    await supabase.from("health_insights").insert({
      session_id: sessionId,
      user_id: labReports[0].user_id,
      insights_data: insights,
      tone: tone,
      language_level: languageLevel,
      metadata: {
        report_count: labReports.length,
        test_count: testResults?.length || 0,
        generated_at: new Date().toISOString()
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        insights,
        metadata: {
          reports_analyzed: labReports.length,
          tests_analyzed: testResults?.length || 0,
          patient_name: patient?.name
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Generate insights error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to generate health insights",
        details: error.toString(),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
